-- Ensure single award_stamps implementation and robust acceptance test.

-- Drop any existing award_stamps overloads
DO $$
DECLARE obj record;
BEGIN
  FOR obj IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'award_stamps'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', obj.sig);
  END LOOP;
END $$;

-- Recreate function
CREATE FUNCTION public.award_stamps(
  p_user uuid,
  p_order_id text,
  p_add int
)
RETURNS TABLE (loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ls int;
  fd int;
BEGIN
  -- Load current totals (profiles may use either user_id or id; prefer user_id if present)
  SELECT COALESCE(loyalty_stamps,0), COALESCE(free_drinks,0)
    INTO ls, fd
  FROM public.profiles
  WHERE (user_id = p_user OR id = p_user)
  ORDER BY CASE WHEN user_id = p_user THEN 0 ELSE 1 END
  LIMIT 1;

  -- If no row found, start from zeros
  IF NOT FOUND THEN
    ls := 0; fd := 0;
  END IF;

  -- Accumulate
  ls := GREATEST(0, ls + p_add);
  fd := fd + (ls / 8);
  ls := ls % 8;

  -- Upsert back into profiles
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
    INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
    VALUES (p_user, ls, fd)
    ON CONFLICT (user_id) DO UPDATE
      SET loyalty_stamps = EXCLUDED.loyalty_stamps,
          free_drinks    = EXCLUDED.free_drinks;
  ELSE
    INSERT INTO public.profiles(id, loyalty_stamps, free_drinks)
    VALUES (p_user, ls, fd)
    ON CONFLICT (id) DO UPDATE
      SET loyalty_stamps = EXCLUDED.loyalty_stamps,
          free_drinks    = EXCLUDED.free_drinks;
  END IF;

  -- Log award only when p_add > 0 (idempotent)
  IF p_add > 0 THEN
    INSERT INTO public.loyalty_awards(order_id, user_id, stamps)
    VALUES (p_order_id, p_user, p_add)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return OUT columns
  RETURN QUERY
  SELECT ls, fd;
END $$;

GRANT EXECUTE ON FUNCTION public.award_stamps(uuid, text, int) TO anon, authenticated, service_role;

-- roll stamps into free drink
DO $$
DECLARE
  u  uuid;
  ls int;
  fd int;
  cnt int;
  pk text;
BEGIN
  -- Use an existing auth user; if none, skip test
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping loyalty acceptance test: no rows in auth.users.';
    RETURN;
  END IF;

  -- Ensure a profiles row exists for this user (support user_id or id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) THEN
    pk := 'user_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) THEN
    pk := 'id';
  ELSE
    RAISE EXCEPTION 'profiles identifier column not found';
  END IF;

  -- Upsert a baseline profile (5 stamps, 1 free drink)
  IF pk = 'user_id' THEN
    INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
    VALUES (u, 5, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET loyalty_stamps = EXCLUDED.loyalty_stamps,
          free_drinks    = EXCLUDED.free_drinks;
  ELSE
    INSERT INTO public.profiles(id, loyalty_stamps, free_drinks)
    VALUES (u, 5, 1)
    ON CONFLICT (id) DO UPDATE
      SET loyalty_stamps = EXCLUDED.loyalty_stamps,
          free_drinks    = EXCLUDED.free_drinks;
  END IF;

  -- Call function and read OUT columns (NO alias, NO column list)
  SELECT loyalty_stamps, free_drinks
    INTO ls, fd
  FROM public.award_stamps(u, 'o1', 3);

  -- Expect: 5 + 3 = 8 → rolls to 1 free drink, 0 stamps
  IF ls <> 0 OR fd <> 2 THEN
    RAISE EXCEPTION 'unexpected totals %, %', ls, fd;
  END IF;

  -- One log row should exist for this order id
  SELECT count(*) INTO cnt FROM public.loyalty_awards WHERE order_id = 'o1';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'loyalty_awards count %', cnt;
  END IF;

  -- Cleanup
  DELETE FROM public.loyalty_awards WHERE order_id = 'o1';
  IF pk = 'user_id' THEN
    DELETE FROM public.profiles WHERE user_id = u;
  ELSE
    DELETE FROM public.profiles WHERE id = u;
  END IF;
END $$;

-- Verification: single signature
SELECT proname, oid::regprocedure
FROM pg_proc
WHERE proname = 'award_stamps';

-- Quick runtime sanity (optional, guarded)
DO $$
DECLARE u uuid;
       ls int; fd int;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NOT NULL THEN
    -- Ensure a profile exists
    INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
    VALUES (u, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT loyalty_stamps, free_drinks INTO ls, fd
    FROM public.award_stamps(u, 'test-accept', 1);
    RAISE NOTICE 'award_stamps returned ls=%, fd=%', ls, fd;
    DELETE FROM public.loyalty_awards WHERE order_id='test-accept';
  END IF;
END $$;

-- Reload schema
notify pgrst, 'reload schema';

-- 0008_fix_acceptance_award_stamps.sql

-- Smoke test: insert/delete an order only if a user exists
DO $$
DECLARE
  u uuid;
  oid text := 'test-oid-' || floor(extract(epoch from now()))::text;

BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping orders smoke test: no auth.users present.';
    RETURN;
  END IF;

  INSERT INTO public.orders(user_id, order_id, source, channel)

  VALUES (u, oid, 'app', 'click_and_collect');

  DELETE FROM public.orders WHERE order_id = oid;

END
$$;

-- Acceptance test for award_stamps: only run if a user exists
DO $$
DECLARE

  u   uuid;
  ls  int;
  fd  int;
  cnt int;
  oid text := 'o' || floor(extract(epoch from now()))::text;
  r   record;

BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping award_stamps acceptance: no auth.users present.';
    RETURN;
  END IF;

  -- Ensure a profile row exists for that user
  INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
  VALUES (u, 5, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET loyalty_stamps = EXCLUDED.loyalty_stamps,
        free_drinks    = EXCLUDED.free_drinks;


  -- Call function and capture OUT columns via record
  SELECT * INTO r FROM public.award_stamps(u, oid, 3);
  ls := r.loyalty_stamps;
  fd := r.free_drinks;


  IF ls <> 0 OR fd <> 2 THEN
    RAISE EXCEPTION 'unexpected totals %, % (expected 0, 2)', ls, fd;
  END IF;

  -- Validate we logged exactly one award for this order

  SELECT count(*) INTO cnt FROM public.loyalty_awards WHERE order_id = oid;

  IF cnt <> 1 THEN
    RAISE EXCEPTION 'loyalty_awards count % (expected 1)', cnt;
  END IF;

  -- Cleanup acceptance data

  DELETE FROM public.loyalty_awards WHERE order_id = oid;

END
$$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
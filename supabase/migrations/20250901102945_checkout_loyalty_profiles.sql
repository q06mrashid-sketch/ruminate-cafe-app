-- 20250901102945_checkout_loyalty_profiles.sql
-- Simplify checkout_loyalty to maintain balances directly in profiles

-- Ensure profiles has loyalty columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_stamps int NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_drinks int NOT NULL DEFAULT 0;

-- Drop legacy stamp/voucher tables to avoid duplicate state
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='loyalty_stamps'
  ) THEN
    DROP TABLE public.loyalty_stamps;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='drink_vouchers'
  ) THEN
    DROP TABLE public.drink_vouchers;
  END IF;
END $$;

-- Replace checkout_loyalty to update profiles directly
DROP FUNCTION IF EXISTS public.checkout_loyalty(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.checkout_loyalty(uuid, text, int, int);

CREATE FUNCTION public.checkout_loyalty(
  p_user uuid,
  p_order_id text,
  p_add_stamps int,
  p_redeem int
) RETURNS TABLE(loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pk text;
  cur_stamps int;
  cur_free int;
  redeem_used int;
  inserted int;
BEGIN
  -- detect profiles pk
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

  -- ensure profile row exists
  EXECUTE format(
    'INSERT INTO public.profiles(%1$I, loyalty_stamps, free_drinks) VALUES ($1,0,0) ON CONFLICT (%1$I) DO NOTHING',
    pk
  ) USING p_user;

  -- ledger for idempotency
  INSERT INTO public.loyalty_tx(order_id, user_id, stamps_awarded, vouchers_redeemed)
    VALUES (p_order_id, p_user, GREATEST(p_add_stamps,0), GREATEST(p_redeem,0))
    ON CONFLICT (order_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  -- lock and fetch current totals
  EXECUTE format('SELECT loyalty_stamps, free_drinks FROM public.profiles WHERE %1$I=$1 FOR UPDATE', pk)
    INTO cur_stamps, cur_free USING p_user;

  IF inserted > 0 THEN
    -- consume free drinks
    redeem_used := LEAST(GREATEST(p_redeem,0), cur_free);
    cur_free := cur_free - redeem_used;

    -- award stamps
    cur_stamps := cur_stamps + GREATEST(p_add_stamps,0);

    -- roll stamps into free drinks
    cur_free := cur_free + (cur_stamps / 8);
    cur_stamps := cur_stamps % 8;

    EXECUTE format('UPDATE public.profiles SET loyalty_stamps=$1, free_drinks=$2 WHERE %1$I=$3', pk)
      USING cur_stamps, cur_free, p_user;
  END IF;

  loyalty_stamps := cur_stamps;
  free_drinks := cur_free;
  RETURN QUERY SELECT loyalty_stamps, free_drinks;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkout_loyalty(uuid, text, int, int) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Acceptance: award 3 stamps and redeem 1
DO $$
DECLARE
  u uuid;
  r record;
  pk text;
  oid text := 'o' || floor(extract(epoch from now()))::text;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping checkout_loyalty acceptance: no rows in auth.users.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
    pk := 'user_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='id') THEN
    pk := 'id';
  ELSE
    RAISE EXCEPTION 'profiles identifier column not found';
  END IF;

  EXECUTE format('INSERT INTO public.profiles(%1$I, loyalty_stamps, free_drinks) VALUES ($1,5,1) ON CONFLICT (%1$I) DO UPDATE SET loyalty_stamps=5, free_drinks=1', pk)
    USING u;

  SELECT * INTO r FROM public.checkout_loyalty(u, oid, 3, 1);
  IF r.loyalty_stamps <> 0 OR r.free_drinks <> 1 THEN
    RAISE EXCEPTION 'checkout_loyalty mismatch: % %', r.loyalty_stamps, r.free_drinks;
  END IF;

  DELETE FROM public.loyalty_tx WHERE order_id = oid;
  EXECUTE format('DELETE FROM public.profiles WHERE %I=$1', pk) USING u;
END $$;

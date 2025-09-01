-- 0018_normalize_checkout_loyalty.sql
-- Normalize loyalty after checkout: convert stamps to vouchers and sync profiles

DROP FUNCTION IF EXISTS public.checkout_loyalty(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.checkout_loyalty(uuid, text, int, int);

CREATE OR REPLACE FUNCTION public.checkout_loyalty(
  p_user uuid,
  p_order_id text,
  p_add_stamps int,
  p_redeem int
) RETURNS TABLE(loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pk text;
  cur_stamps int;
  cur_free int;
  redeem_used int;
  inserted int;
  total_stamps int;
  vouchers_to_add int;
  stamps_remainder int;
BEGIN
  -- detect profiles pk (user_id or id)
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

  -- idempotent ledger entry
  INSERT INTO public.loyalty_tx(order_id, user_id, stamps_awarded, vouchers_redeemed)
    VALUES (p_order_id, p_user, GREATEST(p_add_stamps,0), GREATEST(p_redeem,0))
    ON CONFLICT (order_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  -- current ledger totals
  SELECT COALESCE(SUM(stamps), 0) INTO cur_stamps
    FROM (
      SELECT stamps FROM public.loyalty_stamps
      WHERE user_id = p_user
      FOR UPDATE
    ) s;

  SELECT COUNT(*) INTO cur_free
    FROM (
      SELECT 1 FROM public.drink_vouchers
      WHERE user_id = p_user AND redeemed = FALSE
      FOR UPDATE
    ) v;

  IF inserted > 0 THEN
    -- consume existing free drinks
    redeem_used := LEAST(GREATEST(p_redeem,0), cur_free);
    IF redeem_used > 0 THEN
      UPDATE public.drink_vouchers SET redeemed = TRUE
        WHERE id IN (
          SELECT id FROM public.drink_vouchers
          WHERE user_id = p_user AND redeemed = FALSE
          ORDER BY created_at
          LIMIT redeem_used
        );
    END IF;
    cur_free := cur_free - redeem_used;

    -- award stamps
    IF GREATEST(p_add_stamps,0) > 0 THEN
      INSERT INTO public.loyalty_stamps(user_id, stamps)
        VALUES (p_user, GREATEST(p_add_stamps,0));
      cur_stamps := cur_stamps + GREATEST(p_add_stamps,0);
    END IF;

    -- normalize stamps into vouchers
    total_stamps := cur_stamps;
    vouchers_to_add := total_stamps / 8;
    stamps_remainder := total_stamps % 8;

    IF vouchers_to_add > 0 THEN
      INSERT INTO public.drink_vouchers(user_id, code)
        SELECT p_user, gen_random_uuid()::text
        FROM generate_series(1, vouchers_to_add);
    END IF;
    cur_free := cur_free + vouchers_to_add;

    DELETE FROM public.loyalty_stamps WHERE user_id = p_user;
    IF stamps_remainder > 0 THEN
      INSERT INTO public.loyalty_stamps(user_id, stamps)
        VALUES (p_user, stamps_remainder);
    END IF;
    cur_stamps := stamps_remainder;

    EXECUTE format(
      'UPDATE public.profiles SET loyalty_stamps=$1, free_drinks=$2 WHERE %1$I=$3',
      pk
    ) USING cur_stamps, cur_free, p_user;
  END IF;

  loyalty_stamps := COALESCE(cur_stamps,0);
  free_drinks := COALESCE(cur_free,0);
  RETURN QUERY SELECT loyalty_stamps, free_drinks;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkout_loyalty(uuid, text, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Acceptance: award 2 stamps and redeem 1 with normalization
DO $$
DECLARE
  u uuid;
  r record;
  pk text;
  oid text := 'o' || floor(extract(epoch from now()))::text;
  vid text := 'v' || floor(extract(epoch from now()))::text;
  cnt int;
  stamps int;
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

  EXECUTE format('INSERT INTO public.profiles(%1$I, loyalty_stamps, free_drinks) VALUES ($1,7,1) ON CONFLICT (%1$I) DO UPDATE SET loyalty_stamps=7, free_drinks=1', pk)
    USING u;
  INSERT INTO public.loyalty_stamps(user_id, stamps) VALUES (u,7);
  INSERT INTO public.drink_vouchers(user_id, code) VALUES (u, vid);

  SELECT * INTO r FROM public.checkout_loyalty(u, oid, 2, 1);
  IF r.loyalty_stamps <> 1 OR r.free_drinks <> 1 THEN
    RAISE EXCEPTION 'checkout_loyalty mismatch: % %', r.loyalty_stamps, r.free_drinks;
  END IF;

  SELECT SUM(stamps) INTO stamps FROM public.loyalty_stamps WHERE user_id = u;
  IF stamps <> 1 THEN
    RAISE EXCEPTION 'loyalty_stamps not normalized: %', stamps;
  END IF;

  SELECT COUNT(*) INTO cnt FROM public.drink_vouchers WHERE user_id = u AND redeemed = FALSE;
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'unredeemed vouchers mismatch: %', cnt;
  END IF;

  IF EXISTS (SELECT 1 FROM public.drink_vouchers WHERE code = vid AND redeemed = FALSE) THEN
    RAISE EXCEPTION 'voucher not redeemed';
  END IF;

  DELETE FROM public.loyalty_tx WHERE order_id = oid;
  DELETE FROM public.loyalty_stamps WHERE user_id = u;
  DELETE FROM public.drink_vouchers WHERE user_id = u;
  EXECUTE format('DELETE FROM public.profiles WHERE %I=$1', pk) USING u;
END $$;

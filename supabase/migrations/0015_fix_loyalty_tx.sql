-- 0015_fix_loyalty_tx.sql
-- Point loyalty_tx.user_id at auth.users and harden checkout_loyalty

-- 1) Ensure FK references auth.users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loyalty_tx_user_id_fkey'
      AND conrelid = 'public.loyalty_tx'::regclass
  ) THEN
    ALTER TABLE public.loyalty_tx DROP CONSTRAINT loyalty_tx_user_id_fkey;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.loyalty_tx
    ADD CONSTRAINT loyalty_tx_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table OR duplicate_object THEN
  NULL;
END $$;

-- 2) Replace checkout_loyalty to upsert profile and sync stamp/voucher ledgers
DROP FUNCTION IF EXISTS public.checkout_loyalty(uuid, text, int, int);

CREATE FUNCTION public.checkout_loyalty(
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

  -- ledger for idempotency
  INSERT INTO public.loyalty_tx(order_id, user_id, stamps_awarded, vouchers_redeemed)
    VALUES (p_order_id, p_user, GREATEST(p_add_stamps,0), GREATEST(p_redeem,0))
    ON CONFLICT (order_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  EXECUTE format('SELECT loyalty_stamps, free_drinks FROM public.profiles WHERE %I=$1 FOR UPDATE', pk)
    INTO cur_stamps, cur_free USING p_user;

  IF inserted = 0 THEN
    loyalty_stamps := COALESCE(cur_stamps,0);
    free_drinks    := COALESCE(cur_free,0);
    RETURN;
  END IF;

  -- consume existing free drinks
  redeem_used := LEAST(GREATEST(p_redeem,0), COALESCE(cur_free,0));
  cur_free := COALESCE(cur_free,0) - redeem_used;

  IF redeem_used > 0 THEN
    UPDATE public.drink_vouchers SET redeemed = TRUE
      WHERE id IN (
        SELECT id FROM public.drink_vouchers
        WHERE user_id = p_user AND redeemed = FALSE
        ORDER BY created_at
        LIMIT redeem_used
      );
  END IF;

  -- award stamps
  IF GREATEST(p_add_stamps,0) > 0 THEN
    INSERT INTO public.loyalty_stamps(user_id, stamps)
      VALUES (p_user, GREATEST(p_add_stamps,0));
  END IF;

  cur_stamps := COALESCE(cur_stamps,0) + GREATEST(p_add_stamps,0);
  free_drinks := cur_free + (cur_stamps / 8);
  loyalty_stamps := MOD(cur_stamps, 8);

  EXECUTE format('UPDATE public.profiles SET loyalty_stamps=$1, free_drinks=$2 WHERE %I=$3', pk)
    USING loyalty_stamps, free_drinks, p_user;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkout_loyalty(uuid, text, int, int) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 3) Acceptance: award 2 stamps and redeem 1
DO $$
DECLARE
  u uuid;
  r record;
  pk text;
  oid text := 'o' || floor(extract(epoch from now()))::text;
  vid text := 'v' || floor(extract(epoch from now()))::text;
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
  INSERT INTO public.drink_vouchers(user_id, code) VALUES (u, vid);

  SELECT * INTO r FROM public.checkout_loyalty(u, oid, 2, 1);
  IF r.loyalty_stamps <> 1 OR r.free_drinks <> 1 THEN
    RAISE EXCEPTION 'checkout_loyalty mismatch: % %', r.loyalty_stamps, r.free_drinks;
  END IF;

  DELETE FROM public.loyalty_tx WHERE order_id = oid;
  DELETE FROM public.loyalty_stamps WHERE user_id = u;
  DELETE FROM public.drink_vouchers WHERE user_id = u;
  EXECUTE format('DELETE FROM public.profiles WHERE %I=$1', pk) USING u;
END $$;

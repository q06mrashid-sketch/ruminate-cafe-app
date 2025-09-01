-- 20250901102944_redefine_checkout_loyalty.sql
-- Redefine checkout_loyalty to ledger stamp awards without profile aggregates

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

  -- lock profile row to guard totals even when no stamps rows exist
  EXECUTE format('SELECT 1 FROM public.profiles WHERE %1$I=$1 FOR UPDATE', pk)
    USING p_user;

  -- idempotent ledger entry
  INSERT INTO public.loyalty_tx(order_id, user_id, stamps_awarded, vouchers_redeemed)
    VALUES (p_order_id, p_user, GREATEST(p_add_stamps,0), GREATEST(p_redeem,0))
    ON CONFLICT (order_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  -- current ledger totals
  SELECT COALESCE(SUM(stamps),0) INTO cur_stamps
    FROM public.loyalty_stamps
    WHERE user_id = p_user
    FOR UPDATE;

  SELECT COUNT(*) INTO cur_free
    FROM public.drink_vouchers
    WHERE user_id = p_user AND redeemed = FALSE
    FOR UPDATE;

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
    END IF;


    -- normalize within same transaction
    total_stamps := cur_stamps + GREATEST(p_add_stamps,0);
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

  END IF;

  loyalty_stamps := COALESCE(cur_stamps,0);
  free_drinks := COALESCE(cur_free,0);
  RETURN QUERY SELECT loyalty_stamps, free_drinks;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkout_loyalty(uuid, text, int, int) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Acceptance: concurrent checkouts normalize stamps atomically
DO $$
DECLARE
  u uuid;
  r record;
  pk text;
  oid1 text := 'o' || floor(extract(epoch from now()))::text || '_1';
  oid2 text := 'o' || floor(extract(epoch from now()))::text || '_2';
  cnt int;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping checkout_loyalty acceptance: no rows in auth.users.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='dblink') THEN
    RAISE NOTICE 'Skipping checkout_loyalty concurrency test: dblink extension not available.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
    pk := 'user_id';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='id') THEN
    pk := 'id';
  ELSE
    RAISE EXCEPTION 'profiles identifier column not found';
  END IF;

  EXECUTE format('INSERT INTO public.profiles(%1$I, loyalty_stamps, free_drinks) VALUES ($1,0,0) ON CONFLICT (%1$I) DO UPDATE SET loyalty_stamps=0, free_drinks=0', pk)
    USING u;
  INSERT INTO public.loyalty_stamps(user_id, stamps) VALUES (u,6);

  PERFORM dblink_connect('conn1', 'dbname=' || current_database());
  PERFORM dblink_connect('conn2', 'dbname=' || current_database());
  PERFORM dblink_exec('conn1', 'BEGIN');
  PERFORM dblink_exec('conn2', 'BEGIN');

  PERFORM dblink_send_query('conn1', format('SELECT loyalty_stamps, free_drinks FROM public.checkout_loyalty(''%s'',''%s'',2,0);', u::text, oid1));
  PERFORM dblink_send_query('conn2', format('SELECT loyalty_stamps, free_drinks FROM public.checkout_loyalty(''%s'',''%s'',2,0);', u::text, oid2));

  SELECT * INTO r FROM dblink_get_result('conn1') AS t(loyalty_stamps int, free_drinks int);
  IF r.loyalty_stamps <> 0 OR r.free_drinks <> 1 THEN
    RAISE EXCEPTION 'first checkout mismatch: % %', r.loyalty_stamps, r.free_drinks;
  END IF;

  -- release lock held by first checkout before fetching second result
  PERFORM dblink_exec('conn1', 'COMMIT');

  SELECT * INTO r FROM dblink_get_result('conn2') AS t(loyalty_stamps int, free_drinks int);
  IF r.loyalty_stamps <> 2 OR r.free_drinks <> 1 THEN
    RAISE EXCEPTION 'second checkout mismatch: % %', r.loyalty_stamps, r.free_drinks;

  END IF;
  PERFORM dblink_exec('conn2', 'COMMIT');
  PERFORM dblink_disconnect('conn1');
  PERFORM dblink_disconnect('conn2');

  SELECT COALESCE(SUM(stamps),0) INTO cnt FROM public.loyalty_stamps WHERE user_id = u;
  IF cnt <> 2 THEN
    RAISE EXCEPTION 'loyalty_stamps not normalized: %', cnt;
  END IF;

  SELECT COUNT(*) INTO cnt FROM public.drink_vouchers WHERE user_id = u AND redeemed = FALSE;
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'unredeemed vouchers mismatch: %', cnt;
  END IF;

  DELETE FROM public.loyalty_tx WHERE order_id IN (oid1, oid2);

  DELETE FROM public.loyalty_stamps WHERE user_id = u;
  DELETE FROM public.drink_vouchers WHERE user_id = u;
  EXECUTE format('DELETE FROM public.profiles WHERE %I=$1', pk) USING u;
END $$;

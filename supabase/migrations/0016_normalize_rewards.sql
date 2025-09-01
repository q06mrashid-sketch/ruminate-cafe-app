-- 0016_normalize_rewards.sql
-- Normalize loyalty_stamps into drink_vouchers and cap per-user remainder at <8

DO $$
DECLARE
  cnt int;
BEGIN
  -- ensure required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='loyalty_stamps'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='drink_vouchers'
  ) THEN
    RAISE NOTICE 'Skipping rewards normalization: required tables missing.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO cnt FROM public.loyalty_stamps;
  IF cnt = 0 THEN
    RAISE NOTICE 'Skipping rewards normalization: no rows in public.loyalty_stamps.';
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_norm AS
  SELECT ls.user_id,
         SUM(ls.stamps)::int AS total_stamps
  FROM public.loyalty_stamps ls
  GROUP BY ls.user_id;

  ALTER TABLE tmp_norm
    ADD COLUMN vouchers_total int,
    ADD COLUMN remainder int,
    ADD COLUMN existing_vouchers int DEFAULT 0,
    ADD COLUMN vouchers_to_add int;

  UPDATE tmp_norm
    SET vouchers_total = total_stamps / 8,
        remainder = total_stamps % 8;

  UPDATE tmp_norm t
    SET existing_vouchers = dv.cnt
    FROM (
      SELECT user_id, COUNT(*) AS cnt FROM public.drink_vouchers GROUP BY user_id
    ) dv
    WHERE dv.user_id = t.user_id;

  UPDATE tmp_norm
    SET vouchers_to_add = vouchers_total - existing_vouchers;

  -- insert missing vouchers
  INSERT INTO public.drink_vouchers(user_id, code)
    SELECT t.user_id, gen_random_uuid()::text
    FROM tmp_norm t,
         LATERAL generate_series(1, GREATEST(t.vouchers_to_add,0));

  -- replace loyalty_stamps with remainder
  DELETE FROM public.loyalty_stamps;
  INSERT INTO public.loyalty_stamps(user_id, stamps)
    SELECT user_id, remainder FROM tmp_norm WHERE remainder > 0;

  -- acceptance: ensure no user ends with more than 7 stamps
  IF EXISTS (SELECT 1 FROM public.loyalty_stamps WHERE stamps > 7) THEN
    RAISE EXCEPTION 'normalize_rewards: user ends with >7 stamps';
  END IF;

  -- acceptance: voucher counts match expectations
  IF EXISTS (
    SELECT 1
    FROM tmp_norm t
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS cnt FROM public.drink_vouchers GROUP BY user_id
    ) dv ON dv.user_id = t.user_id
    WHERE COALESCE(dv.cnt,0) <> (t.total_stamps - t.remainder)/8
  ) THEN
    RAISE EXCEPTION 'normalize_rewards: voucher count mismatch';
  END IF;

  DROP TABLE tmp_norm;
END $$;

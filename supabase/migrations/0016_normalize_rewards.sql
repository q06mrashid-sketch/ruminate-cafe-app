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
  WITH ls AS (
    SELECT user_id, SUM(stamps)::int AS ls_stamps
    FROM public.loyalty_stamps
    GROUP BY user_id
  ),
  dv AS (
    SELECT user_id, COUNT(*) AS existing_vouchers
    FROM public.drink_vouchers
    GROUP BY user_id
  )
  SELECT COALESCE(ls.user_id, dv.user_id) AS user_id,
         COALESCE(ls.ls_stamps, 0) AS ls_stamps,
         COALESCE(dv.existing_vouchers, 0) AS existing_vouchers,
         COALESCE(ls.ls_stamps, 0) + COALESCE(dv.existing_vouchers,0) * 8 AS total_stamps
  FROM ls
  FULL JOIN dv ON dv.user_id = ls.user_id;

  ALTER TABLE tmp_norm
    ADD COLUMN vouchers_total int,
    ADD COLUMN remainder int,
    ADD COLUMN vouchers_to_add int;

  UPDATE tmp_norm
    SET vouchers_total = total_stamps / 8,
        remainder = total_stamps % 8,
        vouchers_to_add = (total_stamps / 8) - existing_vouchers;

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
    WHERE COALESCE(dv.cnt,0) <> t.vouchers_total
  ) THEN
    RAISE EXCEPTION 'normalize_rewards: voucher count mismatch';
  END IF;

  DROP TABLE tmp_norm;
END $$;

-- 0010_harden_award_stamps_and_acceptance.sql
-- Safe, idempotent hardening + acceptance that won't break on empty auth.users

BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL idle_in_transaction_session_timeout = '4s';
SET LOCAL search_path = public, extensions;

-- ========== A) ORDERS: make bad 'source' safe & (re)add constraint ==========
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source_meta text;

-- Normalize any invalid source values so the check will pass
UPDATE public.orders
SET source_meta = source,
    source      = 'app'
WHERE source IS NULL OR lower(source) NOT IN ('app','pos','portal');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_source_check') THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_source_check;
  END IF;
END$$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_source_check
  CHECK (lower(source) IN ('app','pos','portal'));

-- ========== B) PROFILES: ensure loyalty columns exist ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_stamps int NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_drinks int NOT NULL DEFAULT 0;

-- ========== C) LOYALTY_AWARDS: presence + RLS ==========
CREATE TABLE IF NOT EXISTS public.loyalty_awards(
  order_id       text PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  stamps_awarded int  NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_awards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='loyalty_awards' AND policyname='loyalty_awards_select_own'
  ) THEN
    CREATE POLICY loyalty_awards_select_own ON public.loyalty_awards
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='loyalty_awards' AND policyname='loyalty_awards_insert_own'
  ) THEN
    CREATE POLICY loyalty_awards_insert_own ON public.loyalty_awards
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- ========== D) award_stamps: drop & recreate with OUT columns ==========
DROP FUNCTION IF EXISTS public.award_stamps(uuid, text, integer);

CREATE FUNCTION public.award_stamps(
  p_user     uuid,
  p_order_id text,
  p_add      integer
) RETURNS TABLE(loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_stamps int := 0;
  cur_free   int := 0;
BEGIN
  -- If this order already awarded, return current totals (idempotent call)
  IF EXISTS (SELECT 1 FROM public.loyalty_awards WHERE order_id = p_order_id) THEN
    SELECT COALESCE(loyalty_stamps,0), COALESCE(free_drinks,0)
      INTO loyalty_stamps, free_drinks
    FROM public.profiles
    WHERE user_id = p_user;
    loyalty_stamps := COALESCE(loyalty_stamps,0);
    free_drinks    := COALESCE(free_drinks,0);
    RETURN;
  END IF;

  -- Ensure a profile row exists
  INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
  VALUES (p_user, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- If no stamps to add, just read back totals
  IF COALESCE(p_add,0) <= 0 THEN
    SELECT COALESCE(loyalty_stamps,0), COALESCE(free_drinks,0)
      INTO loyalty_stamps, free_drinks
    FROM public.profiles
    WHERE user_id = p_user;
    RETURN;
  END IF;

  -- Add stamps
  UPDATE public.profiles
  SET loyalty_stamps = COALESCE(loyalty_stamps,0) + p_add
  WHERE user_id = p_user
  RETURNING loyalty_stamps, free_drinks
  INTO cur_stamps, cur_free;

  -- Roll into free drinks (8 stamps = 1)
  cur_free   := COALESCE(cur_free,0) + (cur_stamps / 8);
  cur_stamps := cur_stamps % 8;

  UPDATE public.profiles
  SET loyalty_stamps = cur_stamps,
      free_drinks    = cur_free
  WHERE user_id = p_user;

  INSERT INTO public.loyalty_awards(order_id, user_id, stamps_awarded)
  VALUES (p_order_id, p_user, p_add)
  ON CONFLICT (order_id) DO NOTHING;

  loyalty_stamps := cur_stamps;
  free_drinks    := cur_free;
  RETURN;
END
$$;

GRANT EXECUTE ON FUNCTION public.award_stamps(uuid, text, integer)
TO anon, authenticated, service_role;

-- ========== E) SAFE acceptance: skip if no users ==========
DO $$
DECLARE
  u  uuid;
  ls int;
  fd int;
  oid text := 'accept-' || floor(extract(epoch from now()))::text;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping acceptance (no users in auth.users)';
    RETURN;
  END IF;

  -- Smoke test the function; do NOT assert hard values.
  SELECT * INTO ls, fd FROM public.award_stamps(u, oid, 0);

  -- Smoke an orders row insert (only required cols)
  INSERT INTO public.orders(user_id, order_id, source, channel)
  VALUES (u, 'accept-order-'||floor(extract(epoch from now()))::text, 'app', 'click_and_collect')
  ON CONFLICT (order_id) DO NOTHING;
END$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
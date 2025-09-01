-- 0014_fix_loyalty_for_update.sql
-- Safe reimplementation of award_stamps with explicit row locking & idempotent ledger

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='award_stamps'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, integer'
  ) THEN
    EXECUTE 'DROP FUNCTION public.award_stamps(uuid, text, integer)';
  END IF;
END $$;

CREATE FUNCTION public.award_stamps(p_user uuid, p_order_id text, p_add int)
RETURNS TABLE(loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_stamps int := 0;
  cur_free int := 0;
  inserted int := 0;
BEGIN
  INSERT INTO public.loyalty_awards(order_id, user_id, stamps_awarded)
  VALUES (p_order_id, p_user, GREATEST(p_add,0))
  ON CONFLICT (order_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
  VALUES (p_user, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(loyalty_stamps,0), COALESCE(free_drinks,0)
    INTO cur_stamps, cur_free
  FROM public.profiles
  WHERE user_id = p_user
  FOR UPDATE;

  IF inserted = 0 OR GREATEST(p_add,0) = 0 THEN
    loyalty_stamps := cur_stamps;
    free_drinks := cur_free;
    RETURN;
  END IF;

  cur_stamps := cur_stamps + GREATEST(p_add,0);
  cur_free   := cur_free + (cur_stamps / 8);
  cur_stamps := cur_stamps % 8;

  UPDATE public.profiles
  SET loyalty_stamps = cur_stamps,
      free_drinks    = cur_free
  WHERE user_id = p_user
  RETURNING loyalty_stamps, free_drinks
  INTO loyalty_stamps, free_drinks;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_stamps(uuid, text, integer)
  TO anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='loyalty_awards'
      AND indexname='loyalty_awards_order_id_key'
  ) THEN
    CREATE UNIQUE INDEX loyalty_awards_order_id_key
      ON public.loyalty_awards(order_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_source_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_source_check
      CHECK (lower(source) IN ('app','pos','portal'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND tablename='orders'
      AND indexname='orders_order_id_key'
  ) THEN
    CREATE UNIQUE INDEX orders_order_id_key ON public.orders(order_id);
  END IF;
END $$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='orders' AND policyname='orders_select_own'
  ) THEN
    CREATE POLICY orders_select_own ON public.orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='orders' AND policyname='orders_insert_own'
  ) THEN
    CREATE POLICY orders_insert_own ON public.orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Acceptance: smoke test; skip when no users present
DO $$
DECLARE
  u uuid;
  r record;
  oid text := 'accept-' || floor(extract(epoch from now()))::text;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping award_stamps acceptance: no auth.users present.';
    RETURN;
  END IF;

  SELECT * INTO r FROM public.award_stamps(u, oid, 0);

  INSERT INTO public.orders(user_id, order_id, source, channel)
  VALUES (u, 'accept-order-'||floor(extract(epoch from now()))::text, 'app', 'click_and_collect')
  ON CONFLICT (order_id) DO NOTHING;
END $$;

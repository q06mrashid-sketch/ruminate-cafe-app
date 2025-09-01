-- 0014_fix_loyalty_for_update.sql
-- redefine award_stamps and harden orders constraints/RLS

DROP FUNCTION IF EXISTS public.award_stamps(uuid, text, integer);

CREATE FUNCTION public.award_stamps(
  p_user uuid,
  p_order_id text,
  p_add integer
) RETURNS TABLE(loyalty_stamps int, free_drinks int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_stamps int := 0;
  cur_free   int := 0;
BEGIN
  -- If this order already awarded, return current totals (idempotent)
  IF EXISTS (SELECT 1 FROM public.loyalty_awards WHERE order_id = p_order_id) THEN
    SELECT COALESCE(p.loyalty_stamps,0), COALESCE(p.free_drinks,0)
      INTO loyalty_stamps, free_drinks
    FROM public.profiles AS p
    WHERE p.user_id = p_user;
    loyalty_stamps := COALESCE(loyalty_stamps,0);
    free_drinks    := COALESCE(free_drinks,0);
    RETURN;
  END IF;

  -- Ensure a profile row exists
  INSERT INTO public.profiles AS p (user_id, loyalty_stamps, free_drinks)
  VALUES (p_user, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- If no stamps to add, just read back totals
  IF COALESCE(p_add,0) <= 0 THEN
    SELECT COALESCE(p.loyalty_stamps,0), COALESCE(p.free_drinks,0)
      INTO loyalty_stamps, free_drinks
    FROM public.profiles AS p
    WHERE p.user_id = p_user;
    RETURN;
  END IF;

  -- Add stamps
  UPDATE public.profiles AS p
  SET loyalty_stamps = COALESCE(p.loyalty_stamps,0) + p_add
  WHERE p.user_id = p_user
  RETURNING p.loyalty_stamps, p.free_drinks
  INTO cur_stamps, cur_free;

  -- Roll into free drinks (8 stamps = 1)
  cur_free   := COALESCE(cur_free,0) + (cur_stamps / 8);
  cur_stamps := cur_stamps % 8;

  UPDATE public.profiles AS p
  SET loyalty_stamps = cur_stamps,
      free_drinks    = cur_free
  WHERE p.user_id = p_user;

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

-- tighten orders source invariant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_source_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_source_check
      CHECK (lower(source) IN ('app','pos','portal'));
  END IF;
END $$;

-- ensure unique order_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND indexname = 'orders_order_id_key'
  ) THEN
    CREATE UNIQUE INDEX orders_order_id_key ON public.orders(order_id);
  END IF;
END $$;

-- enable RLS on orders
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
END $$;

-- RLS policies: user can select/insert own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'orders_select_own'
  ) THEN
    CREATE POLICY orders_select_own ON public.orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'orders_insert_own'
  ) THEN
    CREATE POLICY orders_insert_own ON public.orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 0019_fix_loyalty_for_update.sql

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
  inserted   int := 0;
BEGIN
  -- If no stamps to add, ensure profile exists and return current totals
  IF GREATEST(p_add, 0) = 0 THEN
    INSERT INTO public.profiles(user_id, loyalty_stamps, free_drinks)
      VALUES (p_user, 0, 0)
      ON CONFLICT (user_id) DO NOTHING;

    SELECT COALESCE(loyalty_stamps,0), COALESCE(free_drinks,0)
      INTO loyalty_stamps, free_drinks
    FROM public.profiles
    WHERE user_id = p_user;

    RETURN;
  END IF;

  -- ledger row for idempotency
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

  IF inserted = 0 THEN
    loyalty_stamps := cur_stamps;
    free_drinks    := cur_free;
    RETURN;
  END IF;

  -- Add stamps and roll into free drinks (8 stamps = 1)
  cur_stamps := cur_stamps + GREATEST(p_add,0);
  cur_free   := cur_free + (cur_stamps / 8);
  cur_stamps := cur_stamps % 8;

  UPDATE public.profiles
  SET loyalty_stamps = cur_stamps,
      free_drinks    = cur_free
  WHERE user_id = p_user;

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


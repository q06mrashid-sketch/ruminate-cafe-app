CREATE OR REPLACE FUNCTION public.award_stamps(
  p_user uuid,
  p_order_id uuid,
  p_add integer
)
RETURNS TABLE(updated_stamps integer, updated_free_drinks integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total integer;
  to_mint integer;
  remainder integer;
BEGIN
  -- record new stamps entry
  INSERT INTO loyalty_stamps(user_id, stamps)
  VALUES (p_user, p_add);

  SELECT COALESCE(SUM(stamps),0) INTO total
  FROM loyalty_stamps WHERE user_id = p_user;

  to_mint := total / 8;
  remainder := MOD(total, 8);

  IF total <> remainder THEN
    DELETE FROM loyalty_stamps WHERE user_id = p_user;
    IF remainder > 0 THEN
      INSERT INTO loyalty_stamps(user_id, stamps) VALUES (p_user, remainder);
    END IF;
  END IF;

  IF to_mint > 0 THEN
    INSERT INTO drink_vouchers(user_id, code)
    SELECT p_user, gen_random_uuid() FROM generate_series(1, to_mint);
  END IF;

  RETURN QUERY
  SELECT remainder,
    (SELECT COUNT(*) FROM drink_vouchers WHERE user_id = p_user AND redeemed = false);
END;
$$;

-- Ajouter loyalty_points_per_euro au retour de get_customer_loyalty

DROP FUNCTION IF EXISTS get_customer_loyalty(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_customer_loyalty(
  p_foodtruck_id UUID,
  p_email TEXT
)
RETURNS TABLE (
  customer_id UUID,
  loyalty_points INTEGER,
  loyalty_threshold INTEGER,
  loyalty_reward INTEGER,
  loyalty_allow_multiple BOOLEAN,
  loyalty_points_per_euro INTEGER,
  loyalty_opt_in BOOLEAN,
  can_redeem BOOLEAN,
  redeemable_count INTEGER,
  max_discount INTEGER,
  progress_percent INTEGER
)
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_foodtruck RECORD;
  v_redeemable_count INTEGER;
  v_max_discount INTEGER;
BEGIN
  -- Récupérer les paramètres du foodtruck
  SELECT f.loyalty_enabled, f.loyalty_threshold, f.loyalty_reward, f.loyalty_allow_multiple, f.loyalty_points_per_euro
  INTO v_foodtruck
  FROM foodtrucks f
  WHERE f.id = p_foodtruck_id;

  IF NOT FOUND OR NOT v_foodtruck.loyalty_enabled THEN
    RETURN;
  END IF;

  -- Récupérer le client
  SELECT c.id, c.loyalty_points, c.loyalty_opt_in
  INTO v_customer
  FROM customers c
  WHERE c.foodtruck_id = p_foodtruck_id
    AND LOWER(c.email) = LOWER(TRIM(p_email));

  IF NOT FOUND THEN
    -- Client pas encore connu, retourner 0 points, loyalty_opt_in = NULL (nouveau)
    RETURN QUERY SELECT
      NULL::UUID,
      0,
      v_foodtruck.loyalty_threshold,
      v_foodtruck.loyalty_reward,
      v_foodtruck.loyalty_allow_multiple,
      v_foodtruck.loyalty_points_per_euro,
      NULL::BOOLEAN,  -- NULL = nouveau client
      FALSE,
      0,
      0,
      0;
    RETURN;
  END IF;

  -- Calculer le nombre de récompenses utilisables (seulement si opt-in)
  IF COALESCE(v_customer.loyalty_opt_in, FALSE) THEN
    IF v_foodtruck.loyalty_allow_multiple THEN
      v_redeemable_count := FLOOR(v_customer.loyalty_points::DECIMAL / v_foodtruck.loyalty_threshold);
    ELSE
      v_redeemable_count := CASE WHEN v_customer.loyalty_points >= v_foodtruck.loyalty_threshold THEN 1 ELSE 0 END;
    END IF;
  ELSE
    v_redeemable_count := 0;
  END IF;

  v_max_discount := v_redeemable_count * v_foodtruck.loyalty_reward;

  RETURN QUERY SELECT
    v_customer.id,
    v_customer.loyalty_points,
    v_foodtruck.loyalty_threshold,
    v_foodtruck.loyalty_reward,
    v_foodtruck.loyalty_allow_multiple,
    v_foodtruck.loyalty_points_per_euro,
    v_customer.loyalty_opt_in,
    COALESCE(v_customer.loyalty_opt_in, FALSE) AND v_customer.loyalty_points >= v_foodtruck.loyalty_threshold,
    v_redeemable_count,
    v_max_discount,
    CASE WHEN COALESCE(v_customer.loyalty_opt_in, FALSE)
      THEN LEAST(100, FLOOR(v_customer.loyalty_points * 100.0 / v_foodtruck.loyalty_threshold)::INTEGER)
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

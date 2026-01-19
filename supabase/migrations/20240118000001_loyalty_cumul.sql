-- ============================================
-- CUMUL DES RÉCOMPENSES FIDÉLITÉ
-- Permet d'utiliser plusieurs récompenses en même temps
-- ============================================

-- Ajouter l'option de cumul au foodtruck
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS loyalty_allow_multiple BOOLEAN DEFAULT TRUE;

-- Supprimer l'ancienne fonction pour pouvoir changer le type de retour
DROP FUNCTION IF EXISTS get_customer_loyalty(UUID, TEXT);

-- Mettre à jour la fonction get_customer_loyalty pour retourner le nombre de récompenses disponibles
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
  SELECT f.loyalty_enabled, f.loyalty_threshold, f.loyalty_reward, f.loyalty_allow_multiple
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
    v_customer.loyalty_opt_in,  -- TRUE = déjà accepté, FALSE = a refusé, NULL = jamais demandé
    COALESCE(v_customer.loyalty_opt_in, FALSE) AND v_customer.loyalty_points >= v_foodtruck.loyalty_threshold,
    v_redeemable_count,
    v_max_discount,
    CASE WHEN COALESCE(v_customer.loyalty_opt_in, FALSE)
      THEN LEAST(100, FLOOR(v_customer.loyalty_points * 100.0 / v_foodtruck.loyalty_threshold)::INTEGER)
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancienne fonction pour pouvoir changer la signature
DROP FUNCTION IF EXISTS redeem_loyalty_reward(UUID, UUID, INTEGER);

-- Mettre à jour la fonction redeem_loyalty_reward pour gérer le cumul
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_customer_id UUID,
  p_order_id UUID,
  p_threshold INTEGER,
  p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_points INTEGER;
  v_points_to_deduct INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Calculer les points à déduire
  v_points_to_deduct := p_threshold * p_count;

  -- Vérifier le solde actuel
  SELECT loyalty_points INTO v_current_points
  FROM customers
  WHERE id = p_customer_id;

  IF v_current_points < v_points_to_deduct THEN
    RETURN FALSE;
  END IF;

  -- Déduire les points
  UPDATE customers
  SET loyalty_points = loyalty_points - v_points_to_deduct,
      updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING loyalty_points INTO v_new_balance;

  -- Enregistrer la transaction
  INSERT INTO loyalty_transactions (customer_id, order_id, type, points, balance_after, description)
  VALUES (p_customer_id, p_order_id, 'redeem', -v_points_to_deduct, v_new_balance,
    CASE WHEN p_count > 1
      THEN 'Récompense fidélité x' || p_count
      ELSE 'Récompense fidélité'
    END);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les grants
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, UUID, INTEGER, INTEGER) TO authenticated;

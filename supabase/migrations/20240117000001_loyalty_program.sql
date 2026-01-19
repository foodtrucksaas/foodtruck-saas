-- ============================================
-- PROGRAMME DE FIDÉLITÉ
-- Système de points avec seuil et récompense
-- ============================================

-- Ajouter les paramètres fidélité au foodtruck
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS loyalty_points_per_euro INTEGER DEFAULT 1;
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS loyalty_threshold INTEGER DEFAULT 50;
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS loyalty_reward INTEGER DEFAULT 500; -- en centimes (500 = 5€)

-- Ajouter les points fidélité aux clients
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0; -- total points gagnés (stats)

-- Historique des transactions de points
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL, -- positif pour earn, négatif pour redeem
  balance_after INTEGER NOT NULL, -- solde après transaction

  description TEXT, -- ex: "Commande #123" ou "Récompense utilisée"

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_order ON loyalty_transactions(order_id);

-- Fonction pour créditer des points après une commande
CREATE OR REPLACE FUNCTION credit_loyalty_points(
  p_customer_id UUID,
  p_order_id UUID,
  p_order_amount INTEGER, -- en centimes
  p_points_per_euro INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  v_points_earned INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Calculer les points (1 point par euro dépensé)
  v_points_earned := FLOOR(p_order_amount / 100.0) * p_points_per_euro;

  IF v_points_earned <= 0 THEN
    RETURN 0;
  END IF;

  -- Mettre à jour le solde client
  UPDATE customers
  SET loyalty_points = loyalty_points + v_points_earned,
      lifetime_points = lifetime_points + v_points_earned,
      updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING loyalty_points INTO v_new_balance;

  -- Enregistrer la transaction
  INSERT INTO loyalty_transactions (customer_id, order_id, type, points, balance_after, description)
  VALUES (p_customer_id, p_order_id, 'earn', v_points_earned, v_new_balance, 'Points commande');

  RETURN v_points_earned;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour utiliser une récompense
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_customer_id UUID,
  p_order_id UUID,
  p_threshold INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_points INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Vérifier le solde actuel
  SELECT loyalty_points INTO v_current_points
  FROM customers
  WHERE id = p_customer_id;

  IF v_current_points < p_threshold THEN
    RETURN FALSE;
  END IF;

  -- Déduire les points
  UPDATE customers
  SET loyalty_points = loyalty_points - p_threshold,
      updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING loyalty_points INTO v_new_balance;

  -- Enregistrer la transaction
  INSERT INTO loyalty_transactions (customer_id, order_id, type, points, balance_after, description)
  VALUES (p_customer_id, p_order_id, 'redeem', -p_threshold, v_new_balance, 'Récompense fidélité');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les infos fidélité d'un client par email
CREATE OR REPLACE FUNCTION get_customer_loyalty(
  p_foodtruck_id UUID,
  p_email TEXT
)
RETURNS TABLE (
  customer_id UUID,
  loyalty_points INTEGER,
  loyalty_threshold INTEGER,
  loyalty_reward INTEGER,
  can_redeem BOOLEAN,
  progress_percent INTEGER
)
SECURITY DEFINER
AS $$
DECLARE
  v_customer RECORD;
  v_foodtruck RECORD;
BEGIN
  -- Récupérer les paramètres du foodtruck
  SELECT f.loyalty_enabled, f.loyalty_threshold, f.loyalty_reward
  INTO v_foodtruck
  FROM foodtrucks f
  WHERE f.id = p_foodtruck_id;

  IF NOT FOUND OR NOT v_foodtruck.loyalty_enabled THEN
    RETURN;
  END IF;

  -- Récupérer le client
  SELECT c.id, c.loyalty_points
  INTO v_customer
  FROM customers c
  WHERE c.foodtruck_id = p_foodtruck_id
    AND LOWER(c.email) = LOWER(TRIM(p_email));

  IF NOT FOUND THEN
    -- Client pas encore connu, retourner 0 points
    RETURN QUERY SELECT
      NULL::UUID,
      0,
      v_foodtruck.loyalty_threshold,
      v_foodtruck.loyalty_reward,
      FALSE,
      0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_customer.id,
    v_customer.loyalty_points,
    v_foodtruck.loyalty_threshold,
    v_foodtruck.loyalty_reward,
    v_customer.loyalty_points >= v_foodtruck.loyalty_threshold,
    LEAST(100, FLOOR(v_customer.loyalty_points * 100.0 / v_foodtruck.loyalty_threshold)::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foodtruck owners can view their loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN foodtrucks f ON f.id = c.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

GRANT ALL ON loyalty_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION credit_loyalty_points(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_loyalty(UUID, TEXT) TO authenticated, anon;

-- ============================================
-- TRIGGER: Créditer points quand commande confirmée
-- ============================================

CREATE OR REPLACE FUNCTION credit_loyalty_on_order_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_foodtruck RECORD;
  v_customer_id UUID;
BEGIN
  -- Seulement pour les commandes cash (les cartes sont gérées par le webhook Stripe)
  IF NEW.payment_method != 'cash' THEN
    RETURN NEW;
  END IF;

  -- Récupérer les paramètres fidélité du foodtruck
  SELECT loyalty_enabled, loyalty_points_per_euro
  INTO v_foodtruck
  FROM foodtrucks
  WHERE id = NEW.foodtruck_id;

  IF NOT FOUND OR NOT v_foodtruck.loyalty_enabled THEN
    RETURN NEW;
  END IF;

  -- Trouver le client
  SELECT id INTO v_customer_id
  FROM customers
  WHERE foodtruck_id = NEW.foodtruck_id
    AND email = LOWER(TRIM(NEW.customer_email));

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Créditer les points
  PERFORM credit_loyalty_points(
    v_customer_id,
    NEW.id,
    NEW.total_amount,
    v_foodtruck.loyalty_points_per_euro
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger quand une commande passe de pending à confirmed
CREATE TRIGGER trigger_loyalty_on_order_confirmed
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'confirmed')
  EXECUTE FUNCTION credit_loyalty_on_order_confirmed();

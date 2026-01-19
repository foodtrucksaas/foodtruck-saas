-- ============================================
-- FORMULES / DEALS
-- Système de promotions automatiques (3 pizzas = boisson offerte, etc.)
-- ============================================

-- Type de récompense
CREATE TYPE deal_reward_type AS ENUM ('free_item', 'percentage', 'fixed');

-- Table des formules
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                           -- "3 pizzas = boisson offerte"
  description TEXT,                              -- Description optionnelle

  -- Condition de déclenchement
  trigger_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  trigger_quantity INTEGER NOT NULL DEFAULT 2,   -- Nombre d'articles requis

  -- Récompense (un seul type à la fois)
  reward_type deal_reward_type NOT NULL,
  reward_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,  -- Si free_item
  reward_value INTEGER,                          -- % ou centimes (si percentage/fixed)

  -- Options
  stackable BOOLEAN DEFAULT FALSE,               -- Cumulable avec codes promo
  is_active BOOLEAN DEFAULT TRUE,

  -- Stats
  times_used INTEGER DEFAULT 0,
  total_discount_given INTEGER DEFAULT 0,        -- Total économisé par les clients

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_foodtruck ON deals(foodtruck_id);
CREATE INDEX idx_deals_active ON deals(foodtruck_id) WHERE is_active = TRUE;

-- Historique des utilisations
CREATE TABLE deal_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT,
  discount_applied INTEGER NOT NULL,             -- Réduction appliquée (centimes)
  free_item_name TEXT,                           -- Nom de l'article offert (si applicable)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(deal_id, order_id)
);

CREATE INDEX idx_deal_uses_deal ON deal_uses(deal_id);

-- Ajouter colonne deal_id à orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deal_discount INTEGER DEFAULT 0;

-- ============================================
-- FONCTION DE DETECTION DES DEALS
-- Retourne les deals applicables pour un panier donné
-- ============================================

CREATE OR REPLACE FUNCTION get_applicable_deals(
  p_foodtruck_id UUID,
  p_cart_items JSONB  -- [{"category_id": "uuid", "quantity": 2, "menu_item_id": "uuid", "price": 1000}, ...]
)
RETURNS TABLE (
  deal_id UUID,
  deal_name TEXT,
  reward_type deal_reward_type,
  reward_item_id UUID,
  reward_item_name TEXT,
  reward_item_price INTEGER,
  reward_value INTEGER,
  calculated_discount INTEGER,
  trigger_category_name TEXT,
  trigger_quantity INTEGER,
  is_applicable BOOLEAN,
  items_in_cart INTEGER,
  items_needed INTEGER
) AS $$
DECLARE
  v_deal RECORD;
  v_category_count INTEGER;
  v_reward_item RECORD;
  v_category_name TEXT;
  v_calculated_discount INTEGER;
  v_cart_total INTEGER;
BEGIN
  -- Calculer le total du panier
  SELECT COALESCE(SUM((item->>'price')::INTEGER * (item->>'quantity')::INTEGER), 0)
  INTO v_cart_total
  FROM jsonb_array_elements(p_cart_items) AS item;

  -- Parcourir tous les deals actifs du foodtruck
  FOR v_deal IN
    SELECT d.*, c.name as category_name
    FROM deals d
    LEFT JOIN categories c ON c.id = d.trigger_category_id
    WHERE d.foodtruck_id = p_foodtruck_id
      AND d.is_active = TRUE
  LOOP
    -- Compter les articles de la catégorie dans le panier
    SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
    INTO v_category_count
    FROM jsonb_array_elements(p_cart_items) AS item
    WHERE (item->>'category_id')::UUID = v_deal.trigger_category_id;

    -- Récupérer les infos de l'article offert si applicable
    v_reward_item := NULL;
    IF v_deal.reward_type = 'free_item' AND v_deal.reward_item_id IS NOT NULL THEN
      SELECT id, name, price INTO v_reward_item
      FROM menu_items
      WHERE id = v_deal.reward_item_id;
    END IF;

    -- Calculer la réduction
    v_calculated_discount := 0;
    IF v_category_count >= v_deal.trigger_quantity THEN
      CASE v_deal.reward_type
        WHEN 'free_item' THEN
          IF v_reward_item.price IS NOT NULL THEN
            v_calculated_discount := v_reward_item.price;
          END IF;
        WHEN 'percentage' THEN
          v_calculated_discount := (v_cart_total * v_deal.reward_value / 100);
        WHEN 'fixed' THEN
          v_calculated_discount := LEAST(v_deal.reward_value, v_cart_total);
      END CASE;
    END IF;

    RETURN QUERY SELECT
      v_deal.id,
      v_deal.name,
      v_deal.reward_type,
      v_deal.reward_item_id,
      v_reward_item.name,
      v_reward_item.price,
      v_deal.reward_value,
      v_calculated_discount,
      v_deal.category_name,
      v_deal.trigger_quantity,
      v_category_count >= v_deal.trigger_quantity,
      v_category_count,
      GREATEST(v_deal.trigger_quantity - v_category_count, 0);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION POUR APPLIQUER UN DEAL
-- ============================================

CREATE OR REPLACE FUNCTION apply_deal(
  p_deal_id UUID,
  p_order_id UUID,
  p_customer_email TEXT,
  p_discount_applied INTEGER,
  p_free_item_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Enregistrer l'utilisation
  INSERT INTO deal_uses (deal_id, order_id, customer_email, discount_applied, free_item_name)
  VALUES (p_deal_id, p_order_id, p_customer_email, p_discount_applied, p_free_item_name);

  -- Mettre à jour les stats du deal
  UPDATE deals SET
    times_used = times_used + 1,
    total_discount_given = total_discount_given + p_discount_applied,
    updated_at = NOW()
  WHERE id = p_deal_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_uses ENABLE ROW LEVEL SECURITY;

-- Gestionnaires peuvent gérer leurs deals
CREATE POLICY "Foodtruck owners can manage their deals"
  ON deals FOR ALL
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Lecture publique des deals actifs (pour affichage côté client)
CREATE POLICY "Anyone can read active deals"
  ON deals FOR SELECT
  USING (is_active = TRUE);

-- Gestionnaires peuvent voir les utilisations
CREATE POLICY "Foodtruck owners can view deal uses"
  ON deal_uses FOR SELECT
  USING (
    deal_id IN (
      SELECT d.id FROM deals d
      JOIN foodtrucks f ON f.id = d.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Grants
GRANT ALL ON deals TO authenticated;
GRANT SELECT ON deals TO anon;
GRANT ALL ON deal_uses TO authenticated;

GRANT EXECUTE ON FUNCTION get_applicable_deals(UUID, JSONB) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION apply_deal(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated;

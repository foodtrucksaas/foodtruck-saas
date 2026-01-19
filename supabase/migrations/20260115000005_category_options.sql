-- ============================================
-- RESTRUCTURATION: Options par catégorie
-- Les options (tailles, suppléments) sont maintenant au niveau catégorie
-- et s'appliquent à tous les articles de cette catégorie
-- ============================================

-- ============================================
-- NOUVELLES TABLES
-- ============================================

-- Groupes d'options par catégorie (ex: "Taille", "Suppléments")
CREATE TABLE category_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,  -- true = option obligatoire (taille)
  is_multiple BOOLEAN DEFAULT FALSE,  -- true = plusieurs choix possibles (suppléments)
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_category_option_groups_category ON category_option_groups(category_id);

-- Options individuelles (ex: "S", "M", "L" ou "Champignons", "Olives")
CREATE TABLE category_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id UUID NOT NULL REFERENCES category_option_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier INTEGER DEFAULT 0,  -- En centimes (+200 = +2€)
  is_available BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_category_options_group ON category_options(option_group_id);

-- ============================================
-- MISE À JOUR DEALS
-- Ajouter la possibilité de filtrer par option
-- ============================================

ALTER TABLE deals ADD COLUMN IF NOT EXISTS trigger_option_id UUID REFERENCES category_options(id) ON DELETE SET NULL;

-- ============================================
-- MISE À JOUR ORDER_ITEM_OPTIONS
-- Référencer les options de catégorie
-- ============================================

ALTER TABLE order_item_options ADD COLUMN IF NOT EXISTS category_option_id UUID REFERENCES category_options(id) ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE category_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_options ENABLE ROW LEVEL SECURITY;

-- category_option_groups: Lecture publique, écriture par owner
CREATE POLICY "Public can view category option groups" ON category_option_groups
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage category option groups" ON category_option_groups
  FOR ALL USING (
    category_id IN (
      SELECT c.id FROM categories c
      JOIN foodtrucks ft ON c.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

-- category_options: Lecture publique, écriture par owner
CREATE POLICY "Public can view category options" ON category_options
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage category options" ON category_options
  FOR ALL USING (
    option_group_id IN (
      SELECT cog.id FROM category_option_groups cog
      JOIN categories c ON cog.category_id = c.id
      JOIN foodtrucks ft ON c.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON category_option_groups TO anon;
GRANT ALL ON category_option_groups TO authenticated;

GRANT SELECT ON category_options TO anon;
GRANT ALL ON category_options TO authenticated;

-- ============================================
-- MISE À JOUR FONCTION get_applicable_deals
-- Pour supporter le filtrage par option
-- ============================================

DROP FUNCTION IF EXISTS get_applicable_deals(UUID, JSONB);

CREATE OR REPLACE FUNCTION get_applicable_deals(
  p_foodtruck_id UUID,
  p_cart_items JSONB
  -- Format: [{"category_id": "uuid", "quantity": 2, "menu_item_id": "uuid", "price": 1000, "name": "Pizza", "selected_option_ids": ["uuid1", "uuid2"]}, ...]
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
  trigger_option_name TEXT,
  is_applicable BOOLEAN,
  items_in_cart INTEGER,
  items_needed INTEGER,
  cheapest_item_name TEXT
) AS $$
DECLARE
  v_deal RECORD;
  v_category_count INTEGER;
  v_reward_item RECORD;
  v_category_name TEXT;
  v_option_name TEXT;
  v_calculated_discount INTEGER;
  v_cart_total INTEGER;
  v_cheapest_item RECORD;
BEGIN
  -- Calculer le total du panier
  SELECT COALESCE(SUM((item->>'price')::INTEGER * (item->>'quantity')::INTEGER), 0)
  INTO v_cart_total
  FROM jsonb_array_elements(p_cart_items) AS item;

  -- Parcourir tous les deals actifs du foodtruck
  FOR v_deal IN
    SELECT d.*, c.name as category_name, co.name as option_name
    FROM deals d
    LEFT JOIN categories c ON c.id = d.trigger_category_id
    LEFT JOIN category_options co ON co.id = d.trigger_option_id
    WHERE d.foodtruck_id = p_foodtruck_id
      AND d.is_active = TRUE
  LOOP
    -- Compter les articles de la catégorie dans le panier
    -- Si une option est spécifiée, filtrer par cette option
    IF v_deal.trigger_option_id IS NOT NULL THEN
      SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
      INTO v_category_count
      FROM jsonb_array_elements(p_cart_items) AS item
      WHERE (item->>'category_id')::UUID = v_deal.trigger_category_id
        AND item->'selected_option_ids' ? v_deal.trigger_option_id::TEXT;
    ELSE
      SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
      INTO v_category_count
      FROM jsonb_array_elements(p_cart_items) AS item
      WHERE (item->>'category_id')::UUID = v_deal.trigger_category_id;
    END IF;

    -- Récupérer les infos de l'article offert si applicable
    v_reward_item := NULL;
    v_cheapest_item := NULL;

    IF v_deal.reward_type = 'free_item' AND v_deal.reward_item_id IS NOT NULL THEN
      SELECT id, name, price INTO v_reward_item
      FROM menu_items
      WHERE id = v_deal.reward_item_id;
    ELSIF v_deal.reward_type = 'cheapest_in_cart' THEN
      -- Trouver l'article le moins cher de la catégorie dans le panier
      IF v_deal.trigger_option_id IS NOT NULL THEN
        SELECT
          (item->>'menu_item_id')::UUID as id,
          item->>'name' as name,
          (item->>'price')::INTEGER as price
        INTO v_cheapest_item
        FROM jsonb_array_elements(p_cart_items) AS item
        WHERE (item->>'category_id')::UUID = v_deal.trigger_category_id
          AND item->'selected_option_ids' ? v_deal.trigger_option_id::TEXT
        ORDER BY (item->>'price')::INTEGER ASC
        LIMIT 1;
      ELSE
        SELECT
          (item->>'menu_item_id')::UUID as id,
          item->>'name' as name,
          (item->>'price')::INTEGER as price
        INTO v_cheapest_item
        FROM jsonb_array_elements(p_cart_items) AS item
        WHERE (item->>'category_id')::UUID = v_deal.trigger_category_id
        ORDER BY (item->>'price')::INTEGER ASC
        LIMIT 1;
      END IF;
    END IF;

    -- Calculer la réduction
    v_calculated_discount := 0;
    IF v_category_count >= v_deal.trigger_quantity THEN
      CASE v_deal.reward_type
        WHEN 'free_item' THEN
          IF v_reward_item.price IS NOT NULL THEN
            v_calculated_discount := v_reward_item.price;
          END IF;
        WHEN 'cheapest_in_cart' THEN
          IF v_cheapest_item.price IS NOT NULL THEN
            v_calculated_discount := v_cheapest_item.price;
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
      COALESCE(v_reward_item.name, v_cheapest_item.name),
      COALESCE(v_reward_item.price, v_cheapest_item.price),
      v_deal.reward_value,
      v_calculated_discount,
      v_deal.category_name,
      v_deal.trigger_quantity,
      v_deal.option_name,
      v_category_count >= v_deal.trigger_quantity,
      v_category_count,
      GREATEST(v_deal.trigger_quantity - v_category_count, 0),
      v_cheapest_item.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_applicable_deals(UUID, JSONB) TO authenticated, anon;

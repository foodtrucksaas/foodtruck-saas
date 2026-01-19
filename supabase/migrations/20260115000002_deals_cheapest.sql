-- ============================================
-- AMÉLIORATION FORMULES : Article le moins cher offert
-- Ex: "4 pizzas achetées = la moins chère offerte"
-- ============================================

-- Ajouter le nouveau type de récompense
ALTER TYPE deal_reward_type ADD VALUE IF NOT EXISTS 'cheapest_in_cart';

-- Supprimer l'ancienne fonction pour pouvoir changer le type de retour
DROP FUNCTION IF EXISTS get_applicable_deals(UUID, JSONB);

-- Recréer la fonction de détection des deals
CREATE OR REPLACE FUNCTION get_applicable_deals(
  p_foodtruck_id UUID,
  p_cart_items JSONB  -- [{"category_id": "uuid", "quantity": 2, "menu_item_id": "uuid", "price": 1000, "name": "Pizza Margherita"}, ...]
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
  items_needed INTEGER,
  cheapest_item_name TEXT
) AS $$
DECLARE
  v_deal RECORD;
  v_category_count INTEGER;
  v_reward_item RECORD;
  v_category_name TEXT;
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
    v_cheapest_item := NULL;

    IF v_deal.reward_type = 'free_item' AND v_deal.reward_item_id IS NOT NULL THEN
      SELECT id, name, price INTO v_reward_item
      FROM menu_items
      WHERE id = v_deal.reward_item_id;
    ELSIF v_deal.reward_type = 'cheapest_in_cart' THEN
      -- Trouver l'article le moins cher de la catégorie dans le panier
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
      v_category_count >= v_deal.trigger_quantity,
      v_category_count,
      GREATEST(v_deal.trigger_quantity - v_category_count, 0),
      v_cheapest_item.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

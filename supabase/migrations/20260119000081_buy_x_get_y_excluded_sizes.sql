-- Update get_applicable_offers to support excluded items and sizes for buy_x_get_y
-- Now supports:
-- - trigger_excluded_items / trigger_excluded_sizes: items/sizes NOT eligible as triggers
-- - reward_excluded_items / reward_excluded_sizes: items/sizes NOT eligible as rewards

CREATE OR REPLACE FUNCTION get_applicable_offers(
  p_foodtruck_id UUID,
  p_cart_items JSONB,  -- [{"menu_item_id": "uuid", "category_id": "uuid", "quantity": 2, "price": 1000, "size_id": "uuid"}, ...]
  p_order_amount INTEGER,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  offer_id UUID,
  offer_name TEXT,
  offer_type offer_type,
  calculated_discount INTEGER,
  free_item_name TEXT,
  is_applicable BOOLEAN,
  progress_current INTEGER,
  progress_required INTEGER,
  description TEXT
) AS $$
DECLARE
  v_offer RECORD;
  v_config JSONB;
  v_calculated_discount INTEGER;
  v_free_item_name TEXT;
  v_is_applicable BOOLEAN;
  v_progress_current INTEGER;
  v_progress_required INTEGER;
  v_current_time TIME;
  v_current_dow INTEGER;
  v_trigger_count INTEGER;
  v_category_count INTEGER;
  v_reward_item RECORD;
  v_trigger_category_ids UUID[];
  v_reward_category_ids UUID[];
  v_trigger_excluded_items TEXT[];
  v_reward_excluded_items TEXT[];
  v_trigger_excluded_sizes JSONB;
  v_reward_excluded_sizes JSONB;
BEGIN
  v_current_time := CURRENT_TIME;
  v_current_dow := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;

  -- Parcourir toutes les offres actives du foodtruck
  FOR v_offer IN
    SELECT o.*
    FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
  LOOP
    v_config := v_offer.config;
    v_calculated_discount := 0;
    v_free_item_name := NULL;
    v_is_applicable := FALSE;
    v_progress_current := 0;
    v_progress_required := 0;

    CASE v_offer.offer_type
      -- BUNDLE: prix fixe pour un ensemble d'items
      WHEN 'bundle' THEN
        -- Verifier si tous les items du bundle sont dans le panier
        SELECT COUNT(*) INTO v_trigger_count
        FROM offer_items oi
        WHERE oi.offer_id = v_offer.id
          AND oi.role = 'bundle_item'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_cart_items) AS item
            WHERE (item->>'menu_item_id')::UUID = oi.menu_item_id
              AND (item->>'quantity')::INTEGER >= oi.quantity
          );

        SELECT COUNT(*) INTO v_progress_required
        FROM offer_items oi WHERE oi.offer_id = v_offer.id AND oi.role = 'bundle_item';

        v_progress_current := v_trigger_count;

        IF v_trigger_count >= v_progress_required THEN
          v_is_applicable := TRUE;
          -- Calculer la difference entre prix normal et prix fixe
          SELECT COALESCE(SUM(
            (item->>'price')::INTEGER * LEAST(
              (item->>'quantity')::INTEGER,
              COALESCE((SELECT oi.quantity FROM offer_items oi
                WHERE oi.offer_id = v_offer.id
                AND oi.menu_item_id = (item->>'menu_item_id')::UUID
                AND oi.role = 'bundle_item'), 0)
            )
          ), 0) - COALESCE((v_config->>'fixed_price')::INTEGER, 0)
          INTO v_calculated_discount
          FROM jsonb_array_elements(p_cart_items) AS item
          WHERE EXISTS (
            SELECT 1 FROM offer_items oi
            WHERE oi.offer_id = v_offer.id
              AND oi.role = 'bundle_item'
              AND oi.menu_item_id = (item->>'menu_item_id')::UUID
          );

          IF v_calculated_discount < 0 THEN
            v_calculated_discount := 0;
          END IF;
        END IF;

      -- BUY_X_GET_Y: X achetes = Y offert
      WHEN 'buy_x_get_y' THEN
        v_progress_required := (v_config->>'trigger_quantity')::INTEGER;

        -- Check if category-based or item-based
        IF (v_config->>'type') = 'category_choice' AND v_config->'trigger_category_ids' IS NOT NULL THEN
          -- Category-based: count items from trigger categories
          SELECT ARRAY(
            SELECT jsonb_array_elements_text(v_config->'trigger_category_ids')::UUID
          ) INTO v_trigger_category_ids;

          SELECT ARRAY(
            SELECT jsonb_array_elements_text(v_config->'reward_category_ids')::UUID
          ) INTO v_reward_category_ids;

          -- Get excluded items arrays
          SELECT ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(v_config->'trigger_excluded_items', '[]'::JSONB))
          ) INTO v_trigger_excluded_items;

          SELECT ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(v_config->'reward_excluded_items', '[]'::JSONB))
          ) INTO v_reward_excluded_items;

          -- Get excluded sizes (JSONB object: {itemId: [sizeId1, sizeId2]})
          v_trigger_excluded_sizes := COALESCE(v_config->'trigger_excluded_sizes', '{}'::JSONB);
          v_reward_excluded_sizes := COALESCE(v_config->'reward_excluded_sizes', '{}'::JSONB);

          -- Count items from trigger categories, excluding excluded items and sizes
          SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_trigger_count
          FROM jsonb_array_elements(p_cart_items) AS item
          WHERE (item->>'category_id')::UUID = ANY(v_trigger_category_ids)
            -- Exclude items in trigger_excluded_items
            AND NOT ((item->>'menu_item_id') = ANY(v_trigger_excluded_items))
            -- Exclude sizes in trigger_excluded_sizes (if size_id is provided)
            AND NOT (
              item->>'size_id' IS NOT NULL
              AND v_trigger_excluded_sizes->(item->>'menu_item_id') IS NOT NULL
              AND (item->>'size_id') IN (
                SELECT jsonb_array_elements_text(v_trigger_excluded_sizes->(item->>'menu_item_id'))
              )
            );

          v_progress_current := v_trigger_count;

          IF v_trigger_count >= v_progress_required THEN
            v_is_applicable := TRUE;

            -- Find the cheapest eligible item from reward categories
            SELECT mi.id, mi.name, mi.price INTO v_reward_item
            FROM menu_items mi
            WHERE mi.category_id = ANY(v_reward_category_ids)
              AND mi.is_available = TRUE
              AND mi.foodtruck_id = p_foodtruck_id
              -- Exclude items in reward_excluded_items
              AND NOT (mi.id::TEXT = ANY(v_reward_excluded_items))
            ORDER BY mi.price ASC
            LIMIT 1;

            IF v_reward_item.id IS NOT NULL THEN
              v_free_item_name := v_reward_item.name || ' (au choix)';
              IF (v_config->>'reward_type') = 'free' THEN
                v_calculated_discount := v_reward_item.price * COALESCE((v_config->>'reward_quantity')::INTEGER, 1);
              ELSE
                v_calculated_discount := COALESCE((v_config->>'reward_value')::INTEGER, 0);
              END IF;
            END IF;
          END IF;
        ELSE
          -- Item-based (legacy): count specific trigger items
          SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_trigger_count
          FROM jsonb_array_elements(p_cart_items) AS item
          WHERE EXISTS (
            SELECT 1 FROM offer_items oi
            WHERE oi.offer_id = v_offer.id
              AND oi.role = 'trigger'
              AND oi.menu_item_id = (item->>'menu_item_id')::UUID
          );

          v_progress_current := v_trigger_count;

          IF v_trigger_count >= v_progress_required THEN
            v_is_applicable := TRUE;

            -- Trouver l'item reward
            SELECT mi.id, mi.name, mi.price INTO v_reward_item
            FROM offer_items oi
            JOIN menu_items mi ON mi.id = oi.menu_item_id
            WHERE oi.offer_id = v_offer.id AND oi.role = 'reward'
            LIMIT 1;

            IF v_reward_item.id IS NOT NULL THEN
              v_free_item_name := v_reward_item.name;
              IF (v_config->>'reward_type') = 'free' THEN
                v_calculated_discount := v_reward_item.price * COALESCE((v_config->>'reward_quantity')::INTEGER, 1);
              ELSE
                v_calculated_discount := COALESCE((v_config->>'reward_value')::INTEGER, 0);
              END IF;
            END IF;
          END IF;
        END IF;

      -- HAPPY_HOUR: reduction sur creneau horaire
      WHEN 'happy_hour' THEN
        -- Verifier l'heure et le jour
        IF (v_offer.time_start IS NULL OR v_current_time >= v_offer.time_start)
           AND (v_offer.time_end IS NULL OR v_current_time <= v_offer.time_end)
           AND (v_offer.days_of_week IS NULL OR v_current_dow = ANY(v_offer.days_of_week)) THEN

          v_is_applicable := TRUE;

          IF (v_config->>'applies_to') = 'category' AND (v_config->>'category_id') IS NOT NULL THEN
            -- Reduction uniquement sur une categorie
            SELECT COALESCE(SUM((item->>'price')::INTEGER * (item->>'quantity')::INTEGER), 0)
            INTO v_category_count
            FROM jsonb_array_elements(p_cart_items) AS item
            WHERE (item->>'category_id')::UUID = (v_config->>'category_id')::UUID;

            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (v_category_count * (v_config->>'discount_value')::INTEGER / 100);
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, v_category_count);
            END IF;
          ELSE
            -- Reduction sur tout
            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
            END IF;
          END IF;
        END IF;

      -- PROMO_CODE: traite separement via validate_offer_promo_code
      WHEN 'promo_code' THEN
        IF p_promo_code IS NOT NULL AND UPPER(v_config->>'code') = UPPER(p_promo_code) THEN
          -- Verifier le montant minimum
          IF (v_config->>'min_order_amount')::INTEGER IS NULL
             OR p_order_amount >= (v_config->>'min_order_amount')::INTEGER THEN
            v_is_applicable := TRUE;

            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
              IF (v_config->>'max_discount')::INTEGER IS NOT NULL
                 AND v_calculated_discount > (v_config->>'max_discount')::INTEGER THEN
                v_calculated_discount := (v_config->>'max_discount')::INTEGER;
              END IF;
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
            END IF;
          END IF;
        END IF;

      -- THRESHOLD_DISCOUNT: remise au palier
      WHEN 'threshold_discount' THEN
        v_progress_required := (v_config->>'min_amount')::INTEGER;
        v_progress_current := p_order_amount;

        IF p_order_amount >= v_progress_required THEN
          v_is_applicable := TRUE;

          IF (v_config->>'discount_type') = 'percentage' THEN
            v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
          ELSE
            v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
          END IF;
        END IF;

    END CASE;

    RETURN QUERY SELECT
      v_offer.id,
      v_offer.name,
      v_offer.offer_type,
      v_calculated_discount,
      v_free_item_name,
      v_is_applicable,
      v_progress_current,
      v_progress_required,
      v_offer.description;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

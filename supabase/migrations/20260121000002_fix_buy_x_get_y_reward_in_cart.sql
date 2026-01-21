-- Fix buy_x_get_y: reward discount should only apply if reward item is IN THE CART
-- Previously, it calculated discount based on cheapest menu item, not cart item

CREATE OR REPLACE FUNCTION get_applicable_offers(
  p_foodtruck_id UUID,
  p_cart_items JSONB,
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
  v_cart_reward_item RECORD;
  v_trigger_category_ids UUID[];
  v_reward_category_ids UUID[];
  v_trigger_excluded_items TEXT[];
  v_reward_excluded_items TEXT[];
  v_trigger_excluded_sizes JSONB;
  v_reward_excluded_sizes JSONB;
BEGIN
  v_current_time := CURRENT_TIME;
  v_current_dow := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;

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
      -- BUNDLE
      WHEN 'bundle' THEN
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

      -- BUY_X_GET_Y
      WHEN 'buy_x_get_y' THEN
        v_progress_required := (v_config->>'trigger_quantity')::INTEGER;

        IF (v_config->>'type') = 'category_choice' AND v_config->'trigger_category_ids' IS NOT NULL THEN
          -- Category-based mode
          SELECT ARRAY(
            SELECT jsonb_array_elements_text(v_config->'trigger_category_ids')::UUID
          ) INTO v_trigger_category_ids;

          SELECT ARRAY(
            SELECT jsonb_array_elements_text(v_config->'reward_category_ids')::UUID
          ) INTO v_reward_category_ids;

          SELECT ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(v_config->'trigger_excluded_items', '[]'::JSONB))
          ) INTO v_trigger_excluded_items;

          SELECT ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(v_config->'reward_excluded_items', '[]'::JSONB))
          ) INTO v_reward_excluded_items;

          v_trigger_excluded_sizes := COALESCE(v_config->'trigger_excluded_sizes', '{}'::JSONB);
          v_reward_excluded_sizes := COALESCE(v_config->'reward_excluded_sizes', '{}'::JSONB);

          -- Count trigger items in cart
          SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_trigger_count
          FROM jsonb_array_elements(p_cart_items) AS item
          WHERE (item->>'category_id')::UUID = ANY(v_trigger_category_ids)
            AND NOT ((item->>'menu_item_id') = ANY(v_trigger_excluded_items))
            AND NOT (
              item->>'size_id' IS NOT NULL
              AND v_trigger_excluded_sizes->(item->>'menu_item_id') IS NOT NULL
              AND (item->>'size_id') IN (
                SELECT jsonb_array_elements_text(v_trigger_excluded_sizes->(item->>'menu_item_id'))
              )
            );

          v_progress_current := v_trigger_count;

          IF v_trigger_count >= v_progress_required THEN
            -- FIXED: Find the cheapest reward item IN THE CART (not in the menu)
            SELECT
              (item->>'menu_item_id')::UUID as id,
              mi.name,
              (item->>'price')::INTEGER as price
            INTO v_cart_reward_item
            FROM jsonb_array_elements(p_cart_items) AS item
            JOIN menu_items mi ON mi.id = (item->>'menu_item_id')::UUID
            WHERE (item->>'category_id')::UUID = ANY(v_reward_category_ids)
              AND NOT ((item->>'menu_item_id') = ANY(v_reward_excluded_items))
              AND NOT (
                item->>'size_id' IS NOT NULL
                AND v_reward_excluded_sizes->(item->>'menu_item_id') IS NOT NULL
                AND (item->>'size_id') IN (
                  SELECT jsonb_array_elements_text(v_reward_excluded_sizes->(item->>'menu_item_id'))
                )
              )
            ORDER BY (item->>'price')::INTEGER ASC
            LIMIT 1;

            IF v_cart_reward_item.id IS NOT NULL THEN
              -- Reward item is in cart - offer is applicable
              v_is_applicable := TRUE;
              v_free_item_name := v_cart_reward_item.name;
              IF (v_config->>'reward_type') = 'free' THEN
                v_calculated_discount := v_cart_reward_item.price * COALESCE((v_config->>'reward_quantity')::INTEGER, 1);
              ELSE
                v_calculated_discount := COALESCE((v_config->>'reward_value')::INTEGER, 0);
              END IF;
            ELSE
              -- No reward item in cart - show what they could get
              SELECT mi.name, mi.price INTO v_reward_item
              FROM menu_items mi
              WHERE mi.category_id = ANY(v_reward_category_ids)
                AND mi.is_available = TRUE
                AND mi.foodtruck_id = p_foodtruck_id
                AND NOT (mi.id::TEXT = ANY(v_reward_excluded_items))
              ORDER BY mi.price ASC
              LIMIT 1;

              IF v_reward_item.name IS NOT NULL THEN
                v_free_item_name := v_reward_item.name || ' offert(e) si ajouté(e)';
                -- Don't apply discount yet - reward not in cart
                v_calculated_discount := 0;
                -- Mark as NOT applicable since reward not in cart
                v_is_applicable := FALSE;
              END IF;
            END IF;
          ELSE
            -- Not enough triggers yet - show what they could get
            SELECT mi.name INTO v_free_item_name
            FROM menu_items mi
            WHERE mi.category_id = ANY(v_reward_category_ids)
              AND mi.is_available = TRUE
              AND mi.foodtruck_id = p_foodtruck_id
            ORDER BY mi.price ASC
            LIMIT 1;

            IF v_free_item_name IS NOT NULL THEN
              v_free_item_name := v_free_item_name || ' (au choix)';
            END IF;
          END IF;
        ELSE
          -- Item-based (legacy)
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
            -- Check if reward item is in cart
            SELECT mi.id, mi.name, (item->>'price')::INTEGER as price INTO v_cart_reward_item
            FROM jsonb_array_elements(p_cart_items) AS item
            JOIN menu_items mi ON mi.id = (item->>'menu_item_id')::UUID
            WHERE EXISTS (
              SELECT 1 FROM offer_items oi
              WHERE oi.offer_id = v_offer.id
                AND oi.role = 'reward'
                AND oi.menu_item_id = (item->>'menu_item_id')::UUID
            )
            ORDER BY (item->>'price')::INTEGER ASC
            LIMIT 1;

            IF v_cart_reward_item.id IS NOT NULL THEN
              v_is_applicable := TRUE;
              v_free_item_name := v_cart_reward_item.name;
              IF (v_config->>'reward_type') = 'free' THEN
                v_calculated_discount := v_cart_reward_item.price * COALESCE((v_config->>'reward_quantity')::INTEGER, 1);
              ELSE
                v_calculated_discount := COALESCE((v_config->>'reward_value')::INTEGER, 0);
              END IF;
            ELSE
              -- Reward not in cart
              SELECT mi.name INTO v_free_item_name
              FROM offer_items oi
              JOIN menu_items mi ON mi.id = oi.menu_item_id
              WHERE oi.offer_id = v_offer.id AND oi.role = 'reward'
              LIMIT 1;

              IF v_free_item_name IS NOT NULL THEN
                v_free_item_name := v_free_item_name || ' offert(e) si ajouté(e)';
              END IF;
              v_is_applicable := FALSE;
            END IF;
          END IF;
        END IF;

      -- HAPPY_HOUR
      WHEN 'happy_hour' THEN
        IF (v_offer.time_start IS NULL OR v_current_time >= v_offer.time_start)
           AND (v_offer.time_end IS NULL OR v_current_time <= v_offer.time_end)
           AND (v_offer.days_of_week IS NULL OR v_current_dow = ANY(v_offer.days_of_week)) THEN

          v_is_applicable := TRUE;

          IF (v_config->>'applies_to') = 'category' AND (v_config->>'category_id') IS NOT NULL THEN
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
            IF (v_config->>'discount_type') = 'percentage' THEN
              v_calculated_discount := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
            ELSE
              v_calculated_discount := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
            END IF;
          END IF;
        END IF;

      -- PROMO_CODE
      WHEN 'promo_code' THEN
        IF p_promo_code IS NOT NULL AND UPPER(v_config->>'code') = UPPER(p_promo_code) THEN
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
          ELSE
            v_progress_required := (v_config->>'min_order_amount')::INTEGER;
            v_progress_current := p_order_amount;
          END IF;
        END IF;

      -- THRESHOLD_DISCOUNT
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

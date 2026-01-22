-- Fix: Use item name directly from cart items instead of joining menu_items table

CREATE OR REPLACE FUNCTION get_optimized_offers(
  p_foodtruck_id UUID,
  p_cart_items JSONB,
  p_order_amount INTEGER,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  offer_id UUID,
  offer_name TEXT,
  offer_type offer_type,
  times_applied INTEGER,
  discount_per_application INTEGER,
  calculated_discount INTEGER,
  items_consumed JSONB,
  free_item_name TEXT
) AS $$
DECLARE
  v_offer RECORD;
  v_config JSONB;
  v_discount_per_app INTEGER;
  v_trigger_qty INTEGER;
  v_reward_qty INTEGER;
  v_trigger_category_ids UUID[];
  v_reward_category_ids UUID[];
  v_overlapping_ids UUID[];
  v_has_overlap BOOLEAN;
  v_total_items INTEGER;
  v_max_applications INTEGER;
  v_reward_item_price INTEGER;
  v_reward_item_qty INTEGER;
  v_free_item TEXT;
  v_trigger_count INTEGER;
  v_reward_count INTEGER;
  v_bundle_items_count INTEGER;
  v_bundle_fixed_price INTEGER;
  v_bundle_normal_price INTEGER;
  v_trigger_excluded_items TEXT[];
  v_reward_excluded_items TEXT[];
  v_bundle_savings INTEGER;
BEGIN
  -- Create temporary tables for optimization
  CREATE TEMP TABLE IF NOT EXISTS temp_optimized_offers (
    offer_id UUID,
    offer_name TEXT,
    offer_type offer_type,
    times_applied INTEGER,
    discount_per_application INTEGER,
    calculated_discount INTEGER,
    items_consumed JSONB,
    free_item_name TEXT,
    efficiency DECIMAL,
    priority INTEGER DEFAULT 0
  ) ON COMMIT DROP;

  CREATE TEMP TABLE IF NOT EXISTS temp_remaining_items (
    menu_item_id UUID,
    category_id UUID,
    item_name TEXT,
    price INTEGER,
    quantity INTEGER,
    original_qty INTEGER
  ) ON COMMIT DROP;

  DELETE FROM temp_optimized_offers WHERE TRUE;
  DELETE FROM temp_remaining_items WHERE TRUE;

  -- Initialize remaining items from cart (use name directly from cart items)
  INSERT INTO temp_remaining_items (menu_item_id, category_id, item_name, price, quantity, original_qty)
  SELECT
    (item->>'menu_item_id')::UUID,
    (item->>'category_id')::UUID,
    COALESCE(item->>'name', 'Article'),
    (item->>'price')::INTEGER,
    (item->>'quantity')::INTEGER,
    (item->>'quantity')::INTEGER
  FROM jsonb_array_elements(p_cart_items) AS item;

  -- ============================================
  -- PHASE 1: Process BUNDLE offers (fixed price bundles)
  -- Strategy: Use most expensive items to maximize savings
  -- ============================================
  FOR v_offer IN
    SELECT o.*
    FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'bundle'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
    ORDER BY COALESCE((o.config->>'fixed_price')::INTEGER, 0) DESC
  LOOP
    v_config := v_offer.config;
    v_bundle_fixed_price := COALESCE((v_config->>'fixed_price')::INTEGER, 0);

    -- Check if this is a category-based bundle
    IF v_config->'bundle_categories' IS NOT NULL THEN
      DECLARE
        v_bundle_cat RECORD;
        v_can_apply BOOLEAN := TRUE;
        v_bundle_total INTEGER := 0;
        v_consumed_items JSONB := '[]'::JSONB;
      BEGIN
        FOR v_bundle_cat IN
          SELECT
            (bc->>'category_id')::UUID as cat_id,
            COALESCE((bc->>'quantity')::INTEGER, 1) as required_qty
          FROM jsonb_array_elements(v_config->'bundle_categories') AS bc
        LOOP
          DECLARE
            v_cat_items RECORD;
            v_needed INTEGER := v_bundle_cat.required_qty;
          BEGIN
            FOR v_cat_items IN
              SELECT * FROM temp_remaining_items
              WHERE category_id = v_bundle_cat.cat_id
                AND quantity > 0
              ORDER BY price DESC -- Most expensive first for bundles!
            LOOP
              IF v_needed > 0 THEN
                DECLARE
                  v_take INTEGER := LEAST(v_needed, v_cat_items.quantity);
                BEGIN
                  v_bundle_total := v_bundle_total + (v_cat_items.price * v_take);
                  v_needed := v_needed - v_take;
                  v_consumed_items := v_consumed_items || jsonb_build_array(jsonb_build_object(
                    'menu_item_id', v_cat_items.menu_item_id,
                    'name', v_cat_items.item_name,
                    'quantity', v_take,
                    'price', v_cat_items.price
                  ));
                END;
              END IF;
            END LOOP;

            IF v_needed > 0 THEN
              v_can_apply := FALSE;
            END IF;
          END;
        END LOOP;

        IF v_can_apply THEN
          v_bundle_savings := GREATEST(v_bundle_total - v_bundle_fixed_price, 0);

          IF v_bundle_savings > 0 THEN
            -- Consume items from remaining
            DECLARE
              v_consume_item RECORD;
            BEGIN
              FOR v_consume_item IN SELECT * FROM jsonb_array_elements(v_consumed_items)
              LOOP
                UPDATE temp_remaining_items
                SET quantity = quantity - (v_consume_item.value->>'quantity')::INTEGER
                WHERE menu_item_id = (v_consume_item.value->>'menu_item_id')::UUID;
              END LOOP;
            END;

            INSERT INTO temp_optimized_offers VALUES (
              v_offer.id, v_offer.name, v_offer.offer_type, 1,
              v_bundle_savings, v_bundle_savings, v_consumed_items,
              NULL, v_bundle_savings::DECIMAL, 1
            );
          END IF;
        END IF;
      END;
    ELSE
      -- Specific items bundle (legacy) - skip for now, handled separately
      NULL;
    END IF;
  END LOOP;

  -- ============================================
  -- PHASE 2: Process BUY_X_GET_Y offers with remaining items
  -- Strategy: Free item = cheapest among eligible
  -- ============================================
  FOR v_offer IN
    SELECT o.*
    FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'buy_x_get_y'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
  LOOP
    v_config := v_offer.config;
    v_trigger_qty := COALESCE((v_config->>'trigger_quantity')::INTEGER, 0);
    v_reward_qty := COALESCE((v_config->>'reward_quantity')::INTEGER, 1);
    v_free_item := NULL;
    v_discount_per_app := 0;
    v_max_applications := 0;

    IF (v_config->>'type') = 'category_choice' AND v_config->'trigger_category_ids' IS NOT NULL THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'trigger_category_ids')::UUID) INTO v_trigger_category_ids;
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'reward_category_ids')::UUID) INTO v_reward_category_ids;

      v_trigger_excluded_items := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_config->'trigger_excluded_items', '[]'::JSONB)));
      v_reward_excluded_items := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_config->'reward_excluded_items', '[]'::JSONB)));

      SELECT ARRAY(
        SELECT unnest(v_trigger_category_ids)
        INTERSECT
        SELECT unnest(v_reward_category_ids)
      ) INTO v_overlapping_ids;

      v_has_overlap := (array_length(v_overlapping_ids, 1) > 0);

      IF v_has_overlap THEN
        -- SAME CATEGORY: trigger and reward from same pool
        SELECT COALESCE(SUM(quantity), 0)
        INTO v_total_items
        FROM temp_remaining_items
        WHERE category_id = ANY(v_overlapping_ids)
          AND quantity > 0
          AND NOT (menu_item_id::TEXT = ANY(v_trigger_excluded_items))
          AND NOT (menu_item_id::TEXT = ANY(v_reward_excluded_items));

        v_max_applications := FLOOR(v_total_items::DECIMAL / (v_trigger_qty + v_reward_qty))::INTEGER;

        IF v_max_applications > 0 THEN
          -- Find CHEAPEST item for the free reward
          SELECT price, item_name
          INTO v_reward_item_price, v_free_item
          FROM temp_remaining_items
          WHERE category_id = ANY(v_overlapping_ids)
            AND quantity > 0
            AND NOT (menu_item_id::TEXT = ANY(v_trigger_excluded_items))
            AND NOT (menu_item_id::TEXT = ANY(v_reward_excluded_items))
          ORDER BY price ASC
          LIMIT 1;

          IF v_reward_item_price IS NOT NULL THEN
            IF (v_config->>'reward_type') = 'free' THEN
              v_discount_per_app := v_reward_item_price * v_reward_qty;
            ELSE
              v_discount_per_app := COALESCE((v_config->>'reward_value')::INTEGER, 0);
            END IF;

            -- Consume items
            DECLARE
              v_to_consume INTEGER := (v_trigger_qty + v_reward_qty) * v_max_applications;
              v_consume_item RECORD;
            BEGIN
              FOR v_consume_item IN
                SELECT * FROM temp_remaining_items
                WHERE category_id = ANY(v_overlapping_ids)
                  AND quantity > 0
                  AND NOT (menu_item_id::TEXT = ANY(v_trigger_excluded_items))
                  AND NOT (menu_item_id::TEXT = ANY(v_reward_excluded_items))
                ORDER BY price ASC
              LOOP
                IF v_to_consume > 0 THEN
                  DECLARE
                    v_take INTEGER := LEAST(v_to_consume, v_consume_item.quantity);
                  BEGIN
                    UPDATE temp_remaining_items
                    SET quantity = quantity - v_take
                    WHERE menu_item_id = v_consume_item.menu_item_id;
                    v_to_consume := v_to_consume - v_take;
                  END;
                END IF;
              END LOOP;
            END;
          END IF;
        END IF;
      ELSE
        -- DIFFERENT CATEGORIES
        SELECT COALESCE(SUM(quantity), 0)
        INTO v_trigger_count
        FROM temp_remaining_items
        WHERE category_id = ANY(v_trigger_category_ids)
          AND quantity > 0
          AND NOT (menu_item_id::TEXT = ANY(v_trigger_excluded_items));

        SELECT price, item_name, quantity
        INTO v_reward_item_price, v_free_item, v_reward_item_qty
        FROM temp_remaining_items
        WHERE category_id = ANY(v_reward_category_ids)
          AND quantity > 0
          AND NOT (menu_item_id::TEXT = ANY(v_reward_excluded_items))
        ORDER BY price ASC
        LIMIT 1;

        IF v_reward_item_price IS NOT NULL THEN
          v_reward_count := v_reward_item_qty;
          v_max_applications := LEAST(
            FLOOR(v_trigger_count::DECIMAL / v_trigger_qty)::INTEGER,
            FLOOR(v_reward_count::DECIMAL / v_reward_qty)::INTEGER
          );

          IF v_max_applications > 0 THEN
            IF (v_config->>'reward_type') = 'free' THEN
              v_discount_per_app := v_reward_item_price * v_reward_qty;
            ELSE
              v_discount_per_app := COALESCE((v_config->>'reward_value')::INTEGER, 0);
            END IF;

            -- Consume trigger items
            DECLARE
              v_triggers_to_consume INTEGER := v_trigger_qty * v_max_applications;
              v_consume_item RECORD;
            BEGIN
              FOR v_consume_item IN
                SELECT * FROM temp_remaining_items
                WHERE category_id = ANY(v_trigger_category_ids)
                  AND quantity > 0
                  AND NOT (menu_item_id::TEXT = ANY(v_trigger_excluded_items))
                ORDER BY price DESC
              LOOP
                IF v_triggers_to_consume > 0 THEN
                  DECLARE
                    v_take INTEGER := LEAST(v_triggers_to_consume, v_consume_item.quantity);
                  BEGIN
                    UPDATE temp_remaining_items
                    SET quantity = quantity - v_take
                    WHERE menu_item_id = v_consume_item.menu_item_id;
                    v_triggers_to_consume := v_triggers_to_consume - v_take;
                  END;
                END IF;
              END LOOP;
            END;

            -- Consume reward items
            DECLARE
              v_rewards_to_consume INTEGER := v_reward_qty * v_max_applications;
              v_consume_item RECORD;
            BEGIN
              FOR v_consume_item IN
                SELECT * FROM temp_remaining_items
                WHERE category_id = ANY(v_reward_category_ids)
                  AND quantity > 0
                  AND NOT (menu_item_id::TEXT = ANY(v_reward_excluded_items))
                ORDER BY price ASC
              LOOP
                IF v_rewards_to_consume > 0 THEN
                  DECLARE
                    v_take INTEGER := LEAST(v_rewards_to_consume, v_consume_item.quantity);
                  BEGIN
                    UPDATE temp_remaining_items
                    SET quantity = quantity - v_take
                    WHERE menu_item_id = v_consume_item.menu_item_id;
                    v_rewards_to_consume := v_rewards_to_consume - v_take;
                  END;
                END IF;
              END LOOP;
            END;
          END IF;
        END IF;
      END IF;
    ELSE
      -- Item-based mode (legacy)
      SELECT COALESCE(SUM(tri.quantity), 0) INTO v_trigger_count
      FROM temp_remaining_items tri
      WHERE EXISTS (
        SELECT 1 FROM offer_items oi
        WHERE oi.offer_id = v_offer.id
          AND oi.role = 'trigger'
          AND oi.menu_item_id = tri.menu_item_id
      ) AND tri.quantity > 0;

      IF v_trigger_count >= v_trigger_qty THEN
        SELECT tri.item_name, tri.price, tri.quantity
        INTO v_free_item, v_reward_item_price, v_reward_item_qty
        FROM temp_remaining_items tri
        WHERE EXISTS (
          SELECT 1 FROM offer_items oi
          WHERE oi.offer_id = v_offer.id
            AND oi.role = 'reward'
            AND oi.menu_item_id = tri.menu_item_id
        ) AND tri.quantity > 0
        ORDER BY tri.price ASC
        LIMIT 1;

        IF v_free_item IS NOT NULL THEN
          v_max_applications := LEAST(
            FLOOR(v_trigger_count::DECIMAL / v_trigger_qty)::INTEGER,
            FLOOR(v_reward_item_qty::DECIMAL / v_reward_qty)::INTEGER
          );

          IF v_max_applications > 0 THEN
            IF (v_config->>'reward_type') = 'free' THEN
              v_discount_per_app := v_reward_item_price * v_reward_qty;
            ELSE
              v_discount_per_app := COALESCE((v_config->>'reward_value')::INTEGER, 0);
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;

    IF v_max_applications > 0 AND v_discount_per_app > 0 THEN
      INSERT INTO temp_optimized_offers VALUES (
        v_offer.id, v_offer.name, v_offer.offer_type, v_max_applications,
        v_discount_per_app, v_discount_per_app * v_max_applications, '[]'::JSONB,
        v_free_item, v_discount_per_app::DECIMAL / GREATEST(v_trigger_qty + v_reward_qty, 1), 2
      );
    END IF;
  END LOOP;

  -- ============================================
  -- PHASE 3: Process THRESHOLD_DISCOUNT offers
  -- ============================================
  FOR v_offer IN
    SELECT o.*
    FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'threshold_discount'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
  LOOP
    v_config := v_offer.config;

    IF p_order_amount >= COALESCE((v_config->>'min_amount')::INTEGER, 0) THEN
      IF (v_config->>'discount_type') = 'percentage' THEN
        v_discount_per_app := (p_order_amount * COALESCE((v_config->>'discount_value')::INTEGER, 0) / 100);
      ELSE
        v_discount_per_app := LEAST(COALESCE((v_config->>'discount_value')::INTEGER, 0), p_order_amount);
      END IF;

      IF v_discount_per_app > 0 THEN
        INSERT INTO temp_optimized_offers VALUES (
          v_offer.id, v_offer.name, v_offer.offer_type, 1,
          v_discount_per_app, v_discount_per_app, '[]'::JSONB,
          NULL, v_discount_per_app::DECIMAL, 3
        );
      END IF;
    END IF;
  END LOOP;

  -- ============================================
  -- PHASE 4: Process PROMO_CODE offers
  -- ============================================
  IF p_promo_code IS NOT NULL THEN
    FOR v_offer IN
      SELECT o.*
      FROM offers o
      WHERE o.foodtruck_id = p_foodtruck_id
        AND o.is_active = TRUE
        AND o.offer_type = 'promo_code'
        AND (o.start_date IS NULL OR o.start_date <= NOW())
        AND (o.end_date IS NULL OR o.end_date >= NOW())
    LOOP
      v_config := v_offer.config;

      IF UPPER(v_config->>'code') = UPPER(p_promo_code) THEN
        IF p_order_amount >= COALESCE((v_config->>'min_order_amount')::INTEGER, 0) THEN
          IF (v_config->>'discount_type') = 'percentage' THEN
            v_discount_per_app := (p_order_amount * COALESCE((v_config->>'discount_value')::INTEGER, 0) / 100);
            IF (v_config->>'max_discount')::INTEGER IS NOT NULL
               AND v_discount_per_app > (v_config->>'max_discount')::INTEGER THEN
              v_discount_per_app := (v_config->>'max_discount')::INTEGER;
            END IF;
          ELSE
            v_discount_per_app := LEAST(COALESCE((v_config->>'discount_value')::INTEGER, 0), p_order_amount);
          END IF;

          IF v_discount_per_app > 0 THEN
            INSERT INTO temp_optimized_offers VALUES (
              v_offer.id, v_offer.name, v_offer.offer_type, 1,
              v_discount_per_app, v_discount_per_app, '[]'::JSONB,
              NULL, v_discount_per_app::DECIMAL, 4
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Return results sorted by discount (highest first)
  RETURN QUERY
  SELECT
    t.offer_id,
    t.offer_name,
    t.offer_type,
    t.times_applied,
    t.discount_per_application,
    t.calculated_discount,
    t.items_consumed,
    t.free_item_name
  FROM temp_optimized_offers t
  ORDER BY t.calculated_discount DESC;
END;
$$ LANGUAGE plpgsql;

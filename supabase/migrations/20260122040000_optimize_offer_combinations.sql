-- ============================================
-- OFFER OPTIMIZATION ALGORITHM
-- ============================================
-- Enables multiple offers to apply to DIFFERENT items (not stack on same items)
-- Each cart item can only be "consumed" by ONE offer
-- If offers compete for the same items → pick the best one for customer
-- If offers use different items → they ALL apply
-- An offer can apply MULTIPLE TIMES if enough items available
--
-- Algorithm: Greedy optimization
-- 1. Calculate all potentially applicable offers
-- 2. For each offer, determine how many times it CAN apply
-- 3. Sort by discount-per-item-consumed (maximize value)
-- 4. Apply greedily, tracking which items are consumed
-- 5. Non-consuming offers (promo_code, threshold) apply at the end
--
-- Example scenarios:
-- - 3 pizzas + 1 drink: "2 pizzas = 3rd free" vs "pizza + drink = 12€" → pick best
-- - 4 pizzas + 1 drink: "3rd pizza free" (3 pizzas) + "pizza + drink = 12€" (1 pizza + drink) → both
-- - 6 pizzas: "3rd pizza free" applies 2x (6 pizzas total, 2 free)
-- ============================================

-- ============================================
-- MAIN: Optimized offer combination algorithm
-- ============================================
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
  v_available_items JSONB;
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
  v_items_consumed_arr JSONB;
  v_items_to_consume INTEGER;
  v_item JSONB;
  v_item_qty INTEGER;
  v_consumed_qty INTEGER;
  v_reward_item_price INTEGER;
  v_bundle_items_count INTEGER;
  v_bundle_fixed_price INTEGER;
  v_bundle_normal_price INTEGER;
  v_free_item TEXT;
BEGIN
  -- Initialize available items (clone cart with index for tracking)
  v_available_items := p_cart_items;

  -- Create temporary table to store results
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
    is_consuming BOOLEAN,
    items_needed INTEGER
  ) ON COMMIT DROP;

  DELETE FROM temp_optimized_offers;

  -- ============================================
  -- PHASE 1: Evaluate all item-consuming offers
  -- ============================================

  -- Process BUNDLE offers
  FOR v_offer IN
    SELECT o.*
    FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'bundle'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
  LOOP
    v_config := v_offer.config;
    v_bundle_fixed_price := COALESCE((v_config->>'fixed_price')::INTEGER, 0);

    -- Check if all bundle items are in cart
    -- Count bundle items
    SELECT COUNT(*) INTO v_bundle_items_count
    FROM offer_items oi
    WHERE oi.offer_id = v_offer.id AND oi.role = 'bundle_item';

    -- Count matching items in cart
    SELECT COUNT(DISTINCT oi.menu_item_id) INTO v_total_items
    FROM offer_items oi
    WHERE oi.offer_id = v_offer.id
      AND oi.role = 'bundle_item'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_available_items) AS item
        WHERE (item->>'menu_item_id')::UUID = oi.menu_item_id
          AND (item->>'quantity')::INTEGER >= oi.quantity
      );

    IF v_total_items >= v_bundle_items_count THEN
      -- Calculate normal price of bundle items
      SELECT COALESCE(SUM(
        (item->>'price')::INTEGER * LEAST(
          (item->>'quantity')::INTEGER,
          COALESCE((SELECT oi.quantity FROM offer_items oi
            WHERE oi.offer_id = v_offer.id
            AND oi.menu_item_id = (item->>'menu_item_id')::UUID
            AND oi.role = 'bundle_item'), 0)
        )
      ), 0)
      INTO v_bundle_normal_price
      FROM jsonb_array_elements(v_available_items) AS item
      WHERE EXISTS (
        SELECT 1 FROM offer_items oi
        WHERE oi.offer_id = v_offer.id
          AND oi.role = 'bundle_item'
          AND oi.menu_item_id = (item->>'menu_item_id')::UUID
      );

      v_discount_per_app := GREATEST(v_bundle_normal_price - v_bundle_fixed_price, 0);

      IF v_discount_per_app > 0 THEN
        INSERT INTO temp_optimized_offers (
          offer_id, offer_name, offer_type, times_applied,
          discount_per_application, calculated_discount, items_consumed,
          free_item_name, efficiency, is_consuming, items_needed
        ) VALUES (
          v_offer.id, v_offer.name, v_offer.offer_type, 1,
          v_discount_per_app, v_discount_per_app, '[]'::JSONB,
          NULL, v_discount_per_app::DECIMAL / GREATEST(v_bundle_items_count, 1),
          TRUE, v_bundle_items_count
        );
      END IF;
    END IF;
  END LOOP;

  -- Process BUY_X_GET_Y offers
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

    IF (v_config->>'type') = 'category_choice' AND v_config->'trigger_category_ids' IS NOT NULL THEN
      -- Category-based mode
      SELECT ARRAY(
        SELECT jsonb_array_elements_text(v_config->'trigger_category_ids')::UUID
      ) INTO v_trigger_category_ids;

      SELECT ARRAY(
        SELECT jsonb_array_elements_text(v_config->'reward_category_ids')::UUID
      ) INTO v_reward_category_ids;

      -- Check for overlap
      SELECT ARRAY(
        SELECT unnest(v_trigger_category_ids)
        INTERSECT
        SELECT unnest(v_reward_category_ids)
      ) INTO v_overlapping_ids;

      v_has_overlap := (array_length(v_overlapping_ids, 1) > 0);

      IF v_has_overlap THEN
        -- SAME CATEGORY: need trigger_qty + reward_qty items per application
        SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
        INTO v_total_items
        FROM jsonb_array_elements(v_available_items) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_overlapping_ids);

        v_max_applications := FLOOR(v_total_items::DECIMAL / (v_trigger_qty + v_reward_qty))::INTEGER;

        -- Find cheapest item for reward (discount calculation)
        SELECT (item->>'price')::INTEGER, (item->>'name')::TEXT
        INTO v_reward_item_price, v_free_item
        FROM jsonb_array_elements(v_available_items) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_overlapping_ids)
        ORDER BY (item->>'price')::INTEGER ASC
        LIMIT 1;
      ELSE
        -- DIFFERENT CATEGORIES
        DECLARE
          v_trigger_count INTEGER;
          v_reward_count INTEGER;
        BEGIN
          SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
          INTO v_trigger_count
          FROM jsonb_array_elements(v_available_items) AS item
          WHERE (item->>'category_id')::UUID = ANY(v_trigger_category_ids);

          SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
          INTO v_reward_count
          FROM jsonb_array_elements(v_available_items) AS item
          WHERE (item->>'category_id')::UUID = ANY(v_reward_category_ids);

          v_max_applications := LEAST(
            FLOOR(v_trigger_count::DECIMAL / v_trigger_qty)::INTEGER,
            FLOOR(v_reward_count::DECIMAL / v_reward_qty)::INTEGER
          );

          -- Find cheapest reward item
          SELECT (item->>'price')::INTEGER, (item->>'name')::TEXT
          INTO v_reward_item_price, v_free_item
          FROM jsonb_array_elements(v_available_items) AS item
          WHERE (item->>'category_id')::UUID = ANY(v_reward_category_ids)
          ORDER BY (item->>'price')::INTEGER ASC
          LIMIT 1;
        END;
      END IF;

      IF v_max_applications > 0 AND v_reward_item_price IS NOT NULL THEN
        IF (v_config->>'reward_type') = 'free' THEN
          v_discount_per_app := v_reward_item_price * v_reward_qty;
        ELSE
          v_discount_per_app := COALESCE((v_config->>'reward_value')::INTEGER, 0);
        END IF;

        INSERT INTO temp_optimized_offers (
          offer_id, offer_name, offer_type, times_applied,
          discount_per_application, calculated_discount, items_consumed,
          free_item_name, efficiency, is_consuming, items_needed
        ) VALUES (
          v_offer.id, v_offer.name, v_offer.offer_type, v_max_applications,
          v_discount_per_app, v_discount_per_app * v_max_applications, '[]'::JSONB,
          v_free_item, v_discount_per_app::DECIMAL / GREATEST(v_trigger_qty + v_reward_qty, 1),
          TRUE, v_trigger_qty + v_reward_qty
        );
      END IF;
    ELSE
      -- Item-based mode (legacy) - skip for now, handled by existing logic
      NULL;
    END IF;
  END LOOP;

  -- ============================================
  -- PHASE 2: Apply offers greedily (best efficiency first)
  -- Track consumed items and adjust max_applications
  -- ============================================

  FOR v_offer IN
    SELECT * FROM temp_optimized_offers
    WHERE is_consuming = TRUE
    ORDER BY efficiency DESC, calculated_discount DESC
  LOOP
    v_items_consumed_arr := '[]'::JSONB;

    -- Get offer details
    SELECT o.config INTO v_config FROM offers o WHERE o.id = v_offer.offer_id;

    -- Recalculate max applications based on remaining items
    IF v_offer.offer_type = 'bundle' THEN
      -- For bundles, check if all items are still available
      SELECT COUNT(DISTINCT oi.menu_item_id) INTO v_total_items
      FROM offer_items oi
      WHERE oi.offer_id = v_offer.offer_id
        AND oi.role = 'bundle_item'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_available_items) AS item
          WHERE (item->>'menu_item_id')::UUID = oi.menu_item_id
            AND (item->>'quantity')::INTEGER >= oi.quantity
        );

      SELECT COUNT(*) INTO v_bundle_items_count
      FROM offer_items oi WHERE oi.offer_id = v_offer.offer_id AND oi.role = 'bundle_item';

      IF v_total_items < v_bundle_items_count THEN
        v_max_applications := 0;
      ELSE
        v_max_applications := 1;

        -- Consume bundle items
        FOR v_item IN
          SELECT item FROM jsonb_array_elements(v_available_items) AS item
          WHERE EXISTS (
            SELECT 1 FROM offer_items oi
            WHERE oi.offer_id = v_offer.offer_id
              AND oi.role = 'bundle_item'
              AND oi.menu_item_id = (item->>'menu_item_id')::UUID
          )
        LOOP
          SELECT oi.quantity INTO v_consumed_qty
          FROM offer_items oi
          WHERE oi.offer_id = v_offer.offer_id
            AND oi.role = 'bundle_item'
            AND oi.menu_item_id = (v_item->>'menu_item_id')::UUID;

          v_items_consumed_arr := v_items_consumed_arr || jsonb_build_object(
            'menu_item_id', (v_item->>'menu_item_id')::UUID,
            'quantity', v_consumed_qty
          );

          -- Reduce available items
          v_item_qty := (v_item->>'quantity')::INTEGER;
          IF v_consumed_qty >= v_item_qty THEN
            v_available_items := (
              SELECT COALESCE(jsonb_agg(item), '[]'::JSONB)
              FROM jsonb_array_elements(v_available_items) AS item
              WHERE (item->>'menu_item_id')::UUID != (v_item->>'menu_item_id')::UUID
            );
          ELSE
            v_available_items := (
              SELECT COALESCE(jsonb_agg(
                CASE
                  WHEN (item->>'menu_item_id')::UUID = (v_item->>'menu_item_id')::UUID THEN
                    jsonb_set(item, '{quantity}', to_jsonb(v_item_qty - v_consumed_qty))
                  ELSE item
                END
              ), '[]'::JSONB)
              FROM jsonb_array_elements(v_available_items) AS item
            );
          END IF;
        END LOOP;
      END IF;

    ELSIF v_offer.offer_type = 'buy_x_get_y' THEN
      v_trigger_qty := COALESCE((v_config->>'trigger_quantity')::INTEGER, 0);
      v_reward_qty := COALESCE((v_config->>'reward_quantity')::INTEGER, 1);

      IF (v_config->>'type') = 'category_choice' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'trigger_category_ids')::UUID) INTO v_trigger_category_ids;
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'reward_category_ids')::UUID) INTO v_reward_category_ids;

        SELECT ARRAY(
          SELECT unnest(v_trigger_category_ids) INTERSECT SELECT unnest(v_reward_category_ids)
        ) INTO v_overlapping_ids;

        v_has_overlap := (array_length(v_overlapping_ids, 1) > 0);

        IF v_has_overlap THEN
          -- Recalculate max applications
          SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
          INTO v_total_items
          FROM jsonb_array_elements(v_available_items) AS item
          WHERE (item->>'category_id')::UUID = ANY(v_overlapping_ids);

          v_max_applications := FLOOR(v_total_items::DECIMAL / (v_trigger_qty + v_reward_qty))::INTEGER;

          IF v_max_applications > 0 THEN
            v_items_to_consume := (v_trigger_qty + v_reward_qty) * v_max_applications;

            -- Consume items (cheapest first as rewards)
            FOR v_item IN
              SELECT item FROM jsonb_array_elements(v_available_items) AS item
              WHERE (item->>'category_id')::UUID = ANY(v_overlapping_ids)
              ORDER BY (item->>'price')::INTEGER ASC
            LOOP
              EXIT WHEN v_items_to_consume <= 0;

              v_item_qty := (v_item->>'quantity')::INTEGER;
              v_consumed_qty := LEAST(v_item_qty, v_items_to_consume);

              v_items_consumed_arr := v_items_consumed_arr || jsonb_build_object(
                'menu_item_id', (v_item->>'menu_item_id')::UUID,
                'quantity', v_consumed_qty
              );

              v_items_to_consume := v_items_to_consume - v_consumed_qty;

              IF v_consumed_qty >= v_item_qty THEN
                v_available_items := (
                  SELECT COALESCE(jsonb_agg(item), '[]'::JSONB)
                  FROM jsonb_array_elements(v_available_items) AS item
                  WHERE (item->>'menu_item_id')::UUID != (v_item->>'menu_item_id')::UUID
                );
              ELSE
                v_available_items := (
                  SELECT COALESCE(jsonb_agg(
                    CASE
                      WHEN (item->>'menu_item_id')::UUID = (v_item->>'menu_item_id')::UUID THEN
                        jsonb_set(item, '{quantity}', to_jsonb(v_item_qty - v_consumed_qty))
                      ELSE item
                    END
                  ), '[]'::JSONB)
                  FROM jsonb_array_elements(v_available_items) AS item
                );
              END IF;
            END LOOP;
          END IF;
        ELSE
          -- Different categories - consume triggers then rewards
          DECLARE
            v_trigger_count INTEGER;
            v_reward_count INTEGER;
          BEGIN
            SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_trigger_count
            FROM jsonb_array_elements(v_available_items) AS item
            WHERE (item->>'category_id')::UUID = ANY(v_trigger_category_ids);

            SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_reward_count
            FROM jsonb_array_elements(v_available_items) AS item
            WHERE (item->>'category_id')::UUID = ANY(v_reward_category_ids);

            v_max_applications := LEAST(
              FLOOR(v_trigger_count::DECIMAL / v_trigger_qty)::INTEGER,
              FLOOR(v_reward_count::DECIMAL / v_reward_qty)::INTEGER
            );

            IF v_max_applications > 0 THEN
              -- Consume trigger items
              v_items_to_consume := v_trigger_qty * v_max_applications;
              FOR v_item IN
                SELECT item FROM jsonb_array_elements(v_available_items) AS item
                WHERE (item->>'category_id')::UUID = ANY(v_trigger_category_ids)
              LOOP
                EXIT WHEN v_items_to_consume <= 0;
                v_item_qty := (v_item->>'quantity')::INTEGER;
                v_consumed_qty := LEAST(v_item_qty, v_items_to_consume);

                v_items_consumed_arr := v_items_consumed_arr || jsonb_build_object(
                  'menu_item_id', (v_item->>'menu_item_id')::UUID,
                  'quantity', v_consumed_qty
                );
                v_items_to_consume := v_items_to_consume - v_consumed_qty;

                IF v_consumed_qty >= v_item_qty THEN
                  v_available_items := (
                    SELECT COALESCE(jsonb_agg(item), '[]'::JSONB)
                    FROM jsonb_array_elements(v_available_items) AS item
                    WHERE (item->>'menu_item_id')::UUID != (v_item->>'menu_item_id')::UUID
                  );
                ELSE
                  v_available_items := (
                    SELECT COALESCE(jsonb_agg(
                      CASE
                        WHEN (item->>'menu_item_id')::UUID = (v_item->>'menu_item_id')::UUID THEN
                          jsonb_set(item, '{quantity}', to_jsonb(v_item_qty - v_consumed_qty))
                        ELSE item
                      END
                    ), '[]'::JSONB)
                    FROM jsonb_array_elements(v_available_items) AS item
                  );
                END IF;
              END LOOP;

              -- Consume reward items (cheapest first)
              v_items_to_consume := v_reward_qty * v_max_applications;
              FOR v_item IN
                SELECT item FROM jsonb_array_elements(v_available_items) AS item
                WHERE (item->>'category_id')::UUID = ANY(v_reward_category_ids)
                ORDER BY (item->>'price')::INTEGER ASC
              LOOP
                EXIT WHEN v_items_to_consume <= 0;
                v_item_qty := (v_item->>'quantity')::INTEGER;
                v_consumed_qty := LEAST(v_item_qty, v_items_to_consume);

                v_items_consumed_arr := v_items_consumed_arr || jsonb_build_object(
                  'menu_item_id', (v_item->>'menu_item_id')::UUID,
                  'quantity', v_consumed_qty
                );
                v_items_to_consume := v_items_to_consume - v_consumed_qty;

                IF v_consumed_qty >= v_item_qty THEN
                  v_available_items := (
                    SELECT COALESCE(jsonb_agg(item), '[]'::JSONB)
                    FROM jsonb_array_elements(v_available_items) AS item
                    WHERE (item->>'menu_item_id')::UUID != (v_item->>'menu_item_id')::UUID
                  );
                ELSE
                  v_available_items := (
                    SELECT COALESCE(jsonb_agg(
                      CASE
                        WHEN (item->>'menu_item_id')::UUID = (v_item->>'menu_item_id')::UUID THEN
                          jsonb_set(item, '{quantity}', to_jsonb(v_item_qty - v_consumed_qty))
                        ELSE item
                      END
                    ), '[]'::JSONB)
                    FROM jsonb_array_elements(v_available_items) AS item
                  );
                END IF;
              END LOOP;
            END IF;
          END;
        END IF;
      END IF;
    END IF;

    -- Update the result with actual applications
    IF v_max_applications > 0 THEN
      UPDATE temp_optimized_offers
      SET
        times_applied = v_max_applications,
        calculated_discount = discount_per_application * v_max_applications,
        items_consumed = v_items_consumed_arr
      WHERE offer_id = v_offer.offer_id;
    ELSE
      DELETE FROM temp_optimized_offers WHERE offer_id = v_offer.offer_id;
    END IF;
  END LOOP;

  -- ============================================
  -- PHASE 3: Apply non-consuming offers
  -- ============================================

  -- PROMO_CODE
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

    IF p_promo_code IS NOT NULL AND UPPER(v_config->>'code') = UPPER(p_promo_code) THEN
      IF (v_config->>'min_order_amount')::INTEGER IS NULL
         OR p_order_amount >= (v_config->>'min_order_amount')::INTEGER THEN

        IF (v_config->>'discount_type') = 'percentage' THEN
          v_discount_per_app := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
          IF (v_config->>'max_discount')::INTEGER IS NOT NULL
             AND v_discount_per_app > (v_config->>'max_discount')::INTEGER THEN
            v_discount_per_app := (v_config->>'max_discount')::INTEGER;
          END IF;
        ELSE
          v_discount_per_app := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
        END IF;

        INSERT INTO temp_optimized_offers (
          offer_id, offer_name, offer_type, times_applied,
          discount_per_application, calculated_discount, items_consumed,
          free_item_name, efficiency, is_consuming, items_needed
        ) VALUES (
          v_offer.id, v_offer.name, v_offer.offer_type, 1,
          v_discount_per_app, v_discount_per_app, '[]'::JSONB,
          NULL, 999999, FALSE, 0
        );
      END IF;
    END IF;
  END LOOP;

  -- THRESHOLD_DISCOUNT
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

    IF p_order_amount >= (v_config->>'min_amount')::INTEGER THEN
      IF (v_config->>'discount_type') = 'percentage' THEN
        v_discount_per_app := (p_order_amount * (v_config->>'discount_value')::INTEGER / 100);
      ELSE
        v_discount_per_app := LEAST((v_config->>'discount_value')::INTEGER, p_order_amount);
      END IF;

      INSERT INTO temp_optimized_offers (
        offer_id, offer_name, offer_type, times_applied,
        discount_per_application, calculated_discount, items_consumed,
        free_item_name, efficiency, is_consuming, items_needed
      ) VALUES (
        v_offer.id, v_offer.name, v_offer.offer_type, 1,
        v_discount_per_app, v_discount_per_app, '[]'::JSONB,
        NULL, 999999, FALSE, 0
      );
    END IF;
  END LOOP;

  -- ============================================
  -- PHASE 4: Return results
  -- ============================================
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
  WHERE t.times_applied > 0 AND t.calculated_discount > 0
  ORDER BY t.is_consuming DESC, t.calculated_discount DESC;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_optimized_offers TO anon, authenticated, service_role;

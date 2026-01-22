-- Fix DELETE without WHERE clause error

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
BEGIN
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
    efficiency DECIMAL
  ) ON COMMIT DROP;

  -- Clear previous results (fix: add WHERE TRUE)
  DELETE FROM temp_optimized_offers WHERE TRUE;

  -- ============================================
  -- Process BUNDLE offers
  -- ============================================
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

    SELECT COUNT(*) INTO v_bundle_items_count
    FROM offer_items oi
    WHERE oi.offer_id = v_offer.id AND oi.role = 'bundle_item';

    SELECT COUNT(DISTINCT oi.menu_item_id) INTO v_total_items
    FROM offer_items oi
    WHERE oi.offer_id = v_offer.id
      AND oi.role = 'bundle_item'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_cart_items) AS item
        WHERE (item->>'menu_item_id')::UUID = oi.menu_item_id
          AND (item->>'quantity')::INTEGER >= oi.quantity
      );

    IF v_total_items >= v_bundle_items_count THEN
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
      FROM jsonb_array_elements(p_cart_items) AS item
      WHERE EXISTS (
        SELECT 1 FROM offer_items oi
        WHERE oi.offer_id = v_offer.id
          AND oi.role = 'bundle_item'
          AND oi.menu_item_id = (item->>'menu_item_id')::UUID
      );

      v_discount_per_app := GREATEST(v_bundle_normal_price - v_bundle_fixed_price, 0);

      IF v_discount_per_app > 0 THEN
        INSERT INTO temp_optimized_offers VALUES (
          v_offer.id, v_offer.name, v_offer.offer_type, 1,
          v_discount_per_app, v_discount_per_app, '[]'::JSONB,
          NULL, v_discount_per_app::DECIMAL / GREATEST(v_bundle_items_count, 1)
        );
      END IF;
    END IF;
  END LOOP;

  -- ============================================
  -- Process BUY_X_GET_Y offers
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
      -- Category-based mode
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'trigger_category_ids')::UUID) INTO v_trigger_category_ids;
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'reward_category_ids')::UUID) INTO v_reward_category_ids;

      v_trigger_excluded_items := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_config->'trigger_excluded_items', '[]'::JSONB)));
      v_reward_excluded_items := ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_config->'reward_excluded_items', '[]'::JSONB)));

      -- Check for overlap
      SELECT ARRAY(
        SELECT unnest(v_trigger_category_ids)
        INTERSECT
        SELECT unnest(v_reward_category_ids)
      ) INTO v_overlapping_ids;

      v_has_overlap := (array_length(v_overlapping_ids, 1) > 0);

      IF v_has_overlap THEN
        -- SAME CATEGORY
        SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
        INTO v_total_items
        FROM jsonb_array_elements(p_cart_items) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_overlapping_ids)
          AND NOT ((item->>'menu_item_id') = ANY(v_trigger_excluded_items))
          AND NOT ((item->>'menu_item_id') = ANY(v_reward_excluded_items));

        v_max_applications := FLOOR(v_total_items::DECIMAL / (v_trigger_qty + v_reward_qty))::INTEGER;

        IF v_max_applications > 0 THEN
          SELECT (item->>'price')::INTEGER, mi.name
          INTO v_reward_item_price, v_free_item
          FROM jsonb_array_elements(p_cart_items) AS item
          JOIN menu_items mi ON mi.id = (item->>'menu_item_id')::UUID
          WHERE (item->>'category_id')::UUID = ANY(v_overlapping_ids)
            AND NOT ((item->>'menu_item_id') = ANY(v_trigger_excluded_items))
            AND NOT ((item->>'menu_item_id') = ANY(v_reward_excluded_items))
          ORDER BY (item->>'price')::INTEGER ASC
          LIMIT 1;

          IF v_reward_item_price IS NOT NULL THEN
            IF (v_config->>'reward_type') = 'free' THEN
              v_discount_per_app := v_reward_item_price * v_reward_qty;
            ELSE
              v_discount_per_app := COALESCE((v_config->>'reward_value')::INTEGER, 0);
            END IF;
          END IF;
        END IF;
      ELSE
        -- DIFFERENT CATEGORIES
        SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0)
        INTO v_trigger_count
        FROM jsonb_array_elements(p_cart_items) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_trigger_category_ids)
          AND NOT ((item->>'menu_item_id') = ANY(v_trigger_excluded_items));

        SELECT (item->>'price')::INTEGER, mi.name, (item->>'quantity')::INTEGER
        INTO v_reward_item_price, v_free_item, v_reward_item_qty
        FROM jsonb_array_elements(p_cart_items) AS item
        JOIN menu_items mi ON mi.id = (item->>'menu_item_id')::UUID
        WHERE (item->>'category_id')::UUID = ANY(v_reward_category_ids)
          AND NOT ((item->>'menu_item_id') = ANY(v_reward_excluded_items))
        ORDER BY (item->>'price')::INTEGER ASC
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
          END IF;
        END IF;
      END IF;
    ELSE
      -- Item-based mode (legacy)
      SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 0) INTO v_trigger_count
      FROM jsonb_array_elements(p_cart_items) AS item
      WHERE EXISTS (
        SELECT 1 FROM offer_items oi
        WHERE oi.offer_id = v_offer.id
          AND oi.role = 'trigger'
          AND oi.menu_item_id = (item->>'menu_item_id')::UUID
      );

      IF v_trigger_count >= v_trigger_qty THEN
        SELECT mi.name, (item->>'price')::INTEGER, (item->>'quantity')::INTEGER
        INTO v_free_item, v_reward_item_price, v_reward_item_qty
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
        v_free_item, v_discount_per_app::DECIMAL / GREATEST(v_trigger_qty + v_reward_qty, 1)
      );
    END IF;
  END LOOP;

  -- ============================================
  -- Process THRESHOLD_DISCOUNT offers
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
          NULL, v_discount_per_app::DECIMAL
        );
      END IF;
    END IF;
  END LOOP;

  -- ============================================
  -- Process PROMO_CODE offers
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
              NULL, v_discount_per_app::DECIMAL
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

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

-- ============================================
-- OPTIMAL OFFER COMBINATION ALGORITHM
-- ============================================
-- Fixes three issues in get_optimized_offers:
-- 1. Bundle offers now apply MULTIPLE times (not just once)
-- 2. Tries both orderings (bundles→buy_x_get_y AND buy_x_get_y→bundles)
--    and picks the combination with the highest total discount
-- 3. Item marking now correctly marks ONE item at a time (not all duplicates)
--
-- Keeps fair pricing rules intact:
-- - Bundles use the most expensive matching items
-- - Buy X Get Y offers the cheapest item free (with anti-gaming skip logic)
-- ============================================


-- ============================================
-- HELPER: Mark first unused item matching menu_item_id + price
-- ============================================
CREATE OR REPLACE FUNCTION mark_first_unused_item(
  p_items JSONB,
  p_menu_item_id TEXT,
  p_price INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_item JSONB;
  v_marked BOOLEAN := FALSE;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT v_marked
       AND v_item->>'menu_item_id' = p_menu_item_id
       AND (v_item->>'price')::INTEGER = p_price
       AND (v_item->>'used')::BOOLEAN = FALSE
    THEN
      v_result := v_result || jsonb_build_array(v_item || '{"used": true}'::JSONB);
      v_marked := TRUE;
    ELSE
      v_result := v_result || jsonb_build_array(v_item);
    END IF;
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- HELPER: Mark multiple items as used (one at a time)
-- ============================================
CREATE OR REPLACE FUNCTION mark_items_used_safe(
  p_items JSONB,
  p_items_to_mark JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := p_items;
  v_item JSONB;
  v_i INTEGER;
BEGIN
  IF p_items_to_mark IS NULL OR jsonb_array_length(p_items_to_mark) = 0 THEN
    RETURN p_items;
  END IF;

  FOR v_i IN 0..jsonb_array_length(p_items_to_mark)-1 LOOP
    v_item := p_items_to_mark->v_i;
    v_result := mark_first_unused_item(
      v_result,
      v_item->>'menu_item_id',
      (v_item->>'price')::INTEGER
    );
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- HELPER: Process all buy_x_get_y offers on given items
-- ============================================
DROP FUNCTION IF EXISTS process_buy_x_get_y_offers(UUID, JSONB);

CREATE OR REPLACE FUNCTION process_buy_x_get_y_offers(
  p_foodtruck_id UUID,
  p_items JSONB
) RETURNS TABLE (
  total_discount INTEGER,
  results JSONB,
  remaining_items JSONB
) AS $$
DECLARE
  v_offer RECORD;
  v_result RECORD;
  v_trigger_cats UUID[];
  v_trigger_qty INTEGER;
  v_reward_qty INTEGER;
  v_items JSONB := p_items;
  v_results JSONB := '[]'::JSONB;
  v_discount INTEGER := 0;
  v_free_name TEXT;
BEGIN
  FOR v_offer IN
    SELECT o.* FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'buy_x_get_y'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
    ORDER BY o.id
  LOOP
    BEGIN
      v_trigger_qty := COALESCE((v_offer.config->>'trigger_quantity')::INTEGER, 2);
      v_reward_qty := COALESCE((v_offer.config->>'reward_quantity')::INTEGER, 1);

      -- Get trigger category IDs
      IF v_offer.config->'trigger_category_ids' IS NOT NULL
         AND jsonb_array_length(v_offer.config->'trigger_category_ids') > 0 THEN
        SELECT ARRAY(SELECT (jsonb_array_elements_text(v_offer.config->'trigger_category_ids'))::UUID)
        INTO v_trigger_cats;
      ELSE
        v_trigger_cats := ARRAY[]::UUID[];
      END IF;

      IF array_length(v_trigger_cats, 1) IS NULL OR array_length(v_trigger_cats, 1) = 0 THEN
        CONTINUE;
      END IF;

      -- Calculate fair pricing discount (handles k applications with skip logic)
      SELECT * INTO v_result
      FROM calculate_fair_buy_x_get_y_discount(
        v_items, v_trigger_qty, v_reward_qty, v_trigger_cats
      );

      IF v_result.total_discount > 0 THEN
        -- Mark items as used (one at a time, safely)
        v_items := mark_items_used_safe(v_items, v_result.items_used);
        v_discount := v_discount + v_result.total_discount;

        -- Get free item name (first reward item)
        v_free_name := NULL;
        SELECT item->>'item_name' INTO v_free_name
        FROM jsonb_array_elements(v_result.items_used) AS item
        WHERE item->>'role' = 'reward'
        LIMIT 1;

        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'offer_id', v_offer.id,
          'offer_name', v_offer.name,
          'offer_type', 'buy_x_get_y',
          'times_applied', v_result.num_applications,
          'discount_per_application', v_result.total_discount / GREATEST(v_result.num_applications, 1),
          'calculated_discount', v_result.total_discount,
          'items_consumed', v_result.items_used,
          'free_item_name', v_free_name
        ));
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'process_buy_x_get_y: Error on offer %: %', v_offer.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_discount, v_results, v_items;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- HELPER: Process all bundle offers on given items
-- Applies each bundle offer MULTIPLE TIMES until no more matches
-- ============================================
DROP FUNCTION IF EXISTS process_bundle_offers(UUID, JSONB);

CREATE OR REPLACE FUNCTION process_bundle_offers(
  p_foodtruck_id UUID,
  p_items JSONB
) RETURNS TABLE (
  total_discount INTEGER,
  results JSONB,
  remaining_items JSONB
) AS $$
DECLARE
  v_offer RECORD;
  v_result RECORD;
  v_items JSONB := p_items;
  v_results JSONB := '[]'::JSONB;
  v_discount INTEGER := 0;
  v_bundle_apps INTEGER;
  v_bundle_discount INTEGER;
  v_bundle_all_items JSONB;
  v_max_bundle_apps CONSTANT INTEGER := 20;  -- Safety limit
BEGIN
  FOR v_offer IN
    SELECT o.* FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'bundle'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
    ORDER BY o.id
  LOOP
    BEGIN
      v_bundle_apps := 0;
      v_bundle_discount := 0;
      v_bundle_all_items := '[]'::JSONB;

      -- Apply this bundle as many times as possible
      LOOP
        SELECT * INTO v_result
        FROM calculate_fair_bundle_discount(
          v_items,
          v_offer.config->'bundle_categories',
          COALESCE((v_offer.config->>'fixed_price')::INTEGER, 0)
        );

        EXIT WHEN NOT v_result.is_applicable OR v_result.total_discount <= 0;
        EXIT WHEN v_bundle_apps >= v_max_bundle_apps;

        v_bundle_apps := v_bundle_apps + 1;
        v_bundle_discount := v_bundle_discount + v_result.total_discount;
        v_bundle_all_items := v_bundle_all_items || v_result.items_used;

        -- Mark items as used (one at a time, safely)
        v_items := mark_items_used_safe(v_items, v_result.items_used);
      END LOOP;

      IF v_bundle_apps > 0 THEN
        v_discount := v_discount + v_bundle_discount;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'offer_id', v_offer.id,
          'offer_name', v_offer.name,
          'offer_type', 'bundle',
          'times_applied', v_bundle_apps,
          'discount_per_application', v_bundle_discount / v_bundle_apps,
          'calculated_discount', v_bundle_discount,
          'items_consumed', v_bundle_all_items,
          'free_item_name', NULL
        ));
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'process_bundle: Error on offer %: %', v_offer.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_discount, v_results, v_items;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- REPLACE get_optimized_offers with OPTIMAL COMBINATION
-- ============================================
DROP FUNCTION IF EXISTS get_optimized_offers(UUID, JSONB, INTEGER, TEXT);

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
  v_expanded_items JSONB;
  -- Strategy A: bundles first, then buy_x_get_y
  v_strat_a_step1 RECORD;
  v_strat_a_step2 RECORD;
  v_discount_a INTEGER;
  v_results_a JSONB;
  -- Strategy B: buy_x_get_y first, then bundles
  v_strat_b_step1 RECORD;
  v_strat_b_step2 RECORD;
  v_discount_b INTEGER;
  v_results_b JSONB;
  -- Best result
  v_best_results JSONB;
  -- Threshold + promo
  v_offer RECORD;
  v_promo_discount INTEGER := 0;
  v_threshold_discount INTEGER := 0;
  v_max_items CONSTANT INTEGER := 100;
BEGIN
  -- ============================================
  -- STEP 1: EXPAND CART ITEMS
  -- ============================================
  BEGIN
    WITH expanded AS (
      SELECT
        (item->>'menu_item_id')::UUID AS menu_item_id,
        CASE
          WHEN item->>'category_id' IS NOT NULL AND item->>'category_id' != ''
          THEN (item->>'category_id')::UUID
          ELSE NULL
        END AS category_id,
        COALESCE(item->>'name', 'Article') AS item_name,
        COALESCE((item->>'price')::INTEGER, 0) AS price,
        generate_series(1, LEAST((item->>'quantity')::INTEGER, 50)) AS item_index
      FROM jsonb_array_elements(COALESCE(p_cart_items, '[]'::JSONB)) AS item
    )
    SELECT jsonb_agg(jsonb_build_object(
      'menu_item_id', menu_item_id,
      'category_id', category_id,
      'item_name', item_name,
      'price', price,
      'item_index', item_index,
      'used', false
    ) ORDER BY price ASC)
    INTO v_expanded_items
    FROM (
      SELECT * FROM expanded LIMIT v_max_items
    ) limited;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'get_optimized_offers: Invalid cart items JSON: %', SQLERRM;
      RETURN;
  END;

  IF v_expanded_items IS NULL OR jsonb_array_length(v_expanded_items) = 0 THEN
    v_expanded_items := '[]'::JSONB;
  END IF;

  -- ============================================
  -- STEP 2: STRATEGY A - Bundles first, then Buy X Get Y
  -- ============================================
  SELECT * INTO v_strat_a_step1
  FROM process_bundle_offers(p_foodtruck_id, v_expanded_items);

  SELECT * INTO v_strat_a_step2
  FROM process_buy_x_get_y_offers(p_foodtruck_id, COALESCE(v_strat_a_step1.remaining_items, v_expanded_items));

  v_discount_a := COALESCE(v_strat_a_step1.total_discount, 0) + COALESCE(v_strat_a_step2.total_discount, 0);
  v_results_a := COALESCE(v_strat_a_step1.results, '[]'::JSONB) || COALESCE(v_strat_a_step2.results, '[]'::JSONB);

  -- ============================================
  -- STEP 3: STRATEGY B - Buy X Get Y first, then Bundles
  -- ============================================
  SELECT * INTO v_strat_b_step1
  FROM process_buy_x_get_y_offers(p_foodtruck_id, v_expanded_items);

  SELECT * INTO v_strat_b_step2
  FROM process_bundle_offers(p_foodtruck_id, COALESCE(v_strat_b_step1.remaining_items, v_expanded_items));

  v_discount_b := COALESCE(v_strat_b_step1.total_discount, 0) + COALESCE(v_strat_b_step2.total_discount, 0);
  v_results_b := COALESCE(v_strat_b_step1.results, '[]'::JSONB) || COALESCE(v_strat_b_step2.results, '[]'::JSONB);

  -- ============================================
  -- STEP 4: PICK THE BETTER STRATEGY
  -- ============================================
  IF v_discount_a >= v_discount_b THEN
    v_best_results := v_results_a;
  ELSE
    v_best_results := v_results_b;
  END IF;

  -- ============================================
  -- STEP 5: ADD THRESHOLD DISCOUNT
  -- ============================================
  FOR v_offer IN
    SELECT o.* FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type = 'threshold_discount'
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
  LOOP
    BEGIN
      IF p_order_amount >= COALESCE((v_offer.config->>'min_amount')::INTEGER, 0) THEN
        IF (v_offer.config->>'discount_type') = 'percentage' THEN
          v_threshold_discount := (p_order_amount * COALESCE((v_offer.config->>'discount_value')::INTEGER, 0) / 100);
        ELSE
          v_threshold_discount := LEAST(COALESCE((v_offer.config->>'discount_value')::INTEGER, 0), p_order_amount);
        END IF;

        IF v_threshold_discount > 0 THEN
          v_best_results := v_best_results || jsonb_build_array(jsonb_build_object(
            'offer_id', v_offer.id,
            'offer_name', v_offer.name,
            'offer_type', 'threshold_discount',
            'times_applied', 1,
            'discount_per_application', v_threshold_discount,
            'calculated_discount', v_threshold_discount,
            'items_consumed', '[]'::JSONB,
            'free_item_name', NULL
          ));
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'get_optimized_offers: Error processing threshold offer %: %', v_offer.id, SQLERRM;
    END;
  END LOOP;

  -- ============================================
  -- STEP 6: ADD PROMO CODE
  -- ============================================
  IF p_promo_code IS NOT NULL THEN
    FOR v_offer IN
      SELECT o.* FROM offers o
      WHERE o.foodtruck_id = p_foodtruck_id
        AND o.is_active = TRUE
        AND o.offer_type = 'promo_code'
        AND (o.start_date IS NULL OR o.start_date <= NOW())
        AND (o.end_date IS NULL OR o.end_date >= NOW())
        AND UPPER(o.config->>'code') = UPPER(p_promo_code)
    LOOP
      BEGIN
        IF p_order_amount >= COALESCE((v_offer.config->>'min_order_amount')::INTEGER, 0) THEN
          IF (v_offer.config->>'discount_type') = 'percentage' THEN
            v_promo_discount := (p_order_amount * COALESCE((v_offer.config->>'discount_value')::INTEGER, 0) / 100);
            IF (v_offer.config->>'max_discount') IS NOT NULL THEN
              v_promo_discount := LEAST(v_promo_discount, (v_offer.config->>'max_discount')::INTEGER);
            END IF;
          ELSE
            v_promo_discount := LEAST(COALESCE((v_offer.config->>'discount_value')::INTEGER, 0), p_order_amount);
          END IF;

          IF v_promo_discount > 0 THEN
            v_best_results := v_best_results || jsonb_build_array(jsonb_build_object(
              'offer_id', v_offer.id,
              'offer_name', v_offer.name,
              'offer_type', 'promo_code',
              'times_applied', 1,
              'discount_per_application', v_promo_discount,
              'calculated_discount', v_promo_discount,
              'items_consumed', '[]'::JSONB,
              'free_item_name', NULL
            ));
          END IF;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'get_optimized_offers: Error processing promo code %: %', v_offer.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- ============================================
  -- STEP 7: RETURN RESULTS
  -- ============================================
  RETURN QUERY
  SELECT
    (r->>'offer_id')::UUID,
    r->>'offer_name',
    (r->>'offer_type')::offer_type,
    (r->>'times_applied')::INTEGER,
    (r->>'discount_per_application')::INTEGER,
    (r->>'calculated_discount')::INTEGER,
    r->'items_consumed',
    r->>'free_item_name'
  FROM jsonb_array_elements(v_best_results) AS r
  ORDER BY (r->>'calculated_discount')::INTEGER DESC;
END;
$$ LANGUAGE plpgsql;

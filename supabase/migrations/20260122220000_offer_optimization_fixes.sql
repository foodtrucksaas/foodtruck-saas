-- ============================================
-- OFFER OPTIMIZATION FIXES
-- ============================================
-- Audit date: 2026-01-22
--
-- BUGS IDENTIFIED AND FIXED:
--
-- #1  [BUNDLE] category_ids empty array [] not handled correctly
--     -> Added explicit length check for category_ids array
--
-- #2  [BUNDLE] category_id empty string "" causes UUID cast failure
--     -> Added length check before casting
--
-- #3  [BUY_X_GET_Y] reward_category_ids NULL when trigger_category_ids exists
--     -> Added NULL check and fallback to trigger_category_ids
--
-- #4  [BUY_X_GET_Y] NULL arrays in intersection operator cause unexpected behavior
--     -> Added COALESCE to ensure non-null arrays
--
-- #5  [BUY_X_GET_Y] Item-based mode not supported (items as triggers/rewards)
--     -> Added support for offer_items table lookup
--
-- #6  [CART] category_id NULL in cart items not handled
--     -> Added NULL handling in category matching
--
-- #7  [CART] No quantity limit - potential DoS with qty=10000
--     -> Added MAX_ITEMS_PER_CART limit (100 items after expansion)
--
-- #8  [GENERAL] No exception handling for malformed JSON
--     -> Added EXCEPTION blocks with meaningful error messages
--
-- #9  [RECURSION] - NOT A BUG - recursion correctly handles multiple applications
--
-- #10 [RECURSION] No recursion depth limit - potential stack overflow
--     -> Added MAX_RECURSION_DEPTH limit (50)
--
-- #11 [OUTPUT] Multiple applications of same offer not consolidated
--     -> Added consolidation step before returning results
--
-- #12 [DISPLAY] items_consumed order (rewards before triggers in same-category)
--     -> Reordered to show triggers first, then rewards
-- ============================================

-- Constants for limits
DO $$
BEGIN
  -- These will be used as compile-time constants in the functions
  RAISE NOTICE 'Applying offer optimization fixes...';
END $$;


-- ============================================
-- FIXED: Main optimization function
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
  v_best_result JSONB := '[]'::JSONB;
  v_best_discount INTEGER := 0;
  v_offer RECORD;
  v_expanded_items JSONB;
  v_promo_discount INTEGER := 0;
  v_threshold_discount INTEGER := 0;
  v_consolidated JSONB;
  v_max_items CONSTANT INTEGER := 100;  -- FIX #7: Max items after expansion
BEGIN
  -- ============================================
  -- STEP 1: EXPAND CART ITEMS (qty=3 -> 3 individual items)
  -- FIX #7: Limit total expanded items
  -- FIX #8: Exception handling for malformed JSON
  -- ============================================
  BEGIN
    WITH expanded AS (
      SELECT
        (item->>'menu_item_id')::UUID AS menu_item_id,
        -- FIX #6: Handle NULL category_id
        CASE
          WHEN item->>'category_id' IS NOT NULL AND item->>'category_id' != ''
          THEN (item->>'category_id')::UUID
          ELSE NULL
        END AS category_id,
        COALESCE(item->>'name', 'Article') AS item_name,
        COALESCE((item->>'price')::INTEGER, 0) AS price,
        generate_series(1, LEAST((item->>'quantity')::INTEGER, 20)) AS item_index  -- FIX #7: Cap per-item qty
      FROM jsonb_array_elements(COALESCE(p_cart_items, '[]'::JSONB)) AS item
    )
    SELECT jsonb_agg(jsonb_build_object(
      'menu_item_id', menu_item_id,
      'category_id', category_id,
      'item_name', item_name,
      'price', price,
      'item_index', item_index,
      'used', false
    ) ORDER BY price DESC)
    INTO v_expanded_items
    FROM (
      SELECT * FROM expanded LIMIT v_max_items  -- FIX #7: Total limit
    ) limited;
  EXCEPTION
    WHEN OTHERS THEN
      -- FIX #8: Return empty on malformed input
      RAISE WARNING 'get_optimized_offers: Invalid cart items JSON: %', SQLERRM;
      RETURN;
  END;

  -- Handle empty cart
  IF v_expanded_items IS NULL OR jsonb_array_length(v_expanded_items) = 0 THEN
    v_expanded_items := '[]'::JSONB;
  END IF;

  -- ============================================
  -- STEP 2: TEST ALL COMBINATIONS OF ITEM-CONSUMING OFFERS
  -- Using recursive approach with depth limit
  -- ============================================
  SELECT * INTO v_best_result, v_best_discount
  FROM find_best_offer_combination(
    p_foodtruck_id,
    v_expanded_items,
    '[]'::JSONB,
    0,
    0  -- FIX #10: Initial recursion depth
  );

  -- ============================================
  -- STEP 2.5: CONSOLIDATE MULTIPLE APPLICATIONS OF SAME OFFER
  -- FIX #11: Merge duplicate offer applications
  -- ============================================
  WITH grouped AS (
    SELECT
      r->>'offer_id' AS offer_id,
      r->>'offer_name' AS offer_name,
      r->>'offer_type' AS offer_type,
      COUNT(*)::INTEGER AS times_applied,
      (r->>'discount_per_application')::INTEGER AS discount_per_application,
      SUM((r->>'calculated_discount')::INTEGER)::INTEGER AS calculated_discount,
      jsonb_agg(r->'items_consumed') AS all_items_consumed,
      r->>'free_item_name' AS free_item_name
    FROM jsonb_array_elements(v_best_result) AS r
    GROUP BY
      r->>'offer_id',
      r->>'offer_name',
      r->>'offer_type',
      r->>'discount_per_application',
      r->>'free_item_name'
  )
  SELECT jsonb_agg(jsonb_build_object(
    'offer_id', offer_id,
    'offer_name', offer_name,
    'offer_type', offer_type,
    'times_applied', times_applied,
    'discount_per_application', discount_per_application,
    'calculated_discount', calculated_discount,
    'items_consumed', (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(all_items_consumed) AS arr,
           jsonb_array_elements(arr) AS elem
    ),
    'free_item_name', free_item_name
  ))
  INTO v_consolidated
  FROM grouped;

  v_best_result := COALESCE(v_consolidated, '[]'::JSONB);

  -- ============================================
  -- STEP 3: ADD GLOBAL OFFERS (threshold, promo_code)
  -- These don't consume items, apply on top
  -- ============================================

  -- Threshold discount
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
          v_best_result := v_best_result || jsonb_build_array(jsonb_build_object(
            'offer_id', v_offer.id,
            'offer_name', v_offer.name,
            'offer_type', 'threshold_discount',
            'times_applied', 1,
            'discount_per_application', v_threshold_discount,
            'calculated_discount', v_threshold_discount,
            'items_consumed', '[]'::JSONB,
            'free_item_name', NULL
          ));
          v_best_discount := v_best_discount + v_threshold_discount;
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'get_optimized_offers: Error processing threshold offer %: %', v_offer.id, SQLERRM;
    END;
  END LOOP;

  -- Promo code
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
            v_best_result := v_best_result || jsonb_build_array(jsonb_build_object(
              'offer_id', v_offer.id,
              'offer_name', v_offer.name,
              'offer_type', 'promo_code',
              'times_applied', 1,
              'discount_per_application', v_promo_discount,
              'calculated_discount', v_promo_discount,
              'items_consumed', '[]'::JSONB,
              'free_item_name', NULL
            ));
            v_best_discount := v_best_discount + v_promo_discount;
          END IF;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'get_optimized_offers: Error processing promo code offer %: %', v_offer.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- ============================================
  -- STEP 4: RETURN RESULTS
  -- ============================================
  RETURN QUERY
  SELECT
    (r->>'offer_id')::UUID,
    r->>'offer_name',
    (r->>'offer_type')::offer_type,
    (r->>'times_applied')::INTEGER,
    (r->>'discount_per_application')::INTEGER,
    (r->>'calculated_discount')::INTEGER,
    COALESCE(r->'items_consumed', '[]'::JSONB),
    r->>'free_item_name'
  FROM jsonb_array_elements(v_best_result) AS r
  ORDER BY (r->>'calculated_discount')::INTEGER DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- FIXED: Recursive combination finder with depth limit
-- FIX #10: Added p_depth parameter for recursion limit
-- ============================================
DROP FUNCTION IF EXISTS find_best_offer_combination(UUID, JSONB, JSONB, INTEGER);
DROP FUNCTION IF EXISTS find_best_offer_combination(UUID, JSONB, JSONB, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION find_best_offer_combination(
  p_foodtruck_id UUID,
  p_remaining_items JSONB,
  p_applied_offers JSONB,
  p_current_discount INTEGER,
  p_depth INTEGER DEFAULT 0
)
RETURNS TABLE (
  best_offers JSONB,
  best_discount INTEGER
) AS $$
DECLARE
  v_offer RECORD;
  v_application RECORD;
  v_new_items JSONB;
  v_new_offers JSONB;
  v_new_discount INTEGER;
  v_sub_result RECORD;
  v_best_offers JSONB := p_applied_offers;
  v_best_discount INTEGER := p_current_discount;
  v_has_applicable_offer BOOLEAN := FALSE;
  v_max_depth CONSTANT INTEGER := 50;  -- FIX #10: Max recursion depth
BEGIN
  -- FIX #10: Check recursion depth
  IF p_depth >= v_max_depth THEN
    RAISE WARNING 'find_best_offer_combination: Max recursion depth reached (%))', v_max_depth;
    RETURN QUERY SELECT v_best_offers, v_best_discount;
    RETURN;
  END IF;

  -- Early exit if no items left
  IF p_remaining_items IS NULL OR jsonb_array_length(p_remaining_items) = 0 THEN
    RETURN QUERY SELECT v_best_offers, v_best_discount;
    RETURN;
  END IF;

  -- Count available (unused) items
  IF (SELECT COUNT(*) FROM jsonb_array_elements(p_remaining_items) item WHERE (item->>'used')::BOOLEAN = FALSE) = 0 THEN
    RETURN QUERY SELECT v_best_offers, v_best_discount;
    RETURN;
  END IF;

  -- Try each active offer
  FOR v_offer IN
    SELECT o.* FROM offers o
    WHERE o.foodtruck_id = p_foodtruck_id
      AND o.is_active = TRUE
      AND o.offer_type IN ('bundle', 'buy_x_get_y')
      AND (o.start_date IS NULL OR o.start_date <= NOW())
      AND (o.end_date IS NULL OR o.end_date >= NOW())
    ORDER BY o.id  -- Deterministic order
  LOOP
    -- Try to apply this offer once
    SELECT * INTO v_application
    FROM try_apply_offer_once(v_offer.id, v_offer.offer_type, v_offer.config, p_remaining_items);

    IF v_application.is_applicable THEN
      v_has_applicable_offer := TRUE;

      -- Calculate new state after applying this offer
      v_new_items := v_application.remaining_items;
      v_new_discount := p_current_discount + v_application.discount;
      v_new_offers := p_applied_offers || jsonb_build_array(jsonb_build_object(
        'offer_id', v_offer.id,
        'offer_name', v_offer.name,
        'offer_type', v_offer.offer_type::TEXT,
        'times_applied', 1,
        'discount_per_application', v_application.discount,
        'calculated_discount', v_application.discount,
        'items_consumed', v_application.items_consumed,
        'free_item_name', v_application.free_item_name
      ));

      -- Recursively find best combination from this state
      SELECT * INTO v_sub_result
      FROM find_best_offer_combination(
        p_foodtruck_id,
        v_new_items,
        v_new_offers,
        v_new_discount,
        p_depth + 1  -- FIX #10: Increment depth
      );

      -- Update best if this path is better
      IF v_sub_result.best_discount > v_best_discount THEN
        v_best_discount := v_sub_result.best_discount;
        v_best_offers := v_sub_result.best_offers;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_best_offers, v_best_discount;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- FIXED: Apply offer once with all bug fixes
-- FIX #1, #2, #3, #4, #5, #6, #12
-- ============================================
DROP FUNCTION IF EXISTS try_apply_offer_once(offer_type, JSONB, JSONB);
DROP FUNCTION IF EXISTS try_apply_offer_once(UUID, offer_type, JSONB, JSONB);

CREATE OR REPLACE FUNCTION try_apply_offer_once(
  p_offer_id UUID,  -- Added for item-based lookup (FIX #5)
  p_offer_type offer_type,
  p_config JSONB,
  p_items JSONB
)
RETURNS TABLE (
  is_applicable BOOLEAN,
  discount INTEGER,
  remaining_items JSONB,
  items_consumed JSONB,
  free_item_name TEXT
) AS $$
DECLARE
  v_config JSONB := p_config;
  v_trigger_qty INTEGER;
  v_reward_qty INTEGER;
  v_trigger_cats UUID[];
  v_reward_cats UUID[];
  v_items_array JSONB[];
  v_item JSONB;
  v_trigger_items JSONB := '[]'::JSONB;
  v_reward_items JSONB := '[]'::JSONB;
  v_consumed JSONB := '[]'::JSONB;
  v_remaining JSONB;
  v_discount INTEGER := 0;
  v_free_name TEXT := NULL;
  v_bundle_cats JSONB;
  v_bundle_cat RECORD;
  v_bundle_total INTEGER := 0;
  v_fixed_price INTEGER;
  v_cat_items JSONB;
  v_needed INTEGER;
  v_taken INTEGER;
  i INTEGER;
  v_cat_id_str TEXT;
  v_cat_ids_arr JSONB;
BEGIN
  -- ============================================
  -- BUNDLE OFFER
  -- FIX #1, #2, #6: Improved category handling
  -- ============================================
  IF p_offer_type = 'bundle' THEN
    v_fixed_price := COALESCE((v_config->>'fixed_price')::INTEGER, 0);
    v_bundle_cats := v_config->'bundle_categories';

    IF v_bundle_cats IS NULL OR jsonb_array_length(v_bundle_cats) = 0 THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    v_remaining := p_items;
    v_consumed := '[]'::JSONB;
    v_bundle_total := 0;

    -- For each category in bundle
    FOR v_bundle_cat IN
      SELECT
        -- FIX #1, #2: Robust category ID extraction
        CASE
          -- Single category_id (string, non-empty)
          WHEN bc->>'category_id' IS NOT NULL
               AND LENGTH(bc->>'category_id') > 0
               AND bc->>'category_id' != 'null' THEN
            ARRAY[(bc->>'category_id')::UUID]
          -- Multiple category_ids (array with elements)
          WHEN bc->'category_ids' IS NOT NULL
               AND jsonb_typeof(bc->'category_ids') = 'array'
               AND jsonb_array_length(bc->'category_ids') > 0 THEN
            ARRAY(
              SELECT (elem)::UUID
              FROM jsonb_array_elements_text(bc->'category_ids') AS elem
              WHERE elem IS NOT NULL AND LENGTH(elem) > 0
            )
          ELSE
            ARRAY[]::UUID[]
        END AS cat_ids,
        COALESCE((bc->>'quantity')::INTEGER, 1) AS required_qty
      FROM jsonb_array_elements(v_bundle_cats) AS bc
    LOOP
      -- FIX #1: Skip if no valid categories
      IF array_length(v_bundle_cat.cat_ids, 1) IS NULL OR array_length(v_bundle_cat.cat_ids, 1) = 0 THEN
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      v_needed := v_bundle_cat.required_qty;

      -- Get available items in ANY of the allowed categories (sorted by price DESC for bundles)
      -- FIX #6: Handle NULL category_id in items
      SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
      INTO v_cat_items
      FROM jsonb_array_elements(v_remaining) AS item
      WHERE (
        (item->>'category_id') IS NOT NULL
        AND (item->>'category_id')::UUID = ANY(v_bundle_cat.cat_ids)
      )
        AND (item->>'used')::BOOLEAN = FALSE;

      IF v_cat_items IS NULL OR jsonb_array_length(COALESCE(v_cat_items, '[]'::JSONB)) < v_needed THEN
        -- Not enough items for this category
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- Take the most expensive items for this category
      FOR i IN 0..v_needed-1 LOOP
        v_item := v_cat_items->i;
        v_bundle_total := v_bundle_total + (v_item->>'price')::INTEGER;
        v_consumed := v_consumed || jsonb_build_array(jsonb_build_object(
          'menu_item_id', v_item->>'menu_item_id',
          'item_name', v_item->>'item_name',
          'price', (v_item->>'price')::INTEGER,
          'role', 'bundle_item'
        ));

        -- Mark as used in remaining
        v_remaining := mark_item_used(v_remaining, v_item);
      END LOOP;
    END LOOP;

    -- Calculate savings
    v_discount := GREATEST(v_bundle_total - v_fixed_price, 0);

    IF v_discount <= 0 THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, NULL::TEXT;
    RETURN;
  END IF;

  -- ============================================
  -- BUY_X_GET_Y OFFER
  -- FIX #3, #4, #5, #12: Improved handling
  -- ============================================
  IF p_offer_type = 'buy_x_get_y' THEN
    v_trigger_qty := COALESCE((v_config->>'trigger_quantity')::INTEGER, 0);
    v_reward_qty := COALESCE((v_config->>'reward_quantity')::INTEGER, 1);

    IF v_trigger_qty <= 0 THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    -- Get category IDs based on type
    IF (v_config->>'type') = 'category_choice' THEN
      -- Category-based offer
      IF v_config->'trigger_category_ids' IS NOT NULL
         AND jsonb_typeof(v_config->'trigger_category_ids') = 'array'
         AND jsonb_array_length(v_config->'trigger_category_ids') > 0 THEN
        SELECT ARRAY(
          SELECT (elem)::UUID
          FROM jsonb_array_elements_text(v_config->'trigger_category_ids') AS elem
          WHERE elem IS NOT NULL AND LENGTH(elem) > 0
        ) INTO v_trigger_cats;
      ELSE
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- FIX #3: If reward_category_ids is NULL, use trigger_category_ids
      IF v_config->'reward_category_ids' IS NOT NULL
         AND jsonb_typeof(v_config->'reward_category_ids') = 'array'
         AND jsonb_array_length(v_config->'reward_category_ids') > 0 THEN
        SELECT ARRAY(
          SELECT (elem)::UUID
          FROM jsonb_array_elements_text(v_config->'reward_category_ids') AS elem
          WHERE elem IS NOT NULL AND LENGTH(elem) > 0
        ) INTO v_reward_cats;
      ELSE
        -- FIX #3: Default to trigger categories
        v_reward_cats := v_trigger_cats;
      END IF;

    ELSIF (v_config->>'type') = 'item_based' OR v_config->>'type' IS NULL THEN
      -- FIX #5: Item-based offer - lookup from offer_items table
      SELECT ARRAY(
        SELECT DISTINCT mi.category_id
        FROM offer_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.offer_id = p_offer_id
          AND oi.role = 'trigger'
          AND mi.category_id IS NOT NULL
      ) INTO v_trigger_cats;

      SELECT ARRAY(
        SELECT DISTINCT mi.category_id
        FROM offer_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.offer_id = p_offer_id
          AND oi.role = 'reward'
          AND mi.category_id IS NOT NULL
      ) INTO v_reward_cats;

      -- If still no categories, try to use specific menu_item_ids
      IF (v_trigger_cats IS NULL OR array_length(v_trigger_cats, 1) IS NULL) THEN
        -- Fall back to checking specific items in cart
        DECLARE
          v_trigger_item_ids UUID[];
          v_reward_item_ids UUID[];
        BEGIN
          SELECT ARRAY(
            SELECT oi.menu_item_id
            FROM offer_items oi
            WHERE oi.offer_id = p_offer_id AND oi.role = 'trigger'
          ) INTO v_trigger_item_ids;

          SELECT ARRAY(
            SELECT oi.menu_item_id
            FROM offer_items oi
            WHERE oi.offer_id = p_offer_id AND oi.role = 'reward'
          ) INTO v_reward_item_ids;

          IF v_trigger_item_ids IS NOT NULL AND array_length(v_trigger_item_ids, 1) > 0 THEN
            -- Item-based matching
            RETURN QUERY SELECT * FROM try_apply_item_based_offer(
              v_trigger_item_ids,
              v_reward_item_ids,
              v_trigger_qty,
              v_reward_qty,
              p_items
            );
            RETURN;
          END IF;
        END;

        -- No valid configuration found
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;
    ELSE
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    -- FIX #4: Ensure arrays are never NULL for intersection
    v_trigger_cats := COALESCE(v_trigger_cats, ARRAY[]::UUID[]);
    v_reward_cats := COALESCE(v_reward_cats, ARRAY[]::UUID[]);

    v_remaining := p_items;

    -- ============================================
    -- SAME CATEGORY (trigger = reward)
    -- Need (trigger_qty + reward_qty) items total
    -- Give the cheapest one(s) free
    -- FIX #12: Reorder items_consumed (triggers first)
    -- ============================================
    IF v_trigger_cats && v_reward_cats AND array_length(v_trigger_cats, 1) > 0 THEN
      DECLARE
        v_overlap_cats UUID[];
        v_total_needed INTEGER;
        v_available_items JSONB;
        v_sorted_items JSONB;
        v_temp_triggers JSONB := '[]'::JSONB;
        v_temp_rewards JSONB := '[]'::JSONB;
      BEGIN
        SELECT ARRAY(
          SELECT unnest(v_trigger_cats)
          INTERSECT
          SELECT unnest(v_reward_cats)
        ) INTO v_overlap_cats;

        v_total_needed := v_trigger_qty + v_reward_qty;

        -- Get available items in overlapping categories
        -- FIX #6: Handle NULL category_id
        SELECT jsonb_agg(item)
        INTO v_available_items
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_overlap_cats)
          AND (item->>'used')::BOOLEAN = FALSE;

        IF v_available_items IS NULL OR jsonb_array_length(v_available_items) < v_total_needed THEN
          RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
          RETURN;
        END IF;

        -- Sort by price ASC to identify reward items (cheapest)
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
        INTO v_sorted_items
        FROM jsonb_array_elements(v_available_items) AS item;

        -- REWARD items: the cheapest v_reward_qty items (will be free)
        FOR i IN 0..v_reward_qty-1 LOOP
          v_item := v_sorted_items->i;
          v_discount := v_discount + (v_item->>'price')::INTEGER;
          v_temp_rewards := v_temp_rewards || jsonb_build_array(jsonb_build_object(
            'menu_item_id', v_item->>'menu_item_id',
            'item_name', v_item->>'item_name',
            'price', (v_item->>'price')::INTEGER,
            'role', 'reward'
          ));
          v_remaining := mark_item_used(v_remaining, v_item);

          -- Track free item name (first one)
          IF v_free_name IS NULL THEN
            v_free_name := v_item->>'item_name';
          END IF;
        END LOOP;

        -- TRIGGER items: the next v_trigger_qty items
        FOR i IN v_reward_qty..v_total_needed-1 LOOP
          v_item := v_sorted_items->i;
          v_temp_triggers := v_temp_triggers || jsonb_build_array(jsonb_build_object(
            'menu_item_id', v_item->>'menu_item_id',
            'item_name', v_item->>'item_name',
            'price', (v_item->>'price')::INTEGER,
            'role', 'trigger'
          ));
          v_remaining := mark_item_used(v_remaining, v_item);
        END LOOP;

        -- FIX #12: Order as triggers first, then rewards
        v_consumed := v_temp_triggers || v_temp_rewards;

        RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, v_free_name;
        RETURN;
      END;

    -- ============================================
    -- DIFFERENT CATEGORIES (trigger != reward)
    -- ============================================
    ELSE
      DECLARE
        v_trigger_items_avail JSONB;
        v_reward_items_avail JSONB;
        v_temp_triggers JSONB := '[]'::JSONB;
        v_temp_rewards JSONB := '[]'::JSONB;
      BEGIN
        -- Get trigger items (sorted by price DESC - use most expensive as triggers)
        -- FIX #6: Handle NULL category_id
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
        INTO v_trigger_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_trigger_cats)
          AND (item->>'used')::BOOLEAN = FALSE;

        -- Get reward items (sorted by price ASC - give cheapest free)
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
        INTO v_reward_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_reward_cats)
          AND (item->>'used')::BOOLEAN = FALSE;

        -- Check if enough items
        IF v_trigger_items_avail IS NULL OR jsonb_array_length(v_trigger_items_avail) < v_trigger_qty THEN
          RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
          RETURN;
        END IF;

        IF v_reward_items_avail IS NULL OR jsonb_array_length(v_reward_items_avail) < v_reward_qty THEN
          RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
          RETURN;
        END IF;

        -- Consume trigger items
        FOR i IN 0..v_trigger_qty-1 LOOP
          v_item := v_trigger_items_avail->i;
          v_temp_triggers := v_temp_triggers || jsonb_build_array(jsonb_build_object(
            'menu_item_id', v_item->>'menu_item_id',
            'item_name', v_item->>'item_name',
            'price', (v_item->>'price')::INTEGER,
            'role', 'trigger'
          ));
          v_remaining := mark_item_used(v_remaining, v_item);
        END LOOP;

        -- Consume reward items (free)
        FOR i IN 0..v_reward_qty-1 LOOP
          v_item := v_reward_items_avail->i;
          v_discount := v_discount + (v_item->>'price')::INTEGER;
          v_temp_rewards := v_temp_rewards || jsonb_build_array(jsonb_build_object(
            'menu_item_id', v_item->>'menu_item_id',
            'item_name', v_item->>'item_name',
            'price', (v_item->>'price')::INTEGER,
            'role', 'reward'
          ));
          v_remaining := mark_item_used(v_remaining, v_item);

          IF v_free_name IS NULL THEN
            v_free_name := v_item->>'item_name';
          END IF;
        END LOOP;

        -- FIX #12: Order as triggers first, then rewards
        v_consumed := v_temp_triggers || v_temp_rewards;

        RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, v_free_name;
        RETURN;
      END;
    END IF;
  END IF;

  -- Unknown offer type
  RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- NEW: Item-based offer application (FIX #5)
-- For offers that specify specific menu_item_ids as triggers/rewards
-- ============================================
CREATE OR REPLACE FUNCTION try_apply_item_based_offer(
  p_trigger_item_ids UUID[],
  p_reward_item_ids UUID[],
  p_trigger_qty INTEGER,
  p_reward_qty INTEGER,
  p_items JSONB
)
RETURNS TABLE (
  is_applicable BOOLEAN,
  discount INTEGER,
  remaining_items JSONB,
  items_consumed JSONB,
  free_item_name TEXT
) AS $$
DECLARE
  v_item JSONB;
  v_consumed JSONB := '[]'::JSONB;
  v_remaining JSONB := p_items;
  v_discount INTEGER := 0;
  v_free_name TEXT := NULL;
  v_trigger_items_avail JSONB;
  v_reward_items_avail JSONB;
  i INTEGER;
BEGIN
  -- Get trigger items by specific item IDs (sorted by price DESC)
  SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
  INTO v_trigger_items_avail
  FROM jsonb_array_elements(v_remaining) AS item
  WHERE (item->>'menu_item_id')::UUID = ANY(p_trigger_item_ids)
    AND (item->>'used')::BOOLEAN = FALSE;

  -- Get reward items by specific item IDs (sorted by price ASC - give cheapest free)
  SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
  INTO v_reward_items_avail
  FROM jsonb_array_elements(v_remaining) AS item
  WHERE (item->>'menu_item_id')::UUID = ANY(p_reward_item_ids)
    AND (item->>'used')::BOOLEAN = FALSE;

  -- Check if enough items
  IF v_trigger_items_avail IS NULL OR jsonb_array_length(v_trigger_items_avail) < p_trigger_qty THEN
    RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  IF v_reward_items_avail IS NULL OR jsonb_array_length(v_reward_items_avail) < p_reward_qty THEN
    RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  -- Consume trigger items
  FOR i IN 0..p_trigger_qty-1 LOOP
    v_item := v_trigger_items_avail->i;
    v_consumed := v_consumed || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'item_name', v_item->>'item_name',
      'price', (v_item->>'price')::INTEGER,
      'role', 'trigger'
    ));
    v_remaining := mark_item_used(v_remaining, v_item);
  END LOOP;

  -- Consume reward items (free)
  FOR i IN 0..p_reward_qty-1 LOOP
    v_item := v_reward_items_avail->i;
    v_discount := v_discount + (v_item->>'price')::INTEGER;
    v_consumed := v_consumed || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'item_name', v_item->>'item_name',
      'price', (v_item->>'price')::INTEGER,
      'role', 'reward'
    ));
    v_remaining := mark_item_used(v_remaining, v_item);

    IF v_free_name IS NULL THEN
      v_free_name := v_item->>'item_name';
    END IF;
  END LOOP;

  RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, v_free_name;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- UNCHANGED: Mark item as used helper
-- (No bugs found in this function)
-- ============================================
-- mark_item_used function remains unchanged from previous migration


-- ============================================
-- Update function comment
-- ============================================
COMMENT ON FUNCTION get_optimized_offers IS
'Calculates the optimal combination of offers for a cart.
Uses exhaustive search to find the maximum discount.

Version: 2.0 (2026-01-22) - Bug fixes applied

Parameters:
- p_foodtruck_id: The foodtruck UUID
- p_cart_items: JSONB array of cart items with menu_item_id, category_id, price, quantity, name
- p_order_amount: Total order amount in cents
- p_promo_code: Optional promo code to apply

Returns: Table of applied offers with discount details and items consumed.

Fixes included:
- #1: category_ids empty array handling
- #2: category_id empty string handling
- #3: NULL reward_category_ids fallback
- #4: NULL array intersection handling
- #5: Item-based offer support
- #6: NULL category_id in cart items
- #7: Quantity limits (DoS protection)
- #8: Exception handling for malformed JSON
- #10: Recursion depth limit
- #11: Consolidation of multiple applications
- #12: items_consumed ordering (triggers first)';

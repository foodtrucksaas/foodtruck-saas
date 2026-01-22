-- ============================================
-- ROBUST OFFER OPTIMIZATION ALGORITHM
-- ============================================
-- Fixes:
-- #1: Uses exhaustive search instead of greedy sequential
-- #4: Clearly separates trigger vs reward items
-- #6: Isolates offers (each combination tested independently)
-- #7: Properly fills items_consumed for all offer types

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
BEGIN
  -- ============================================
  -- STEP 1: EXPAND CART ITEMS (qty=3 → 3 individual items)
  -- ============================================
  WITH expanded AS (
    SELECT
      (item->>'menu_item_id')::UUID AS menu_item_id,
      (item->>'category_id')::UUID AS category_id,
      COALESCE(item->>'name', 'Article') AS item_name,
      (item->>'price')::INTEGER AS price,
      generate_series(1, (item->>'quantity')::INTEGER) AS item_index
    FROM jsonb_array_elements(p_cart_items) AS item
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
  FROM expanded;

  -- Handle empty cart
  IF v_expanded_items IS NULL OR jsonb_array_length(v_expanded_items) = 0 THEN
    v_expanded_items := '[]'::JSONB;
  END IF;

  -- ============================================
  -- STEP 2: TEST ALL COMBINATIONS OF ITEM-CONSUMING OFFERS
  -- Using recursive approach
  -- ============================================

  SELECT * INTO v_best_result, v_best_discount
  FROM find_best_offer_combination(
    p_foodtruck_id,
    v_expanded_items,
    '[]'::JSONB,
    0
  );

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
-- HELPER: Find best offer combination recursively
-- ============================================
CREATE OR REPLACE FUNCTION find_best_offer_combination(
  p_foodtruck_id UUID,
  p_remaining_items JSONB,
  p_applied_offers JSONB,
  p_current_discount INTEGER
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
BEGIN
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
    FROM try_apply_offer_once(v_offer.offer_type, v_offer.config, p_remaining_items);

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
        v_new_discount
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
-- HELPER: Try to apply an offer exactly once
-- Returns: is_applicable, discount, remaining_items, items_consumed, free_item_name
-- ============================================
CREATE OR REPLACE FUNCTION try_apply_offer_once(
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
BEGIN
  -- ============================================
  -- BUNDLE OFFER
  -- ============================================
  IF p_offer_type = 'bundle' THEN
    v_fixed_price := COALESCE((v_config->>'fixed_price')::INTEGER, 0);
    v_bundle_cats := v_config->'bundle_categories';

    IF v_bundle_cats IS NULL THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    v_remaining := p_items;
    v_consumed := '[]'::JSONB;
    v_bundle_total := 0;

    -- For each category in bundle
    FOR v_bundle_cat IN
      SELECT
        -- Support both 'category_id' (string) and 'category_ids' (array) formats
        CASE
          WHEN bc->>'category_id' IS NOT NULL THEN
            ARRAY[(bc->>'category_id')::UUID]
          WHEN bc->'category_ids' IS NOT NULL THEN
            ARRAY(SELECT (jsonb_array_elements_text(bc->'category_ids'))::UUID)
          ELSE
            ARRAY[]::UUID[]
        END AS cat_ids,
        COALESCE((bc->>'quantity')::INTEGER, 1) AS required_qty
      FROM jsonb_array_elements(v_bundle_cats) AS bc
    LOOP
      v_needed := v_bundle_cat.required_qty;

      -- Get available items in ANY of the allowed categories (sorted by price DESC for bundles)
      SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
      INTO v_cat_items
      FROM jsonb_array_elements(v_remaining) AS item
      WHERE (item->>'category_id')::UUID = ANY(v_bundle_cat.cat_ids)
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
  -- ============================================
  IF p_offer_type = 'buy_x_get_y' THEN
    v_trigger_qty := COALESCE((v_config->>'trigger_quantity')::INTEGER, 0);
    v_reward_qty := COALESCE((v_config->>'reward_quantity')::INTEGER, 1);

    IF v_trigger_qty <= 0 THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    -- Get category IDs
    IF (v_config->>'type') = 'category_choice' AND v_config->'trigger_category_ids' IS NOT NULL THEN
      SELECT ARRAY(SELECT (jsonb_array_elements_text(v_config->'trigger_category_ids'))::UUID) INTO v_trigger_cats;
      SELECT ARRAY(SELECT (jsonb_array_elements_text(v_config->'reward_category_ids'))::UUID) INTO v_reward_cats;
    ELSE
      -- Legacy item-based mode - skip for now
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    v_remaining := p_items;

    -- ============================================
    -- SAME CATEGORY (trigger = reward)
    -- Need (trigger_qty + reward_qty) items total
    -- Give the cheapest one(s) free
    -- ============================================
    IF v_trigger_cats && v_reward_cats THEN
      DECLARE
        v_overlap_cats UUID[];
        v_total_needed INTEGER;
        v_available_items JSONB;
        v_sorted_items JSONB;
      BEGIN
        SELECT ARRAY(
          SELECT unnest(v_trigger_cats)
          INTERSECT
          SELECT unnest(v_reward_cats)
        ) INTO v_overlap_cats;

        v_total_needed := v_trigger_qty + v_reward_qty;

        -- Get available items in overlapping categories
        SELECT jsonb_agg(item)
        INTO v_available_items
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_overlap_cats)
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
          v_consumed := v_consumed || jsonb_build_array(jsonb_build_object(
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
          v_consumed := v_consumed || jsonb_build_array(jsonb_build_object(
            'menu_item_id', v_item->>'menu_item_id',
            'item_name', v_item->>'item_name',
            'price', (v_item->>'price')::INTEGER,
            'role', 'trigger'
          ));
          v_remaining := mark_item_used(v_remaining, v_item);
        END LOOP;

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
      BEGIN
        -- Get trigger items (sorted by price DESC - use most expensive as triggers)
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
        INTO v_trigger_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_trigger_cats)
          AND (item->>'used')::BOOLEAN = FALSE;

        -- Get reward items (sorted by price ASC - give cheapest free)
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
        INTO v_reward_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id')::UUID = ANY(v_reward_cats)
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
          v_consumed := v_consumed || jsonb_build_array(jsonb_build_object(
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
        RETURN;
      END;
    END IF;
  END IF;

  -- Unknown offer type
  RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- HELPER: Mark an item as used in the items array
-- ============================================
CREATE OR REPLACE FUNCTION mark_item_used(
  p_items JSONB,
  p_item_to_mark JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_item JSONB;
  v_marked BOOLEAN := FALSE;
  v_target_id TEXT;
  v_target_index INTEGER;
BEGIN
  v_target_id := p_item_to_mark->>'menu_item_id';
  v_target_index := (p_item_to_mark->>'item_index')::INTEGER;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT v_marked
       AND v_item->>'menu_item_id' = v_target_id
       AND (v_item->>'item_index')::INTEGER = v_target_index
       AND (v_item->>'used')::BOOLEAN = FALSE
    THEN
      -- Mark this item as used
      v_result := v_result || jsonb_build_array(
        v_item || jsonb_build_object('used', TRUE)
      );
      v_marked := TRUE;
    ELSE
      v_result := v_result || jsonb_build_array(v_item);
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- Add comment for documentation
-- ============================================
COMMENT ON FUNCTION get_optimized_offers IS
'Calculates the optimal combination of offers for a cart.
Uses exhaustive search to find the maximum discount.
Fixes bugs #1 (greedy), #4 (trigger/reward), #6 (isolation), #7 (items_consumed).

Parameters:
- p_foodtruck_id: The foodtruck UUID
- p_cart_items: JSONB array of cart items with menu_item_id, category_id, price, quantity, name
- p_order_amount: Total order amount in cents
- p_promo_code: Optional promo code to apply

Returns: Table of applied offers with discount details and items consumed.';

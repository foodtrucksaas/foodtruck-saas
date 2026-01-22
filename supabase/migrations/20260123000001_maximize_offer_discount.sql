-- ============================================
-- MAXIMIZE OFFER DISCOUNT STRATEGY
-- ============================================
-- Problem: Current algorithm always gives the cheapest item as reward,
-- which protects merchant margin but doesn't maximize customer discount.
--
-- Solution: Explore both strategies (give cheapest vs give most expensive)
-- and let the exhaustive search find the global optimum.
--
-- Example: 6 pizzas (3x10€ + 3x15€), Buy 2 Get 1
--   Strategy A (current): triggers=15+15, reward=10 → 10€ discount
--                        triggers=15+10, reward=10 → 10€ discount
--                        Total: 20€
--   Strategy B (maximize): triggers=10+10, reward=15 → 15€ discount
--                         triggers=15+15, reward=10 → 10€ discount
--                         Total: 25€
-- ============================================

-- Add strategy parameter to try_apply_offer_once
DROP FUNCTION IF EXISTS try_apply_offer_once(UUID, offer_type, JSONB, JSONB);
DROP FUNCTION IF EXISTS try_apply_offer_once(UUID, offer_type, JSONB, JSONB, BOOLEAN);

CREATE OR REPLACE FUNCTION try_apply_offer_once(
  p_offer_id UUID,
  p_offer_type offer_type,
  p_config JSONB,
  p_items JSONB,
  p_maximize_discount BOOLEAN DEFAULT FALSE  -- NEW: When true, give most expensive as reward
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
  v_bundle_cats JSONB;
  v_bundle_price INTEGER;
  v_trigger_qty INTEGER;
  v_reward_qty INTEGER;
  v_trigger_cats UUID[];
  v_reward_cats UUID[];
  v_items_selected JSONB;
  v_cat_items JSONB;
  v_total_price INTEGER;
  i INTEGER;
  v_bundle_cat RECORD;
  v_temp_consumed JSONB := '[]'::JSONB;
  v_trigger_order TEXT;  -- ASC or DESC for triggers
  v_reward_order TEXT;   -- ASC or DESC for rewards
BEGIN
  -- Determine sort order based on strategy
  IF p_maximize_discount THEN
    -- Maximize discount: use cheap items as triggers, expensive as rewards
    v_trigger_order := 'ASC';
    v_reward_order := 'DESC';
  ELSE
    -- Protect margin (default): use expensive as triggers, cheap as rewards
    v_trigger_order := 'DESC';
    v_reward_order := 'ASC';
  END IF;

  -- ============================================
  -- BUNDLE OFFER (always use most expensive for max discount)
  -- ============================================
  IF p_offer_type = 'bundle' THEN
    v_bundle_cats := p_config->'bundle_categories';
    v_bundle_price := COALESCE((p_config->>'fixed_price')::INTEGER, 0);

    IF v_bundle_cats IS NULL OR jsonb_array_length(v_bundle_cats) = 0 THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    v_total_price := 0;

    FOR v_bundle_cat IN
      SELECT
        CASE
          WHEN bc->>'category_id' IS NOT NULL AND length(bc->>'category_id') > 0 THEN
            ARRAY[(bc->>'category_id')::UUID]
          WHEN bc->'category_ids' IS NOT NULL AND jsonb_array_length(bc->'category_ids') > 0 THEN
            ARRAY(SELECT (jsonb_array_elements_text(bc->'category_ids'))::UUID)
          ELSE
            ARRAY[]::UUID[]
        END AS cat_ids,
        COALESCE((bc->>'quantity')::INTEGER, 1) AS required_qty
      FROM jsonb_array_elements(v_bundle_cats) AS bc
    LOOP
      IF array_length(v_bundle_cat.cat_ids, 1) IS NULL OR array_length(v_bundle_cat.cat_ids, 1) = 0 THEN
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- Always pick most expensive for bundles to maximize discount
      SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
      INTO v_cat_items
      FROM jsonb_array_elements(v_remaining) AS item
      WHERE (item->>'category_id') IS NOT NULL
        AND (item->>'category_id')::UUID = ANY(v_bundle_cat.cat_ids)
        AND (item->>'used')::BOOLEAN = FALSE;

      IF v_cat_items IS NULL OR jsonb_array_length(v_cat_items) < v_bundle_cat.required_qty THEN
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      FOR i IN 0..v_bundle_cat.required_qty-1 LOOP
        v_item := v_cat_items->i;
        v_total_price := v_total_price + (v_item->>'price')::INTEGER;
        v_temp_consumed := v_temp_consumed || jsonb_build_array(jsonb_build_object(
          'menu_item_id', v_item->>'menu_item_id',
          'item_name', v_item->>'item_name',
          'price', (v_item->>'price')::INTEGER,
          'role', 'bundle_item'
        ));
        v_remaining := mark_item_used(v_remaining, v_item);
      END LOOP;
    END LOOP;

    IF v_total_price > v_bundle_price THEN
      v_discount := v_total_price - v_bundle_price;
      v_consumed := v_temp_consumed;
      RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, NULL::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
    END IF;
    RETURN;
  END IF;

  -- ============================================
  -- BUY X GET Y OFFER (with strategy support)
  -- ============================================
  IF p_offer_type = 'buy_x_get_y' THEN
    v_trigger_qty := COALESCE((p_config->>'trigger_quantity')::INTEGER, 2);
    v_reward_qty := COALESCE((p_config->>'reward_quantity')::INTEGER, 1);

    -- Get trigger category IDs
    IF p_config->'trigger_category_ids' IS NOT NULL AND jsonb_array_length(p_config->'trigger_category_ids') > 0 THEN
      SELECT ARRAY(SELECT (jsonb_array_elements_text(p_config->'trigger_category_ids'))::UUID)
      INTO v_trigger_cats;
    ELSE
      v_trigger_cats := ARRAY[]::UUID[];
    END IF;

    -- Get reward category IDs
    IF p_config->'reward_category_ids' IS NOT NULL AND jsonb_array_length(p_config->'reward_category_ids') > 0 THEN
      SELECT ARRAY(SELECT (jsonb_array_elements_text(p_config->'reward_category_ids'))::UUID)
      INTO v_reward_cats;
    ELSE
      v_reward_cats := v_trigger_cats;
    END IF;

    IF array_length(v_trigger_cats, 1) IS NULL OR array_length(v_trigger_cats, 1) = 0 THEN
      RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
      RETURN;
    END IF;

    DECLARE
      v_trigger_items_avail JSONB;
      v_reward_items_avail JSONB;
      v_temp_triggers JSONB := '[]'::JSONB;
      v_temp_rewards JSONB := '[]'::JSONB;
    BEGIN
      -- STEP 1: Get trigger items with strategy-based sorting
      IF p_maximize_discount THEN
        -- Maximize: use cheapest as triggers (save expensive for rewards)
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
        INTO v_trigger_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_trigger_cats)
          AND (item->>'used')::BOOLEAN = FALSE;
      ELSE
        -- Default: use most expensive as triggers
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
        INTO v_trigger_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_trigger_cats)
          AND (item->>'used')::BOOLEAN = FALSE;
      END IF;

      IF v_trigger_items_avail IS NULL OR jsonb_array_length(v_trigger_items_avail) < v_trigger_qty THEN
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- STEP 2: Consume trigger items
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

      -- STEP 3: Get reward items with strategy-based sorting
      IF p_maximize_discount THEN
        -- Maximize: give most expensive as reward
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
        INTO v_reward_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_reward_cats)
          AND (item->>'used')::BOOLEAN = FALSE;
      ELSE
        -- Default: give cheapest as reward
        SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
        INTO v_reward_items_avail
        FROM jsonb_array_elements(v_remaining) AS item
        WHERE (item->>'category_id') IS NOT NULL
          AND (item->>'category_id')::UUID = ANY(v_reward_cats)
          AND (item->>'used')::BOOLEAN = FALSE;
      END IF;

      IF v_reward_items_avail IS NULL OR jsonb_array_length(v_reward_items_avail) < v_reward_qty THEN
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- STEP 4: Consume reward items
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

      v_consumed := v_temp_triggers || v_temp_rewards;
      RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, v_free_name;
      RETURN;
    END;
  END IF;

  -- Unknown offer type
  RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- UPDATE find_best_offer_combination to try BOTH strategies
-- ============================================
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
  v_max_depth CONSTANT INTEGER := 50;
  v_strategy BOOLEAN;  -- TRUE = maximize, FALSE = protect margin
BEGIN
  -- Check recursion depth
  IF p_depth >= v_max_depth THEN
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
    ORDER BY o.id
  LOOP
    -- Try BOTH strategies for each offer
    FOR v_strategy IN SELECT unnest(ARRAY[FALSE, TRUE]) LOOP
      -- Try to apply this offer with this strategy
      SELECT * INTO v_application
      FROM try_apply_offer_once(v_offer.id, v_offer.offer_type, v_offer.config, p_remaining_items, v_strategy);

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
          p_depth + 1
        );

        -- Update best if this path is better
        IF v_sub_result.best_discount > v_best_discount THEN
          v_best_discount := v_sub_result.best_discount;
          v_best_offers := v_sub_result.best_offers;
        END IF;
      END IF;
    END LOOP;  -- End strategy loop
  END LOOP;  -- End offer loop

  RETURN QUERY SELECT v_best_offers, v_best_discount;
END;
$$ LANGUAGE plpgsql;

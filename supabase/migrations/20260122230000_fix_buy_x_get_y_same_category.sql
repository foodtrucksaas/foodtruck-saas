-- ============================================
-- FIX: Buy X Get Y same category bug
-- ============================================
-- Bug: When trigger and reward categories are the same (e.g., pizzas -> pizzas),
-- the reward items are selected from the pool BEFORE trigger items are marked as used.
-- This can cause the same item to be counted as both trigger AND reward.
--
-- Fix: Select trigger items first, mark them as used, THEN select reward items
-- from the updated (filtered) pool.
-- ============================================

DROP FUNCTION IF EXISTS try_apply_offer_once(UUID, offer_type, JSONB, JSONB);

CREATE OR REPLACE FUNCTION try_apply_offer_once(
  p_offer_id UUID,
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
BEGIN
  -- ============================================
  -- BUNDLE OFFER
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
  -- BUY X GET Y OFFER (FIXED!)
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

    -- Get reward category IDs (default to trigger categories if not specified)
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
      -- STEP 1: Get trigger items (sorted by price DESC - use most expensive as triggers)
      SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
      INTO v_trigger_items_avail
      FROM jsonb_array_elements(v_remaining) AS item
      WHERE (item->>'category_id') IS NOT NULL
        AND (item->>'category_id')::UUID = ANY(v_trigger_cats)
        AND (item->>'used')::BOOLEAN = FALSE;

      -- Check if enough trigger items
      IF v_trigger_items_avail IS NULL OR jsonb_array_length(v_trigger_items_avail) < v_trigger_qty THEN
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- STEP 2: Consume trigger items FIRST (mark as used)
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

      -- STEP 3: NOW get reward items from UPDATED pool (after triggers are marked as used)
      -- This is the FIX: reward selection happens AFTER trigger items are consumed
      SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
      INTO v_reward_items_avail
      FROM jsonb_array_elements(v_remaining) AS item
      WHERE (item->>'category_id') IS NOT NULL
        AND (item->>'category_id')::UUID = ANY(v_reward_cats)
        AND (item->>'used')::BOOLEAN = FALSE;

      -- Check if enough reward items (after triggers consumed)
      IF v_reward_items_avail IS NULL OR jsonb_array_length(v_reward_items_avail) < v_reward_qty THEN
        -- Not enough items for reward - rollback and return false
        RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
        RETURN;
      END IF;

      -- STEP 4: Consume reward items (free - give cheapest)
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

      -- Combine: triggers first, then rewards
      v_consumed := v_temp_triggers || v_temp_rewards;

      RETURN QUERY SELECT TRUE, v_discount, v_remaining, v_consumed, v_free_name;
      RETURN;
    END;
  END IF;

  -- Unknown offer type
  RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;


-- Also fix the item-based version
DROP FUNCTION IF EXISTS try_apply_item_based_offer(UUID[], UUID[], INTEGER, INTEGER, JSONB);

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
  v_temp_triggers JSONB := '[]'::JSONB;
  v_temp_rewards JSONB := '[]'::JSONB;
  i INTEGER;
BEGIN
  -- STEP 1: Get trigger items by specific item IDs (sorted by price DESC)
  SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
  INTO v_trigger_items_avail
  FROM jsonb_array_elements(v_remaining) AS item
  WHERE (item->>'menu_item_id')::UUID = ANY(p_trigger_item_ids)
    AND (item->>'used')::BOOLEAN = FALSE;

  -- Check if enough trigger items
  IF v_trigger_items_avail IS NULL OR jsonb_array_length(v_trigger_items_avail) < p_trigger_qty THEN
    RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 2: Consume trigger items FIRST
  FOR i IN 0..p_trigger_qty-1 LOOP
    v_item := v_trigger_items_avail->i;
    v_temp_triggers := v_temp_triggers || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'item_name', v_item->>'item_name',
      'price', (v_item->>'price')::INTEGER,
      'role', 'trigger'
    ));
    v_remaining := mark_item_used(v_remaining, v_item);
  END LOOP;

  -- STEP 3: NOW get reward items from UPDATED pool
  SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
  INTO v_reward_items_avail
  FROM jsonb_array_elements(v_remaining) AS item
  WHERE (item->>'menu_item_id')::UUID = ANY(p_reward_item_ids)
    AND (item->>'used')::BOOLEAN = FALSE;

  -- Check if enough reward items
  IF v_reward_items_avail IS NULL OR jsonb_array_length(v_reward_items_avail) < p_reward_qty THEN
    RETURN QUERY SELECT FALSE, 0, p_items, '[]'::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 4: Consume reward items (free)
  FOR i IN 0..p_reward_qty-1 LOOP
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
END;
$$ LANGUAGE plpgsql;

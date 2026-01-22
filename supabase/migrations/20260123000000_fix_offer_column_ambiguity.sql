-- ============================================
-- FIX: Column ambiguity in get_optimized_offers
-- ============================================
-- Bug: CTE column aliases (offer_id, offer_name, etc.) conflict with
-- function RETURNS TABLE column names, causing "column reference is ambiguous" error.
--
-- Fix: Use g. prefix to explicitly reference CTE columns
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
        generate_series(1, LEAST((item->>'quantity')::INTEGER, 50)) AS item_index  -- Increased limit to 50
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
  -- STEP 2: FIND BEST COMBINATION
  -- ============================================
  SELECT * INTO v_best_result, v_best_discount
  FROM find_best_offer_combination(
    p_foodtruck_id,
    v_expanded_items,
    '[]'::JSONB,
    0,
    0
  );

  -- ============================================
  -- STEP 2.5: CONSOLIDATE MULTIPLE APPLICATIONS
  -- FIX: Use g. prefix to avoid column ambiguity
  -- ============================================
  WITH grouped AS (
    SELECT
      r->>'offer_id' AS g_offer_id,
      r->>'offer_name' AS g_offer_name,
      r->>'offer_type' AS g_offer_type,
      COUNT(*)::INTEGER AS g_times_applied,
      (r->>'discount_per_application')::INTEGER AS g_discount_per_app,
      SUM((r->>'calculated_discount')::INTEGER)::INTEGER AS g_calculated_discount,
      jsonb_agg(r->'items_consumed') AS g_all_items_consumed,
      r->>'free_item_name' AS g_free_item_name
    FROM jsonb_array_elements(v_best_result) AS r
    GROUP BY
      r->>'offer_id',
      r->>'offer_name',
      r->>'offer_type',
      r->>'discount_per_application',
      r->>'free_item_name'
  )
  SELECT jsonb_agg(jsonb_build_object(
    'offer_id', g_offer_id,
    'offer_name', g_offer_name,
    'offer_type', g_offer_type,
    'times_applied', g_times_applied,
    'discount_per_application', g_discount_per_app,
    'calculated_discount', g_calculated_discount,
    'items_consumed', (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(g_all_items_consumed) AS arr,
           jsonb_array_elements(arr) AS elem
    ),
    'free_item_name', g_free_item_name
  ))
  INTO v_consolidated
  FROM grouped;

  v_best_result := COALESCE(v_consolidated, '[]'::JSONB);

  -- ============================================
  -- STEP 3: ADD THRESHOLD DISCOUNT
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

  -- ============================================
  -- STEP 4: ADD PROMO CODE
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
          RAISE WARNING 'get_optimized_offers: Error processing promo code %: %', v_offer.id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- ============================================
  -- STEP 5: RETURN RESULTS
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
  FROM jsonb_array_elements(v_best_result) AS r
  ORDER BY (r->>'calculated_discount')::INTEGER DESC;
END;
$$ LANGUAGE plpgsql;

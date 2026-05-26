-- Migration: Add max_discount_percent_per_order safety cap on foodtrucks
-- Default 50% — prevents accidental excessive discounts from stacked offers

-- ============================================
-- 1. Add column to foodtrucks
-- ============================================
ALTER TABLE foodtrucks
  ADD COLUMN max_discount_percent_per_order INTEGER NOT NULL DEFAULT 50
  CONSTRAINT max_discount_percent_per_order_range CHECK (max_discount_percent_per_order BETWEEN 0 AND 100);

-- ============================================
-- 2. Replace get_optimized_offers to enforce the cap
-- ============================================
CREATE OR REPLACE FUNCTION get_optimized_offers(
  p_foodtruck_id UUID,
  p_cart_items JSONB,
  p_order_amount INTEGER,
  p_promo_code TEXT DEFAULT NULL,
  p_check_date TIMESTAMPTZ DEFAULT NULL
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
)
AS $$
DECLARE
  v_expanded_items JSONB;
  v_strat_a_step1 RECORD;
  v_strat_a_step2 RECORD;
  v_strat_b_step1 RECORD;
  v_strat_b_step2 RECORD;
  v_discount_a INTEGER := 0;
  v_discount_b INTEGER := 0;
  v_results_a JSONB := '[]'::JSONB;
  v_results_b JSONB := '[]'::JSONB;
  v_best_results JSONB := '[]'::JSONB;
  v_offer RECORD;
  v_threshold_discount INTEGER;
  v_promo_discount INTEGER;
  v_max_items INTEGER := 100;
  v_local_now TIMESTAMP;
  v_local_dow INTEGER;
  -- Cap variables
  v_max_discount_pct INTEGER;
  v_max_discount_amount INTEGER;
  v_total_discount INTEGER;
  v_scale_factor NUMERIC;
BEGIN
  -- Compute local time for day-of-week filtering
  v_local_now := COALESCE(p_check_date, NOW()) AT TIME ZONE 'Europe/Paris';
  v_local_dow := EXTRACT(DOW FROM v_local_now)::INTEGER;

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
  FROM process_bundle_offers(p_foodtruck_id, v_expanded_items, p_check_date);

  SELECT * INTO v_strat_a_step2
  FROM process_buy_x_get_y_offers(p_foodtruck_id, COALESCE(v_strat_a_step1.remaining_items, v_expanded_items), p_check_date);

  v_discount_a := COALESCE(v_strat_a_step1.total_discount, 0) + COALESCE(v_strat_a_step2.total_discount, 0);
  v_results_a := COALESCE(v_strat_a_step1.results, '[]'::JSONB) || COALESCE(v_strat_a_step2.results, '[]'::JSONB);

  -- ============================================
  -- STEP 3: STRATEGY B - Buy X Get Y first, then Bundles
  -- ============================================
  SELECT * INTO v_strat_b_step1
  FROM process_buy_x_get_y_offers(p_foodtruck_id, v_expanded_items, p_check_date);

  SELECT * INTO v_strat_b_step2
  FROM process_bundle_offers(p_foodtruck_id, COALESCE(v_strat_b_step1.remaining_items, v_expanded_items), p_check_date);

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
      AND (o.days_of_week IS NULL OR v_local_dow = ANY(o.days_of_week))
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
        AND (o.days_of_week IS NULL OR v_local_dow = ANY(o.days_of_week))
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
  -- STEP 7: ENFORCE MAX DISCOUNT CAP
  -- ============================================
  SELECT f.max_discount_percent_per_order INTO v_max_discount_pct
  FROM foodtrucks f WHERE f.id = p_foodtruck_id;

  v_max_discount_pct := COALESCE(v_max_discount_pct, 50);
  v_max_discount_amount := (p_order_amount * v_max_discount_pct / 100);

  -- Calculate total discount across all results
  SELECT COALESCE(SUM((r->>'calculated_discount')::INTEGER), 0)
  INTO v_total_discount
  FROM jsonb_array_elements(v_best_results) AS r;

  -- If total exceeds cap, scale down each offer's discount proportionally
  IF v_total_discount > v_max_discount_amount AND v_total_discount > 0 THEN
    v_scale_factor := v_max_discount_amount::NUMERIC / v_total_discount::NUMERIC;

    SELECT jsonb_agg(
      jsonb_set(
        jsonb_set(
          r,
          '{calculated_discount}',
          to_jsonb(GREATEST(FLOOR((r->>'calculated_discount')::NUMERIC * v_scale_factor)::INTEGER, 0))
        ),
        '{discount_per_application}',
        to_jsonb(GREATEST(FLOOR((r->>'discount_per_application')::NUMERIC * v_scale_factor)::INTEGER, 0))
      )
    )
    INTO v_best_results
    FROM jsonb_array_elements(v_best_results) AS r;
  END IF;

  -- ============================================
  -- STEP 8: RETURN RESULTS
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

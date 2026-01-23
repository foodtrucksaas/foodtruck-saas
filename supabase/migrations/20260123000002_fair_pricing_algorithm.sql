-- ============================================
-- FAIR PRICING ALGORITHM (ANTI-GAMING)
-- ============================================
-- Principe: Donner au client EXACTEMENT ce qu'il obtiendrait
-- en scindant sa commande de manière optimale.
--
-- Règle: Offrir l'item le MOINS CHER, mais empêcher le gaming.
--
-- Algorithme pour Buy X Get Y avec N items (triés par prix croissant):
--   1. k = floor(N / (X+Y)) applications possibles
--   2. Ignorer les (N mod (X+Y)) items les MOINS chers
--   3. Grouper les k*(X+Y) items restants en k groupes consécutifs
--   4. Pour chaque groupe, offrir les Y items les moins chers
--
-- Exemple: 4 pizzas (6€,7€,8€,9€), Buy 2 Get 1:
--   - k = floor(4/3) = 1 application
--   - Ignorer 1 item (le moins cher: 6€)
--   - Groupe: (7€,8€,9€) → offrir 7€
--   - Résultat: -7€ (pas 6€, pas 9€)
--
-- Cela correspond exactement à ce que le client obtiendrait
-- en commandant (7,8,9) puis (6) séparément.
-- ============================================

-- ============================================
-- NOUVELLE FONCTION: Fair pricing pour Buy X Get Y
-- ============================================
DROP FUNCTION IF EXISTS calculate_fair_buy_x_get_y_discount(JSONB, INTEGER, INTEGER, UUID[]);

CREATE OR REPLACE FUNCTION calculate_fair_buy_x_get_y_discount(
  p_items JSONB,           -- Items du panier avec category_id et price
  p_trigger_qty INTEGER,   -- X dans "Buy X Get Y" (ex: 2)
  p_reward_qty INTEGER,    -- Y dans "Buy X Get Y" (ex: 1)
  p_eligible_cats UUID[]   -- Catégories éligibles
)
RETURNS TABLE (
  total_discount INTEGER,
  num_applications INTEGER,
  items_used JSONB
) AS $$
DECLARE
  v_group_size INTEGER;
  v_eligible_items JSONB;
  v_num_eligible INTEGER;
  v_k INTEGER;
  v_skip INTEGER;
  v_discount INTEGER := 0;
  v_items_used JSONB := '[]'::JSONB;
  v_item JSONB;
  v_group_start INTEGER;
  v_i INTEGER;
  v_j INTEGER;
BEGIN
  v_group_size := p_trigger_qty + p_reward_qty;  -- Ex: 2+1 = 3

  -- Récupérer les items éligibles triés par prix CROISSANT
  SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER ASC)
  INTO v_eligible_items
  FROM jsonb_array_elements(p_items) AS item
  WHERE (item->>'category_id') IS NOT NULL
    AND (item->>'category_id')::UUID = ANY(p_eligible_cats)
    AND (item->>'used')::BOOLEAN = FALSE;

  IF v_eligible_items IS NULL THEN
    RETURN QUERY SELECT 0, 0, '[]'::JSONB;
    RETURN;
  END IF;

  v_num_eligible := jsonb_array_length(v_eligible_items);

  -- Calcul: combien d'applications possibles
  v_k := v_num_eligible / v_group_size;  -- Division entière PostgreSQL

  IF v_k = 0 THEN
    RETURN QUERY SELECT 0, 0, '[]'::JSONB;
    RETURN;
  END IF;

  -- Combien d'items à ignorer (les moins chers)
  v_skip := v_num_eligible - (v_k * v_group_size);

  -- Traiter chaque groupe
  FOR v_i IN 0..v_k-1 LOOP
    v_group_start := v_skip + (v_i * v_group_size);

    -- Les Y premiers items du groupe sont les rewards (les moins chers du groupe)
    FOR v_j IN 0..p_reward_qty-1 LOOP
      v_item := v_eligible_items->(v_group_start + v_j);
      v_discount := v_discount + (v_item->>'price')::INTEGER;
      v_items_used := v_items_used || jsonb_build_array(jsonb_build_object(
        'menu_item_id', v_item->>'menu_item_id',
        'item_name', v_item->>'item_name',
        'price', (v_item->>'price')::INTEGER,
        'role', 'reward'
      ));
    END LOOP;

    -- Les X items restants sont les triggers
    FOR v_j IN p_reward_qty..v_group_size-1 LOOP
      v_item := v_eligible_items->(v_group_start + v_j);
      v_items_used := v_items_used || jsonb_build_array(jsonb_build_object(
        'menu_item_id', v_item->>'menu_item_id',
        'item_name', v_item->>'item_name',
        'price', (v_item->>'price')::INTEGER,
        'role', 'trigger'
      ));
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_discount, v_k, v_items_used;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- NOUVELLE FONCTION: Fair pricing pour Bundles
-- ============================================
-- Pour les bundles: toujours utiliser les items les plus chers
-- (la logique actuelle est déjà correcte pour les bundles)

DROP FUNCTION IF EXISTS calculate_fair_bundle_discount(JSONB, JSONB, INTEGER);

CREATE OR REPLACE FUNCTION calculate_fair_bundle_discount(
  p_items JSONB,           -- Items du panier
  p_bundle_cats JSONB,     -- Configuration des catégories du bundle
  p_fixed_price INTEGER    -- Prix fixe du bundle
)
RETURNS TABLE (
  total_discount INTEGER,
  is_applicable BOOLEAN,
  items_used JSONB
) AS $$
DECLARE
  v_bundle_cat RECORD;
  v_cat_items JSONB;
  v_total_price INTEGER := 0;
  v_items_used JSONB := '[]'::JSONB;
  v_item JSONB;
  v_i INTEGER;
BEGIN
  IF p_bundle_cats IS NULL OR jsonb_array_length(p_bundle_cats) = 0 THEN
    RETURN QUERY SELECT 0, FALSE, '[]'::JSONB;
    RETURN;
  END IF;

  -- Pour chaque catégorie du bundle
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
    FROM jsonb_array_elements(p_bundle_cats) AS bc
  LOOP
    IF array_length(v_bundle_cat.cat_ids, 1) IS NULL THEN
      RETURN QUERY SELECT 0, FALSE, '[]'::JSONB;
      RETURN;
    END IF;

    -- Prendre les items les plus chers de cette catégorie
    SELECT jsonb_agg(item ORDER BY (item->>'price')::INTEGER DESC)
    INTO v_cat_items
    FROM jsonb_array_elements(p_items) AS item
    WHERE (item->>'category_id') IS NOT NULL
      AND (item->>'category_id')::UUID = ANY(v_bundle_cat.cat_ids)
      AND (item->>'used')::BOOLEAN = FALSE;

    IF v_cat_items IS NULL OR jsonb_array_length(v_cat_items) < v_bundle_cat.required_qty THEN
      RETURN QUERY SELECT 0, FALSE, '[]'::JSONB;
      RETURN;
    END IF;

    FOR v_i IN 0..v_bundle_cat.required_qty-1 LOOP
      v_item := v_cat_items->v_i;
      v_total_price := v_total_price + (v_item->>'price')::INTEGER;
      v_items_used := v_items_used || jsonb_build_array(jsonb_build_object(
        'menu_item_id', v_item->>'menu_item_id',
        'item_name', v_item->>'item_name',
        'price', (v_item->>'price')::INTEGER,
        'role', 'bundle_item'
      ));
    END LOOP;
  END LOOP;

  IF v_total_price > p_fixed_price THEN
    RETURN QUERY SELECT v_total_price - p_fixed_price, TRUE, v_items_used;
  ELSE
    RETURN QUERY SELECT 0, FALSE, '[]'::JSONB;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- REMPLACER get_optimized_offers avec FAIR PRICING
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
  v_working_items JSONB;
  v_results JSONB := '[]'::JSONB;
  v_offer RECORD;
  v_buy_x_result RECORD;
  v_bundle_result RECORD;
  v_trigger_cats UUID[];
  v_reward_cats UUID[];
  v_trigger_qty INTEGER;
  v_reward_qty INTEGER;
  v_promo_discount INTEGER := 0;
  v_threshold_discount INTEGER := 0;
  v_total_discount INTEGER := 0;
  v_max_items CONSTANT INTEGER := 100;
  v_item JSONB;
  v_i INTEGER;
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
    ) ORDER BY price ASC)  -- Trié par prix croissant pour fair pricing
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

  v_working_items := v_expanded_items;

  -- ============================================
  -- STEP 2: PROCESS BUY_X_GET_Y OFFERS (FAIR PRICING)
  -- ============================================
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

      -- Get reward category IDs (default to trigger cats if not specified)
      IF v_offer.config->'reward_category_ids' IS NOT NULL
         AND jsonb_array_length(v_offer.config->'reward_category_ids') > 0 THEN
        SELECT ARRAY(SELECT (jsonb_array_elements_text(v_offer.config->'reward_category_ids'))::UUID)
        INTO v_reward_cats;
      ELSE
        v_reward_cats := v_trigger_cats;
      END IF;

      IF array_length(v_trigger_cats, 1) IS NULL OR array_length(v_trigger_cats, 1) = 0 THEN
        CONTINUE;
      END IF;

      -- Calculate fair pricing discount
      SELECT * INTO v_buy_x_result
      FROM calculate_fair_buy_x_get_y_discount(
        v_working_items,
        v_trigger_qty,
        v_reward_qty,
        v_trigger_cats  -- Use trigger cats (assuming same category for trigger/reward)
      );

      IF v_buy_x_result.total_discount > 0 THEN
        -- Mark used items
        FOR v_i IN 0..jsonb_array_length(v_buy_x_result.items_used)-1 LOOP
          v_item := v_buy_x_result.items_used->v_i;
          -- Find and mark item as used in working_items
          v_working_items := (
            SELECT jsonb_agg(
              CASE
                WHEN (item->>'menu_item_id') = (v_item->>'menu_item_id')
                  AND (item->>'price')::INTEGER = (v_item->>'price')::INTEGER
                  AND (item->>'used')::BOOLEAN = FALSE
                  AND NOT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(v_working_items) prev
                    WHERE (prev->>'menu_item_id') = (item->>'menu_item_id')
                      AND (prev->>'price')::INTEGER = (item->>'price')::INTEGER
                      AND (prev->>'used')::BOOLEAN = TRUE
                      AND prev != item
                  )
                THEN jsonb_set(item, '{used}', 'true')
                ELSE item
              END
            )
            FROM jsonb_array_elements(v_working_items) item
          );
        END LOOP;

        -- Get free item name (first reward item)
        DECLARE
          v_free_name TEXT := NULL;
        BEGIN
          SELECT item->>'item_name' INTO v_free_name
          FROM jsonb_array_elements(v_buy_x_result.items_used) AS item
          WHERE item->>'role' = 'reward'
          LIMIT 1;

          v_results := v_results || jsonb_build_array(jsonb_build_object(
            'offer_id', v_offer.id,
            'offer_name', v_offer.name,
            'offer_type', 'buy_x_get_y',
            'times_applied', v_buy_x_result.num_applications,
            'discount_per_application', v_buy_x_result.total_discount / v_buy_x_result.num_applications,
            'calculated_discount', v_buy_x_result.total_discount,
            'items_consumed', v_buy_x_result.items_used,
            'free_item_name', v_free_name
          ));
        END;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'get_optimized_offers: Error processing buy_x_get_y offer %: %', v_offer.id, SQLERRM;
    END;
  END LOOP;

  -- ============================================
  -- STEP 3: PROCESS BUNDLE OFFERS
  -- ============================================
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
      SELECT * INTO v_bundle_result
      FROM calculate_fair_bundle_discount(
        v_working_items,
        v_offer.config->'bundle_categories',
        COALESCE((v_offer.config->>'fixed_price')::INTEGER, 0)
      );

      IF v_bundle_result.is_applicable AND v_bundle_result.total_discount > 0 THEN
        -- Mark used items
        FOR v_i IN 0..jsonb_array_length(v_bundle_result.items_used)-1 LOOP
          v_item := v_bundle_result.items_used->v_i;
          v_working_items := (
            SELECT jsonb_agg(
              CASE
                WHEN (item->>'menu_item_id') = (v_item->>'menu_item_id')
                  AND (item->>'price')::INTEGER = (v_item->>'price')::INTEGER
                  AND (item->>'used')::BOOLEAN = FALSE
                THEN jsonb_set(item, '{used}', 'true')
                ELSE item
              END
            )
            FROM jsonb_array_elements(v_working_items) item
          );
        END LOOP;

        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'offer_id', v_offer.id,
          'offer_name', v_offer.name,
          'offer_type', 'bundle',
          'times_applied', 1,
          'discount_per_application', v_bundle_result.total_discount,
          'calculated_discount', v_bundle_result.total_discount,
          'items_consumed', v_bundle_result.items_used,
          'free_item_name', NULL
        ));
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'get_optimized_offers: Error processing bundle offer %: %', v_offer.id, SQLERRM;
    END;
  END LOOP;

  -- ============================================
  -- STEP 4: ADD THRESHOLD DISCOUNT
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
          v_results := v_results || jsonb_build_array(jsonb_build_object(
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
  -- STEP 5: ADD PROMO CODE
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
            v_results := v_results || jsonb_build_array(jsonb_build_object(
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
  -- STEP 6: RETURN RESULTS
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
  FROM jsonb_array_elements(v_results) AS r
  ORDER BY (r->>'calculated_discount')::INTEGER DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- CLEANUP: Drop old functions that are no longer needed
-- ============================================
DROP FUNCTION IF EXISTS try_apply_offer_once(UUID, offer_type, JSONB, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS try_apply_offer_once(UUID, offer_type, JSONB, JSONB);
DROP FUNCTION IF EXISTS find_best_offer_combination(UUID, JSONB, JSONB, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS mark_item_used(JSONB, JSONB);

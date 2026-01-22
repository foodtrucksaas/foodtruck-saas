-- ============================================
-- TEST SUITE: Robust Offer Optimization
-- ============================================
-- Run with: docker exec -i supabase_db_foodtruck-saas psql -U postgres -d postgres < supabase/tests/offer_optimization.test.sql

-- Setup test data
DO $$
DECLARE
  v_foodtruck_id UUID := '00000000-0000-0000-0000-000000000001';
  v_user_id UUID := '00000000-0000-0000-0000-000000000099';
  v_pizza_cat UUID := '00000000-0000-0000-0000-000000000010';
  v_dessert_cat UUID := '00000000-0000-0000-0000-000000000020';
  v_boisson_cat UUID := '00000000-0000-0000-0000-000000000030';
  v_offer_buy2get1 UUID := '00000000-0000-0000-0000-000000000100';
  v_offer_bundle UUID := '00000000-0000-0000-0000-000000000200';
  v_result RECORD;
  v_total_discount INTEGER;
  v_cart JSONB;
  v_has_trigger BOOLEAN;
  v_has_reward BOOLEAN;
  v_item JSONB;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SETUP: Creating test data';
  RAISE NOTICE '============================================';

  -- ============================================
  -- SETUP: Create test user and foodtruck
  -- ============================================

  -- Create test user if not exists
  INSERT INTO auth.users (id, email, instance_id, aud, role, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    v_user_id,
    'test@test.com',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    '',
    '{}',
    '{}',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create test foodtruck
  INSERT INTO foodtrucks (id, user_id, name)
  VALUES (v_foodtruck_id, v_user_id, 'Test Pizza Truck')
  ON CONFLICT (id) DO UPDATE SET name = 'Test Pizza Truck';

  -- Create test categories
  INSERT INTO categories (id, foodtruck_id, name, display_order)
  VALUES
    (v_pizza_cat, v_foodtruck_id, 'Pizzas', 1),
    (v_dessert_cat, v_foodtruck_id, 'Desserts', 2),
    (v_boisson_cat, v_foodtruck_id, 'Boissons', 3)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- ============================================
  -- SETUP: Create test offers
  -- ============================================

  -- Buy 2 Get 1 Free offer for pizzas
  INSERT INTO offers (id, foodtruck_id, name, offer_type, is_active, config)
  VALUES (
    v_offer_buy2get1,
    v_foodtruck_id,
    '2 pizzas = 3e offerte',
    'buy_x_get_y',
    TRUE,
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 2,
      'reward_quantity', 1,
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    config = EXCLUDED.config,
    is_active = TRUE;

  -- Bundle: Pizza + Dessert = 15€
  INSERT INTO offers (id, foodtruck_id, name, offer_type, is_active, config)
  VALUES (
    v_offer_bundle,
    v_foodtruck_id,
    'Formule Pizza + Dessert',
    'bundle',
    TRUE,
    jsonb_build_object(
      'fixed_price', 1500,
      'bundle_categories', jsonb_build_array(
        jsonb_build_object('category_id', v_pizza_cat::TEXT, 'quantity', 1),
        jsonb_build_object('category_id', v_dessert_cat::TEXT, 'quantity', 1)
      )
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    config = EXCLUDED.config,
    is_active = TRUE;

  RAISE NOTICE 'Test data created successfully';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST SUITE: Robust Offer Optimization';
  RAISE NOTICE '============================================';

  -- ============================================
  -- TEST 1: Buy 2 Get 1 Free - Basic Case
  -- 3 pizzas (10, 11, 12) → cheapest (10) free
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Buy 2 Get 1 Free - Basic (3 pizzas)';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1000, "quantity": 1, "name": "Margherita"},
    {"menu_item_id": "22222222-2222-2222-2222-222222222222", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1100, "quantity": 1, "name": "Pepperoni"},
    {"menu_item_id": "33333333-3333-3333-3333-333333333333", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1200, "quantity": 1, "name": "4 Fromages"}
  ]'::JSONB;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    3300,
    NULL
  );

  IF v_total_discount = 1000 THEN
    RAISE NOTICE '  PASS: Discount = 10 (Margherita free)';
  ELSE
    RAISE NOTICE '  FAIL: Expected 1000, got %', COALESCE(v_total_discount, 0);
  END IF;

  -- ============================================
  -- TEST 2: Buy 2 Get 1 Free - Multiple Applications
  -- 9 pizzas at 10€ each → 3 free = 30€ discount
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Buy 2 Get 1 Free - Multiple (9 pizzas)';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1000, "quantity": 9, "name": "Margherita"}
  ]'::JSONB;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    9000,
    NULL
  );

  IF v_total_discount = 3000 THEN
    RAISE NOTICE '  PASS: Discount = 30 (3 pizzas free)';
  ELSE
    RAISE NOTICE '  FAIL: Expected 3000, got %', COALESCE(v_total_discount, 0);
  END IF;

  -- ============================================
  -- TEST 3: Bundle - Basic Case
  -- 1 pizza (13€) + 1 dessert (5€) = 18€ → bundle 15€ → 3€ saving
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Bundle - Basic (pizza + dessert)';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1300, "quantity": 1, "name": "4 Formaggi"},
    {"menu_item_id": "44444444-4444-4444-4444-444444444444", "category_id": "00000000-0000-0000-0000-000000000020", "price": 500, "quantity": 1, "name": "Tiramisu"}
  ]'::JSONB;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    1800,
    NULL
  );

  IF v_total_discount = 300 THEN
    RAISE NOTICE '  PASS: Discount = 3 (bundle saving)';
  ELSE
    RAISE NOTICE '  FAIL: Expected 300, got %', COALESCE(v_total_discount, 0);
  END IF;

  -- ============================================
  -- TEST 4: Competition - Bundle vs Buy2Get1
  -- 4 pizzas (10, 11, 12, 13) + 1 dessert (5€)
  -- Optimal: Bundle(13+5=15€) + Buy2Get1(on 3 remaining, free 10€)
  -- Total discount: 3€ + 10€ = 13€
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Competition - Bundle + Buy2Get1 optimal';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1000, "quantity": 1, "name": "Margherita"},
    {"menu_item_id": "22222222-2222-2222-2222-222222222222", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1100, "quantity": 1, "name": "Napoli"},
    {"menu_item_id": "33333333-3333-3333-3333-333333333333", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1200, "quantity": 1, "name": "4 Saisons"},
    {"menu_item_id": "44444444-4444-4444-4444-444444444444", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1300, "quantity": 1, "name": "4 Formaggi"},
    {"menu_item_id": "55555555-5555-5555-5555-555555555555", "category_id": "00000000-0000-0000-0000-000000000020", "price": 500, "quantity": 1, "name": "Tiramisu"}
  ]'::JSONB;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    5100,
    NULL
  );

  IF v_total_discount = 1300 THEN
    RAISE NOTICE '  PASS: Discount = 13 (optimal combination)';
  ELSE
    RAISE NOTICE '  FAIL: Expected 1300, got %', COALESCE(v_total_discount, 0);
  END IF;

  -- ============================================
  -- TEST 5: Competition - Buy2Get1 alone is better
  -- 9 pizzas at 10€ + 1 dessert at 5€
  -- Option A: Bundle(10+5=12€, saving 3€) + 2x Buy2Get1 = 3€ + 20€ = 23€
  -- Option B: 3x Buy2Get1 (ignore bundle) = 30€ ← BETTER!
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Competition - Buy2Get1 alone better than Bundle+Buy2Get1';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1000, "quantity": 9, "name": "Margherita"},
    {"menu_item_id": "55555555-5555-5555-5555-555555555555", "category_id": "00000000-0000-0000-0000-000000000020", "price": 500, "quantity": 1, "name": "Tiramisu"}
  ]'::JSONB;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    9500,
    NULL
  );

  IF v_total_discount = 3000 THEN
    RAISE NOTICE '  PASS: Discount = 30 (Buy2Get1 x3, ignored bundle)';
  ELSE
    RAISE NOTICE '  FAIL: Expected 3000, got %', COALESCE(v_total_discount, 0);
  END IF;

  -- ============================================
  -- TEST 6: Items consumed correctly tracked
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Items consumed tracking';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1000, "quantity": 3, "name": "Margherita"}
  ]'::JSONB;

  SELECT items_consumed INTO v_result
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    3000,
    NULL
  )
  LIMIT 1;

  IF v_result.items_consumed IS NOT NULL AND jsonb_array_length(v_result.items_consumed) > 0 THEN
    RAISE NOTICE '  PASS: items_consumed is populated';
  ELSE
    RAISE NOTICE '  FAIL: items_consumed is empty or NULL';
  END IF;

  -- ============================================
  -- TEST 7: Trigger vs Reward distinction
  -- Check that roles are correctly assigned
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 7: Trigger vs Reward roles';

  v_has_trigger := FALSE;
  v_has_reward := FALSE;

  IF v_result.items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_result.items_consumed)
    LOOP
      IF v_item->>'role' = 'trigger' THEN v_has_trigger := TRUE; END IF;
      IF v_item->>'role' = 'reward' THEN v_has_reward := TRUE; END IF;
    END LOOP;
  END IF;

  IF v_has_trigger AND v_has_reward THEN
    RAISE NOTICE '  PASS: Both trigger and reward roles present';
  ELSE
    RAISE NOTICE '  FAIL: Missing roles (trigger=%, reward=%)', v_has_trigger, v_has_reward;
  END IF;

  -- ============================================
  -- TEST 8: Empty cart
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 8: Empty cart returns 0 discount';

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    '[]'::JSONB,
    0,
    NULL
  );

  IF COALESCE(v_total_discount, 0) = 0 THEN
    RAISE NOTICE '  PASS: Discount = 0 for empty cart';
  ELSE
    RAISE NOTICE '  FAIL: Expected 0, got %', v_total_discount;
  END IF;

  -- ============================================
  -- TEST 9: Not enough items for offer
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 9: Not enough items (2 pizzas for Buy2Get1)';

  v_cart := '[
    {"menu_item_id": "11111111-1111-1111-1111-111111111111", "category_id": "00000000-0000-0000-0000-000000000010", "price": 1000, "quantity": 2, "name": "Margherita"}
  ]'::JSONB;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(
    v_foodtruck_id,
    v_cart,
    2000,
    NULL
  );

  IF COALESCE(v_total_discount, 0) = 0 THEN
    RAISE NOTICE '  PASS: Discount = 0 (not enough for offer)';
  ELSE
    RAISE NOTICE '  FAIL: Expected 0, got %', v_total_discount;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST SUITE COMPLETE';
  RAISE NOTICE '============================================';

  -- ============================================
  -- CLEANUP: Remove test data (optional)
  -- ============================================
  -- DELETE FROM offers WHERE id IN (v_offer_buy2get1, v_offer_bundle);
  -- DELETE FROM categories WHERE foodtruck_id = v_foodtruck_id;
  -- DELETE FROM foodtrucks WHERE id = v_foodtruck_id;
  -- DELETE FROM users WHERE id = v_user_id;
  -- DELETE FROM auth.users WHERE id = v_user_id;

END $$;

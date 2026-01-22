-- ============================================
-- RUNNER UNIFIÉ - TOUS LES TESTS D'OFFRES
-- ============================================
-- Ce script crée les données de test, puis exécute tous les tests.
-- Run: docker exec -i supabase_db_foodtruck-saas psql -U postgres -d postgres < supabase/tests/run_all_tests.sql

-- ============================================
-- PHASE 1: SETUP DES DONNÉES DE TEST
-- ============================================

DO $$
DECLARE
  v_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';
  v_entree_cat UUID := '09c31d07-4652-43eb-a806-0126447c42cd';
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHASE 1: SETUP DES DONNÉES DE TEST';
  RAISE NOTICE '============================================';

  -- Clean up old test data first
  DELETE FROM offers WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM categories WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM foodtrucks WHERE id = v_foodtruck_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  -- Create test user
  INSERT INTO auth.users (id, email, instance_id, aud, role, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    v_user_id,
    'test-exhaustive-runner@test.com',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    '',
    '{}',
    '{}',
    NOW(),
    NOW()
  );

  -- Create test foodtruck
  INSERT INTO foodtrucks (id, user_id, name, description)
  VALUES (v_foodtruck_id, v_user_id, 'Camion Pizza Test', 'Foodtruck de test pour tests exhaustifs');

  -- Create test categories
  INSERT INTO categories (id, foodtruck_id, name, display_order)
  VALUES
    (v_pizza_cat, v_foodtruck_id, 'Pizzas', 1),
    (v_boisson_cat, v_foodtruck_id, 'Boissons', 2),
    (v_dessert_cat, v_foodtruck_id, 'Desserts', 3),
    (v_entree_cat, v_foodtruck_id, 'Entrées', 4);

  RAISE NOTICE 'Données de test créées:';
  RAISE NOTICE '  - Foodtruck: % (Camion Pizza Test)', v_foodtruck_id;
  RAISE NOTICE '  - Catégorie Pizzas: %', v_pizza_cat;
  RAISE NOTICE '  - Catégorie Boissons: %', v_boisson_cat;
  RAISE NOTICE '  - Catégorie Desserts: %', v_dessert_cat;
  RAISE NOTICE '  - Catégorie Entrées: %', v_entree_cat;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PHASE 2: TESTS BUY X GET Y EXHAUSTIFS
-- ============================================

DO $$
DECLARE
  -- IDs du foodtruck de test
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';

  -- Compteurs
  v_total_passed INTEGER := 0;
  v_total_failed INTEGER := 0;
  v_section_passed INTEGER;
  v_section_failed INTEGER;

  -- Variables de test
  v_cart JSONB;
  v_total_discount INTEGER;
  v_expected INTEGER;
  v_test_name TEXT;
  v_qty INTEGER;
  v_expected_free INTEGER;
  v_items_consumed JSONB;
  v_trigger_count INTEGER;
  v_reward_count INTEGER;
  v_item JSONB;

  -- Offer IDs
  v_buy2get1_offer_id UUID;
  v_buy3get1_offer_id UUID;
  v_buy1get1_offer_id UUID;

BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHASE 2: TESTS BUY X GET Y';
  RAISE NOTICE '============================================';

  -- Créer l'offre Buy 2 Get 1 sur les pizzas
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 2 Get 1 Pizzas',
    '2 pizzas achetées = 1 pizza offerte',
    'buy_x_get_y',
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 2,
      'reward_quantity', 1,
      'reward_type', 'free',
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_buy2get1_offer_id;
  RAISE NOTICE 'Offre Buy 2 Get 1 créée: %', v_buy2get1_offer_id;

  -- ============================================
  -- SECTION A: TESTS BASIQUES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION A: Tests basiques Buy 2 Get 1 ---';
  v_section_passed := 0;
  v_section_failed := 0;

  -- A01: Panier vide
  v_test_name := 'A01: Panier vide';
  v_cart := '[]'::JSONB;
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 0, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A02: 1 pizza (insuffisant)
  v_test_name := 'A02: 1 pizza seule';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A03: 2 pizzas (insuffisant - il faut 3 pour Buy 2 Get 1)
  v_test_name := 'A03: 2 pizzas (insuffisant)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A04: 3 pizzas même prix (1 offerte)
  v_test_name := 'A04: 3 pizzas même prix (10€) = 1 offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A05: 3 pizzas prix différents (maximize = plus chère offerte)
  v_test_name := 'A05: 3 pizzas (10€, 12€, 15€) = plus chère offerte (15€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages')
  );
  v_expected := 1500;  -- Maximize: offer the most expensive
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3700, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section A: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- SECTION B: TESTS DE QUANTITÉS (3-30)
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION B: Tests quantités (3-30 pizzas) ---';
  v_section_passed := 0;
  v_section_failed := 0;

  FOR v_qty IN 3..21 BY 3 LOOP
    v_expected_free := v_qty / 3;  -- Nombre de pizzas offertes
    v_expected := v_expected_free * 1000;  -- Réduction en centimes (pizzas à 10€)
    v_test_name := format('B: %s pizzas = %s offertes (-%s€)', v_qty, v_expected_free, v_expected/100);

    v_cart := jsonb_build_array(
      jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', v_qty, 'name', 'Margherita')
    );

    SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
    FROM get_optimized_offers(v_foodtruck_id, v_cart, v_qty * 1000, NULL);

    IF v_total_discount = v_expected THEN
      RAISE NOTICE '  [PASS] %', v_test_name;
      v_section_passed := v_section_passed + 1;
    ELSE
      RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
      v_section_failed := v_section_failed + 1;
    END IF;
  END LOOP;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section B: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- SECTION C: TESTS PRIX MIXTES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION C: Tests prix mixtes ---';
  v_section_passed := 0;
  v_section_failed := 0;

  -- C01: 6 pizzas, 2 types
  -- True optimal: maximize client discount → 15€ + 15€ free = 30€
  -- Algorithm uses cheap items as triggers, expensive as rewards
  v_test_name := 'C01: 6 pizzas (3x10€ + 3x15€) = optimal 30€ (15€+15€ free)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 3, 'name', '4 Fromages')
  );
  v_expected := 3000;  -- True optimal: 15€ + 15€ free (maximize discount)
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 7500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C02: 9 pizzas, 3 types
  -- True optimal: maximize → use cheap as triggers, expensive as rewards
  -- 3 applications: reward=12+12+12 = 36€
  v_test_name := 'C02: 9 pizzas (3x8€ + 3x10€ + 3x12€) = optimal 36€ (12€+12€+12€ free)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 3, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 3, 'name', '4 Saisons')
  );
  v_expected := 3600;  -- True optimal: 12€ + 12€ + 12€ free (maximize)
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section C: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- SECTION D: TESTS BOISSONS SEULES (pas d'offre)
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION D: Boissons seules (pas d''offre) ---';
  v_section_passed := 0;
  v_section_failed := 0;

  v_test_name := 'D01: 3 boissons (pas d''offre applicable)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 250, 'quantity', 3, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 750, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'D02: 10 boissons (pas d''offre applicable)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 250, 'quantity', 10, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section D: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- SECTION E: TESTS ITEMS CONSUMED ET ROLES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION E: Items consumed et roles ---';
  v_section_passed := 0;
  v_section_failed := 0;

  v_test_name := 'E01: Vérifier items_consumed populé';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL)
  LIMIT 1;
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) > 0 THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - items_consumed vide ou NULL', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'E02: Vérifier roles trigger/reward présents';
  v_trigger_count := 0;
  v_reward_count := 0;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed)
    LOOP
      IF v_item->>'role' = 'trigger' THEN v_trigger_count := v_trigger_count + 1; END IF;
      IF v_item->>'role' = 'reward' THEN v_reward_count := v_reward_count + 1; END IF;
    END LOOP;
  END IF;
  IF v_trigger_count > 0 AND v_reward_count > 0 THEN
    RAISE NOTICE '  [PASS] % (triggers=%, rewards=%)', v_test_name, v_trigger_count, v_reward_count;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - triggers=%, rewards=%', v_test_name, v_trigger_count, v_reward_count;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'E03: Buy 2 Get 1 doit avoir 2 triggers + 1 reward';
  IF v_trigger_count = 2 AND v_reward_count = 1 THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - triggers=% (attendu 2), rewards=% (attendu 1)', v_test_name, v_trigger_count, v_reward_count;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section E: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- Cleanup Buy 2 Get 1 offer
  DELETE FROM offers WHERE id = v_buy2get1_offer_id;

  -- ============================================
  -- SECTION F: BUY 3 GET 1
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION F: Buy 3 Get 1 ---';
  v_section_passed := 0;
  v_section_failed := 0;

  -- Créer offre Buy 3 Get 1
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 3 Get 1 Pizzas',
    '3 pizzas achetées = 1 pizza offerte',
    'buy_x_get_y',
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 3,
      'reward_quantity', 1,
      'reward_type', 'free',
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_buy3get1_offer_id;

  v_test_name := 'F01: 3 pizzas - pas d''offre (il en faut 4)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'F02: 4 pizzas à 10€ = 1 offerte (10€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 4, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'F03: 8 pizzas à 10€ = 2 offertes (20€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 8, 'name', 'Margherita')
  );
  v_expected := 2000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 8000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  DELETE FROM offers WHERE id = v_buy3get1_offer_id;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section F: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- SECTION G: BUY 1 GET 1 (BOGO)
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION G: Buy 1 Get 1 (BOGO) ---';
  v_section_passed := 0;
  v_section_failed := 0;

  -- Créer offre Buy 1 Get 1
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 1 Get 1 Pizzas',
    '1 pizza achetée = 1 pizza offerte (BOGO)',
    'buy_x_get_y',
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 1,
      'reward_quantity', 1,
      'reward_type', 'free',
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_buy1get1_offer_id;

  v_test_name := 'G01: 1 pizza - pas d''offre (il en faut 2)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'G02: 2 pizzas à 10€ = 1 offerte (10€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'G03: 4 pizzas à 10€ = 2 offertes (20€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 4, 'name', 'Margherita')
  );
  v_expected := 2000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_test_name := 'G04: 2 pizzas (10€+15€) = plus chère offerte (15€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages')
  );
  v_expected := 1500;  -- Maximize: offer the most expensive
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  DELETE FROM offers WHERE id = v_buy1get1_offer_id;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section G: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- RÉSUMÉ BUY X GET Y
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RÉSUMÉ TESTS BUY X GET Y';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total: %/% tests passés', v_total_passed, v_total_passed + v_total_failed;
  IF v_total_failed = 0 THEN
    RAISE NOTICE '>>> TOUS LES TESTS BUY X GET Y PASSENT! <<<';
  ELSE
    RAISE NOTICE '>>> %s TESTS ÉCHOUÉS <<<', v_total_failed;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PHASE 3: TESTS BUNDLE
-- ============================================

DO $$
DECLARE
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';

  v_total_passed INTEGER := 0;
  v_total_failed INTEGER := 0;
  v_section_passed INTEGER;
  v_section_failed INTEGER;

  v_cart JSONB;
  v_total_discount INTEGER;
  v_expected INTEGER;
  v_test_name TEXT;
  v_items_consumed JSONB;

  v_bundle_offer_id UUID;
  v_bundle2_offer_id UUID;
  v_bundle3_offer_id UUID;

BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHASE 3: TESTS BUNDLE';
  RAISE NOTICE '============================================';

  -- ============================================
  -- SECTION A: BUNDLE PIZZA + BOISSON
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION A: Bundle Pizza + Boisson = 12€ ---';
  v_section_passed := 0;
  v_section_failed := 0;

  -- Créer bundle: Pizza + Boisson = 12€
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Bundle Pizza + Boisson',
    'Pizza + Boisson = 12€',
    'bundle',
    jsonb_build_object(
      'fixed_price', 1200,
      'bundle_categories', jsonb_build_array(
        jsonb_build_object('category_id', v_pizza_cat::TEXT, 'quantity', 1),
        jsonb_build_object('category_id', v_boisson_cat::TEXT, 'quantity', 1)
      )
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_bundle_offer_id;
  RAISE NOTICE 'Bundle Pizza+Boisson créé: %', v_bundle_offer_id;

  -- A01: Pizza seule (pas de bundle)
  v_test_name := 'A01: 1 pizza seule (pas de bundle)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A02: Boisson seule (pas de bundle)
  v_test_name := 'A02: 1 boisson seule (pas de bundle)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 300, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A03: Pizza (10€) + Boisson (3€) = 13€ → bundle 12€ = 1€ réduction
  v_test_name := 'A03: Pizza (10€) + Boisson (3€) = 13€ → bundle 12€ = 1€ réduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 100;  -- 1€ réduction
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1300, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A04: Pizza (15€) + Boisson (3€) = 18€ → bundle 12€ = 6€ réduction
  v_test_name := 'A04: Pizza (15€) + Boisson (3€) = 18€ → bundle 12€ = 6€ réduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 600;  -- 6€ réduction
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A05: 2 pizzas + 2 boissons = 2 bundles
  v_test_name := 'A05: 2 pizzas (10€+12€) + 2 boissons (3€+3€) = 2 bundles = 4€ réduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 2, 'name', 'Coca')
  );
  -- Total = 10+12+3+3 = 28€, 2 bundles = 24€, économie = 4€
  v_expected := 400;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A06: Bundle ne s'applique pas si prix total < prix bundle
  v_test_name := 'A06: Pizza (8€) + Boisson (3€) = 11€ < bundle 12€ → pas de bundle';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Mini Pizza'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 0;  -- Pas de réduction si prix < bundle
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1100, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  DELETE FROM offers WHERE id = v_bundle_offer_id;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section A: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- SECTION B: BUNDLE PIZZA + BOISSON + DESSERT
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SECTION B: Bundle Pizza + Boisson + Dessert = 15€ ---';
  v_section_passed := 0;
  v_section_failed := 0;

  -- Créer bundle: Pizza + Boisson + Dessert = 15€
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Bundle Complet',
    'Pizza + Boisson + Dessert = 15€',
    'bundle',
    jsonb_build_object(
      'fixed_price', 1500,
      'bundle_categories', jsonb_build_array(
        jsonb_build_object('category_id', v_pizza_cat::TEXT, 'quantity', 1),
        jsonb_build_object('category_id', v_boisson_cat::TEXT, 'quantity', 1),
        jsonb_build_object('category_id', v_dessert_cat::TEXT, 'quantity', 1)
      )
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_bundle2_offer_id;
  RAISE NOTICE 'Bundle Complet créé: %', v_bundle2_offer_id;

  -- B01: Pizza + Boisson seulement (manque dessert)
  v_test_name := 'B01: Pizza + Boisson seulement (manque dessert)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1300, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B02: Pizza (10€) + Boisson (3€) + Dessert (5€) = 18€ → bundle 15€ = 3€ réduction
  v_test_name := 'B02: Pizza + Boisson + Dessert = 18€ → bundle 15€ = 3€ réduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca'),
    jsonb_build_object('menu_item_id', 'c0000001-0000-0000-0000-000000000001', 'category_id', v_dessert_cat, 'price', 500, 'quantity', 1, 'name', 'Tiramisu')
  );
  v_expected := 300;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B03: Pizza chère
  v_test_name := 'B03: Pizza (15€) + Boisson (3€) + Dessert (5€) = 23€ → bundle 15€ = 8€ réduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca'),
    jsonb_build_object('menu_item_id', 'c0000001-0000-0000-0000-000000000001', 'category_id', v_dessert_cat, 'price', 500, 'quantity', 1, 'name', 'Tiramisu')
  );
  v_expected := 800;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2300, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  DELETE FROM offers WHERE id = v_bundle2_offer_id;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section B: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;

  -- ============================================
  -- RÉSUMÉ BUNDLES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RÉSUMÉ TESTS BUNDLE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total: %/% tests passés', v_total_passed, v_total_passed + v_total_failed;
  IF v_total_failed = 0 THEN
    RAISE NOTICE '>>> TOUS LES TESTS BUNDLE PASSENT! <<<';
  ELSE
    RAISE NOTICE '>>> %s TESTS ÉCHOUÉS <<<', v_total_failed;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PHASE 4: TESTS COMPÉTITION D'OFFRES
-- ============================================

DO $$
DECLARE
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';

  v_total_passed INTEGER := 0;
  v_total_failed INTEGER := 0;

  v_cart JSONB;
  v_total_discount INTEGER;
  v_expected INTEGER;
  v_test_name TEXT;

  v_buy2get1_offer_id UUID;
  v_bundle_offer_id UUID;

BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHASE 4: TESTS COMPÉTITION D''OFFRES';
  RAISE NOTICE '============================================';

  -- Créer Buy 2 Get 1 sur pizzas
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 2 Get 1 Pizzas',
    '2 pizzas = 3e offerte',
    'buy_x_get_y',
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 2,
      'reward_quantity', 1,
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_buy2get1_offer_id;

  -- Créer Bundle Pizza + Boisson = 12€
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Bundle Pizza + Boisson',
    'Pizza + Boisson = 12€',
    'bundle',
    jsonb_build_object(
      'fixed_price', 1200,
      'bundle_categories', jsonb_build_array(
        jsonb_build_object('category_id', v_pizza_cat::TEXT, 'quantity', 1),
        jsonb_build_object('category_id', v_boisson_cat::TEXT, 'quantity', 1)
      )
    ),
    TRUE,
    FALSE
  ) RETURNING id INTO v_bundle_offer_id;

  RAISE NOTICE 'Offres créées: Buy2Get1=%, Bundle=%', v_buy2get1_offer_id, v_bundle_offer_id;
  RAISE NOTICE '';

  -- ============================================
  -- TEST C01: Bundle seul est optimal
  -- 1 pizza (15€) + 1 boisson (3€) = 18€
  -- Option A: Bundle = 12€ (économie 6€)
  -- Option B: Buy2Get1 impossible (1 seule pizza)
  -- ============================================
  v_test_name := 'C01: 1 pizza + 1 boisson → bundle seul (6€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 600;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_total_passed := v_total_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_total_failed := v_total_failed + 1;
  END IF;

  -- ============================================
  -- TEST C02: Buy2Get1 seul est optimal
  -- 3 pizzas (10€ chacune)
  -- Option A: Buy2Get1 = 1 pizza offerte (10€)
  -- Option B: Bundle impossible (pas de boisson)
  -- ============================================
  v_test_name := 'C02: 3 pizzas → Buy2Get1 seul (10€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_total_passed := v_total_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_total_failed := v_total_failed + 1;
  END IF;

  -- ============================================
  -- TEST C03: Combinaison optimale Bundle + Buy2Get1
  -- 4 pizzas (10, 11, 12, 13€) + 1 boisson (3€) = 49€
  -- Option A: Bundle(13+3=12€, éco 4€) + Buy2Get1(10,11,12 → offre 10€) = 4+10 = 14€
  -- Option B: Buy2Get1 seul (3 pizzas, offre 10€) = 10€
  -- Optimal: Option A = 14€ ← Non, faux calcul
  --
  -- Recalculons:
  -- Panier: 4 pizzas à 10,11,12,13 + boisson 3 = Total 49€
  -- Option A: Bundle utilise pizza 13€ + boisson 3€ = 16€ → bundle 12€ (éco 4€)
  --           Reste 3 pizzas (10,11,12) → Buy2Get1: offre 10€
  --           Total économie = 4 + 10 = 14€
  -- Option B: Buy2Get1 sur 4 pizzas, seulement 3 consommées (2 trigger + 1 reward)
  --           Offre la moins chère = 10€
  --           Boisson pas utilisée
  --           Total économie = 10€
  -- Optimal = A avec 14€
  --
  -- MAIS ATTENTION: L'algorithme peut prendre la pizza la plus chère pour Buy2Get1.
  -- Vérifions: Buy2Get1 utilise 2 triggers + 1 reward.
  -- Triggers: les 2 plus chères (13, 12), reward: la moins chère parmi les restantes.
  -- Non, Buy2Get1 devrait optimiser la réduction, donc offrir la moins chère.
  -- Donc Buy2Get1 avec 4 pizzas: trigger(13,12), reward(10) OU trigger(11,10), reward(10)?
  -- En fait Buy2Get1 doit utiliser n'importe quelles 2 pizzas comme trigger et offrir la moins chère.
  --
  -- Si Buy2Get1 seul: 3 pizzas utilisées, 1 restante. Discount = 10€
  -- Si Bundle + Buy2Get1:
  --   - Bundle prend pizza 13€ + boisson 3€ → éco 4€
  --   - Buy2Get1 avec 3 pizzas restantes (10,11,12) → éco 10€
  --   - Total = 14€
  --
  -- L'algorithme doit trouver 14€ comme optimal.
  -- ============================================
  v_test_name := 'C03: 4 pizzas + 1 boisson → Bundle + Buy2Get1 (16€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', '4 Saisons'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 1300, 'quantity', 1, 'name', '4 Fromages'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 1600;  -- Bundle(4€: 13€+3€-12€) + Buy2Get1(12€: offer most expensive remaining) = 16€
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4900, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_total_passed := v_total_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_total_failed := v_total_failed + 1;
  END IF;

  -- ============================================
  -- TEST C04: Buy2Get1 seul est meilleur que Bundle + Buy2Get1
  -- 9 pizzas à 10€ + 1 boisson 3€ = 93€
  -- Option A: Buy2Get1 x3 = 30€ économie (ignore boisson)
  -- Option B: Bundle(10+3=13€→12€, éco 1€) + Buy2Get1 x2 sur 8 pizzas restantes
  --           Mais 8 pizzas / 3 = 2.67, donc 2 applications = 20€
  --           Total = 1 + 20 = 21€
  -- Optimal = A avec 30€
  -- ============================================
  v_test_name := 'C04: 9 pizzas + 1 boisson → Buy2Get1 x3 meilleur (30€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 9, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 3000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9300, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_total_passed := v_total_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_total_failed := v_total_failed + 1;
  END IF;

  -- ============================================
  -- TEST C05: Bundle utilise articles les plus chers
  -- 2 pizzas (10€, 15€) + 1 boisson (3€) = 28€
  -- Bundle doit prendre la pizza à 15€ (pas 10€)
  -- Bundle(15+3=18€→12€, éco 6€)
  -- Pizza 10€ reste seule, pas d'offre
  -- ============================================
  v_test_name := 'C05: 2 pizzas (10€+15€) + boisson → Bundle prend la plus chère (6€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 600;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_total_passed := v_total_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_total_failed := v_total_failed + 1;
  END IF;

  -- Cleanup
  DELETE FROM offers WHERE id IN (v_buy2get1_offer_id, v_bundle_offer_id);

  -- ============================================
  -- RÉSUMÉ COMPÉTITION
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RÉSUMÉ TESTS COMPÉTITION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total: %/% tests passés', v_total_passed, v_total_passed + v_total_failed;
  IF v_total_failed = 0 THEN
    RAISE NOTICE '>>> TOUS LES TESTS COMPÉTITION PASSENT! <<<';
  ELSE
    RAISE NOTICE '>>> %s TESTS ÉCHOUÉS <<<', v_total_failed;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PHASE 5: CLEANUP
-- ============================================

DO $$
DECLARE
  v_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHASE 5: NETTOYAGE';
  RAISE NOTICE '============================================';

  -- Clean up test data
  DELETE FROM offers WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM categories WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM foodtrucks WHERE id = v_foodtruck_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Données de test nettoyées.';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '       TOUS LES TESTS TERMINÉS';
  RAISE NOTICE '============================================';
END $$;

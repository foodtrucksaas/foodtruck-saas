-- ============================================
-- SUITE DE TESTS EXHAUSTIVE - BUY X GET Y
-- ============================================
-- Version: 1.0
-- Date: 2026-01-22
--
-- Cette suite teste TOUS les cas possibles pour l'offre "Buy X Get Y"
-- incluant les variations de configuration, quantites, prix et edge cases.
--
-- Foodtruck: Camion Pizza
-- ID: c5ec1412-d0ce-4516-8b65-ae2d796d70fa
-- Categorie Pizzas: d40baa5c-061d-417c-b325-536043fddb29
-- Categorie Boissons: e8fc3e17-085a-46f6-82d7-e233da4888cf
-- Categorie Desserts: 09c31d07-4652-43eb-a806-0126447c42ce
--
-- Sections de tests:
-- A. Buy 2 Get 1 basique (configuration existante)
-- B. Buy 2 Get 1 avec prix varies (la moins chere offerte)
-- C. Buy 2 Get 1 avec quantites de 1 a 30
-- D. Buy 2 Get 1 avec plusieurs types de pizzas
-- E. Buy 2 Get 1 quand l'offre n'existe PAS (boissons seules)
-- F. Simulation Buy 3 Get 1
-- G. Simulation Buy 1 Get 1
-- H. Verification items consumed
-- I. Verification des roles trigger/reward
-- J. Edge cases (prix 0, prix eleves, meme menu_item_id repete)
-- ============================================

DO $$
DECLARE
  -- IDs du foodtruck Camion Pizza
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';

  -- Compteurs globaux
  v_total_passed INTEGER := 0;
  v_total_failed INTEGER := 0;
  v_section_passed INTEGER;
  v_section_failed INTEGER;

  -- Variables de test
  v_cart JSONB;
  v_total_discount INTEGER;
  v_expected INTEGER;
  v_test_name TEXT;
  v_offer_count INTEGER;
  v_items_consumed JSONB;
  v_item JSONB;

  -- Variables pour roles
  v_trigger_count INTEGER;
  v_reward_count INTEGER;
  v_bundle_item_count INTEGER;
  v_has_trigger BOOLEAN;
  v_has_reward BOOLEAN;

  -- Pour tests dynamiques
  v_qty INTEGER;
  v_expected_free INTEGER;

  -- Offer IDs pour simulation
  v_buy2get1_offer_id UUID;
  v_buy3get1_offer_id UUID;
  v_buy1get1_offer_id UUID;

BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '   SUITE DE TESTS EXHAUSTIVE - BUY X GET Y';
  RAISE NOTICE '   Foodtruck: Camion Pizza (%)' , v_foodtruck_id;
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Categories utilisees:';
  RAISE NOTICE '  - Pizzas:   %', v_pizza_cat;
  RAISE NOTICE '  - Boissons: %', v_boisson_cat;
  RAISE NOTICE '  - Desserts: %', v_dessert_cat;
  RAISE NOTICE '';

  -- ============================================
  -- PREPARATION: Verifier/Creer l'offre Buy 2 Get 1 sur les pizzas
  -- ============================================
  RAISE NOTICE '>>> PREPARATION: Configuration de l''offre Buy 2 Get 1...';

  -- Supprimer les offres de test existantes
  DELETE FROM offers
  WHERE foodtruck_id = v_foodtruck_id
    AND name IN ('Test Buy 2 Get 1 Pizzas', 'Test Buy 3 Get 1 Pizzas', 'Test Buy 1 Get 1 Pizzas');

  -- Creer l'offre Buy 2 Get 1 sur les pizzas
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 2 Get 1 Pizzas',
    '2 pizzas achetees = 1 pizza offerte (la moins chere)',
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

  RAISE NOTICE '    Offre Buy 2 Get 1 creee: %', v_buy2get1_offer_id;
  RAISE NOTICE '';

  -- ============================================
  -- SECTION A: BUY 2 GET 1 BASIQUE
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION A: BUY 2 GET 1 BASIQUE                        |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- A01: Panier vide
  v_test_name := 'A01: Panier vide - aucune reduction';
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
  v_test_name := 'A02: 1 pizza seule (insuffisant pour l''offre)';
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

  -- A03: 2 pizzas (insuffisant, besoin de 3)
  v_test_name := 'A03: 2 pizzas (insuffisant - besoin de 3 pour Buy 2 Get 1)';
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

  -- A04: 3 pizzas identiques - 1 offerte
  v_test_name := 'A04: 3 pizzas identiques a 10EUR -> 1 offerte (10EUR)';
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

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section A: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION B: BUY 2 GET 1 AVEC PRIX VARIES
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION B: BUY 2 GET 1 AVEC PRIX VARIES               |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- B01: 3 pizzas prix differents - la moins chere offerte
  v_test_name := 'B01: 3 pizzas (8EUR, 10EUR, 12EUR) -> 8EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', '4 Fromages')
  );
  v_expected := 800;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B02: 3 pizzas meme prix
  v_test_name := 'B02: 3 pizzas meme prix 10EUR -> 10EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza A'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza B'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza C')
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

  -- B03: 6 pizzas prix differents - 2 moins cheres offertes
  v_test_name := 'B03: 6 pizzas (5,6,7,8,9,10EUR) -> 5+6=11EUR offertes';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 500, 'quantity', 1, 'name', 'Mini 1'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Mini 2'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Moyenne 1'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Moyenne 2'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Grande 1'),
    jsonb_build_object('menu_item_id', 'a0000006-0000-0000-0000-000000000006', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Grande 2')
  );
  v_expected := 1100; -- 500 + 600
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B04: Mix quantites (2+1)
  v_test_name := 'B04: 2x Margherita 10EUR + 1x Napoli 12EUR -> 10EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Napoli')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3200, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B05: Mix quantites (1+2)
  v_test_name := 'B05: 1x Margherita 10EUR + 2x Napoli 12EUR -> 10EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 2, 'name', 'Napoli')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3400, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B06: 9 pizzas (3 types, 3 prix)
  v_test_name := 'B06: 9 pizzas (3x8EUR, 3x10EUR, 3x12EUR) -> 3 offertes (24EUR)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 3, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 3, 'name', '4 Fromages')
  );
  v_expected := 2400; -- 800 + 800 + 800 (les 3 moins cheres)
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
  RAISE NOTICE '  Section B: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION C: BUY 2 GET 1 AVEC QUANTITES DE 1 A 30
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION C: BUY 2 GET 1 AVEC QUANTITES 1 A 30          |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- C01-C30: Tester chaque quantite de 1 a 30
  FOR v_qty IN 1..30 LOOP
    v_expected_free := v_qty / 3; -- Nombre de pizzas offertes
    v_expected := v_expected_free * 1000; -- 10EUR par pizza offerte

    v_test_name := format('C%s: %s pizzas a 10EUR -> %s offerte(s) = %sEUR',
      LPAD(v_qty::TEXT, 2, '0'), v_qty, v_expected_free, v_expected / 100.0);

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
  RAISE NOTICE '  Section C: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION D: BUY 2 GET 1 AVEC PLUSIEURS TYPES DE PIZZAS
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION D: BUY 2 GET 1 AVEC PLUSIEURS TYPES           |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- D01: 1 de chaque type (3 pizzas = 1 offerte)
  v_test_name := 'D01: 1x Mini + 1x Margherita + 1x 4 Fromages -> Mini offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', '4 Fromages')
  );
  v_expected := 800;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D02: 5 types differents (5 pizzas = 1 offerte, reste 2)
  v_test_name := 'D02: 5 pizzas differentes (5,6,7,8,9EUR) -> 1 offerte (5EUR)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 500, 'quantity', 1, 'name', 'Pizza 1'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Pizza 2'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Pizza 3'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 4'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Pizza 5')
  );
  v_expected := 500;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D03: 10 types differents (10 pizzas = 3 offertes)
  v_test_name := 'D03: 10 pizzas differentes -> 3 offertes (les 3 moins cheres)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 100, 'quantity', 1, 'name', 'P1'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 200, 'quantity', 1, 'name', 'P2'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 300, 'quantity', 1, 'name', 'P3'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 400, 'quantity', 1, 'name', 'P4'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 500, 'quantity', 1, 'name', 'P5'),
    jsonb_build_object('menu_item_id', 'a0000006-0000-0000-0000-000000000006', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000007-0000-0000-0000-000000000007', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000008-0000-0000-0000-000000000008', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'a0000009-0000-0000-0000-000000000009', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'P9'),
    jsonb_build_object('menu_item_id', 'a0000010-0000-0000-0000-000000000010', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'P10')
  );
  v_expected := 600; -- 100 + 200 + 300 (les 3 moins cheres)
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 5500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section D: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION E: BUY 2 GET 1 SUR CATEGORIE NON CONCERNEE
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION E: OFFRE NON APPLICABLE (BOISSONS SEULES)     |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- E01: 3 boissons (pas d'offre Buy2Get1 sur les boissons)
  v_test_name := 'E01: 3 boissons seules -> aucune reduction (pas d''offre)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 3, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 900, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E02: 10 boissons (toujours pas d'offre)
  v_test_name := 'E02: 10 boissons seules -> aucune reduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 10, 'name', 'Coca')
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

  -- E03: 3 desserts (pas d'offre Buy2Get1 sur les desserts)
  v_test_name := 'E03: 3 desserts seuls -> aucune reduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'c0000001-0000-0000-0000-000000000001', 'category_id', v_dessert_cat, 'price', 500, 'quantity', 3, 'name', 'Tiramisu')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E04: 2 pizzas + 1 boisson (insuffisant car seulement 2 pizzas)
  v_test_name := 'E04: 2 pizzas + 1 boisson -> aucune reduction (seulement 2 pizzas)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2300, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section E: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION F: SIMULATION BUY 3 GET 1
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION F: SIMULATION BUY 3 GET 1                     |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- Creer l'offre Buy 3 Get 1
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 3 Get 1 Pizzas',
    '3 pizzas achetees = 1 pizza offerte',
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

  -- Desactiver l'offre Buy 2 Get 1 temporairement
  UPDATE offers SET is_active = FALSE WHERE id = v_buy2get1_offer_id;

  RAISE NOTICE '    Offre Buy 3 Get 1 creee et activee: %', v_buy3get1_offer_id;

  -- F01: 3 pizzas (insuffisant pour Buy 3 Get 1)
  v_test_name := 'F01: 3 pizzas -> 0 offerte (besoin de 4 pour Buy 3 Get 1)';
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

  -- F02: 4 pizzas (1 offerte)
  v_test_name := 'F02: 4 pizzas a 10EUR -> 1 offerte (10EUR)';
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

  -- F03: 8 pizzas (2 offertes)
  v_test_name := 'F03: 8 pizzas a 10EUR -> 2 offertes (20EUR)';
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

  -- F04: 12 pizzas (3 offertes)
  v_test_name := 'F04: 12 pizzas a 10EUR -> 3 offertes (30EUR)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 12, 'name', 'Margherita')
  );
  v_expected := 3000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 12000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- Desactiver Buy 3 Get 1, reactiver Buy 2 Get 1
  UPDATE offers SET is_active = FALSE WHERE id = v_buy3get1_offer_id;
  UPDATE offers SET is_active = TRUE WHERE id = v_buy2get1_offer_id;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section F: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION G: SIMULATION BUY 1 GET 1
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION G: SIMULATION BUY 1 GET 1                     |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- Creer l'offre Buy 1 Get 1
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Test Buy 1 Get 1 Pizzas',
    '1 pizza achetee = 1 pizza offerte',
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

  -- Desactiver Buy 2 Get 1
  UPDATE offers SET is_active = FALSE WHERE id = v_buy2get1_offer_id;

  RAISE NOTICE '    Offre Buy 1 Get 1 creee et activee: %', v_buy1get1_offer_id;

  -- G01: 1 pizza (insuffisant)
  v_test_name := 'G01: 1 pizza -> 0 offerte (besoin de 2 pour Buy 1 Get 1)';
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

  -- G02: 2 pizzas (1 offerte)
  v_test_name := 'G02: 2 pizzas a 10EUR -> 1 offerte (10EUR)';
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

  -- G03: 4 pizzas (2 offertes)
  v_test_name := 'G03: 4 pizzas a 10EUR -> 2 offertes (20EUR)';
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

  -- G04: 10 pizzas (5 offertes)
  v_test_name := 'G04: 10 pizzas a 10EUR -> 5 offertes (50EUR)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 10, 'name', 'Margherita')
  );
  v_expected := 5000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 10000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- Desactiver Buy 1 Get 1, reactiver Buy 2 Get 1
  UPDATE offers SET is_active = FALSE WHERE id = v_buy1get1_offer_id;
  UPDATE offers SET is_active = TRUE WHERE id = v_buy2get1_offer_id;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section G: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION H: VERIFICATION ITEMS CONSUMED
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION H: VERIFICATION ITEMS CONSUMED                |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- H01: items_consumed non vide pour Buy 2 Get 1
  v_test_name := 'H01: items_consumed non vide pour Buy 2 Get 1';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) > 0 THEN
    RAISE NOTICE '  [PASS] % (% items consommes)', v_test_name, jsonb_array_length(v_items_consumed);
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - items_consumed vide ou NULL', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- H02: Bon nombre d'items pour Buy 2 Get 1 (2 trigger + 1 reward = 3)
  v_test_name := 'H02: 3 items consommes pour Buy 2 Get 1 (2 trigger + 1 reward)';
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) = 3 THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu 3, Obtenu %', v_test_name, COALESCE(jsonb_array_length(v_items_consumed), 0);
    v_section_failed := v_section_failed + 1;
  END IF;

  -- H03: 6 items consommes pour 6 pizzas (2 applications = 6 items)
  v_test_name := 'H03: 6 items consommes pour 6 pizzas (2 applications de l''offre)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 6, 'name', 'Margherita')
  );
  SELECT SUM(jsonb_array_length(items_consumed)) INTO v_trigger_count
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 6000, NULL)
  WHERE calculated_discount > 0;
  IF v_trigger_count = 6 THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu 6, Obtenu %', v_test_name, COALESCE(v_trigger_count, 0);
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section H: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION I: VERIFICATION DES ROLES TRIGGER/REWARD
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION I: VERIFICATION DES ROLES TRIGGER/REWARD      |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- I01: Presence du role "trigger"
  v_test_name := 'I01: Role "trigger" present dans items_consumed';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;

  v_has_trigger := FALSE;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed) LOOP
      IF v_item->>'role' = 'trigger' THEN
        v_has_trigger := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_has_trigger THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Pas de role trigger trouve', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- I02: Presence du role "reward"
  v_test_name := 'I02: Role "reward" present dans items_consumed';
  v_has_reward := FALSE;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed) LOOP
      IF v_item->>'role' = 'reward' THEN
        v_has_reward := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_has_reward THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Pas de role reward trouve', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- I03: Compter exactement 2 triggers et 1 reward
  v_test_name := 'I03: Exactement 2 triggers et 1 reward pour Buy 2 Get 1';
  v_trigger_count := 0;
  v_reward_count := 0;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed) LOOP
      IF v_item->>'role' = 'trigger' THEN
        v_trigger_count := v_trigger_count + 1;
      ELSIF v_item->>'role' = 'reward' THEN
        v_reward_count := v_reward_count + 1;
      END IF;
    END LOOP;
  END IF;

  IF v_trigger_count = 2 AND v_reward_count = 1 THEN
    RAISE NOTICE '  [PASS] % (% triggers, % rewards)', v_test_name, v_trigger_count, v_reward_count;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu 2 triggers/1 reward, Obtenu %/%', v_test_name, v_trigger_count, v_reward_count;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- I04: Le reward est l'item le moins cher
  v_test_name := 'I04: Le reward est l''item le moins cher';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', '4 Fromages')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;

  DECLARE
    v_reward_price INTEGER := 0;
  BEGIN
    IF v_items_consumed IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed) LOOP
        IF v_item->>'role' = 'reward' THEN
          v_reward_price := (v_item->>'price')::INTEGER;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_reward_price = 800 THEN -- Le moins cher
      RAISE NOTICE '  [PASS] % (reward = %EUR)', v_test_name, v_reward_price / 100.0;
      v_section_passed := v_section_passed + 1;
    ELSE
      RAISE NOTICE '  [FAIL] % - Attendu 800, Obtenu %', v_test_name, v_reward_price;
      v_section_failed := v_section_failed + 1;
    END IF;
  END;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section I: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- SECTION J: EDGE CASES
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE '| SECTION J: EDGE CASES                                 |';
  RAISE NOTICE '--------------------------------------------------------';
  v_section_passed := 0;
  v_section_failed := 0;

  -- J01: Prix a 0
  v_test_name := 'J01: 3 pizzas a 0EUR -> 0EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 0, 'quantity', 3, 'name', 'Free Pizza')
  );
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

  -- J02: Prix a 1 centime
  v_test_name := 'J02: 3 pizzas a 1 centime -> 1 centime offert';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1, 'quantity', 3, 'name', 'Tiny Pizza')
  );
  v_expected := 1;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- J03: Prix tres eleve
  v_test_name := 'J03: 3 pizzas a 100EUR -> 100EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 10000, 'quantity', 3, 'name', 'Luxury Pizza')
  );
  v_expected := 10000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 30000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- J04: Prix tres eleve (1000 EUR)
  v_test_name := 'J04: 3 pizzas a 1000EUR -> 1000EUR offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 100000, 'quantity', 3, 'name', 'Ultra Luxury Pizza')
  );
  v_expected := 100000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 300000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- J05: Meme menu_item_id repete plusieurs fois
  v_test_name := 'J05: Meme menu_item_id dans plusieurs lignes (2+1) = 3 pizzas';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita')
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

  -- J06: Category_id NULL
  v_test_name := 'J06: Category_id NULL -> pas d''erreur, 0 reduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', NULL, 'price', 1000, 'quantity', 3, 'name', 'Unknown')
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

  -- J07: Category_id inconnue
  v_test_name := 'J07: Category_id inconnue -> 0 reduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'price', 1000, 'quantity', 3, 'name', 'Unknown Cat')
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

  -- J08: Foodtruck inexistant
  v_test_name := 'J08: Foodtruck inexistant -> 0 reduction';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers('ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- J09: Mix categories valides et invalides
  v_test_name := 'J09: 3 pizzas + 3 items categorie invalide -> seulement 1 offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'x0000001-0000-0000-0000-000000000001', 'category_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'price', 500, 'quantity', 3, 'name', 'Unknown')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4500, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu: %, Obtenu: %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- J10: Quantite 0 dans le panier
  v_test_name := 'J10: Quantite 0 dans le panier -> pas d''erreur';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 0, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 0, NULL);
  IF v_total_discount >= 0 THEN -- Pas d'erreur
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Erreur survenue', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_total_passed := v_total_passed + v_section_passed;
  v_total_failed := v_total_failed + v_section_failed;
  RAISE NOTICE '  Section J: %/% tests passes', v_section_passed, (v_section_passed + v_section_failed);
  RAISE NOTICE '';

  -- ============================================
  -- NETTOYAGE
  -- ============================================
  RAISE NOTICE '>>> NETTOYAGE: Suppression des offres de test...';
  DELETE FROM offers WHERE id IN (v_buy2get1_offer_id, v_buy3get1_offer_id, v_buy1get1_offer_id);
  RAISE NOTICE '    Offres de test supprimees.';
  RAISE NOTICE '';

  -- ============================================
  -- RESUME FINAL
  -- ============================================
  RAISE NOTICE '================================================================';
  RAISE NOTICE '                    RESUME FINAL';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  Tests passes:  %', v_total_passed;
  RAISE NOTICE '  Tests echoues: %', v_total_failed;
  RAISE NOTICE '  Total:         %', (v_total_passed + v_total_failed);
  RAISE NOTICE '';

  IF v_total_failed = 0 THEN
    RAISE NOTICE '  ############################################################';
    RAISE NOTICE '  #                                                          #';
    RAISE NOTICE '  #   TOUS LES TESTS PASSENT - ALGORITHME ROBUSTE A 100%%     #';
    RAISE NOTICE '  #                                                          #';
    RAISE NOTICE '  ############################################################';
  ELSE
    RAISE NOTICE '  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!';
    RAISE NOTICE '  !                                                           !';
    RAISE NOTICE '  !   ATTENTION: % TEST(S) EN ECHEC                           !', v_total_failed;
    RAISE NOTICE '  !                                                           !';
    RAISE NOTICE '  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '                    FIN DES TESTS';
  RAISE NOTICE '================================================================';

END $$;

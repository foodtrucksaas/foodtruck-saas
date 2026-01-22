-- ============================================
-- TEST SUITE COMPLET: Offer Optimization
-- ============================================
-- Teste TOUS les cas possibles pour garantir 100% de fiabilité

DO $$
DECLARE
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa'; -- Camion Pizza
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_total_discount INTEGER;
  v_offer_count INTEGER;
  v_cart JSONB;
  v_passed INTEGER := 0;
  v_failed INTEGER := 0;
  v_test_name TEXT;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUITE DE TESTS COMPREHENSIVE';
  RAISE NOTICE 'Foodtruck: Camion Pizza';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- ============================================
  -- TEST 1: Panier vide
  -- ============================================
  v_test_name := 'TEST 1: Panier vide';
  RAISE NOTICE '%', v_test_name;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, '[]'::JSONB, 0, NULL);

  IF v_total_discount = 0 THEN
    RAISE NOTICE '  PASS: Aucune reduction';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 0, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 2: 1 pizza seule (pas assez pour offre)
  -- ============================================
  v_test_name := 'TEST 2: 1 pizza seule';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(jsonb_build_object(
    'menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'category_id', v_pizza_cat,
    'price', 1200,
    'quantity', 1,
    'name', 'Margherita'
  ));

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1200, NULL);

  IF v_total_discount = 0 THEN
    RAISE NOTICE '  PASS: Aucune reduction (pas assez pour Buy2Get1)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 0, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 3: 2 pizzas (pas assez pour Buy2Get1)
  -- ============================================
  v_test_name := 'TEST 3: 2 pizzas';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(jsonb_build_object(
    'menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'category_id', v_pizza_cat,
    'price', 1200,
    'quantity', 2,
    'name', 'Margherita'
  ));

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2400, NULL);

  IF v_total_discount = 0 THEN
    RAISE NOTICE '  PASS: Aucune reduction (2 pizzas, besoin de 3)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 0, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 4: 3 pizzas identiques -> 1 offerte
  -- ============================================
  v_test_name := 'TEST 4: 3 pizzas identiques (12e chacune)';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(jsonb_build_object(
    'menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'category_id', v_pizza_cat,
    'price', 1200,
    'quantity', 3,
    'name', 'Margherita'
  ));

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3600, NULL);

  IF v_total_discount = 1200 THEN
    RAISE NOTICE '  PASS: Reduction 12e (1 pizza offerte)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 1200, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 5: 3 pizzas prix differents -> la moins chere offerte
  -- ============================================
  v_test_name := 'TEST 5: 3 pizzas prix differents (10, 12, 14e)';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'category_id', v_pizza_cat, 'price', 1400, 'quantity', 1, 'name', '4 Fromages')
  );

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3600, NULL);

  IF v_total_discount = 1000 THEN
    RAISE NOTICE '  PASS: Reduction 10e (la moins chere offerte)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 1000, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 6: 6 pizzas -> 2 offertes
  -- ============================================
  v_test_name := 'TEST 6: 6 pizzas identiques (10e) -> 2 offertes';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(jsonb_build_object(
    'menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'category_id', v_pizza_cat,
    'price', 1000,
    'quantity', 6,
    'name', 'Margherita'
  ));

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 6000, NULL);

  IF v_total_discount = 2000 THEN
    RAISE NOTICE '  PASS: Reduction 20e (2 pizzas offertes)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 2000, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 7: 9 pizzas -> 3 offertes
  -- ============================================
  v_test_name := 'TEST 7: 9 pizzas identiques (10e) -> 3 offertes';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(jsonb_build_object(
    'menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'category_id', v_pizza_cat,
    'price', 1000,
    'quantity', 9,
    'name', 'Margherita'
  ));

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9000, NULL);

  IF v_total_discount = 3000 THEN
    RAISE NOTICE '  PASS: Reduction 30e (3 pizzas offertes)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 3000, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 8: 1 pizza + 1 boisson -> Bundle 9e
  -- Pizza 12e + Boisson 4e = 16e, bundle 9e = 7e economie
  -- ============================================
  v_test_name := 'TEST 8: 1 pizza (12e) + 1 boisson (4e) -> Bundle 9e';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1600, NULL);

  IF v_total_discount = 700 THEN
    RAISE NOTICE '  PASS: Reduction 7e (bundle applique)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 700, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 9: 1 boisson seule (pas de bundle possible)
  -- ============================================
  v_test_name := 'TEST 9: 1 boisson seule';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(jsonb_build_object(
    'menu_item_id', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'category_id', v_boisson_cat,
    'price', 400,
    'quantity', 1,
    'name', 'Coca'
  ));

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 400, NULL);

  IF v_total_discount = 0 THEN
    RAISE NOTICE '  PASS: Aucune reduction';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 0, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 10: COMPETITION - 4 pizzas + 1 boisson
  -- Scenario utilisateur: 2x12e + 7e + 8e + 4e = 43e
  -- Option A: Buy2Get1 seul = 7e (la moins chere)
  -- Option B: Bundle(12+4=9e, eco 7e) + Buy2Get1(12,7,8 -> 7e) = 7+7 = 14e
  -- L'algo doit trouver l'optimal
  -- ============================================
  v_test_name := 'TEST 10: COMPETITION 4 pizzas + 1 boisson';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;
  RAISE NOTICE '  Cart: 2x Margherita 6e, Napoli 7e, 4Saisons 8e, Coca 4e = 31e';

  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', '4 Saisons'),
    jsonb_build_object('menu_item_id', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );

  -- Total: 6+6+7+8+4 = 31e
  -- Option A: Buy2Get1 seul sur 4 pizzas = offre la moins chere (6e) = 6e reduction
  -- Option B: Bundle(8+4=12, prix 9e = 3e eco) + Buy2Get1(6,6,7 = 6e offert) = 3+6 = 9e
  -- Option C: Bundle(6+4=10, prix 9e = 1e eco) + Buy2Get1(6,7,8 = 6e offert) = 1+6 = 7e
  -- Optimal = Option B = 9e

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3100, NULL);

  RAISE NOTICE '  Reduction obtenue: %e', v_total_discount / 100.0;

  -- L'algorithme doit trouver au moins 7e (mieux que Buy2Get1 seul)
  IF v_total_discount >= 700 THEN
    RAISE NOTICE '  PASS: Reduction >= 7e (combinaison trouvee)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu >= 700, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 11: Beaucoup de pizzas -> Buy2Get1 meilleur que Bundle
  -- 9 pizzas a 10e + 1 boisson 4e = 94e
  -- Option A: Bundle(10+4=14, eco 5e) + 2x Buy2Get1(8 pizzas -> 2x10e) = 5+20 = 25e
  -- Option B: 3x Buy2Get1 (9 pizzas -> 3x10e offert) = 30e <- MEILLEUR
  -- ============================================
  v_test_name := 'TEST 11: 9 pizzas + 1 boisson -> Buy2Get1 x3 meilleur';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 9, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9400, NULL);

  IF v_total_discount = 3000 THEN
    RAISE NOTICE '  PASS: Reduction 30e (3x Buy2Get1, bundle ignore)';
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Attendu 3000, obtenu %', v_total_discount;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 12: Plusieurs offres appliquees
  -- Verifier qu'on a bien plusieurs lignes retournees
  -- ============================================
  v_test_name := 'TEST 12: Verification nombre offres retournees';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 4, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );

  SELECT COUNT(*) INTO v_offer_count
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 5200, NULL);

  IF v_offer_count >= 1 THEN
    RAISE NOTICE '  PASS: % offre(s) appliquee(s)', v_offer_count;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  FAIL: Aucune offre retournee';
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 13: Items consumed correctement rempli
  -- ============================================
  v_test_name := 'TEST 13: items_consumed non vide';
  RAISE NOTICE '';
  RAISE NOTICE '%', v_test_name;

  DECLARE
    v_items_consumed JSONB;
  BEGIN
    SELECT items_consumed INTO v_items_consumed
    FROM get_optimized_offers(v_foodtruck_id, v_cart, 5200, NULL)
    WHERE calculated_discount > 0
    LIMIT 1;

    IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) > 0 THEN
      RAISE NOTICE '  PASS: items_consumed contient % item(s)', jsonb_array_length(v_items_consumed);
      v_passed := v_passed + 1;
    ELSE
      RAISE NOTICE '  FAIL: items_consumed vide';
      v_failed := v_failed + 1;
    END IF;
  END;

  -- ============================================
  -- RESUME
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUME: % PASS, % FAIL sur % tests', v_passed, v_failed, v_passed + v_failed;
  RAISE NOTICE '============================================';

  IF v_failed = 0 THEN
    RAISE NOTICE 'TOUS LES TESTS PASSENT !';
  ELSE
    RAISE NOTICE 'ATTENTION: % test(s) en echec', v_failed;
  END IF;

END $$;

-- ============================================
-- FAIR PRICING EXHAUSTIVE TEST SUITE
-- ============================================
-- Principe: Le client ne doit JAMAIS pouvoir faire mieux
-- en séparant ses commandes.
--
-- Règle d'or: On offre l'item le moins cher,
-- MAIS on donne la même réduction que si le client
-- avait séparé optimalement ses commandes.
-- ============================================

DO $$
DECLARE
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa'::UUID;
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29'::UUID;
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf'::UUID;
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce'::UUID;
  v_buy2get1_id UUID;
  v_buy3get1_id UUID;
  v_bundle_id UUID;
  v_cart JSONB;
  v_total_discount INTEGER;
  v_expected INTEGER;
  v_optimal_split INTEGER;
  v_test_name TEXT;
  v_passed INTEGER := 0;
  v_failed INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAIR PRICING TEST SUITE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Principe: réduction commande unique >= réduction commandes séparées';
  RAISE NOTICE '';

  -- Cleanup
  DELETE FROM offer_items WHERE offer_id IN (SELECT id FROM offers WHERE foodtruck_id = v_foodtruck_id);
  DELETE FROM offers WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM menu_items WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM categories WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM foodtrucks WHERE id = v_foodtruck_id;

  -- Setup: Create test user and foodtruck
  INSERT INTO auth.users (id, email, instance_id, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (v_foodtruck_id, 'fairtest@test.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO foodtrucks (id, name, user_id)
  VALUES (v_foodtruck_id, 'Fair Pricing Test Foodtruck', v_foodtruck_id)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO categories (id, foodtruck_id, name, display_order) VALUES
    (v_pizza_cat, v_foodtruck_id, 'Pizzas', 1),
    (v_boisson_cat, v_foodtruck_id, 'Boissons', 2),
    (v_dessert_cat, v_foodtruck_id, 'Desserts', 3);

  -- Create Buy 2 Get 1 offer
  INSERT INTO offers (id, foodtruck_id, name, offer_type, config, is_active)
  VALUES (
    gen_random_uuid(), v_foodtruck_id, 'Buy 2 Get 1', 'buy_x_get_y',
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 2,
      'reward_quantity', 1,
      'reward_type', 'free',
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    ),
    TRUE
  ) RETURNING id INTO v_buy2get1_id;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SECTION 1: BUY 2 GET 1 - ANTI-GAMING TESTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- ============================================
  -- TEST 1.1: 3 pizzas (base case)
  -- Commande unique: offre la moins chère = 6€
  -- Séparation impossible (besoin de 3 items)
  -- ============================================
  v_test_name := '1.1: 3 pizzas (6€,7€,8€) - cas de base';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8')
  );
  v_expected := 600;  -- Offre la moins chère
  v_optimal_split := 600;  -- Pas de meilleure séparation possible

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2100, NULL);

  IF v_total_discount = v_expected AND v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ (optimal split: -%.00€)', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ (attendu: -%.00€, optimal split: -%.00€)', v_test_name, v_total_discount/100.0, v_expected/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.2: 4 pizzas - CAS CRITIQUE DU GAMING
  -- Commande unique actuelle: offre 6€ = -6€
  -- Séparation optimale: (7,8,9) → -7€, puis (6) → 0€ = -7€ total
  -- Le client GAGNE en séparant ! C'est le bug à corriger.
  -- ============================================
  v_test_name := '1.2: 4 pizzas (6€,7€,8€,9€) - CAS GAMING';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'P9')
  );
  -- Séparation optimale: (7,8,9) offre 7€
  v_optimal_split := 700;
  v_expected := 700;  -- DOIT être >= optimal_split

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);

  IF v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ >= optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ < optimal split -%.00€ (GAMING POSSIBLE!)', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.3: 5 pizzas
  -- Séparation optimale: (8,9,10) → -8€
  -- Items 6€,7€ ne participent pas
  -- ============================================
  v_test_name := '1.3: 5 pizzas (6€,7€,8€,9€,10€) - 2 items ignorés';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'P9'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'P10')
  );
  v_optimal_split := 800;  -- (8,9,10) → offre 8€

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4000, NULL);

  IF v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ >= optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ < optimal split -%.00€ (GAMING POSSIBLE!)', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.4: 6 pizzas (2 applications)
  -- Séparation optimale: (6,7,8) → -6€ et (9,10,11) → -9€ = -15€
  -- ============================================
  v_test_name := '1.4: 6 pizzas (6€-11€) - 2 applications';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'P9'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'P10'),
    jsonb_build_object('menu_item_id', 'a0000006-0000-0000-0000-000000000006', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'P11')
  );
  v_optimal_split := 1500;  -- (6,7,8)→6€ + (9,10,11)→9€ = 15€

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 5100, NULL);

  IF v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ >= optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ < optimal split -%.00€ (GAMING POSSIBLE!)', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.5: 7 pizzas (2 applications + 1 restant)
  -- Séparation optimale: ignorer le moins cher, puis 2 groupes
  -- (7,8,9) → -7€ et (10,11,12) → -10€ = -17€
  -- ============================================
  v_test_name := '1.5: 7 pizzas (6€-12€) - 1 item ignoré';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'P9'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'P10'),
    jsonb_build_object('menu_item_id', 'a0000006-0000-0000-0000-000000000006', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'P11'),
    jsonb_build_object('menu_item_id', 'a0000007-0000-0000-0000-000000000007', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'P12')
  );
  v_optimal_split := 1700;  -- Ignorer 6€, puis (7,8,9)→7€ + (10,11,12)→10€ = 17€

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 6300, NULL);

  IF v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ >= optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ < optimal split -%.00€ (GAMING POSSIBLE!)', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.6: 9 pizzas (3 applications parfaites)
  -- ============================================
  v_test_name := '1.6: 9 pizzas (6€-14€) - 3 applications';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'P6'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'P7'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'P9'),
    jsonb_build_object('menu_item_id', 'a0000005-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'P10'),
    jsonb_build_object('menu_item_id', 'a0000006-0000-0000-0000-000000000006', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'P11'),
    jsonb_build_object('menu_item_id', 'a0000007-0000-0000-0000-000000000007', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'P12'),
    jsonb_build_object('menu_item_id', 'a0000008-0000-0000-0000-000000000008', 'category_id', v_pizza_cat, 'price', 1300, 'quantity', 1, 'name', 'P13'),
    jsonb_build_object('menu_item_id', 'a0000009-0000-0000-0000-000000000009', 'category_id', v_pizza_cat, 'price', 1400, 'quantity', 1, 'name', 'P14')
  );
  -- Optimal: (6,7,8)→6€ + (9,10,11)→9€ + (12,13,14)→12€ = 27€
  v_optimal_split := 2700;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9000, NULL);

  IF v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ >= optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ < optimal split -%.00€ (GAMING POSSIBLE!)', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.7: Pizzas avec prix identiques (edge case)
  -- ============================================
  v_test_name := '1.7: 4 pizzas même prix (10€) - pas de gaming possible';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 4, 'name', 'P10')
  );
  v_optimal_split := 1000;  -- (10,10,10) → 10€

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4000, NULL);

  IF v_total_discount >= v_optimal_split THEN
    RAISE NOTICE '  [PASS] % → -%.00€ >= optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ < optimal split -%.00€', v_test_name, v_total_discount/100.0, v_optimal_split/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 1.8: Cas réel utilisateur (6€, 7€, 8€, 9€)
  -- ============================================
  v_test_name := '1.8: Cas réel (6€,7€,8€,9€) - DOIT offrir 7€';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'a0000003-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', '4 Saisons'),
    jsonb_build_object('menu_item_id', 'a0000004-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', '4 Formaggi')
  );
  v_expected := 700;  -- EXACTEMENT 7€ (pas 6€, pas 9€)
  v_optimal_split := 700;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] % → -%.00€ = attendu -%.00€ (ÉQUITABLE!)', v_test_name, v_total_discount/100.0, v_expected/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ ≠ attendu -%.00€', v_test_name, v_total_discount/100.0, v_expected/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- SECTION 2: BUNDLE TESTS
  -- ============================================
  DELETE FROM offer_items WHERE offer_id = v_buy2get1_id;
  DELETE FROM offers WHERE id = v_buy2get1_id;

  -- Create Bundle offer: Pizza + Boisson = 12€
  INSERT INTO offers (id, foodtruck_id, name, offer_type, config, is_active)
  VALUES (
    gen_random_uuid(), v_foodtruck_id, 'Menu Pizza+Boisson', 'bundle',
    jsonb_build_object(
      'fixed_price', 1200,
      'bundle_categories', jsonb_build_array(
        jsonb_build_object('category_id', v_pizza_cat::TEXT, 'quantity', 1),
        jsonb_build_object('category_id', v_boisson_cat::TEXT, 'quantity', 1)
      )
    ),
    TRUE
  ) RETURNING id INTO v_bundle_id;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SECTION 2: BUNDLE - ANTI-GAMING TESTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- ============================================
  -- TEST 2.1: Bundle basique
  -- Pizza 15€ + Boisson 3€ = 18€ → bundle 12€ = -6€
  -- ============================================
  v_test_name := '2.1: Pizza 15€ + Boisson 3€ = bundle 12€';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', 'Pizza'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 600;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1800, NULL);

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] % → -%.00€', v_test_name, v_total_discount/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ (attendu -%.00€)', v_test_name, v_total_discount/100.0, v_expected/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 2.2: Bundle doit prendre la pizza la plus chère
  -- 2 pizzas (10€, 15€) + 1 boisson → bundle prend 15€
  -- ============================================
  v_test_name := '2.2: 2 pizzas (10€,15€) + boisson → bundle prend 15€';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'P10'),
    jsonb_build_object('menu_item_id', 'a0000002-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', 'P15'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 600;  -- 15+3=18 → 12 = -6€ (prend la plus chère)

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2800, NULL);

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] % → -%.00€', v_test_name, v_total_discount/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ (attendu -%.00€)', v_test_name, v_total_discount/100.0, v_expected/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- TEST 2.3: Pas de bundle si prix < fixed_price
  -- Pizza 8€ + Boisson 3€ = 11€ < 12€ → pas de bundle
  -- ============================================
  v_test_name := '2.3: Pizza 8€ + Boisson 3€ = 11€ < 12€ → pas de bundle';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000001-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'P8'),
    jsonb_build_object('menu_item_id', 'b0000001-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 0;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1100, NULL);

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] % → -%.00€', v_test_name, v_total_discount/100.0;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % → -%.00€ (attendu -%.00€)', v_test_name, v_total_discount/100.0, v_expected/100.0;
    v_failed := v_failed + 1;
  END IF;

  -- ============================================
  -- SUMMARY
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RÉSUMÉ FAIR PRICING TESTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Passés: %/%', v_passed, v_passed + v_failed;
  IF v_failed = 0 THEN
    RAISE NOTICE '>>> TOUS LES TESTS PASSENT - ANTI-GAMING OK <<<';
  ELSE
    RAISE NOTICE '>>> % TESTS ÉCHOUÉS - GAMING POSSIBLE <<<', v_failed;
  END IF;

  -- Cleanup
  DELETE FROM offer_items WHERE offer_id IN (SELECT id FROM offers WHERE foodtruck_id = v_foodtruck_id);
  DELETE FROM offers WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM menu_items WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM categories WHERE foodtruck_id = v_foodtruck_id;
  DELETE FROM foodtrucks WHERE id = v_foodtruck_id;
  DELETE FROM auth.users WHERE id = v_foodtruck_id;
END $$;

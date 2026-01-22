-- ============================================
-- SUITE DE TESTS EXHAUSTIVE - COMPETITION ENTRE OFFRES
-- ============================================
-- Version: 1.0
-- Auteur: Claude Code Expert QA
-- Date: 2026-01-22
--
-- Cette suite teste TOUS les scenarios de competition entre offres
-- pour valider que l'algorithme trouve la combinaison OPTIMALE.
--
-- Contexte:
-- - Foodtruck: Camion Pizza (c5ec1412-d0ce-4516-8b65-ae2d796d70fa)
-- - Categorie Pizzas: d40baa5c-061d-417c-b325-536043fddb29
-- - Categorie Boissons: e8fc3e17-085a-46f6-82d7-e233da4888cf
-- - Categorie Desserts: 09c31d07-4652-43eb-a806-0126447c42ce
--
-- Offres actives:
-- - Buy 2 Get 1 sur pizzas (trigger_quantity=2, reward_quantity=1)
-- - Bundle Pizza + Boisson/Dessert a 9 euros (900 centimes)
--
-- IMPORTANT: Les prix sont en CENTIMES (1000 = 10 euros)
-- ============================================

-- ============================================
-- PARTIE 1: CREATION DES OFFRES DE TEST
-- ============================================
-- On cree/met a jour les offres pour s'assurer qu'elles existent

DO $$
DECLARE
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';
  v_b2g1_offer_id UUID;
  v_bundle_offer_id UUID;
BEGIN
  -- Supprimer les anciennes offres de test si elles existent
  DELETE FROM offers
  WHERE foodtruck_id = v_foodtruck_id
    AND name IN ('Buy 2 Get 1 Pizzas', 'Bundle Pizza + Accompagnement');

  -- Creer l'offre Buy 2 Get 1 sur pizzas
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Buy 2 Get 1 Pizzas',
    '2 pizzas achetees = 1 offerte',
    'buy_x_get_y',
    jsonb_build_object(
      'type', 'category_choice',
      'trigger_quantity', 2,
      'reward_quantity', 1,
      'trigger_category_ids', jsonb_build_array(v_pizza_cat::TEXT),
      'reward_category_ids', jsonb_build_array(v_pizza_cat::TEXT)
    ),
    TRUE,
    TRUE
  )
  RETURNING id INTO v_b2g1_offer_id;

  RAISE NOTICE 'Offre Buy 2 Get 1 creee: %', v_b2g1_offer_id;

  -- Creer l'offre Bundle Pizza + Boisson/Dessert a 9 euros
  INSERT INTO offers (
    id, foodtruck_id, name, description, offer_type, config, is_active, stackable
  ) VALUES (
    gen_random_uuid(),
    v_foodtruck_id,
    'Bundle Pizza + Accompagnement',
    'Pizza + Boisson ou Dessert a 9 euros',
    'bundle',
    jsonb_build_object(
      'fixed_price', 900,
      'bundle_categories', jsonb_build_array(
        jsonb_build_object('category_ids', jsonb_build_array(v_pizza_cat::TEXT), 'quantity', 1),
        jsonb_build_object('category_ids', jsonb_build_array(v_boisson_cat::TEXT, v_dessert_cat::TEXT), 'quantity', 1)
      )
    ),
    TRUE,
    TRUE
  )
  RETURNING id INTO v_bundle_offer_id;

  RAISE NOTICE 'Offre Bundle creee: %', v_bundle_offer_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Offres de test preparees avec succes!';
END $$;


-- ============================================
-- PARTIE 2: TESTS DE COMPETITION EXHAUSTIFS
-- ============================================

DO $$
DECLARE
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';

  v_cart JSONB;
  v_total_discount INTEGER;
  v_offer_count INTEGER;
  v_passed INTEGER := 0;
  v_failed INTEGER := 0;
  v_test_name TEXT;
  v_expected INTEGER;
  v_order_total INTEGER;
  v_result RECORD;
  v_offer_details TEXT;

BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '   SUITE DE TESTS EXHAUSTIVE - COMPETITION ENTRE OFFRES';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'Foodtruck: Camion Pizza (%)' , v_foodtruck_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Offres en competition:';
  RAISE NOTICE '  - Buy 2 Get 1 Pizzas: 2 pizzas achetees = 1 offerte (la moins chere)';
  RAISE NOTICE '  - Bundle: Pizza + Boisson/Dessert = 9 euros fixe';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '';

  -- ============================================
  -- TEST 1: 3 pizzas + 1 boisson - B2G1 DOIT GAGNER
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 1: 3 pizzas (10 euros chacune) + 1 boisson (4 euros)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 3 x 10 euros + 1 x 4 euros = 34 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - Buy2Get1 seul:';
  RAISE NOTICE '    - 3 pizzas 10 euros -> 1 pizza offerte (la moins chere = 10 euros)';
  RAISE NOTICE '    - Reduction = 10 euros (1000 centimes)';
  RAISE NOTICE '    - Boisson non utilisee';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - Bundle seul:';
  RAISE NOTICE '    - Pizza 10 euros + Boisson 4 euros = 14 euros -> 9 euros fixe = 5 euros eco';
  RAISE NOTICE '    - Reduction = 5 euros (500 centimes)';
  RAISE NOTICE '    - Reste 2 pizzas, pas assez pour B2G1';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option A (B2G1) = 10 euros (1000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 1: 3 pizzas + 1 boisson -> B2G1 gagne (10 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Pizza A'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_order_total := 3400;
  v_expected := 1000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  SELECT COUNT(*) INTO v_offer_count
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
  WHERE calculated_discount > 0;

  -- Afficher les offres appliquees
  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros (% centimes)', v_result.offer_name, v_result.calculated_discount / 100.0, v_result.calculated_discount;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros (% centimes)', v_total_discount / 100.0, v_total_discount;
  RAISE NOTICE '';

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 2: 4 pizzas + 1 boisson - CALCUL OPTIMAL
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 2: 4 pizzas (6, 7, 8, 9 euros) + 1 boisson (4 euros)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 6 + 7 + 8 + 9 + 4 = 34 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1 seul:';
  RAISE NOTICE '    - 4 pizzas -> 1 application B2G1, 1 pizza offerte (6 euros)';
  RAISE NOTICE '    - Reduction = 6 euros (600 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - Bundle + B2G1:';
  RAISE NOTICE '    - Bundle: Pizza 9 euros + Boisson 4 euros = 13 euros -> 9 euros = 4 euros eco';
  RAISE NOTICE '    - B2G1: 3 pizzas restantes (6, 7, 8) -> 1 offerte (6 euros)';
  RAISE NOTICE '    - Total reduction = 4 + 6 = 10 euros (1000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option B (Bundle + B2G1) = 10 euros (1000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 2: 4 pizzas + 1 boisson -> Bundle + B2G1 (10 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Pizza 6e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Pizza 7e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 8e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Pizza 9e'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_order_total := 3400;
  v_expected := 1000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros', v_result.offer_name, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount >= v_expected THEN
    RAISE NOTICE '  [PASS] % (obtenu % centimes)', v_test_name, v_total_discount;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu >= % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 3: 6 pizzas + 2 boissons - CALCUL OPTIMAL
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 3: 6 pizzas (10 euros chacune) + 2 boissons (4 euros chacune)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 6 x 10 + 2 x 4 = 68 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1 seul:';
  RAISE NOTICE '    - 6 pizzas -> 2 applications B2G1, 2 pizzas offertes (2 x 10 = 20 euros)';
  RAISE NOTICE '    - Reduction = 20 euros (2000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - 2 Bundles + B2G1:';
  RAISE NOTICE '    - 2 Bundles: 2 x (10 + 4 = 14 -> 9) = 2 x 5 = 10 euros eco';
  RAISE NOTICE '    - Reste 4 pizzas -> 1 B2G1 = 10 euros offert';
  RAISE NOTICE '    - Total = 10 + 10 = 20 euros (2000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option C - 1 Bundle + B2G1 x1:';
  RAISE NOTICE '    - 1 Bundle: 10 + 4 = 14 -> 9 = 5 euros eco';
  RAISE NOTICE '    - Reste 5 pizzas + 1 boisson -> B2G1 = 10 euros offert';
  RAISE NOTICE '    - Total = 5 + 10 = 15 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option A ou B = 20 euros (2000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 3: 6 pizzas + 2 boissons -> optimal 20 euros';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 6, 'name', 'Pizza'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  v_order_total := 6800;
  v_expected := 2000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros (x%)', v_result.offer_name, v_result.calculated_discount / 100.0, v_result.times_applied;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount >= v_expected THEN
    RAISE NOTICE '  [PASS] % (obtenu % centimes)', v_test_name, v_total_discount;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu >= % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 4: 9 pizzas + 1 boisson - B2G1 x3 DOIT GAGNER
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 4: 9 pizzas (10 euros chacune) + 1 boisson (4 euros)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 9 x 10 + 1 x 4 = 94 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1 x3:';
  RAISE NOTICE '    - 9 pizzas -> 3 applications B2G1, 3 pizzas offertes (3 x 10 = 30 euros)';
  RAISE NOTICE '    - Reduction = 30 euros (3000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - Bundle + B2G1 x2:';
  RAISE NOTICE '    - 1 Bundle: 10 + 4 = 14 -> 9 = 5 euros eco';
  RAISE NOTICE '    - Reste 8 pizzas -> 2 B2G1 = 2 x 10 = 20 euros offerts';
  RAISE NOTICE '    - Total = 5 + 20 = 25 euros (2500 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option A (B2G1 x3) = 30 euros (3000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 4: 9 pizzas + 1 boisson -> B2G1 x3 gagne (30 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 9, 'name', 'Pizza'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_order_total := 9400;
  v_expected := 3000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros', v_result.offer_name, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 5: 12 pizzas + 4 boissons - GROS PANIER
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 5: 12 pizzas (10 euros chacune) + 4 boissons (4 euros chacune)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 12 x 10 + 4 x 4 = 136 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1 x4:';
  RAISE NOTICE '    - 12 pizzas -> 4 applications B2G1, 4 pizzas offertes (4 x 10 = 40 euros)';
  RAISE NOTICE '    - Reduction = 40 euros (4000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - 4 Bundles + B2G1 x2:';
  RAISE NOTICE '    - 4 Bundles: 4 x (10 + 4 = 14 -> 9) = 4 x 5 = 20 euros eco';
  RAISE NOTICE '    - Reste 8 pizzas -> 2 B2G1 = 2 x 10 = 20 euros offerts';
  RAISE NOTICE '    - Total = 20 + 20 = 40 euros (4000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: 40 euros (4000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 5: 12 pizzas + 4 boissons -> optimal 40 euros';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 12, 'name', 'Pizza'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 4, 'name', 'Coca')
  );
  v_order_total := 13600;
  v_expected := 4000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros', v_result.offer_name, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount >= v_expected THEN
    RAISE NOTICE '  [PASS] % (obtenu % centimes)', v_test_name, v_total_discount;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu >= % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 6: CAS OU BUNDLE EST CLAIREMENT MEILLEUR
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 6: 2 pizzas (15 euros chacune) + 2 boissons (4 euros chacune)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 2 x 15 + 2 x 4 = 38 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1:';
  RAISE NOTICE '    - Seulement 2 pizzas, impossible d''appliquer B2G1 (besoin de 3)';
  RAISE NOTICE '    - Reduction = 0 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - 2 Bundles:';
  RAISE NOTICE '    - 2 Bundles: 2 x (15 + 4 = 19 -> 9) = 2 x 10 = 20 euros eco';
  RAISE NOTICE '    - Reduction = 20 euros (2000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option B (2 Bundles) = 20 euros (2000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 6: 2 pizzas + 2 boissons -> Bundle clairement meilleur (20 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 2, 'name', 'Pizza Premium'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  v_order_total := 3800;
  v_expected := 2000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros', v_result.offer_name, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 7: CAS OU B2G1 EST CLAIREMENT MEILLEUR
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 7: 6 pizzas (10 euros chacune) - PAS DE BOISSONS';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 6 x 10 = 60 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1 x2:';
  RAISE NOTICE '    - 6 pizzas -> 2 applications B2G1, 2 pizzas offertes (2 x 10 = 20 euros)';
  RAISE NOTICE '    - Reduction = 20 euros (2000 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - Bundle:';
  RAISE NOTICE '    - Pas de boissons, Bundle impossible';
  RAISE NOTICE '    - Reduction = 0 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option A (B2G1 x2) = 20 euros (2000 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 7: 6 pizzas sans boissons -> B2G1 clairement meilleur (20 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 6, 'name', 'Pizza')
  );
  v_order_total := 6000;
  v_expected := 2000;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros', v_result.offer_name, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 8: COMBINAISON OPTIMALE COMPLEXE
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 8: 5 pizzas (8, 9, 10, 11, 12 euros) + 2 boissons (4 euros chacune)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 8 + 9 + 10 + 11 + 12 + 4 + 4 = 58 euros';
  RAISE NOTICE '';
  RAISE NOTICE '  Option A - B2G1 seul:';
  RAISE NOTICE '    - 5 pizzas -> 1 application B2G1, 1 pizza offerte (8 euros, la moins chere)';
  RAISE NOTICE '    - Reduction = 8 euros (800 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option B - 1 Bundle + B2G1:';
  RAISE NOTICE '    - Bundle: Pizza 12 euros + Boisson 4 euros = 16 -> 9 = 7 euros eco';
  RAISE NOTICE '    - Reste 4 pizzas (8, 9, 10, 11) + 1 boisson';
  RAISE NOTICE '    - B2G1: 1 application = 8 euros offerte';
  RAISE NOTICE '    - Total = 7 + 8 = 15 euros (1500 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  Option C - 2 Bundles:';
  RAISE NOTICE '    - Bundle 1: Pizza 12 + Boisson 4 = 16 -> 9 = 7 euros eco';
  RAISE NOTICE '    - Bundle 2: Pizza 11 + Boisson 4 = 15 -> 9 = 6 euros eco';
  RAISE NOTICE '    - Total = 7 + 6 = 13 euros (1300 centimes)';
  RAISE NOTICE '    - Reste 3 pizzas (8, 9, 10) -> B2G1 = 8 euros offerte';
  RAISE NOTICE '    - Grand total = 13 + 8 = 21 euros (2100 centimes)';
  RAISE NOTICE '';
  RAISE NOTICE '  OPTIMAL ATTENDU: Option C (2 Bundles + B2G1) = 21 euros (2100 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 8: Combinaison optimale complexe (21 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 8e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Pizza 9e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza 10e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'Pizza 11e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Pizza 12e'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  v_order_total := 5800;
  v_expected := 2100;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - %: % euros', v_result.offer_name, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '    Total reduction: % euros', v_total_discount / 100.0;
  RAISE NOTICE '';

  IF v_total_discount >= v_expected THEN
    RAISE NOTICE '  [PASS] % (obtenu % centimes)', v_test_name, v_total_discount;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu >= % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 9: VERIFICATION DU NOMBRE D'OFFRES RETOURNEES
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 9: Verification du nombre d''offres retournees';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CONTEXTE:';
  RAISE NOTICE '  Panier: 4 pizzas + 1 boisson (Test 2 repris)';
  RAISE NOTICE '  L''algorithme devrait retourner 2 offres distinctes (Bundle + B2G1)';
  RAISE NOTICE '';

  v_test_name := 'TEST 9: Nombre d''offres retournees = 2';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Pizza 6e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Pizza 7e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 8e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Pizza 9e'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_order_total := 3400;

  SELECT COUNT(*) INTO v_offer_count
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
  WHERE calculated_discount > 0;

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  RAISE NOTICE '    Nombre d''offres retournees: %', v_offer_count;
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '    - % (%): % euros', v_result.offer_name, v_result.offer_type, v_result.calculated_discount / 100.0;
  END LOOP;
  RAISE NOTICE '';

  IF v_offer_count >= 2 THEN
    RAISE NOTICE '  [PASS] % (% offres)', v_test_name, v_offer_count;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu >= 2 offres, obtenu %', v_test_name, v_offer_count;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TEST 10: VERIFICATION DE LA SOMME DES REDUCTIONS
  -- ============================================
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 10: Verification que la somme des reductions est correcte';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CONTEXTE:';
  RAISE NOTICE '  Panier: 5 pizzas + 2 boissons (Test 8 repris)';
  RAISE NOTICE '  La somme des calculated_discount doit etre >= 21 euros';
  RAISE NOTICE '';

  v_test_name := 'TEST 10: Somme des reductions >= 21 euros';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 8e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Pizza 9e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza 10e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'Pizza 11e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Pizza 12e'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  v_order_total := 5800;
  v_expected := 2100;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT ALGORITHME:';
  RAISE NOTICE '    Somme des reductions: % euros (% centimes)', v_total_discount / 100.0, v_total_discount;
  RAISE NOTICE '    Detail:';
  FOR v_result IN
    SELECT * FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
  LOOP
    RAISE NOTICE '      + %: % centimes', v_result.offer_name, v_result.calculated_discount;
  END LOOP;
  RAISE NOTICE '';

  IF v_total_discount >= v_expected THEN
    RAISE NOTICE '  [PASS] % (% centimes)', v_test_name, v_total_discount;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu >= % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- TESTS SUPPLEMENTAIRES
  -- ============================================

  -- TEST 11: Bundle avec dessert au lieu de boisson
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 11: Bundle avec dessert (categorie alternative)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: Pizza 12 euros + Dessert 5 euros = 17 euros';
  RAISE NOTICE '  Bundle: 17 euros -> 9 euros fixe = 8 euros economie (800 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 11: Bundle avec dessert -> 8 euros eco';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Pizza'),
    jsonb_build_object('menu_item_id', 'c0000000-0000-0000-0000-000000000001', 'category_id', v_dessert_cat, 'price', 500, 'quantity', 1, 'name', 'Tiramisu')
  );
  v_order_total := 1700;
  v_expected := 800;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT: % euros', v_total_discount / 100.0;

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- TEST 12: Items consumed tracking
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 12: Verification items_consumed non vide';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';

  v_test_name := 'TEST 12: items_consumed doit etre non vide';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Pizza')
  );
  v_order_total := 3000;

  DECLARE
    v_items_consumed JSONB;
    v_items_count INTEGER := 0;
  BEGIN
    SELECT items_consumed INTO v_items_consumed
    FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL)
    WHERE calculated_discount > 0
    LIMIT 1;

    IF v_items_consumed IS NOT NULL THEN
      v_items_count := jsonb_array_length(v_items_consumed);
    END IF;

    RAISE NOTICE '  RESULTAT: % items consommes', v_items_count;
    RAISE NOTICE '  Detail: %', v_items_consumed;

    IF v_items_count >= 3 THEN
      RAISE NOTICE '  [PASS] %', v_test_name;
      v_passed := v_passed + 1;
    ELSE
      RAISE NOTICE '  [FAIL] % - Attendu >= 3 items, obtenu %', v_test_name, v_items_count;
      v_failed := v_failed + 1;
    END IF;
  END;
  RAISE NOTICE '';

  -- TEST 13: Edge case - panier juste en dessous du seuil B2G1
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 13: 2 pizzas + 1 boisson (pas assez pour B2G1)';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: 2 x 10 + 1 x 4 = 24 euros';
  RAISE NOTICE '  B2G1: Impossible (besoin de 3 pizzas)';
  RAISE NOTICE '  Bundle: 10 + 4 = 14 -> 9 = 5 euros eco';
  RAISE NOTICE '  OPTIMAL: Bundle = 5 euros (500 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 13: 2 pizzas + 1 boisson -> Bundle seul (5 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Pizza'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_order_total := 2400;
  v_expected := 500;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT: % euros', v_total_discount / 100.0;

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- TEST 14: Pizzas de prix varies avec B2G1 - la moins chere offerte
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 14: 3 pizzas prix varies -> la moins chere offerte';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: Pizza 8 + 10 + 12 = 30 euros';
  RAISE NOTICE '  B2G1: La moins chere (8 euros) est offerte';
  RAISE NOTICE '  OPTIMAL: B2G1 = 8 euros (800 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 14: 3 pizzas (8, 10, 12) -> 8 euros offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 8e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza 10e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Pizza 12e')
  );
  v_order_total := 3000;
  v_expected := 800;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT: % euros', v_total_discount / 100.0;

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- TEST 15: Bundle utilise la pizza la plus chere
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE 'TEST 15: Bundle avec pizzas de prix varies';
  RAISE NOTICE '--------------------------------------------------------------------------------';
  RAISE NOTICE '';
  RAISE NOTICE 'CALCUL MANUEL:';
  RAISE NOTICE '  Panier: Pizza 8 + 10 + Boisson 4 = 22 euros';
  RAISE NOTICE '  Bundle devrait prendre la pizza la plus chere (10 euros) pour maximiser eco';
  RAISE NOTICE '  Bundle: 10 + 4 = 14 -> 9 = 5 euros eco';
  RAISE NOTICE '  Reste: Pizza 8 euros (pas assez pour B2G1)';
  RAISE NOTICE '  OPTIMAL: Bundle = 5 euros (500 centimes)';
  RAISE NOTICE '';

  v_test_name := 'TEST 15: Bundle utilise pizza la plus chere (5 euros)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Pizza 8e'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza 10e'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_order_total := 2200;
  v_expected := 500;

  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, v_order_total, NULL);

  RAISE NOTICE '  RESULTAT: % euros', v_total_discount / 100.0;

  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  [PASS] %', v_test_name;
    v_passed := v_passed + 1;
  ELSE
    RAISE NOTICE '  [FAIL] % - Attendu % centimes, obtenu % centimes', v_test_name, v_expected, v_total_discount;
    v_failed := v_failed + 1;
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- RESUME FINAL
  -- ============================================
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '                           RESUME FINAL';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  Tests passes:  %', v_passed;
  RAISE NOTICE '  Tests echoues: %', v_failed;
  RAISE NOTICE '  Total:         %', v_passed + v_failed;
  RAISE NOTICE '';

  IF v_failed = 0 THEN
    RAISE NOTICE '  ============================================================================';
    RAISE NOTICE '  |                                                                          |';
    RAISE NOTICE '  |   TOUS LES TESTS DE COMPETITION PASSENT - ALGORITHME OPTIMAL VALIDE!     |';
    RAISE NOTICE '  |                                                                          |';
    RAISE NOTICE '  ============================================================================';
  ELSE
    RAISE NOTICE '  ============================================================================';
    RAISE NOTICE '  |   ATTENTION: % TEST(S) EN ECHEC                                          |', v_failed;
    RAISE NOTICE '  |   L''algorithme ne trouve pas toujours la combinaison optimale!          |';
    RAISE NOTICE '  ============================================================================';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '================================================================================';

END $$;


-- ============================================
-- NETTOYAGE (optionnel)
-- ============================================
-- Si vous voulez supprimer les offres de test apres execution:
-- DELETE FROM offers WHERE foodtruck_id = 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa' AND name IN ('Buy 2 Get 1 Pizzas', 'Bundle Pizza + Accompagnement');

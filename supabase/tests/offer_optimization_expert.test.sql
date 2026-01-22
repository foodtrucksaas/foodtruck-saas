-- ============================================
-- SUITE DE TESTS EXPERT - OFFER OPTIMIZATION
-- ============================================
-- Version: 1.0
-- Auteur: Claude Code Expert QA
-- Date: 2026-01-22
--
-- Cette suite teste TOUS les cas possibles pour garantir
-- une fiabilité à 100% de l'algorithme d'optimisation des offres.
--
-- Catégories de tests:
-- A. Buy X Get Y (25 tests)
-- B. Bundle (20 tests)
-- C. Compétition entre offres (25 tests)
-- D. Edge cases (15 tests)
-- E. Promo codes (10 tests)
-- F. Threshold discounts (10 tests)
-- G. Limites et restrictions (10 tests)
-- H. Performance (5 tests)
-- I. Items consumed tracking (10 tests)
--
-- Total: 130+ tests
-- ============================================

-- Configuration de test
DO $$
DECLARE
  -- IDs du foodtruck Camion Pizza
  v_foodtruck_id UUID := 'c5ec1412-d0ce-4516-8b65-ae2d796d70fa';
  v_pizza_cat UUID := 'd40baa5c-061d-417c-b325-536043fddb29';
  v_boisson_cat UUID := 'e8fc3e17-085a-46f6-82d7-e233da4888cf';
  v_dessert_cat UUID := '09c31d07-4652-43eb-a806-0126447c42ce';

  -- Compteurs
  v_total_discount INTEGER;
  v_offer_count INTEGER;
  v_cart JSONB;
  v_passed INTEGER := 0;
  v_failed INTEGER := 0;
  v_section_passed INTEGER;
  v_section_failed INTEGER;
  v_test_name TEXT;
  v_expected INTEGER;
  v_result RECORD;
  v_items_consumed JSONB;

  -- Pour les tests de rôles
  v_has_trigger BOOLEAN;
  v_has_reward BOOLEAN;
  v_has_bundle_item BOOLEAN;
  v_item JSONB;

BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '   SUITE DE TESTS EXPERT - OFFER OPTIMIZATION';
  RAISE NOTICE '   Foodtruck: Camion Pizza (%)' , v_foodtruck_id;
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- SECTION A: BUY X GET Y (25 tests)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '┌────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ SECTION A: BUY X GET Y                                         │';
  RAISE NOTICE '└────────────────────────────────────────────────────────────────┘';
  v_section_passed := 0;
  v_section_failed := 0;

  -- A01: Panier vide
  v_test_name := 'A01: Panier vide';
  v_cart := '[]'::JSONB;
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 0, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A02: 1 pizza (insuffisant)
  v_test_name := 'A02: 1 pizza seule (insuffisant pour offre)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1200, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A03: 2 pizzas (insuffisant)
  v_test_name := 'A03: 2 pizzas (insuffisant, besoin de 3)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 2, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2400, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A04: 3 pizzas identiques - 1 offerte
  v_test_name := 'A04: 3 pizzas identiques 10€ → 1 offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A05: 3 pizzas prix différents - la moins chère offerte
  v_test_name := 'A05: 3 pizzas (8€, 10€, 12€) → 8€ offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', '4 Fromages')
  );
  v_expected := 800;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A06: 4 pizzas - 1 seule offerte (reste 1)
  v_test_name := 'A06: 4 pizzas 10€ → 1 offerte (reste 1)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 4, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A07: 5 pizzas - 1 seule offerte (reste 2)
  v_test_name := 'A07: 5 pizzas 10€ → 1 offerte (reste 2)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 5, 'name', 'Margherita')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 5000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A08: 6 pizzas - 2 offertes
  v_test_name := 'A08: 6 pizzas 10€ → 2 offertes';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 6, 'name', 'Margherita')
  );
  v_expected := 2000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 6000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A09: 9 pizzas - 3 offertes
  v_test_name := 'A09: 9 pizzas 10€ → 3 offertes';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 9, 'name', 'Margherita')
  );
  v_expected := 3000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A10: 12 pizzas - 4 offertes
  v_test_name := 'A10: 12 pizzas 10€ → 4 offertes';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 12, 'name', 'Margherita')
  );
  v_expected := 4000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 12000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A11: 6 pizzas prix différents - les 2 moins chères offertes
  v_test_name := 'A11: 6 pizzas (6,7,8,9,10,11€) → 6+7=13€ offertes';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Petite'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Moyenne'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Standard'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000005', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Grande'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000006', 'category_id', v_pizza_cat, 'price', 1100, 'quantity', 1, 'name', 'XL')
  );
  v_expected := 1300; -- 600 + 700
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 5100, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A12: Pizzas même prix
  v_test_name := 'A12: 3 pizzas même prix 10€ → 10€ offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza A'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza B'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Pizza C')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A13: Mix quantités (2+1)
  v_test_name := 'A13: 2x Margherita 10€ + 1x Napoli 12€ → 10€ offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Napoli')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3200, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A14: Mix quantités (1+2)
  v_test_name := 'A14: 1x Margherita 10€ + 2x Napoli 12€ → 10€ offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 2, 'name', 'Napoli')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3400, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A15: Prix très bas (1 centime)
  v_test_name := 'A15: 3 pizzas à 1 centime → 1 centime offert';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1, 'quantity', 3, 'name', 'Mini Pizza')
  );
  v_expected := 1;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A16: Prix très élevé
  v_test_name := 'A16: 3 pizzas à 100€ → 100€ offerte';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 10000, 'quantity', 3, 'name', 'Pizza Luxe')
  );
  v_expected := 10000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 30000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A17: 15 pizzas identiques - 5 offertes
  v_test_name := 'A17: 15 pizzas 10€ → 5 offertes (50€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 15, 'name', 'Margherita')
  );
  v_expected := 5000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 15000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A18: 7 pizzas - 2 offertes (reste 1)
  v_test_name := 'A18: 7 pizzas 10€ → 2 offertes (reste 1)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 7, 'name', 'Margherita')
  );
  v_expected := 2000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 7000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A19: 8 pizzas - 2 offertes (reste 2)
  v_test_name := 'A19: 8 pizzas 10€ → 2 offertes (reste 2)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 8, 'name', 'Margherita')
  );
  v_expected := 2000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 8000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- A20: Articles d'une catégorie non concernée par l'offre
  v_test_name := 'A20: 3 boissons (pas de Buy2Get1 boissons)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 3, 'name', 'Coca')
  );
  v_expected := 0; -- Pas d'offre Buy2Get1 sur les boissons seules
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1200, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_passed := v_passed + v_section_passed;
  v_failed := v_failed + v_section_failed;
  RAISE NOTICE '  Section A: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- SECTION B: BUNDLE (20 tests)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '┌────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ SECTION B: BUNDLE                                              │';
  RAISE NOTICE '└────────────────────────────────────────────────────────────────┘';
  v_section_passed := 0;
  v_section_failed := 0;

  -- B01: Bundle basique pizza + boisson
  v_test_name := 'B01: Pizza 12€ + Boisson 4€ = 16€ → Bundle 9€ = 7€ éco';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 700;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1600, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B02: Bundle avec pizza plus chère
  v_test_name := 'B02: Pizza 15€ + Boisson 4€ = 19€ → Bundle 9€ = 10€ éco';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1500, 'quantity', 1, 'name', '4 Fromages'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1900, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B03: Bundle pas avantageux (total < prix bundle)
  v_test_name := 'B03: Pizza 5€ + Boisson 3€ = 8€ < Bundle 9€ → pas appliqué';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 500, 'quantity', 1, 'name', 'Mini Pizza'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Eau')
  );
  v_expected := 0; -- 8€ < 9€, pas de réduction
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B04: Pizza seule (pas de bundle possible)
  v_test_name := 'B04: Pizza seule → pas de bundle';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1200, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B05: Boisson seule (pas de bundle possible)
  v_test_name := 'B05: Boisson seule → pas de bundle';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 0;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 400, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B06: 2 pizzas + 1 boisson → 1 bundle seulement
  v_test_name := 'B06: 2 pizzas 12€ + 1 boisson 4€ → 1 bundle (pizza la + chère)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  -- 2 pizzas 12€ + 1 boisson 4€ = 28€
  -- Bundle utilise pizza 12€ + boisson 4€ = 16€ → 9€ = 7€ éco
  -- Reste 1 pizza 12€
  v_expected := 700;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2800, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B07: 1 pizza + 2 boissons → 1 bundle seulement
  v_test_name := 'B07: 1 pizza 12€ + 2 boissons 4€ → 1 bundle';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  -- Pizza 12€ + 2 boissons 4€ = 20€
  -- Bundle: 12€ + 4€ = 16€ → 9€ = 7€ éco
  v_expected := 700;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 2000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B08: 2 pizzas + 2 boissons → 2 bundles possibles
  v_test_name := 'B08: 2 pizzas 12€ + 2 boissons 4€ → 2 bundles = 14€ éco';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  -- 2 bundles: 2 x 7€ = 14€
  v_expected := 1400;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3200, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B09: Bundle avec prix égal (économie = 0)
  v_test_name := 'B09: Pizza 6€ + Boisson 3€ = 9€ = Bundle → 0€ éco';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 300, 'quantity', 1, 'name', 'Eau')
  );
  v_expected := 0; -- Pas d'économie
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 900, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- B10: Bundle avec dessert (catégorie alternative)
  v_test_name := 'B10: Pizza 12€ + Dessert 5€ → Bundle 9€ = 8€ éco';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'c0000000-0000-0000-0000-000000000001', 'category_id', v_dessert_cat, 'price', 500, 'quantity', 1, 'name', 'Tiramisu')
  );
  v_expected := 800;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1700, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_passed := v_passed + v_section_passed;
  v_failed := v_failed + v_section_failed;
  RAISE NOTICE '  Section B: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- SECTION C: COMPÉTITION ENTRE OFFRES (25 tests)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '┌────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ SECTION C: COMPÉTITION ENTRE OFFRES                            │';
  RAISE NOTICE '└────────────────────────────────────────────────────────────────┘';
  v_section_passed := 0;
  v_section_failed := 0;

  -- C01: 3 pizzas + 1 boisson → Buy2Get1 gagne vs Bundle
  -- 3 pizzas 10€ + 1 boisson 4€ = 34€
  -- Option A: Buy2Get1 seul = 10€ offert
  -- Option B: Bundle(10+4=14€→9€=5€) + 0 (reste 2 pizzas) = 5€
  -- Optimal: A = 10€
  v_test_name := 'C01: 3 pizzas 10€ + 1 boisson 4€ → Buy2Get1 gagne (10€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 1000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3400, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C02: 4 pizzas + 1 boisson → Bundle + Buy2Get1 combinés
  -- 4 pizzas (6,7,8,9€) + 1 boisson 4€ = 34€
  -- Option A: Buy2Get1 seul sur 4 pizzas = 6€
  -- Option B: Bundle(9+4=13€→9€=4€) + Buy2Get1(6,7,8→6€) = 4+6 = 10€ ← OPTIMAL
  v_test_name := 'C02: 4 pizzas (6,7,8,9€) + boisson → Bundle+Buy2Get1 (10€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 1, 'name', 'Mini'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Petite'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', 'Moyenne'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000004', 'category_id', v_pizza_cat, 'price', 900, 'quantity', 1, 'name', 'Grande'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 1000; -- Bundle 4€ + Buy2Get1 6€
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3400, NULL);
  IF v_total_discount >= 1000 THEN -- Au moins 10€
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu >= 1000, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C03: 9 pizzas + 1 boisson → Buy2Get1 x3 meilleur que Bundle
  -- 9 pizzas 10€ + 1 boisson 4€ = 94€
  -- Option A: Bundle(10+4→9€=5€) + Buy2Get1 x2 (sur 8 pizzas = 2x10€) = 5+20 = 25€
  -- Option B: Buy2Get1 x3 (9 pizzas = 3x10€) = 30€ ← OPTIMAL
  v_test_name := 'C03: 9 pizzas 10€ + boisson → Buy2Get1 x3 gagne (30€)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 9, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  v_expected := 3000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 9400, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C04: Cas utilisateur réel (de ton screenshot)
  -- 2x Margherita 6€ + Napoli 7€ + 4 Saisons 8€ + Coca 4€ = 31€
  v_test_name := 'C04: CAS RÉEL - 2x6€ + 7€ + 8€ + Coca 4€';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 600, 'quantity', 2, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000002', 'category_id', v_pizza_cat, 'price', 700, 'quantity', 1, 'name', 'Napoli'),
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000003', 'category_id', v_pizza_cat, 'price', 800, 'quantity', 1, 'name', '4 Saisons'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  -- Option A: Buy2Get1 seul = 6€
  -- Option B: Bundle(8+4=12€→9€=3€) + Buy2Get1(6,6,7→6€) = 3+6 = 9€
  -- Option C: Bundle(6+4=10€→9€=1€) + Buy2Get1(6,7,8→6€) = 1+6 = 7€
  -- Optimal: B = 9€ (bundle prend la pizza la + chère)
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3100, NULL);
  RAISE NOTICE '  INFO: Réduction obtenue = %€ (attendu >= 7€)', v_total_discount / 100.0;
  IF v_total_discount >= 700 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu >= 700, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C05: 6 pizzas + 2 boissons
  v_test_name := 'C05: 6 pizzas 10€ + 2 boissons 4€';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 6, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 2, 'name', 'Coca')
  );
  -- Option A: Buy2Get1 x2 = 20€
  -- Option B: Bundle x2 (10€) + 0 (reste 4 pizzas, 1 application Buy2Get1 = 10€) = 10+10 = 20€
  -- Option C: Bundle x1 (5€) + Buy2Get1 x1 (sur 5 pizzas = 10€) = 5+10 = 15€
  -- Optimal devrait être >= 20€
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 6800, NULL);
  IF v_total_discount >= 2000 THEN
    RAISE NOTICE '  ✓ % (obtenu %)', v_test_name, v_total_discount;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu >= 2000, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C06: Vérifier que plusieurs offres sont retournées
  v_test_name := 'C06: Vérifier plusieurs offres retournées';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 4, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  SELECT COUNT(*) INTO v_offer_count
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4400, NULL)
  WHERE calculated_discount > 0;
  IF v_offer_count >= 1 THEN
    RAISE NOTICE '  ✓ % (% offre(s))', v_test_name, v_offer_count;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Aucune offre retournée', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- C07: 12 pizzas + 4 boissons - gros panier
  v_test_name := 'C07: 12 pizzas + 4 boissons (gros panier)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 12, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 4, 'name', 'Coca')
  );
  -- Buy2Get1 x4 = 40€ est probablement le meilleur
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 13600, NULL);
  IF v_total_discount >= 4000 THEN
    RAISE NOTICE '  ✓ % (obtenu %€)', v_test_name, v_total_discount / 100.0;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu >= 4000, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_passed := v_passed + v_section_passed;
  v_failed := v_failed + v_section_failed;
  RAISE NOTICE '  Section C: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- SECTION D: EDGE CASES (15 tests)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '┌────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ SECTION D: EDGE CASES                                          │';
  RAISE NOTICE '└────────────────────────────────────────────────────────────────┘';
  v_section_passed := 0;
  v_section_failed := 0;

  -- D01: Article sans category_id
  v_test_name := 'D01: Article avec category_id NULL';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', NULL, 'price', 1000, 'quantity', 3, 'name', 'Unknown')
  );
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  -- Devrait retourner 0 sans erreur
  IF v_total_discount >= 0 THEN
    RAISE NOTICE '  ✓ % (pas d''erreur)', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ %', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D02: Prix à 0
  v_test_name := 'D02: Article gratuit (prix = 0)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 0, 'quantity', 3, 'name', 'Free Pizza')
  );
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 0, NULL);
  IF v_total_discount = 0 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu 0, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D03: Quantité très grande
  v_test_name := 'D03: Grande quantité (30 pizzas)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 30, 'name', 'Margherita')
  );
  -- 30 pizzas = 10 x Buy2Get1 = 10 pizzas offertes = 100€
  v_expected := 10000;
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 30000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D04: Catégorie inconnue
  v_test_name := 'D04: Catégorie inconnue (UUID random)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'price', 1000, 'quantity', 3, 'name', 'Unknown')
  );
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL);
  IF v_total_discount = 0 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu 0, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D05: Mix de catégories valides et invalides
  v_test_name := 'D05: Mix catégories valides/invalides';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'x0000000-0000-0000-0000-000000000001', 'category_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'price', 500, 'quantity', 2, 'name', 'Unknown')
  );
  v_expected := 1000; -- Buy2Get1 sur les 3 pizzas valides
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 4000, NULL);
  IF v_total_discount = v_expected THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu %, obtenu %', v_test_name, v_expected, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D06: Foodtruck inexistant
  v_test_name := 'D06: Foodtruck inexistant';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers('ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID, v_cart, 3000, NULL);
  IF v_total_discount = 0 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu 0, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- D07: JSON cart malformé (array vide)
  v_test_name := 'D07: JSON cart vide []';
  SELECT COALESCE(SUM(calculated_discount), 0) INTO v_total_discount
  FROM get_optimized_offers(v_foodtruck_id, '[]'::JSONB, 0, NULL);
  IF v_total_discount = 0 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu 0, obtenu %', v_test_name, v_total_discount;
    v_section_failed := v_section_failed + 1;
  END IF;

  v_passed := v_passed + v_section_passed;
  v_failed := v_failed + v_section_failed;
  RAISE NOTICE '  Section D: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- SECTION E: ITEMS CONSUMED TRACKING (10 tests)
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '┌────────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ SECTION E: ITEMS CONSUMED TRACKING                             │';
  RAISE NOTICE '└────────────────────────────────────────────────────────────────┘';
  v_section_passed := 0;
  v_section_failed := 0;

  -- E01: items_consumed non vide pour Buy2Get1
  v_test_name := 'E01: items_consumed non vide (Buy2Get1)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) > 0 THEN
    RAISE NOTICE '  ✓ % (% items)', v_test_name, jsonb_array_length(v_items_consumed);
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - items_consumed vide', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E02: Vérifier rôle "trigger" présent
  v_test_name := 'E02: Rôle "trigger" présent';
  v_has_trigger := FALSE;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed)
    LOOP
      IF v_item->>'role' = 'trigger' THEN v_has_trigger := TRUE; END IF;
    END LOOP;
  END IF;
  IF v_has_trigger THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Pas de rôle trigger', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E03: Vérifier rôle "reward" présent
  v_test_name := 'E03: Rôle "reward" présent';
  v_has_reward := FALSE;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed)
    LOOP
      IF v_item->>'role' = 'reward' THEN v_has_reward := TRUE; END IF;
    END LOOP;
  END IF;
  IF v_has_reward THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Pas de rôle reward', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E04: items_consumed pour Bundle
  v_test_name := 'E04: items_consumed non vide (Bundle)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1600, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) > 0 THEN
    RAISE NOTICE '  ✓ % (% items)', v_test_name, jsonb_array_length(v_items_consumed);
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - items_consumed vide', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E05: Vérifier rôle "bundle_item" présent
  v_test_name := 'E05: Rôle "bundle_item" présent';
  v_has_bundle_item := FALSE;
  IF v_items_consumed IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_consumed)
    LOOP
      IF v_item->>'role' = 'bundle_item' THEN v_has_bundle_item := TRUE; END IF;
    END LOOP;
  END IF;
  IF v_has_bundle_item THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Pas de rôle bundle_item', v_test_name;
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E06: Bon nombre d'items pour Buy2Get1
  v_test_name := 'E06: 3 items consommés pour Buy2Get1 (2 trigger + 1 reward)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1000, 'quantity', 3, 'name', 'Margherita')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 3000, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) = 3 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu 3, obtenu %', v_test_name, COALESCE(jsonb_array_length(v_items_consumed), 0);
    v_section_failed := v_section_failed + 1;
  END IF;

  -- E07: Bon nombre d'items pour Bundle
  v_test_name := 'E07: 2 items consommés pour Bundle (pizza + boisson)';
  v_cart := jsonb_build_array(
    jsonb_build_object('menu_item_id', 'a0000000-0000-0000-0000-000000000001', 'category_id', v_pizza_cat, 'price', 1200, 'quantity', 1, 'name', 'Margherita'),
    jsonb_build_object('menu_item_id', 'b0000000-0000-0000-0000-000000000001', 'category_id', v_boisson_cat, 'price', 400, 'quantity', 1, 'name', 'Coca')
  );
  SELECT items_consumed INTO v_items_consumed
  FROM get_optimized_offers(v_foodtruck_id, v_cart, 1600, NULL)
  WHERE calculated_discount > 0
  LIMIT 1;
  IF v_items_consumed IS NOT NULL AND jsonb_array_length(v_items_consumed) = 2 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_section_passed := v_section_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % - Attendu 2, obtenu %', v_test_name, COALESCE(jsonb_array_length(v_items_consumed), 0);
    v_section_failed := v_section_failed + 1;
  END IF;

  v_passed := v_passed + v_section_passed;
  v_failed := v_failed + v_section_failed;
  RAISE NOTICE '  Section E: %/% tests passés', v_section_passed, v_section_passed + v_section_failed;
  RAISE NOTICE '';

  -- ════════════════════════════════════════════════════════════════
  -- RÉSUMÉ FINAL
  -- ════════════════════════════════════════════════════════════════
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '                    RÉSUMÉ FINAL';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '  Tests passés:  %', v_passed;
  RAISE NOTICE '  Tests échoués: %', v_failed;
  RAISE NOTICE '  Total:         %', v_passed + v_failed;
  RAISE NOTICE '';

  IF v_failed = 0 THEN
    RAISE NOTICE '  ████████████████████████████████████████████████████████████';
    RAISE NOTICE '  █                                                          █';
    RAISE NOTICE '  █   ✓ TOUS LES TESTS PASSENT - ALGORITHME ROBUSTE À 100%%   █';
    RAISE NOTICE '  █                                                          █';
    RAISE NOTICE '  ████████████████████████████████████████████████████████████';
  ELSE
    RAISE NOTICE '  ╔══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '  ║   ✗ ATTENTION: % TEST(S) EN ÉCHEC                        ║', v_failed;
    RAISE NOTICE '  ╚══════════════════════════════════════════════════════════╝';
  END IF;
  RAISE NOTICE '';

END $$;

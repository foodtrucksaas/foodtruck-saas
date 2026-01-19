-- Seed Demo Data: Pizzeria "La Pizza du Chef"
-- Email: projetbonzai@gmail.com / Password: azerty

-- Note: L'utilisateur doit être créé via l'interface Supabase Auth ou le script TS
-- Ce script crée les données une fois que l'utilisateur existe

-- Variables (à remplacer après création de l'utilisateur)
-- Exécuter d'abord: SELECT id FROM auth.users WHERE email = 'projetbonzai@gmail.com';

DO $$
DECLARE
    v_user_id UUID;
    v_foodtruck_id UUID;
    v_cat_pizzas UUID;
    v_cat_boissons UUID;
    v_cat_desserts UUID;
    v_cat_entrees UUID;
    v_loc_marche UUID;
    v_loc_parking UUID;
    v_pizza_margherita UUID;
    v_pizza_reine UUID;
    v_pizza_4fromages UUID;
    v_pizza_calzone UUID;
    v_pizza_veggie UUID;
    v_pizza_chorizo UUID;
    v_tiramisu UUID;
    v_panna_cotta UUID;
    v_option_group_taille UUID;
    v_option_group_supplements UUID;
    v_option_group_base UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'projetbonzai@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur projetbonzai@gmail.com non trouvé. Créez-le d''abord via Supabase Auth.';
    END IF;

    -- Check if user record exists, create if not
    INSERT INTO users (id, role)
    VALUES (v_user_id, 'gestionnaire')
    ON CONFLICT (id) DO NOTHING;

    -- Delete existing foodtruck data for this user (clean slate)
    DELETE FROM foodtrucks WHERE user_id = v_user_id;

    -- Create Foodtruck
    INSERT INTO foodtrucks (
        id, user_id, name, description, cuisine_types,
        is_active, auto_accept_orders, show_order_popup, show_menu_photos,
        loyalty_enabled, loyalty_points_per_euro, loyalty_threshold, loyalty_reward,
        max_orders_per_slot
    ) VALUES (
        gen_random_uuid(), v_user_id,
        'La Pizza du Chef',
        'Pizzas artisanales cuites au feu de bois. Pâte fraîche préparée chaque jour avec des ingrédients de qualité. Venez découvrir nos créations gourmandes !',
        ARRAY['Pizza', 'Italien'],
        true, false, true, true,
        true, 1, 100, 500,
        5
    ) RETURNING id INTO v_foodtruck_id;

    -- Create Locations
    INSERT INTO locations (id, foodtruck_id, name, address, latitude, longitude)
    VALUES
        (gen_random_uuid(), v_foodtruck_id, 'Marché de Fontevraud', 'Place du Marché, 49590 Fontevraud-l''Abbaye', 47.1847, 0.0517)
    RETURNING id INTO v_loc_marche;

    INSERT INTO locations (id, foodtruck_id, name, address, latitude, longitude)
    VALUES
        (gen_random_uuid(), v_foodtruck_id, 'Parking Leclerc Saumur', 'Avenue du Général de Gaulle, 49400 Saumur', 47.2608, -0.0769)
    RETURNING id INTO v_loc_parking;

    -- Create Schedules (recurring)
    -- Mercredi et Samedi au marché
    INSERT INTO schedules (foodtruck_id, location_id, day_of_week, start_time, end_time, is_active)
    VALUES
        (v_foodtruck_id, v_loc_marche, 3, '11:00', '14:00', true), -- Mercredi
        (v_foodtruck_id, v_loc_marche, 6, '11:00', '14:00', true); -- Samedi

    -- Vendredi au parking Leclerc
    INSERT INTO schedules (foodtruck_id, location_id, day_of_week, start_time, end_time, is_active)
    VALUES
        (v_foodtruck_id, v_loc_parking, 5, '11:30', '14:30', true); -- Vendredi

    -- Create Categories
    INSERT INTO categories (id, foodtruck_id, name, display_order)
    VALUES (gen_random_uuid(), v_foodtruck_id, 'Entrées', 0)
    RETURNING id INTO v_cat_entrees;

    INSERT INTO categories (id, foodtruck_id, name, display_order)
    VALUES (gen_random_uuid(), v_foodtruck_id, 'Pizzas', 1)
    RETURNING id INTO v_cat_pizzas;

    INSERT INTO categories (id, foodtruck_id, name, display_order)
    VALUES (gen_random_uuid(), v_foodtruck_id, 'Boissons', 2)
    RETURNING id INTO v_cat_boissons;

    INSERT INTO categories (id, foodtruck_id, name, display_order)
    VALUES (gen_random_uuid(), v_foodtruck_id, 'Desserts', 3)
    RETURNING id INTO v_cat_desserts;

    -- Create Category Option Groups for Pizzas
    INSERT INTO category_option_groups (id, category_id, name, is_required, is_multiple, display_order)
    VALUES (gen_random_uuid(), v_cat_pizzas, 'Taille', true, false, 0)
    RETURNING id INTO v_option_group_taille;

    INSERT INTO category_option_groups (id, category_id, name, is_required, is_multiple, display_order)
    VALUES (gen_random_uuid(), v_cat_pizzas, 'Suppléments', false, true, 1)
    RETURNING id INTO v_option_group_supplements;

    INSERT INTO category_option_groups (id, category_id, name, is_required, is_multiple, display_order)
    VALUES (gen_random_uuid(), v_cat_pizzas, 'Base', true, false, 2)
    RETURNING id INTO v_option_group_base;

    -- Create Category Options - Tailles
    INSERT INTO category_options (option_group_id, name, price_modifier, is_available, is_default, display_order)
    VALUES
        (v_option_group_taille, 'Medium (26cm)', 0, true, true, 0),
        (v_option_group_taille, 'Large (33cm)', 300, true, false, 1),
        (v_option_group_taille, 'XXL (40cm)', 600, true, false, 2);

    -- Create Category Options - Suppléments
    INSERT INTO category_options (option_group_id, name, price_modifier, is_available, is_default, display_order)
    VALUES
        (v_option_group_supplements, 'Mozzarella supplémentaire', 150, true, false, 0),
        (v_option_group_supplements, 'Champignons', 100, true, false, 1),
        (v_option_group_supplements, 'Jambon', 150, true, false, 2),
        (v_option_group_supplements, 'Oeuf', 100, true, false, 3),
        (v_option_group_supplements, 'Anchois', 150, true, false, 4),
        (v_option_group_supplements, 'Olives', 100, true, false, 5);

    -- Create Category Options - Base
    INSERT INTO category_options (option_group_id, name, price_modifier, is_available, is_default, display_order)
    VALUES
        (v_option_group_base, 'Sauce tomate', 0, true, true, 0),
        (v_option_group_base, 'Crème fraîche', 0, true, false, 1);

    -- Create Menu Items - Entrées (prices in centimes)
    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES
        (v_foodtruck_id, v_cat_entrees, 'Bruschetta', 'Pain grillé, tomates fraîches, basilic, huile d''olive', 550, true, 0, ARRAY['Gluten']),
        (v_foodtruck_id, v_cat_entrees, 'Salade Caprese', 'Tomates, mozzarella di bufala, basilic frais', 700, true, 1, ARRAY['Lait']),
        (v_foodtruck_id, v_cat_entrees, 'Arancini (3 pièces)', 'Boulettes de risotto frites, coeur mozzarella', 650, true, 2, ARRAY['Gluten', 'Lait', 'Oeuf']);

    -- Create Menu Items - Pizzas (prices in centimes)
    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_pizzas, 'Margherita', 'Sauce tomate, mozzarella, basilic frais', 900, true, 0, ARRAY['Gluten', 'Lait'])
    RETURNING id INTO v_pizza_margherita;

    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_pizzas, 'Reine', 'Sauce tomate, mozzarella, jambon, champignons', 1100, true, 1, ARRAY['Gluten', 'Lait'])
    RETURNING id INTO v_pizza_reine;

    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_pizzas, '4 Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 1200, true, 2, ARRAY['Gluten', 'Lait'])
    RETURNING id INTO v_pizza_4fromages;

    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_pizzas, 'Calzone', 'Pizza pliée : jambon, mozzarella, oeuf, champignons', 1250, true, 3, ARRAY['Gluten', 'Lait', 'Oeuf'])
    RETURNING id INTO v_pizza_calzone;

    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_pizzas, 'Veggie', 'Sauce tomate, mozzarella, poivrons, aubergines, courgettes, olives', 1150, true, 4, ARRAY['Gluten', 'Lait'])
    RETURNING id INTO v_pizza_veggie;

    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_pizzas, 'Chorizo', 'Sauce tomate, mozzarella, chorizo, poivrons, oignons', 1200, true, 5, ARRAY['Gluten', 'Lait'])
    RETURNING id INTO v_pizza_chorizo;

    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, is_daily_special, display_order, allergens)
    VALUES (v_foodtruck_id, v_cat_pizzas, 'Pizza du Chef', 'Création du jour - Demandez-nous !', 1300, true, true, 6, ARRAY['Gluten', 'Lait']);

    -- Create Menu Items - Boissons (prices in centimes)
    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order)
    VALUES
        (v_foodtruck_id, v_cat_boissons, 'Coca-Cola 33cl', '', 250, true, 0),
        (v_foodtruck_id, v_cat_boissons, 'Coca-Cola Zero 33cl', '', 250, true, 1),
        (v_foodtruck_id, v_cat_boissons, 'Orangina 33cl', '', 250, true, 2),
        (v_foodtruck_id, v_cat_boissons, 'Eau minérale 50cl', '', 150, true, 3),
        (v_foodtruck_id, v_cat_boissons, 'Perrier 33cl', '', 250, true, 4),
        (v_foodtruck_id, v_cat_boissons, 'Thé glacé pêche 33cl', '', 250, true, 5);

    -- Create Menu Items - Desserts (prices in centimes)
    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_desserts, 'Tiramisu maison', 'Mascarpone, café, cacao', 500, true, 0, ARRAY['Gluten', 'Lait', 'Oeuf'])
    RETURNING id INTO v_tiramisu;

    INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (gen_random_uuid(), v_foodtruck_id, v_cat_desserts, 'Panna Cotta', 'Coulis de fruits rouges', 450, true, 1, ARRAY['Lait'])
    RETURNING id INTO v_panna_cotta;

    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES (v_foodtruck_id, v_cat_desserts, 'Cannoli sicilien', 'Ricotta, pépites de chocolat, pistache', 400, true, 2, ARRAY['Gluten', 'Lait', 'Fruits à coque']);

    -- Create Offers

    -- Offer 1: Menu Midi (Bundle)
    INSERT INTO offers (foodtruck_id, name, description, offer_type, config, is_active, stackable)
    VALUES (
        v_foodtruck_id,
        'Menu Midi',
        'Pizza Medium + Boisson + Dessert',
        'bundle',
        '{"fixed_price": 1500}',
        true,
        false
    );

    -- Offer 2: Code Promo Bienvenue
    INSERT INTO offers (foodtruck_id, name, description, offer_type, config, is_active, max_uses_per_customer)
    VALUES (
        v_foodtruck_id,
        'Bienvenue !',
        '10% de réduction sur votre première commande',
        'promo_code',
        '{"code": "BIENVENUE", "discount_type": "percentage", "discount_value": 10, "min_order_amount": 1500}',
        true,
        1
    );

    -- Offer 3: Happy Hour
    INSERT INTO offers (foodtruck_id, name, description, offer_type, config, is_active, time_start, time_end, days_of_week)
    VALUES (
        v_foodtruck_id,
        'Happy Hour',
        '-15% entre 11h et 11h30',
        'happy_hour',
        '{"discount_type": "percentage", "discount_value": 15, "applies_to": "all"}',
        true,
        '11:00',
        '11:30',
        ARRAY[3, 5, 6]
    );

    -- Offer 4: 3 pizzas = -20%
    INSERT INTO offers (foodtruck_id, name, description, offer_type, config, is_active)
    VALUES (
        v_foodtruck_id,
        'Soirée Pizza',
        '3 pizzas ou plus = -20% sur le total',
        'threshold_discount',
        '{"min_amount": 0, "min_quantity": 3, "category_id": "' || v_cat_pizzas || '", "discount_type": "percentage", "discount_value": 20}',
        true
    );

    -- Create some sample customers
    INSERT INTO customers (foodtruck_id, email, name, phone, email_opt_in, sms_opt_in, loyalty_opt_in, loyalty_points, lifetime_points, total_orders, total_spent, first_order_at, last_order_at)
    VALUES
        (v_foodtruck_id, 'marie.dupont@email.com', 'Marie Dupont', '0612345678', true, true, true, 45, 145, 5, 7850, NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),
        (v_foodtruck_id, 'jean.martin@email.com', 'Jean Martin', '0698765432', true, false, true, 120, 220, 8, 12400, NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days'),
        (v_foodtruck_id, 'sophie.bernard@email.com', 'Sophie Bernard', NULL, true, false, false, 0, 0, 2, 2500, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
        (v_foodtruck_id, 'pierre.durand@email.com', 'Pierre Durand', '0654321098', false, false, true, 80, 80, 3, 4200, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day');

    RAISE NOTICE 'Seed data created successfully for foodtruck: %', v_foodtruck_id;
END $$;

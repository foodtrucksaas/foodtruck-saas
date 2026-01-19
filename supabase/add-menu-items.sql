-- Script pour ajouter les plats au foodtruck "La Pizza du Chef"
-- A exécuter dans Supabase SQL Editor

DO $$
DECLARE
    v_foodtruck_id UUID;
    v_cat_entrees UUID;
    v_cat_pizzas UUID;
    v_cat_boissons UUID;
    v_cat_desserts UUID;
BEGIN
    -- Récupérer le foodtruck
    SELECT f.id INTO v_foodtruck_id
    FROM foodtrucks f
    JOIN auth.users u ON f.user_id = u.id
    WHERE u.email = 'projetbonzai@gmail.com';

    IF v_foodtruck_id IS NULL THEN
        RAISE EXCEPTION 'Foodtruck non trouvé pour projetbonzai@gmail.com';
    END IF;

    RAISE NOTICE 'Foodtruck ID: %', v_foodtruck_id;

    -- Récupérer les catégories
    SELECT id INTO v_cat_entrees FROM categories WHERE foodtruck_id = v_foodtruck_id AND name = 'Entrées';
    SELECT id INTO v_cat_pizzas FROM categories WHERE foodtruck_id = v_foodtruck_id AND name = 'Pizzas';
    SELECT id INTO v_cat_boissons FROM categories WHERE foodtruck_id = v_foodtruck_id AND name = 'Boissons';
    SELECT id INTO v_cat_desserts FROM categories WHERE foodtruck_id = v_foodtruck_id AND name = 'Desserts';

    -- Supprimer les anciens plats (si existants)
    DELETE FROM menu_items WHERE foodtruck_id = v_foodtruck_id;

    -- Entrées (prix en centimes)
    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES
        (v_foodtruck_id, v_cat_entrees, 'Bruschetta', 'Pain grillé, tomates fraîches, basilic, huile d''olive', 550, true, 0, ARRAY['Gluten']),
        (v_foodtruck_id, v_cat_entrees, 'Salade Caprese', 'Tomates, mozzarella di bufala, basilic frais', 700, true, 1, ARRAY['Lait']),
        (v_foodtruck_id, v_cat_entrees, 'Arancini (3 pièces)', 'Boulettes de risotto frites, coeur mozzarella', 650, true, 2, ARRAY['Gluten', 'Lait', 'Oeuf']);

    -- Pizzas (prix en centimes)
    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES
        (v_foodtruck_id, v_cat_pizzas, 'Margherita', 'Sauce tomate, mozzarella, basilic frais', 900, true, 0, ARRAY['Gluten', 'Lait']),
        (v_foodtruck_id, v_cat_pizzas, 'Reine', 'Sauce tomate, mozzarella, jambon, champignons', 1100, true, 1, ARRAY['Gluten', 'Lait']),
        (v_foodtruck_id, v_cat_pizzas, '4 Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 1200, true, 2, ARRAY['Gluten', 'Lait']),
        (v_foodtruck_id, v_cat_pizzas, 'Calzone', 'Pizza pliée : jambon, mozzarella, oeuf, champignons', 1250, true, 3, ARRAY['Gluten', 'Lait', 'Oeuf']),
        (v_foodtruck_id, v_cat_pizzas, 'Veggie', 'Sauce tomate, mozzarella, poivrons, aubergines, courgettes, olives', 1150, true, 4, ARRAY['Gluten', 'Lait']),
        (v_foodtruck_id, v_cat_pizzas, 'Chorizo', 'Sauce tomate, mozzarella, chorizo, poivrons, oignons', 1200, true, 5, ARRAY['Gluten', 'Lait']),
        (v_foodtruck_id, v_cat_pizzas, 'Pizza du Chef', 'Création du jour - Demandez-nous !', 1300, true, 6, ARRAY['Gluten', 'Lait']);

    -- Boissons (prix en centimes)
    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order)
    VALUES
        (v_foodtruck_id, v_cat_boissons, 'Coca-Cola 33cl', '', 250, true, 0),
        (v_foodtruck_id, v_cat_boissons, 'Coca-Cola Zero 33cl', '', 250, true, 1),
        (v_foodtruck_id, v_cat_boissons, 'Orangina 33cl', '', 250, true, 2),
        (v_foodtruck_id, v_cat_boissons, 'Eau minérale 50cl', '', 150, true, 3),
        (v_foodtruck_id, v_cat_boissons, 'Perrier 33cl', '', 250, true, 4),
        (v_foodtruck_id, v_cat_boissons, 'Thé glacé pêche 33cl', '', 250, true, 5);

    -- Desserts (prix en centimes)
    INSERT INTO menu_items (foodtruck_id, category_id, name, description, price, is_available, display_order, allergens)
    VALUES
        (v_foodtruck_id, v_cat_desserts, 'Tiramisu maison', 'Mascarpone, café, cacao', 500, true, 0, ARRAY['Gluten', 'Lait', 'Oeuf']),
        (v_foodtruck_id, v_cat_desserts, 'Panna Cotta', 'Coulis de fruits rouges', 450, true, 1, ARRAY['Lait']),
        (v_foodtruck_id, v_cat_desserts, 'Cannoli sicilien', 'Ricotta, pépites de chocolat, pistache', 400, true, 2, ARRAY['Gluten', 'Lait', 'Fruits à coque']);

    RAISE NOTICE 'Menu items créés avec succès !';
END $$;

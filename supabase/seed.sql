-- ==============================================
-- SEED FILE: Donnees de test pour le developpement
-- ==============================================
--
-- IDENTIFIANTS DE TEST:
-- ---------------------
-- Dashboard (gestionnaire):
--   Email: test@foodtruck.com
--   Password: test1234
--
-- ==============================================

-- Nettoyer les donnees existantes (dans l'ordre inverse des FK)
TRUNCATE order_items CASCADE;
TRUNCATE orders CASCADE;
TRUNCATE schedule_exceptions CASCADE;
TRUNCATE schedules CASCADE;
TRUNCATE locations CASCADE;
TRUNCATE menu_items CASCADE;
TRUNCATE categories CASCADE;
TRUNCATE foodtrucks CASCADE;

-- Supprimer les utilisateurs de test s'ils existent
DELETE FROM auth.users WHERE email = 'test@foodtruck.com';

-- ==============================================
-- 1. CREER LES UTILISATEURS DE TEST
-- ==============================================

-- Utilisateur gestionnaire (foodtruck owner)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  phone,
  phone_change,
  phone_change_token
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'test@foodtruck.com',
  crypt('test1234', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "gestionnaire"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
);

-- Ajouter les identities pour les utilisateurs (necessaire pour Supabase Auth)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub": "11111111-1111-1111-1111-111111111111", "email": "test@foodtruck.com"}',
  'email',
  'test@foodtruck.com',
  NOW(),
  NOW(),
  NOW()
);

-- ==============================================
-- 2. CREER LE FOODTRUCK
-- ==============================================

INSERT INTO foodtrucks (
  id,
  user_id,
  name,
  description,
  cuisine_types,
  phone,
  email,
  is_active,
  is_mobile,
  auto_accept_orders,
  show_menu_photos,
  show_order_popup
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Le Camion Gourmand',
  'Cuisine francaise traditionnelle revisitee avec des produits frais et locaux. Nos burgers sont prepares maison avec du boeuf charolais et nos frites sont coupees a la main !',
  ARRAY['Burger', 'Francais', 'Street Food'],
  '06 12 34 56 78',
  'contact@lecamiongourmand.fr',
  true,
  true,
  false,
  true,
  true
);

-- ==============================================
-- 3. CREER LES CATEGORIES
-- ==============================================

INSERT INTO categories (id, foodtruck_id, name, display_order) VALUES
  ('ca111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Entrees', 1),
  ('ca222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Burgers', 2),
  ('ca333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Accompagnements', 3),
  ('ca444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Desserts', 4),
  ('ca555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Boissons', 5);

-- ==============================================
-- 4. CREER LES PLATS DU MENU
-- ==============================================

-- Entrees
INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, allergens, is_available, display_order) VALUES
  ('1a111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca111111-1111-1111-1111-111111111111',
   'Nuggets de Poulet', '6 nuggets de poulet croustillants avec sauce au choix', 650, ARRAY['Gluten', 'Oeuf'], true, 1),
  ('1a111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca111111-1111-1111-1111-111111111111',
   'Onion Rings', 'Rondelles d''oignon panees et frites', 550, ARRAY['Gluten'], true, 2),
  ('1a111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca111111-1111-1111-1111-111111111111',
   'Salade Caesar', 'Salade romaine, croutons, parmesan, sauce caesar maison', 850, ARRAY['Gluten', 'Lait', 'Oeuf', 'Poisson'], true, 3);

-- Burgers
INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, allergens, is_available, is_daily_special, display_order) VALUES
  ('2b222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca222222-2222-2222-2222-222222222222',
   'Classic Burger', 'Boeuf charolais, cheddar, salade, tomate, oignon, sauce maison', 1250, ARRAY['Gluten', 'Lait', 'Oeuf', 'Moutarde'], true, false, 1),
  ('2b222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca222222-2222-2222-2222-222222222222',
   'Cheese Burger Deluxe', 'Double boeuf, double cheddar, bacon croustillant, oignons caramelises', 1550, ARRAY['Gluten', 'Lait', 'Oeuf', 'Moutarde'], true, false, 2),
  ('2b222222-2222-2222-2222-222222222223', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca222222-2222-2222-2222-222222222222',
   'Burger Veggie', 'Steak de legumes maison, avocat, roquette, tomate confite', 1150, ARRAY['Gluten', 'Soja'], true, false, 3),
  ('2b222222-2222-2222-2222-222222222224', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca222222-2222-2222-2222-222222222222',
   'Burger du Chef', 'Boeuf, foie gras poele, confit d''oignon, roquette - Edition limitee !', 1850, ARRAY['Gluten', 'Lait', 'Oeuf'], true, true, 4),
  ('2b222222-2222-2222-2222-222222222225', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca222222-2222-2222-2222-222222222222',
   'Chicken Burger', 'Filet de poulet pane, coleslaw maison, pickles, sauce ranch', 1150, ARRAY['Gluten', 'Lait', 'Oeuf'], true, false, 5);

-- Accompagnements
INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, allergens, is_available, display_order) VALUES
  ('3c333333-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca333333-3333-3333-3333-333333333333',
   'Frites Maison', 'Frites fraiches coupees a la main', 450, ARRAY[]::TEXT[], true, 1),
  ('3c333333-3333-3333-3333-333333333332', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca333333-3333-3333-3333-333333333333',
   'Frites au Fromage', 'Frites maison nappees de cheddar fondu et bacon', 650, ARRAY['Lait'], true, 2),
  ('3c333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca333333-3333-3333-3333-333333333333',
   'Potatoes', 'Quartiers de pommes de terre epicees', 450, ARRAY[]::TEXT[], true, 3),
  ('3c333333-3333-3333-3333-333333333334', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca333333-3333-3333-3333-333333333333',
   'Coleslaw', 'Salade de chou frais, carotte et sauce cremeuse', 350, ARRAY['Lait', 'Oeuf', 'Moutarde'], true, 4);

-- Desserts
INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, allergens, is_available, display_order) VALUES
  ('4d444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca444444-4444-4444-4444-444444444444',
   'Brownie Chocolat', 'Brownie moelleux au chocolat noir intense', 450, ARRAY['Gluten', 'Lait', 'Oeuf'], true, 1),
  ('4d444444-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca444444-4444-4444-4444-444444444444',
   'Cookie Geant', 'Cookie aux pepites de chocolat fait maison', 350, ARRAY['Gluten', 'Lait', 'Oeuf'], true, 2),
  ('4d444444-4444-4444-4444-444444444443', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca444444-4444-4444-4444-444444444444',
   'Glace Artisanale', 'Deux boules au choix : vanille, chocolat, fraise, caramel', 500, ARRAY['Lait'], true, 3);

-- Boissons
INSERT INTO menu_items (id, foodtruck_id, category_id, name, description, price, allergens, is_available, display_order) VALUES
  ('5e555555-5555-5555-5555-555555555551', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca555555-5555-5555-5555-555555555555',
   'Coca-Cola', '33cl', 300, ARRAY[]::TEXT[], true, 1),
  ('5e555555-5555-5555-5555-555555555552', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca555555-5555-5555-5555-555555555555',
   'Coca-Cola Zero', '33cl', 300, ARRAY[]::TEXT[], true, 2),
  ('5e555555-5555-5555-5555-555555555553', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca555555-5555-5555-5555-555555555555',
   'Orangina', '33cl', 300, ARRAY[]::TEXT[], true, 3),
  ('5e555555-5555-5555-5555-555555555554', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca555555-5555-5555-5555-555555555555',
   'Eau Minerale', 'Evian 50cl', 250, ARRAY[]::TEXT[], true, 4),
  ('5e555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca555555-5555-5555-5555-555555555555',
   'Jus de Pomme', 'Pur jus 33cl', 350, ARRAY[]::TEXT[], true, 5),
  ('5e555555-5555-5555-5555-555555555556', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ca555555-5555-5555-5555-555555555555',
   'Biere Artisanale', 'IPA locale 33cl - Reserve aux +18 ans', 550, ARRAY['Gluten'], true, 6);

-- ==============================================
-- 5. CREER LES EMPLACEMENTS
-- ==============================================

INSERT INTO locations (id, foodtruck_id, name, address, latitude, longitude) VALUES
  ('10c11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'La Defense - Parvis', '1 Parvis de la Defense, 92800 Puteaux', 48.8920, 2.2360),
  ('10c22222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Bastille - Place', 'Place de la Bastille, 75011 Paris', 48.8533, 2.3692),
  ('10c33333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Nation - Cours de Vincennes', 'Cours de Vincennes, 75012 Paris', 48.8483, 2.3959),
  ('10c44444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Marche Saint-Germain', 'Rue Mabillon, 75006 Paris', 48.8528, 2.3350);

-- ==============================================
-- 6. CREER LE PLANNING HEBDOMADAIRE
-- ==============================================

-- Lundi : La Defense (11h30-14h30)
INSERT INTO schedules (id, foodtruck_id, location_id, day_of_week, start_time, end_time, is_active) VALUES
  ('5c111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c11111-1111-1111-1111-111111111111', 1, '11:30', '14:30', true);

-- Mardi : Bastille (11:00-14:00)
INSERT INTO schedules (id, foodtruck_id, location_id, day_of_week, start_time, end_time, is_active) VALUES
  ('5c222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c22222-2222-2222-2222-222222222222', 2, '11:00', '14:00', true);

-- Mercredi : Nation (11:30-14:30)
INSERT INTO schedules (id, foodtruck_id, location_id, day_of_week, start_time, end_time, is_active) VALUES
  ('5c333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c33333-3333-3333-3333-333333333333', 3, '11:30', '14:30', true);

-- Jeudi : La Defense (11:30-14:30)
INSERT INTO schedules (id, foodtruck_id, location_id, day_of_week, start_time, end_time, is_active) VALUES
  ('5c444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c11111-1111-1111-1111-111111111111', 4, '11:30', '14:30', true);

-- Vendredi : Bastille (11:00-14:00) + soir (18:00-22:00)
INSERT INTO schedules (id, foodtruck_id, location_id, day_of_week, start_time, end_time, is_active) VALUES
  ('5c555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c22222-2222-2222-2222-222222222222', 5, '11:00', '14:00', true),
  ('5c555555-5555-5555-5555-555555555556', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c22222-2222-2222-2222-222222222222', 5, '18:00', '22:00', true);

-- Samedi : Marche Saint-Germain (10:00-16:00)
INSERT INTO schedules (id, foodtruck_id, location_id, day_of_week, start_time, end_time, is_active) VALUES
  ('5c666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '10c44444-4444-4444-4444-444444444444', 6, '10:00', '16:00', true);

-- Dimanche : Ferme (pas de schedule)

-- ==============================================
-- 7. CREER DES EXCEPTIONS AU PLANNING
-- ==============================================

-- Fermeture exceptionnelle le 1er janvier
INSERT INTO schedule_exceptions (id, foodtruck_id, date, is_closed, reason) VALUES
  ('e1c11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '2026-01-01', true, 'Jour de l''An');

-- ==============================================
-- 8. CREER DES COMMANDES DE TEST
-- ==============================================

-- Commande 1 : En attente (paiement sur place)
INSERT INTO orders (
  id, foodtruck_id, customer_email, customer_name, customer_phone,
  status, pickup_time, total_amount, notes
) VALUES (
  '01d11111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'jean.dupont@email.com',
  'Jean Dupont',
  '06 98 76 54 32',
  'pending',
  NOW() + INTERVAL '30 minutes',
  2050,
  'Sans oignon SVP'
);

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes) VALUES
  ('01d11111-1111-1111-1111-111111111111', '2b222222-2222-2222-2222-222222222221', 1, 1250, 'Saignant'),
  ('01d11111-1111-1111-1111-111111111111', '3c333333-3333-3333-3333-333333333331', 1, 450, NULL),
  ('01d11111-1111-1111-1111-111111111111', '5e555555-5555-5555-5555-555555555551', 1, 350, NULL);

-- Commande 2 : En preparation
INSERT INTO orders (
  id, foodtruck_id, customer_id, customer_email, customer_name, customer_phone,
  status, pickup_time, total_amount
) VALUES (
  '01d22222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'marie.martin@email.com',
  'Marie Martin',
  '06 11 22 33 44',
  'preparing',
  NOW() + INTERVAL '15 minutes',
  3450
);

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES
  ('01d22222-2222-2222-2222-222222222222', '2b222222-2222-2222-2222-222222222222', 2, 1550),
  ('01d22222-2222-2222-2222-222222222222', '4d444444-4444-4444-4444-444444444441', 1, 350);

-- Commande 3 : Prete a retirer
INSERT INTO orders (
  id, foodtruck_id, customer_email, customer_name,
  status, pickup_time, total_amount
) VALUES (
  '01d33333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'pierre.durand@email.com',
  'Pierre Durand',
  'ready',
  NOW(),
  1850
);

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES
  ('01d33333-3333-3333-3333-333333333333', '2b222222-2222-2222-2222-222222222224', 1, 1850);

-- Commande 4 : Completee (hier)
INSERT INTO orders (
  id, foodtruck_id, customer_email, customer_name,
  status, pickup_time, total_amount, created_at
) VALUES (
  '01d44444-4444-4444-4444-444444444444',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'jean.dupont@email.com',
  'Jean Dupont',
  'completed',
  NOW() - INTERVAL '1 day',
  2600,
  NOW() - INTERVAL '1 day'
);

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES
  ('01d44444-4444-4444-4444-444444444444', '2b222222-2222-2222-2222-222222222223', 1, 1150),
  ('01d44444-4444-4444-4444-444444444444', '3c333333-3333-3333-3333-333333333332', 1, 650),
  ('01d44444-4444-4444-4444-444444444444', '5e555555-5555-5555-5555-555555555556', 1, 550),
  ('01d44444-4444-4444-4444-444444444444', '4d444444-4444-4444-4444-444444444442', 1, 250);

-- Commande 5 : Completee (il y a 3 jours)
INSERT INTO orders (
  id, foodtruck_id, customer_email, customer_name, customer_phone,
  status, pickup_time, total_amount, created_at
) VALUES (
  '01d55555-5555-5555-5555-555555555555',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'sophie.bernard@email.com',
  'Sophie Bernard',
  '06 55 44 33 22',
  'completed',
  NOW() - INTERVAL '3 days',
  4200,
  NOW() - INTERVAL '3 days'
);

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES
  ('01d55555-5555-5555-5555-555555555555', '2b222222-2222-2222-2222-222222222221', 2, 1250),
  ('01d55555-5555-5555-5555-555555555555', '3c333333-3333-3333-3333-333333333331', 2, 450),
  ('01d55555-5555-5555-5555-555555555555', '5e555555-5555-5555-5555-555555555553', 2, 300),
  ('01d55555-5555-5555-5555-555555555555', '4d444444-4444-4444-4444-444444444443', 2, 500);

-- ==============================================
-- FIN DU SEED
-- ==============================================

-- Verification des donnees inserees
SELECT 'Utilisateurs crees:' AS info, COUNT(*) FROM auth.users WHERE email LIKE '%@%';
SELECT 'Foodtruck cree:' AS info, name FROM foodtrucks;
SELECT 'Categories:' AS info, COUNT(*) FROM categories;
SELECT 'Plats au menu:' AS info, COUNT(*) FROM menu_items;
SELECT 'Emplacements:' AS info, COUNT(*) FROM locations;
SELECT 'Horaires:' AS info, COUNT(*) FROM schedules;
SELECT 'Commandes:' AS info, COUNT(*) FROM orders;

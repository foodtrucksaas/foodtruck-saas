-- ============================================
-- FIX: Ajouter tous les GRANT manquants
-- ============================================

-- foodtrucks
GRANT SELECT ON foodtrucks TO anon;
GRANT ALL ON foodtrucks TO authenticated;

-- categories
GRANT SELECT ON categories TO anon;
GRANT ALL ON categories TO authenticated;

-- menu_items
GRANT SELECT ON menu_items TO anon;
GRANT ALL ON menu_items TO authenticated;

-- schedules
GRANT SELECT ON schedules TO anon;
GRANT ALL ON schedules TO authenticated;

-- schedule_exceptions
GRANT SELECT ON schedule_exceptions TO anon;
GRANT ALL ON schedule_exceptions TO authenticated;

-- locations
GRANT SELECT ON locations TO anon;
GRANT ALL ON locations TO authenticated;

-- orders
GRANT SELECT ON orders TO anon;
GRANT ALL ON orders TO authenticated;

-- order_items
GRANT SELECT ON order_items TO anon;
GRANT ALL ON order_items TO authenticated;

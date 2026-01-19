-- ============================================
-- FIX: Ajouter les GRANT manquants pour option_groups et options
-- ============================================

-- Grants pour option_groups
GRANT SELECT ON option_groups TO anon;
GRANT ALL ON option_groups TO authenticated;

-- Grants pour options
GRANT SELECT ON options TO anon;
GRANT ALL ON options TO authenticated;

-- Grants pour order_item_options
GRANT SELECT ON order_item_options TO anon;
GRANT ALL ON order_item_options TO authenticated;

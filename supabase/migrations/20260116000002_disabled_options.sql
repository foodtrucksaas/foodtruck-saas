-- ============================================
-- Options désactivées par plat
-- Permet de désactiver certains suppléments pour un plat spécifique
-- Ex: Pizza Calzone sans option "extra fromage"
-- ============================================

-- Ajouter colonne disabled_options sur menu_items
-- Format JSONB: ["option_id_1", "option_id_2", ...]
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS disabled_options JSONB DEFAULT '[]';

COMMENT ON COLUMN menu_items.disabled_options IS 'IDs des options désactivées pour ce plat. Ces options ne seront pas proposées côté client.';

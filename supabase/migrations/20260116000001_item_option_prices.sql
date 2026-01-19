-- ============================================
-- Prix des options par plat
-- Permet de définir un prix différent pour chaque taille/option par plat
-- Ex: Pizza Reine S=12€, M=14€, L=16€ / Calzone S=15€, M=17€, L=19€
-- ============================================

-- Ajouter colonne option_prices sur menu_items
-- Format JSONB: {"category_option_id": price_in_cents, ...}
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS option_prices JSONB DEFAULT '{}';

-- Le prix de base (price) reste le prix par défaut quand pas d'options
-- ou le prix de la plus petite taille

COMMENT ON COLUMN menu_items.option_prices IS 'Prix par option de catégorie. Format: {"option_id": price_cents}. Si vide, utilise price + option.price_modifier';

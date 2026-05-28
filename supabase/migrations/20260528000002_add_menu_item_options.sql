-- ============================================
-- CHANTIER 2.1 — Options au niveau article
--
-- Nouvelles tables pour stocker les options directement sur chaque
-- menu_item (au lieu de les heriter de la categorie). Les anciennes
-- tables category_option_groups / category_options restent intactes
-- et continuent d'etre lues par le frontend et les Edge Functions
-- pendant la transition. La bascule complete arrive en 2.3.
-- ============================================

-- ============================================
-- TABLE 1 : menu_item_option_groups
-- ============================================

CREATE TABLE menu_item_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_multiple BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_item_option_groups_menu_item_id
  ON menu_item_option_groups(menu_item_id);

-- ============================================
-- TABLE 2 : menu_item_options
-- ============================================

CREATE TABLE menu_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES menu_item_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier INTEGER NOT NULL DEFAULT 0, -- en cents, peut etre negatif
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_item_options_group_id
  ON menu_item_options(group_id);

-- ============================================
-- TABLE 3 : option_templates (preparation pour la 2.2)
--
-- Permet de sauvegarder des jeux d'options reutilisables :
-- "Tailles standard", "Cuisson burger", "Supplements salades"…
--
-- config JSONB format :
-- {
--   "groups": [
--     {
--       "name": "Taille",
--       "is_required": true,
--       "is_multiple": false,
--       "display_order": 0,
--       "options": [
--         { "name": "Moyenne", "price_modifier": 0, "is_default": true, "display_order": 0 },
--         { "name": "Grande", "price_modifier": 300, "is_default": false, "display_order": 1 }
--       ]
--     }
--   ]
-- }
-- ============================================

CREATE TABLE option_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ex: "Tailles standard", "Cuisson burger"
  config JSONB NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (foodtruck_id, name)
);

CREATE INDEX idx_option_templates_foodtruck_id
  ON option_templates(foodtruck_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_menu_item_option_groups_updated_at
  BEFORE UPDATE ON menu_item_option_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_item_options_updated_at
  BEFORE UPDATE ON menu_item_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_option_templates_updated_at
  BEFORE UPDATE ON option_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE menu_item_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_templates ENABLE ROW LEVEL SECURITY;

-- menu_item_option_groups: Lecture publique, ecriture par owner
-- (meme pattern que category_option_groups)
CREATE POLICY "Public can view menu item option groups" ON menu_item_option_groups
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage menu item option groups" ON menu_item_option_groups
  FOR ALL USING (
    menu_item_id IN (
      SELECT mi.id FROM menu_items mi
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

-- menu_item_options: Lecture publique, ecriture par owner
-- (meme pattern que category_options)
CREATE POLICY "Public can view menu item options" ON menu_item_options
  FOR SELECT USING (true);

CREATE POLICY "Owners can manage menu item options" ON menu_item_options
  FOR ALL USING (
    group_id IN (
      SELECT miog.id FROM menu_item_option_groups miog
      JOIN menu_items mi ON miog.menu_item_id = mi.id
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

-- option_templates: Lecture par owner uniquement, ecriture par owner
-- (pas public — les templates sont des donnees internes au dashboard)
CREATE POLICY "Owners can view option templates" ON option_templates
  FOR SELECT USING (
    foodtruck_id IN (
      SELECT ft.id FROM foodtrucks ft WHERE ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage option templates" ON option_templates
  FOR ALL USING (
    foodtruck_id IN (
      SELECT ft.id FROM foodtrucks ft WHERE ft.user_id = auth.uid()
    )
  );

-- Note: service_role bypasses RLS in Supabase, no explicit policy needed.

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON menu_item_option_groups TO anon;
GRANT ALL ON menu_item_option_groups TO authenticated;

GRANT SELECT ON menu_item_options TO anon;
GRANT ALL ON menu_item_options TO authenticated;

GRANT SELECT ON option_templates TO anon;
GRANT ALL ON option_templates TO authenticated;

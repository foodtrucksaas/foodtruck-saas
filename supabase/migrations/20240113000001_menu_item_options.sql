-- ============================================
-- Migration: Menu Item Options
-- Permet d'ajouter des options/variantes aux plats
-- Ex: Taille (S/M/L), Suppléments, Cuisson
-- ============================================

-- ============================================
-- OPTION GROUPS TABLE
-- Groupes d'options pour un plat (ex: "Taille", "Suppléments")
-- ============================================
CREATE TABLE option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_multiple BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_option_groups_menu_item_id ON option_groups(menu_item_id);

-- ============================================
-- OPTIONS TABLE
-- Options individuelles (ex: "S +0€", "M +2€", "L +4€")
-- ============================================
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_options_option_group_id ON options(option_group_id);

-- ============================================
-- ORDER ITEM OPTIONS TABLE
-- Options sélectionnées pour chaque item de commande
-- ============================================
CREATE TABLE order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  option_name VARCHAR(100) NOT NULL,
  option_group_name VARCHAR(100) NOT NULL,
  price_modifier INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_item_options_order_item_id ON order_item_options(order_item_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;

-- option_groups: Public read, owner write
CREATE POLICY "Public can view option groups" ON option_groups
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert option groups" ON option_groups
  FOR INSERT WITH CHECK (
    menu_item_id IN (
      SELECT mi.id FROM menu_items mi
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update option groups" ON option_groups
  FOR UPDATE USING (
    menu_item_id IN (
      SELECT mi.id FROM menu_items mi
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete option groups" ON option_groups
  FOR DELETE USING (
    menu_item_id IN (
      SELECT mi.id FROM menu_items mi
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

-- options: Public read, owner write
CREATE POLICY "Public can view options" ON options
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert options" ON options
  FOR INSERT WITH CHECK (
    option_group_id IN (
      SELECT og.id FROM option_groups og
      JOIN menu_items mi ON og.menu_item_id = mi.id
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update options" ON options
  FOR UPDATE USING (
    option_group_id IN (
      SELECT og.id FROM option_groups og
      JOIN menu_items mi ON og.menu_item_id = mi.id
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete options" ON options
  FOR DELETE USING (
    option_group_id IN (
      SELECT og.id FROM option_groups og
      JOIN menu_items mi ON og.menu_item_id = mi.id
      JOIN foodtrucks ft ON mi.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

-- order_item_options: Customers and owners can view, anyone can insert (via order creation)
CREATE POLICY "Users can view their order item options" ON order_item_options
  FOR SELECT USING (
    order_item_id IN (
      SELECT oi.id FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Foodtruck owners can view order item options" ON order_item_options
  FOR SELECT USING (
    order_item_id IN (
      SELECT oi.id FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN foodtrucks ft ON o.foodtruck_id = ft.id
      WHERE ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert order item options" ON order_item_options
  FOR INSERT WITH CHECK (true);

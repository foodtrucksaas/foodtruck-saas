-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE foodtrucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FOODTRUCKS POLICIES
-- ============================================

-- Anyone can view active foodtrucks
CREATE POLICY "Public can view active foodtrucks"
  ON foodtrucks FOR SELECT
  USING (is_active = TRUE);

-- Owners can view their own foodtruck (even if inactive)
CREATE POLICY "Owners can view own foodtruck"
  ON foodtrucks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own foodtruck
CREATE POLICY "Users can create own foodtruck"
  ON foodtrucks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their foodtruck
CREATE POLICY "Owners can update own foodtruck"
  ON foodtrucks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete their foodtruck
CREATE POLICY "Owners can delete own foodtruck"
  ON foodtrucks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CATEGORIES POLICIES
-- ============================================

-- Anyone can view categories of active foodtrucks
CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = categories.foodtruck_id
      AND foodtrucks.is_active = TRUE
    )
  );

-- Owners can manage categories
CREATE POLICY "Owners can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = categories.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- ============================================
-- MENU ITEMS POLICIES
-- ============================================

-- Anyone can view menu items of active foodtrucks
CREATE POLICY "Public can view menu items"
  ON menu_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = menu_items.foodtruck_id
      AND foodtrucks.is_active = TRUE
    )
  );

-- Owners can manage menu items
CREATE POLICY "Owners can manage menu items"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = menu_items.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- ============================================
-- LOCATIONS POLICIES
-- ============================================

-- Anyone can view locations of active foodtrucks
CREATE POLICY "Public can view locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = locations.foodtruck_id
      AND foodtrucks.is_active = TRUE
    )
  );

-- Owners can manage locations
CREATE POLICY "Owners can manage locations"
  ON locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = locations.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- ============================================
-- SCHEDULES POLICIES
-- ============================================

-- Anyone can view schedules of active foodtrucks
CREATE POLICY "Public can view schedules"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = schedules.foodtruck_id
      AND foodtrucks.is_active = TRUE
    )
  );

-- Owners can manage schedules
CREATE POLICY "Owners can manage schedules"
  ON schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = schedules.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- ============================================
-- SCHEDULE EXCEPTIONS POLICIES
-- ============================================

-- Anyone can view schedule exceptions of active foodtrucks
CREATE POLICY "Public can view schedule exceptions"
  ON schedule_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = schedule_exceptions.foodtruck_id
      AND foodtrucks.is_active = TRUE
    )
  );

-- Owners can manage schedule exceptions
CREATE POLICY "Owners can manage schedule exceptions"
  ON schedule_exceptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = schedule_exceptions.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- ============================================
-- ORDERS POLICIES
-- ============================================

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR auth.email() = customer_email
  );

-- Foodtruck owners can view orders for their foodtruck
CREATE POLICY "Owners can view foodtruck orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = orders.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- Anyone can create orders (for guest checkout)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE);

-- Foodtruck owners can update order status
CREATE POLICY "Owners can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = orders.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- ============================================
-- ORDER ITEMS POLICIES
-- ============================================

-- Users can view order items for orders they have access to
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.customer_id = auth.uid() OR auth.email() = orders.customer_email)
    )
  );

-- Foodtruck owners can view order items
CREATE POLICY "Owners can view order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN foodtrucks ON foodtrucks.id = orders.foodtruck_id
      WHERE orders.id = order_items.order_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- Anyone can create order items (for guest checkout)
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (TRUE);

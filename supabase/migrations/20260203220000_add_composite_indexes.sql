-- Add composite indexes for high-frequency queries
-- These indexes optimize the most common dashboard queries

-- Orders: filter by foodtruck and sort by pickup_time (Orders page)
CREATE INDEX IF NOT EXISTS idx_orders_foodtruck_pickup
ON orders(foodtruck_id, pickup_time DESC);

-- Orders: filter by foodtruck and status (Order filtering)
CREATE INDEX IF NOT EXISTS idx_orders_foodtruck_status
ON orders(foodtruck_id, status);

-- Orders: filter by foodtruck and created_at (Analytics queries)
CREATE INDEX IF NOT EXISTS idx_orders_foodtruck_created
ON orders(foodtruck_id, created_at DESC);

-- Customers: filter by foodtruck and last_order_at (Customer sorting)
CREATE INDEX IF NOT EXISTS idx_customers_foodtruck_last_order
ON customers(foodtruck_id, last_order_at DESC);

-- Customers: filter by foodtruck and total_orders (Top customers)
CREATE INDEX IF NOT EXISTS idx_customers_foodtruck_total_orders
ON customers(foodtruck_id, total_orders DESC);

-- Order items: optimize joins for order details
CREATE INDEX IF NOT EXISTS idx_order_items_order_menu
ON order_items(order_id, menu_item_id);

-- Menu items: filter by category and availability (Menu display)
CREATE INDEX IF NOT EXISTS idx_menu_items_category_available
ON menu_items(category_id, is_available) WHERE is_archived IS NOT TRUE;

-- Schedules: filter active schedules by foodtruck and day
CREATE INDEX IF NOT EXISTS idx_schedules_foodtruck_day_active
ON schedules(foodtruck_id, day_of_week) WHERE is_active = true;

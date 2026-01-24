-- Performance optimization indexes
-- These indexes improve query performance for common operations

-- Composite index for orders filtered by foodtruck and pickup time (used in dashboard orders page)
CREATE INDEX IF NOT EXISTS idx_orders_foodtruck_pickup
ON orders(foodtruck_id, pickup_time);

-- Index for customers sorted by last_order_at (used in customer segmentation)
CREATE INDEX IF NOT EXISTS idx_customers_last_order
ON customers(foodtruck_id, last_order_at DESC);

-- Index for menu_items availability queries
CREATE INDEX IF NOT EXISTS idx_menu_items_available
ON menu_items(foodtruck_id, is_available, is_archived)
WHERE is_archived = false;

-- Index for schedules by day_of_week (used for finding today's schedule)
CREATE INDEX IF NOT EXISTS idx_schedules_day
ON schedules(foodtruck_id, day_of_week, is_active)
WHERE is_active = true;

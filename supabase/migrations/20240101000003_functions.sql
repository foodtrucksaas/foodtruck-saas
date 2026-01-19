-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to get dashboard stats for a foodtruck
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_foodtruck_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'todayRevenue', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) = CURRENT_DATE
      AND payment_status = 'paid'
    ), 0),
    'todayOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) = CURRENT_DATE
    ),
    'pendingOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND status = 'pending'
    ),
    'preparingOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND status = 'preparing'
    ),
    'readyOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND status = 'ready'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics data
CREATE OR REPLACE FUNCTION get_analytics(
  p_foodtruck_id UUID,
  p_period TEXT DEFAULT 'week'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date DATE;
BEGIN
  -- Calculate start date based on period
  start_date := CASE p_period
    WHEN 'day' THEN CURRENT_DATE
    WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
    ELSE CURRENT_DATE - INTERVAL '7 days'
  END;

  SELECT json_build_object(
    'period', p_period,
    'revenue', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) >= start_date
      AND payment_status = 'paid'
    ), 0),
    'orderCount', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) >= start_date
    ),
    'averageOrderValue', COALESCE((
      SELECT AVG(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) >= start_date
      AND payment_status = 'paid'
    ), 0),
    'topItems', (
      SELECT json_agg(item_stats)
      FROM (
        SELECT
          json_build_object(
            'menuItemId', oi.menu_item_id,
            'menuItemName', mi.name,
            'quantity', SUM(oi.quantity),
            'revenue', SUM(oi.quantity * oi.unit_price)
          ) as item_stats
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) >= start_date
        AND o.payment_status = 'paid'
        GROUP BY oi.menu_item_id, mi.name
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 5
      ) top_items
    ),
    'revenueByDay', (
      SELECT json_agg(daily_stats ORDER BY date)
      FROM (
        SELECT
          DATE(created_at) as date,
          SUM(total_amount) as revenue,
          COUNT(*) as order_count
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) >= start_date
        AND payment_status = 'paid'
        GROUP BY DATE(created_at)
      ) daily_stats
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check slot availability
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_foodtruck_id UUID,
  p_pickup_time TIMESTAMPTZ,
  p_max_orders INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  slot_start TIMESTAMPTZ;
  slot_end TIMESTAMPTZ;
  order_count INTEGER;
BEGIN
  -- Round down to 15 minute slot
  slot_start := date_trunc('hour', p_pickup_time) +
    (EXTRACT(MINUTE FROM p_pickup_time)::INTEGER / 15 * 15) * INTERVAL '1 minute';
  slot_end := slot_start + INTERVAL '15 minutes';

  -- Count orders in this slot
  SELECT COUNT(*) INTO order_count
  FROM orders
  WHERE foodtruck_id = p_foodtruck_id
  AND pickup_time >= slot_start
  AND pickup_time < slot_end
  AND status NOT IN ('cancelled', 'completed');

  RETURN order_count < p_max_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available time slots
CREATE OR REPLACE FUNCTION get_available_slots(
  p_foodtruck_id UUID,
  p_date DATE,
  p_interval_minutes INTEGER DEFAULT 15,
  p_max_orders_per_slot INTEGER DEFAULT 5
)
RETURNS TABLE (
  slot_time TIME,
  available BOOLEAN,
  order_count INTEGER
) AS $$
DECLARE
  schedule_rec RECORD;
  current_slot TIME;
  slot_datetime TIMESTAMPTZ;
  orders_in_slot INTEGER;
BEGIN
  -- Get schedule for this day
  SELECT s.start_time, s.end_time INTO schedule_rec
  FROM schedules s
  WHERE s.foodtruck_id = p_foodtruck_id
  AND s.day_of_week = EXTRACT(DOW FROM p_date)
  AND s.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check for exceptions
  IF EXISTS (
    SELECT 1 FROM schedule_exceptions
    WHERE foodtruck_id = p_foodtruck_id
    AND date = p_date
    AND is_closed = TRUE
  ) THEN
    RETURN;
  END IF;

  current_slot := schedule_rec.start_time;

  WHILE current_slot < schedule_rec.end_time LOOP
    slot_datetime := p_date + current_slot;

    SELECT COUNT(*) INTO orders_in_slot
    FROM orders o
    WHERE o.foodtruck_id = p_foodtruck_id
    AND o.pickup_time >= slot_datetime
    AND o.pickup_time < slot_datetime + (p_interval_minutes || ' minutes')::INTERVAL
    AND o.status NOT IN ('cancelled', 'completed');

    slot_time := current_slot;
    order_count := orders_in_slot;
    available := orders_in_slot < p_max_orders_per_slot;

    RETURN NEXT;

    current_slot := current_slot + (p_interval_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

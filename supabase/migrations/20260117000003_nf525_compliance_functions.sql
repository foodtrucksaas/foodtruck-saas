-- Migration: NF525 Compliance - Remove payment references from analytics functions
-- MonTruck is a pre-order management tool, NOT a payment system
-- All payments are handled externally by merchants on-site

-- ============================================
-- Fix get_dashboard_stats - remove payment references
-- ============================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_foodtruck_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'todayOrderAmount', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) = CURRENT_DATE
      AND status NOT IN ('cancelled')
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
      AND status IN ('confirmed', 'preparing')
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

-- ============================================
-- Fix get_analytics - remove payment references
-- ============================================
CREATE OR REPLACE FUNCTION get_analytics(
  p_foodtruck_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  v_days_diff INTEGER;
BEGIN
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '6 days');
  v_days_diff := v_end_date - v_start_date + 1;
  v_prev_end_date := v_start_date - INTERVAL '1 day';
  v_prev_start_date := v_prev_end_date - (v_days_diff - 1);

  SELECT json_build_object(
    'startDate', v_start_date,
    'endDate', v_end_date,
    'dayCount', v_days_diff,

    -- Main metrics (status-based, not payment-based)
    'orderAmount', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled')
    ), 0),

    'previousOrderAmount', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled')
    ), 0),

    'orderCount', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status != 'cancelled'
    ),

    'previousOrderCount', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status != 'cancelled'
    ),

    'averageOrderValue', COALESCE((
      SELECT AVG(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled')
    ), 0),

    'previousAverageOrderValue', COALESCE((
      SELECT AVG(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled')
    ), 0),

    -- Top items
    'topItems', (
      SELECT COALESCE(json_agg(item_stats), '[]'::json)
      FROM (
        SELECT
          json_build_object(
            'menuItemId', oi.menu_item_id,
            'menuItemName', mi.name,
            'quantity', SUM(oi.quantity),
            'amount', SUM(oi.quantity * oi.unit_price),
            'orderCount', COUNT(DISTINCT o.id)
          ) as item_stats
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.status NOT IN ('cancelled')
        GROUP BY oi.menu_item_id, mi.name
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 10
      ) top_items
    ),

    -- Amount by day
    'amountByDay', (
      SELECT COALESCE(json_agg(daily_stats ORDER BY date), '[]'::json)
      FROM (
        SELECT
          DATE(created_at) as date,
          SUM(total_amount) as amount,
          COUNT(*) as order_count
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status NOT IN ('cancelled')
        GROUP BY DATE(created_at)
      ) daily_stats
    ),

    -- Orders by hour
    'ordersByHour', (
      SELECT COALESCE(json_agg(hourly_stats ORDER BY hour), '[]'::json)
      FROM (
        SELECT
          EXTRACT(HOUR FROM pickup_time)::INTEGER as hour,
          COUNT(*) as order_count,
          SUM(total_amount) as amount
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status != 'cancelled'
        GROUP BY EXTRACT(HOUR FROM pickup_time)
      ) hourly_stats
    ),

    -- Orders by day of week
    'ordersByDayOfWeek', (
      SELECT COALESCE(json_agg(dow_stats ORDER BY day_of_week), '[]'::json)
      FROM (
        SELECT
          EXTRACT(DOW FROM created_at)::INTEGER as day_of_week,
          COUNT(*) as order_count,
          SUM(total_amount) as amount
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status NOT IN ('cancelled')
        GROUP BY EXTRACT(DOW FROM created_at)
      ) dow_stats
    ),

    -- Amount by location
    'amountByLocation', (
      SELECT COALESCE(json_agg(loc_stats), '[]'::json)
      FROM (
        SELECT
          json_build_object(
            'locationId', l.id,
            'locationName', l.name,
            'orderCount', COUNT(o.id),
            'amount', SUM(o.total_amount)
          ) as loc_stats
        FROM orders o
        JOIN schedules s ON s.foodtruck_id = o.foodtruck_id
          AND EXTRACT(DOW FROM o.pickup_time) = s.day_of_week
        JOIN locations l ON l.id = s.location_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.status NOT IN ('cancelled')
        GROUP BY l.id, l.name
        ORDER BY SUM(o.total_amount) DESC
      ) loc_stats
    ),

    -- Categories performance
    'categoryStats', (
      SELECT COALESCE(json_agg(cat_stats), '[]'::json)
      FROM (
        SELECT
          json_build_object(
            'categoryId', c.id,
            'categoryName', c.name,
            'itemCount', COUNT(DISTINCT mi.id),
            'quantity', SUM(oi.quantity),
            'amount', SUM(oi.quantity * oi.unit_price)
          ) as cat_stats
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        LEFT JOIN categories c ON c.id = mi.category_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.status NOT IN ('cancelled')
        GROUP BY c.id, c.name
        ORDER BY SUM(oi.quantity * oi.unit_price) DESC
      ) cat_stats
    ),

    -- Unique customers
    'uniqueCustomers', (
      SELECT COUNT(DISTINCT customer_email)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status != 'cancelled'
    ),

    -- Returning customers
    'returningCustomers', (
      SELECT COUNT(*)
      FROM (
        SELECT customer_email
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status != 'cancelled'
        GROUP BY customer_email
        HAVING COUNT(*) > 1
      ) returning_cust
    )

  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

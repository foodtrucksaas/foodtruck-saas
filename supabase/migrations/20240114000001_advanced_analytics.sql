-- ============================================
-- ADVANCED ANALYTICS FUNCTION
-- Stats avancées comme les meilleurs POS
-- ============================================

-- Drop existing function to replace it
DROP FUNCTION IF EXISTS get_analytics(UUID, TEXT);

-- Enhanced analytics function with custom date range
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
  -- Default to last 7 days if no dates provided
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '6 days');

  -- Calculate previous period for comparison
  v_days_diff := v_end_date - v_start_date + 1;
  v_prev_end_date := v_start_date - INTERVAL '1 day';
  v_prev_start_date := v_prev_end_date - (v_days_diff - 1);

  SELECT json_build_object(
    'startDate', v_start_date,
    'endDate', v_end_date,
    'dayCount', v_days_diff,

    -- Main metrics
    'revenue', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND payment_status = 'paid'
    ), 0),

    'previousRevenue', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND payment_status = 'paid'
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
      AND payment_status = 'paid'
    ), 0),

    'previousAverageOrderValue', COALESCE((
      SELECT AVG(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND payment_status = 'paid'
    ), 0),

    -- Payment methods breakdown
    'paymentMethods', (
      SELECT json_build_object(
        'card', COALESCE(SUM(CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END), 0),
        'cash', COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END), 0),
        'cardRevenue', COALESCE(SUM(CASE WHEN payment_method = 'card' AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0),
        'cashRevenue', COALESCE(SUM(CASE WHEN payment_method = 'cash' AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0)
      )
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status != 'cancelled'
    ),

    -- Top items (top 10)
    'topItems', (
      SELECT COALESCE(json_agg(item_stats), '[]'::json)
      FROM (
        SELECT
          json_build_object(
            'menuItemId', oi.menu_item_id,
            'menuItemName', mi.name,
            'quantity', SUM(oi.quantity),
            'revenue', SUM(oi.quantity * oi.unit_price),
            'orderCount', COUNT(DISTINCT o.id)
          ) as item_stats
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.payment_status = 'paid'
        GROUP BY oi.menu_item_id, mi.name
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 10
      ) top_items
    ),

    -- Revenue by day
    'revenueByDay', (
      SELECT COALESCE(json_agg(daily_stats ORDER BY date), '[]'::json)
      FROM (
        SELECT
          DATE(created_at) as date,
          SUM(total_amount) as revenue,
          COUNT(*) as order_count
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND payment_status = 'paid'
        GROUP BY DATE(created_at)
      ) daily_stats
    ),

    -- Orders by hour (peak hours)
    'ordersByHour', (
      SELECT COALESCE(json_agg(hourly_stats ORDER BY hour), '[]'::json)
      FROM (
        SELECT
          EXTRACT(HOUR FROM pickup_time)::INTEGER as hour,
          COUNT(*) as order_count,
          SUM(total_amount) as revenue
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
          SUM(total_amount) as revenue
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND payment_status = 'paid'
        GROUP BY EXTRACT(DOW FROM created_at)
      ) dow_stats
    ),

    -- Revenue by location
    'revenueByLocation', (
      SELECT COALESCE(json_agg(loc_stats), '[]'::json)
      FROM (
        SELECT
          json_build_object(
            'locationId', l.id,
            'locationName', l.name,
            'orderCount', COUNT(o.id),
            'revenue', SUM(o.total_amount)
          ) as loc_stats
        FROM orders o
        JOIN schedules s ON s.foodtruck_id = o.foodtruck_id
          AND EXTRACT(DOW FROM o.pickup_time) = s.day_of_week
        JOIN locations l ON l.id = s.location_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.payment_status = 'paid'
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
            'revenue', SUM(oi.quantity * oi.unit_price)
          ) as cat_stats
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        LEFT JOIN categories c ON c.id = mi.category_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.payment_status = 'paid'
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

    -- Returning customers (ordered more than once)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_analytics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics(UUID, DATE, DATE) TO anon;

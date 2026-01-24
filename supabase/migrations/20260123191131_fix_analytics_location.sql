-- Fix get_analytics to properly calculate amountByLocation
-- Match orders to schedules by day of week, then get location name

CREATE OR REPLACE FUNCTION get_analytics(
  p_foodtruck_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE := p_start_date;
  v_end_date DATE := p_end_date;
  v_day_count INTEGER;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
BEGIN
  v_day_count := v_end_date - v_start_date + 1;
  v_prev_end_date := v_start_date - INTERVAL '1 day';
  v_prev_start_date := v_prev_end_date - (v_day_count - 1) * INTERVAL '1 day';

  RETURN json_build_object(
    'startDate', v_start_date,
    'endDate', v_end_date,
    'dayCount', v_day_count,
    'orderAmount', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled')
    ), 0),
    'previousOrderAmount', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled')
    ), 0),
    'orderCount', COALESCE((
      SELECT COUNT(*) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled')
    ), 0),
    'previousOrderCount', COALESCE((
      SELECT COUNT(*) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled')
    ), 0),
    'averageOrderValue', COALESCE((
      SELECT AVG(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled')
    ), 0),
    'previousAverageOrderValue', COALESCE((
      SELECT AVG(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled')
    ), 0),
    'topItems', (
      SELECT COALESCE(json_agg(item_stats), '[]'::json)
      FROM (
        SELECT json_build_object(
          'menuItemId', oi.menu_item_id,
          'menuItemName', mi.name,
          'quantity', COALESCE(SUM(oi.quantity), 0),
          'amount', COALESCE(SUM(oi.quantity * oi.unit_price), 0),
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
    'amountByDay', (
      SELECT COALESCE(json_agg(daily_stats ORDER BY date), '[]'::json)
      FROM (
        SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as amount, COUNT(*) as order_count
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status NOT IN ('cancelled')
        GROUP BY DATE(created_at)
      ) daily_stats
    ),
    'ordersByHour', (
      SELECT COALESCE(json_agg(hourly_stats ORDER BY hour), '[]'::json)
      FROM (
        SELECT EXTRACT(HOUR FROM created_at)::INTEGER as hour, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as amount
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status NOT IN ('cancelled')
        GROUP BY EXTRACT(HOUR FROM created_at)
      ) hourly_stats
    ),
    'ordersByDayOfWeek', (
      SELECT COALESCE(json_agg(dow_stats ORDER BY day_of_week), '[]'::json)
      FROM (
        SELECT EXTRACT(DOW FROM created_at)::INTEGER as day_of_week, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as amount
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status NOT IN ('cancelled')
        GROUP BY EXTRACT(DOW FROM created_at)
      ) dow_stats
    ),
    'uniqueCustomers', COALESCE((
      SELECT COUNT(DISTINCT customer_email) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled')
      AND customer_email IS NOT NULL
    ), 0),
    'returningCustomers', COALESCE((
      SELECT COUNT(*) FROM (
        SELECT customer_email FROM orders
        WHERE foodtruck_id = p_foodtruck_id
        AND DATE(created_at) BETWEEN v_start_date AND v_end_date
        AND status NOT IN ('cancelled')
        AND customer_email IS NOT NULL
        GROUP BY customer_email
        HAVING COUNT(*) > 1
      ) returning_cust
    ), 0),
    -- Amount by location: match orders to schedules by day of week, get location name
    'amountByLocation', (
      SELECT COALESCE(json_agg(loc_stats ORDER BY amount DESC), '[]'::json)
      FROM (
        SELECT
          COALESCE(l.name, s.address, 'Emplacement inconnu') as "locationName",
          l.id as "locationId",
          COUNT(DISTINCT o.id) as "orderCount",
          COALESCE(SUM(o.total_amount), 0) as amount
        FROM orders o
        JOIN schedules s ON s.foodtruck_id = o.foodtruck_id
          AND s.day_of_week = EXTRACT(DOW FROM o.pickup_time)::INTEGER
          AND s.is_active = true
        LEFT JOIN locations l ON l.id = s.location_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.status NOT IN ('cancelled')
        GROUP BY l.id, l.name, s.address
      ) loc_stats
    ),
    'categoryStats', (
      SELECT COALESCE(json_agg(cat_stats ORDER BY amount DESC), '[]'::json)
      FROM (
        SELECT COALESCE(c.name, 'Sans catégorie') as "categoryName", COALESCE(SUM(oi.quantity), 0) as quantity, COALESCE(SUM(oi.quantity * oi.unit_price), 0) as amount
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        LEFT JOIN categories c ON c.id = mi.category_id
        WHERE o.foodtruck_id = p_foodtruck_id
        AND DATE(o.created_at) BETWEEN v_start_date AND v_end_date
        AND o.status NOT IN ('cancelled')
        GROUP BY c.name
      ) cat_stats
    )
  );
END;
$$;

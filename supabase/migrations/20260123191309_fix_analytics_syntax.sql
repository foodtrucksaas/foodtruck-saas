-- Drop and recreate get_analytics with simplified, working version
DROP FUNCTION IF EXISTS get_analytics(UUID, DATE, DATE);

CREATE FUNCTION get_analytics(
  p_foodtruck_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_count INTEGER;
  v_prev_start DATE;
  v_prev_end DATE;
  v_result JSON;
BEGIN
  -- Calculate period
  v_day_count := p_end_date - p_start_date + 1;
  v_prev_end := p_start_date - 1;
  v_prev_start := v_prev_end - v_day_count + 1;

  SELECT json_build_object(
    'startDate', p_start_date,
    'endDate', p_end_date,
    'dayCount', v_day_count,

    'orderAmount', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN p_start_date AND p_end_date
        AND status != 'cancelled'
    ), 0),

    'previousOrderAmount', COALESCE((
      SELECT SUM(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN v_prev_start AND v_prev_end
        AND status != 'cancelled'
    ), 0),

    'orderCount', (
      SELECT COUNT(*)::int FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN p_start_date AND p_end_date
        AND status != 'cancelled'
    ),

    'previousOrderCount', (
      SELECT COUNT(*)::int FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN v_prev_start AND v_prev_end
        AND status != 'cancelled'
    ),

    'averageOrderValue', COALESCE((
      SELECT AVG(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN p_start_date AND p_end_date
        AND status != 'cancelled'
    ), 0),

    'previousAverageOrderValue', COALESCE((
      SELECT AVG(total_amount) FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN v_prev_start AND v_prev_end
        AND status != 'cancelled'
    ), 0),

    'uniqueCustomers', (
      SELECT COUNT(DISTINCT customer_email)::int FROM orders
      WHERE foodtruck_id = p_foodtruck_id
        AND created_at::date BETWEEN p_start_date AND p_end_date
        AND status != 'cancelled'
        AND customer_email IS NOT NULL
    ),

    'returningCustomers', (
      SELECT COUNT(*)::int FROM (
        SELECT customer_email FROM orders
        WHERE foodtruck_id = p_foodtruck_id
          AND created_at::date BETWEEN p_start_date AND p_end_date
          AND status != 'cancelled'
          AND customer_email IS NOT NULL
        GROUP BY customer_email HAVING COUNT(*) > 1
      ) r
    ),

    'topItems', COALESCE((
      SELECT json_agg(t) FROM (
        SELECT
          oi.menu_item_id as "menuItemId",
          mi.name as "menuItemName",
          SUM(oi.quantity)::int as quantity,
          SUM(oi.quantity * oi.unit_price)::int as amount,
          COUNT(DISTINCT o.id)::int as "orderCount"
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.foodtruck_id = p_foodtruck_id
          AND o.created_at::date BETWEEN p_start_date AND p_end_date
          AND o.status != 'cancelled'
        GROUP BY oi.menu_item_id, mi.name
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 10
      ) t
    ), '[]'::json),

    'amountByDay', COALESCE((
      SELECT json_agg(t ORDER BY t.date) FROM (
        SELECT
          created_at::date as date,
          SUM(total_amount)::int as amount,
          COUNT(*)::int as order_count
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
          AND created_at::date BETWEEN p_start_date AND p_end_date
          AND status != 'cancelled'
        GROUP BY created_at::date
      ) t
    ), '[]'::json),

    'ordersByHour', COALESCE((
      SELECT json_agg(t ORDER BY t.hour) FROM (
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*)::int as order_count,
          SUM(total_amount)::int as amount
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
          AND created_at::date BETWEEN p_start_date AND p_end_date
          AND status != 'cancelled'
        GROUP BY EXTRACT(HOUR FROM created_at)
      ) t
    ), '[]'::json),

    'ordersByDayOfWeek', COALESCE((
      SELECT json_agg(t ORDER BY t.day_of_week) FROM (
        SELECT
          EXTRACT(DOW FROM created_at)::int as day_of_week,
          COUNT(*)::int as order_count,
          SUM(total_amount)::int as amount
        FROM orders
        WHERE foodtruck_id = p_foodtruck_id
          AND created_at::date BETWEEN p_start_date AND p_end_date
          AND status != 'cancelled'
        GROUP BY EXTRACT(DOW FROM created_at)
      ) t
    ), '[]'::json),

    'amountByLocation', COALESCE((
      SELECT json_agg(t ORDER BY t.amount DESC) FROM (
        SELECT
          COALESCE(l.name, 'Non défini') as "locationName",
          l.id as "locationId",
          COUNT(DISTINCT o.id)::int as "orderCount",
          SUM(o.total_amount)::int as amount
        FROM orders o
        LEFT JOIN schedules s ON s.foodtruck_id = o.foodtruck_id
          AND s.day_of_week = EXTRACT(DOW FROM o.pickup_time)::int
          AND s.is_active = true
        LEFT JOIN locations l ON l.id = s.location_id
        WHERE o.foodtruck_id = p_foodtruck_id
          AND o.created_at::date BETWEEN p_start_date AND p_end_date
          AND o.status != 'cancelled'
        GROUP BY l.id, l.name
      ) t
    ), '[]'::json),

    'categoryStats', COALESCE((
      SELECT json_agg(t ORDER BY t.amount DESC) FROM (
        SELECT
          COALESCE(c.name, 'Sans catégorie') as "categoryName",
          SUM(oi.quantity)::int as quantity,
          SUM(oi.quantity * oi.unit_price)::int as amount
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        LEFT JOIN categories c ON c.id = mi.category_id
        WHERE o.foodtruck_id = p_foodtruck_id
          AND o.created_at::date BETWEEN p_start_date AND p_end_date
          AND o.status != 'cancelled'
        GROUP BY c.name
      ) t
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

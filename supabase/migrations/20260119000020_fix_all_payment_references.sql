-- ============================================
-- MIGRATION CRITIQUE: Corriger toutes les références aux colonnes payment supprimées
-- Les colonnes payment_method, payment_status, stripe_payment_intent_id ont été supprimées
-- MonTruck ne gère plus les paiements (NF525) - tout se paie sur place
-- ============================================

-- ============================================
-- 1. CORRIGER credit_loyalty_on_order_confirmed
-- ============================================
CREATE OR REPLACE FUNCTION credit_loyalty_on_order_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_foodtruck RECORD;
  v_customer RECORD;
BEGIN
  -- Plus de vérification payment_method - tous les paiements sont sur place

  -- Récupérer les paramètres fidélité du foodtruck
  SELECT loyalty_enabled, loyalty_points_per_euro
  INTO v_foodtruck
  FROM foodtrucks
  WHERE id = NEW.foodtruck_id;

  IF NOT FOUND OR NOT v_foodtruck.loyalty_enabled THEN
    RETURN NEW;
  END IF;

  -- Trouver le client et vérifier l'opt-in
  SELECT id, loyalty_opt_in INTO v_customer
  FROM customers
  WHERE foodtruck_id = NEW.foodtruck_id
    AND email = LOWER(TRIM(NEW.customer_email));

  IF v_customer.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ne créditer que si le client a opté pour la fidélité
  IF NOT COALESCE(v_customer.loyalty_opt_in, FALSE) THEN
    RETURN NEW;
  END IF;

  -- Créditer les points
  PERFORM credit_loyalty_points(
    v_customer.id,
    NEW.id,
    NEW.total_amount,
    v_foodtruck.loyalty_points_per_euro
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. CORRIGER get_dashboard_stats
-- ============================================
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
      AND status NOT IN ('cancelled', 'pending')
    ), 0),
    'todayOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) = CURRENT_DATE
      AND status != 'cancelled'
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

-- ============================================
-- 3. CORRIGER get_analytics (version avancée)
-- ============================================
DROP FUNCTION IF EXISTS get_analytics(UUID, TEXT);
DROP FUNCTION IF EXISTS get_analytics(UUID, DATE, DATE);

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

    -- Main metrics (status != cancelled = commande valide)
    'revenue', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled', 'pending')
    ), 0),

    'previousRevenue', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled', 'pending')
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
      AND status NOT IN ('cancelled', 'pending')
    ), 0),

    'previousAverageOrderValue', COALESCE((
      SELECT AVG(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(created_at) BETWEEN v_prev_start_date AND v_prev_end_date
      AND status NOT IN ('cancelled', 'pending')
    ), 0),

    -- Payment methods - plus de sens maintenant, retourne des valeurs par défaut
    'paymentMethods', json_build_object(
      'card', 0,
      'cash', 0,
      'cardRevenue', 0,
      'cashRevenue', 0
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
        AND o.status NOT IN ('cancelled', 'pending')
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
        AND status NOT IN ('cancelled', 'pending')
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
        AND status NOT IN ('cancelled', 'pending')
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
        AND o.status NOT IN ('cancelled', 'pending')
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
        AND o.status NOT IN ('cancelled', 'pending')
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_analytics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics(UUID, DATE, DATE) TO anon;

-- ============================================
-- 4. SUPPRIMER ET RECRÉER LES TRIGGERS CLIENTS
-- ============================================
DROP TRIGGER IF EXISTS trigger_upsert_customer_insert ON orders;
DROP TRIGGER IF EXISTS trigger_upsert_customer_update ON orders;
DROP TRIGGER IF EXISTS trigger_upsert_customer ON orders;

-- Recréer le trigger sans condition payment
CREATE TRIGGER trigger_upsert_customer_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION upsert_customer_from_order();

-- ============================================
-- 5. CORRIGER validate_order_status_transition (cast TEXT)
-- ============================================
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["picked_up", "no_show", "cancelled"],
    "picked_up": [],
    "cancelled": [],
    "no_show": []
  }'::JSONB;
  allowed_statuses JSONB;
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions for current status (CAST to TEXT!)
  allowed_statuses := valid_transitions -> OLD.status::TEXT;

  -- Check if the new status is allowed
  IF NOT (allowed_statuses ? NEW.status::TEXT) THEN
    RAISE EXCEPTION 'Transition de statut invalide: % → %. Transitions autorisées: %',
      OLD.status, NEW.status, allowed_statuses;
  END IF;

  -- If cancelling, require a reason
  IF NEW.status::TEXT = 'cancelled' AND (NEW.cancellation_reason IS NULL OR NEW.cancellation_reason = '') THEN
    RAISE EXCEPTION 'Un motif d''annulation est requis pour annuler une commande.';
  END IF;

  -- Set cancelled_at timestamp
  IF NEW.status::TEXT = 'cancelled' THEN
    NEW.cancelled_at := NOW();
    NEW.cancelled_by := 'merchant';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE - Toutes les références payment_* corrigées
-- ============================================

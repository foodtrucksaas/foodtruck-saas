-- ============================================
-- GARDER LE STATUT "ready" COMME OPTION
-- Flux: pending → confirmed → [ready (optionnel)] → picked_up
-- ============================================

-- Mettre à jour le trigger de validation
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["ready", "picked_up", "cancelled", "no_show"],
    "ready": ["picked_up", "cancelled", "no_show"],
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

  -- Get allowed transitions for current status
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

-- Mettre à jour get_dashboard_stats pour inclure les commandes ready
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
      AND DATE(pickup_time) = CURRENT_DATE
      AND status NOT IN ('cancelled', 'pending')
    ), 0),
    'todayOrderAmount', COALESCE((
      SELECT SUM(total_amount)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status != 'cancelled'
    ), 0),
    'todayOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status != 'cancelled'
    ),
    'pendingOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status = 'pending'
    ),
    'confirmedOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status = 'confirmed'
    ),
    'readyOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status = 'ready'
    ),
    'pickedUpOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status = 'picked_up'
    ),
    -- Legacy: preparingOrders = confirmed + ready (commandes en cours)
    'preparingOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status IN ('confirmed', 'ready')
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUPPRIMER LES STATUTS "preparing" ET "ready"
-- Nouveau flux simplifié : pending → confirmed → picked_up
-- ============================================

-- 1. Migrer les commandes existantes avec ces statuts
UPDATE orders SET status = 'confirmed' WHERE status = 'preparing';
UPDATE orders SET status = 'confirmed' WHERE status = 'ready';

-- 2. Mettre à jour le trigger de validation
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["picked_up", "cancelled", "no_show"],
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

-- 3. Mettre à jour get_dashboard_stats pour ne plus référencer preparing/ready
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
    'pickedUpOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status = 'picked_up'
    ),
    -- Legacy fields for backward compatibility (map to new statuses)
    'preparingOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE foodtruck_id = p_foodtruck_id
      AND DATE(pickup_time) = CURRENT_DATE
      AND status = 'confirmed'
    ),
    'readyOrders', 0
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: On ne peut pas supprimer les valeurs d'un ENUM en PostgreSQL
-- sans recréer complètement le type, ce qui est risqué.
-- Les valeurs 'preparing' et 'ready' restent dans l'enum mais ne sont plus utilisées.

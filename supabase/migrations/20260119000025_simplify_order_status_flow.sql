-- ============================================
-- SIMPLIFIER LE FLUX DE STATUT DES COMMANDES
-- Nouveau flux : pending → confirmed → picked_up
-- (preparing et ready sont optionnels)
-- ============================================

CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "ready", "picked_up", "cancelled"],
    "preparing": ["ready", "picked_up", "cancelled"],
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

-- Le trigger existe déjà, la fonction est juste mise à jour

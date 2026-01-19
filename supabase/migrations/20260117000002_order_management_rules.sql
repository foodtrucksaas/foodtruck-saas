-- Migration: Order management rules
-- Purpose: Implement business rules for order modifications
-- - No deletion allowed (only cancellation with reason)
-- - Track all modifications with history
-- - Restrict status changes to forward-only

-- ============================================
-- Step 1: Add cancellation_reason to orders
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'merchant' or 'system'

-- ============================================
-- Step 2: Create order_modifications table for history
-- ============================================
CREATE TABLE IF NOT EXISTS order_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  modified_by TEXT, -- 'merchant', 'customer', 'system'
  field_name TEXT NOT NULL, -- 'status', 'pickup_time', 'items', 'customer_email', etc.
  old_value TEXT,
  new_value TEXT,
  reason TEXT -- optional reason for the change
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_modifications_order_id ON order_modifications(order_id);
CREATE INDEX IF NOT EXISTS idx_order_modifications_modified_at ON order_modifications(modified_at DESC);

-- ============================================
-- Step 3: RLS policies for order_modifications
-- ============================================
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;

-- Merchants can view modifications for their orders
CREATE POLICY "Merchants can view their order modifications"
  ON order_modifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN foodtrucks f ON o.foodtruck_id = f.id
      WHERE o.id = order_modifications.order_id
      AND f.user_id = auth.uid()
    )
  );

-- Merchants can insert modifications (tracked changes)
CREATE POLICY "Merchants can insert order modifications"
  ON order_modifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN foodtrucks f ON o.foodtruck_id = f.id
      WHERE o.id = order_modifications.order_id
      AND f.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 4: Prevent DELETE on orders table
-- ============================================
-- Drop any existing delete policy
DROP POLICY IF EXISTS "Merchants can delete their orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- Create a policy that explicitly denies all deletes
-- (By not having any DELETE policy with RLS enabled, deletes are denied)
-- But let's be explicit with a function that raises an error

CREATE OR REPLACE FUNCTION prevent_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Les commandes ne peuvent pas être supprimées. Utilisez l''annulation avec motif.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_order_delete ON orders;
CREATE TRIGGER prevent_order_delete
  BEFORE DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_order_deletion();

-- ============================================
-- Step 5: Function to validate status transitions
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

  -- Get allowed transitions for current status
  allowed_statuses := valid_transitions -> OLD.status;

  -- Check if the new status is allowed
  IF NOT (allowed_statuses ? NEW.status) THEN
    RAISE EXCEPTION 'Transition de statut invalide: % → %. Transitions autorisées: %',
      OLD.status, NEW.status, allowed_statuses;
  END IF;

  -- If cancelling, require a reason
  IF NEW.status = 'cancelled' AND (NEW.cancellation_reason IS NULL OR NEW.cancellation_reason = '') THEN
    RAISE EXCEPTION 'Un motif d''annulation est requis pour annuler une commande.';
  END IF;

  -- Set cancelled_at timestamp
  IF NEW.status = 'cancelled' THEN
    NEW.cancelled_at := NOW();
    NEW.cancelled_by := 'merchant';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_order_status ON orders;
CREATE TRIGGER validate_order_status
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();

-- ============================================
-- Step 6: Function to track order modifications
-- ============================================
CREATE OR REPLACE FUNCTION track_order_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Track pickup_time changes
  IF OLD.pickup_time IS DISTINCT FROM NEW.pickup_time THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value)
    VALUES (NEW.id, 'merchant', 'pickup_time', OLD.pickup_time::TEXT, NEW.pickup_time::TEXT);
  END IF;

  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value, reason)
    VALUES (NEW.id, 'merchant', 'status', OLD.status, NEW.status,
      CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason ELSE NULL END);
  END IF;

  -- Track customer_email changes
  IF OLD.customer_email IS DISTINCT FROM NEW.customer_email THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value)
    VALUES (NEW.id, 'merchant', 'customer_email', OLD.customer_email, NEW.customer_email);
  END IF;

  -- Track customer_phone changes
  IF OLD.customer_phone IS DISTINCT FROM NEW.customer_phone THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value)
    VALUES (NEW.id, 'merchant', 'customer_phone', OLD.customer_phone, NEW.customer_phone);
  END IF;

  -- Track customer_name changes
  IF OLD.customer_name IS DISTINCT FROM NEW.customer_name THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value)
    VALUES (NEW.id, 'merchant', 'customer_name', OLD.customer_name, NEW.customer_name);
  END IF;

  -- Track total_amount changes
  IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value)
    VALUES (NEW.id, 'merchant', 'total_amount', OLD.total_amount::TEXT, NEW.total_amount::TEXT);
  END IF;

  -- Track notes changes
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO order_modifications (order_id, modified_by, field_name, old_value, new_value)
    VALUES (NEW.id, 'merchant', 'notes', OLD.notes, NEW.notes);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_order_changes ON orders;
CREATE TRIGGER track_order_changes
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_modification();

-- ============================================
-- Step 7: Prevent modification of protected fields
-- ============================================
CREATE OR REPLACE FUNCTION protect_order_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing order ID (should never happen but be explicit)
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Le numéro de commande ne peut pas être modifié.';
  END IF;

  -- Prevent changing created_at
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'La date de création ne peut pas être modifiée.';
  END IF;

  -- Prevent changing foodtruck_id
  IF OLD.foodtruck_id IS DISTINCT FROM NEW.foodtruck_id THEN
    RAISE EXCEPTION 'Le food truck associé ne peut pas être modifié.';
  END IF;

  -- Prevent modifying pickup_time if order is ready or later
  IF OLD.pickup_time IS DISTINCT FROM NEW.pickup_time
     AND OLD.status IN ('ready', 'picked_up', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'L''heure de retrait ne peut plus être modifiée une fois la commande prête.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_order_fields ON orders;
CREATE TRIGGER protect_order_fields
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION protect_order_fields();

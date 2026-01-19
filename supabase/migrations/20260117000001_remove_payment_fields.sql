-- Migration: Remove payment-related fields from orders table
-- Purpose: NF525 compliance - MonTruck is a pre-order management tool, NOT a payment system
-- All payments are handled externally by the merchant

-- Step 1: Drop triggers that depend on payment_method/payment_status columns
DROP TRIGGER IF EXISTS trigger_upsert_customer_insert ON orders;
DROP TRIGGER IF EXISTS trigger_upsert_customer_update ON orders;
DROP TRIGGER IF EXISTS trigger_upsert_customer ON orders;

-- Step 2: Create a new simple trigger that fires on all new orders
CREATE TRIGGER trigger_upsert_customer_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION upsert_customer_from_order();

-- Step 3: Drop payment-related columns from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- Step 4: Drop payment-related enums (if they exist)
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS payment_status;

-- Step 5: Add comment to clarify the business model
COMMENT ON TABLE orders IS 'Pre-orders for pickup. Payments are handled externally by merchants - MonTruck does NOT process payments (NF525 compliant).';

-- Step 6: Update order_status enum to include picked_up and no_show
-- First, update the enum type
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'no_show';

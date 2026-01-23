-- ============================================
-- RLS AUDIT & FIXES
-- Migration: 20260123_add_missing_rls.sql
-- Purpose: Comprehensive RLS policy audit and fixes
-- ============================================

-- ============================================
-- OFFER_USES: Add INSERT policy for recording offer usage
-- Current state: Only SELECT policy exists for owners
-- ============================================

-- Allow authenticated users to insert offer uses (when creating an order)
-- Service role and edge functions handle this, but we also allow authenticated
DROP POLICY IF EXISTS "Authenticated users can insert offer uses" ON offer_uses;
CREATE POLICY "Authenticated users can insert offer uses"
  ON offer_uses FOR INSERT
  WITH CHECK (true);

-- Allow customers to view their own offer uses (by email)
DROP POLICY IF EXISTS "Customers can view their own offer uses" ON offer_uses;
CREATE POLICY "Customers can view their own offer uses"
  ON offer_uses FOR SELECT
  USING (
    LOWER(customer_email) = LOWER(auth.email())
  );

-- ============================================
-- DEAL_USES: Add INSERT policy for recording deal usage
-- Current state: Only SELECT policy exists for owners
-- ============================================

-- Allow authenticated users to insert deal uses (when creating an order)
DROP POLICY IF EXISTS "Authenticated users can insert deal uses" ON deal_uses;
CREATE POLICY "Authenticated users can insert deal uses"
  ON deal_uses FOR INSERT
  WITH CHECK (true);

-- Allow customers to view their own deal uses (by email)
DROP POLICY IF EXISTS "Customers can view their own deal uses" ON deal_uses;
CREATE POLICY "Customers can view their own deal uses"
  ON deal_uses FOR SELECT
  USING (
    LOWER(customer_email) = LOWER(auth.email())
  );

-- ============================================
-- PROMO_CODE_USES: Add INSERT policy for recording promo code usage
-- Current state: Only SELECT policy exists for owners
-- ============================================

-- Allow authenticated users to insert promo code uses (when creating an order)
DROP POLICY IF EXISTS "Authenticated users can insert promo code uses" ON promo_code_uses;
CREATE POLICY "Authenticated users can insert promo code uses"
  ON promo_code_uses FOR INSERT
  WITH CHECK (true);

-- Allow customers to view their own promo code uses (by email)
DROP POLICY IF EXISTS "Customers can view their own promo code uses" ON promo_code_uses;
CREATE POLICY "Customers can view their own promo code uses"
  ON promo_code_uses FOR SELECT
  USING (
    LOWER(customer_email) = LOWER(auth.email())
  );

-- ============================================
-- ORDER_ITEM_OPTIONS: Ensure anonymous access for order viewing via secret link
-- When customers view orders via secret link (unauthenticated), they need
-- to see the options. The service role handles this, but we should also
-- support anon users who have the order ID (security by obscurity with UUIDs)
-- ============================================

-- Drop existing policy if it exists and recreate with broader access
DROP POLICY IF EXISTS "Order owners can view their order item options" ON order_item_options;

-- More permissive policy that allows viewing if you can access the order
-- Security relies on UUID unpredictability for order_id
DROP POLICY IF EXISTS "Users can view order item options via order access" ON order_item_options;
CREATE POLICY "Users can view order item options via order access"
  ON order_item_options FOR SELECT
  USING (
    -- Foodtruck owner can view
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_options.order_item_id
      AND o.foodtruck_id IN (SELECT f.id FROM foodtrucks f WHERE f.user_id = auth.uid())
    )
    OR
    -- Customer can view by email
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_options.order_item_id
      AND LOWER(o.customer_email) = LOWER(auth.email())
    )
    OR
    -- Customer can view by customer_id
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_options.order_item_id
      AND o.customer_id = auth.uid()
    )
  );

-- ============================================
-- LOYALTY_TRANSACTIONS: Ensure customers can view their transactions
-- The policy was added in 20260118000001_missing_rls_policies.sql
-- but let's ensure it exists
-- ============================================

DROP POLICY IF EXISTS "Customers can view their own loyalty transactions" ON loyalty_transactions;

CREATE POLICY "Customers can view their own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      WHERE LOWER(c.email) = LOWER(auth.email())
    )
  );

-- ============================================
-- ORDER_MODIFICATIONS: Add customer access to view modifications
-- Customers should be able to see changes made to their orders
-- ============================================

DROP POLICY IF EXISTS "Customers can view their order modifications" ON order_modifications;
CREATE POLICY "Customers can view their order modifications"
  ON order_modifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_modifications.order_id
      AND (
        LOWER(o.customer_email) = LOWER(auth.email())
        OR o.customer_id = auth.uid()
      )
    )
  );

-- ============================================
-- GRANTS: Ensure proper grants for anon users
-- ============================================

-- Ensure anon can access offer_uses for validation (read-only)
GRANT SELECT ON offer_uses TO anon;

-- Ensure anon can access deal_uses for validation (read-only)
GRANT SELECT ON deal_uses TO anon;

-- Ensure anon can access promo_code_uses for validation (read-only)
GRANT SELECT ON promo_code_uses TO anon;

-- Ensure anon can view order_item_options (for order secret links)
GRANT SELECT ON order_item_options TO anon;

-- Ensure anon can view order_modifications (for order secret links)
GRANT SELECT ON order_modifications TO anon;

-- ============================================
-- SECURITY NOTE:
-- The following tables intentionally have no public read access:
-- - customers (only foodtruck owner can view)
-- - customer_locations (only foodtruck owner can view)
-- - campaigns (only foodtruck owner can view)
-- - campaign_sends (only foodtruck owner can view)
-- - device_tokens (only owner can view their own)
--
-- These contain sensitive customer/business data that should remain private.
-- ============================================

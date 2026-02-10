-- Fix RLS policies for offer_uses and offers
-- Problem: OrderStatus page can't read offer_uses/offers data because:
-- 1. offer_uses only allows reading by matching customer_email, which fails for anon users
-- 2. offers only allows reading active offers, so deactivated offers break order history display
-- 3. The nested PostgREST query (orders -> offer_uses -> offers -> offer_items) requires
--    each table to be independently readable

-- ============================================
-- OFFER_USES: Allow reading for accessible orders
-- ============================================

-- Add policy that allows reading offer_uses when the user can access the associated order
-- This uses RLS recursion: PostgreSQL evaluates orders RLS to determine accessible order_ids
DROP POLICY IF EXISTS "Read offer_uses via order access" ON offer_uses;
CREATE POLICY "Read offer_uses via order access"
  ON offer_uses FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders)
  );

-- Ensure both roles have table-level SELECT grant
GRANT SELECT ON offer_uses TO anon;
GRANT SELECT ON offer_uses TO authenticated;

-- ============================================
-- OFFERS: Allow reading all offers (not just active)
-- ============================================
-- Offers are public promotions. Reading their config is needed for:
-- - Order history display (bundle structure, free item details)
-- - Client-side offer evaluation
-- No sensitive data is in the offers table.

DROP POLICY IF EXISTS "Anyone can read active offers" ON offers;
DROP POLICY IF EXISTS "Anyone can read offers" ON offers;
CREATE POLICY "Anyone can read offers"
  ON offers FOR SELECT
  USING (true);

-- Ensure both roles have table-level SELECT grant
GRANT SELECT ON offers TO anon;
GRANT SELECT ON offers TO authenticated;

-- ============================================
-- OFFER_ITEMS: Ensure grants exist
-- ============================================
GRANT SELECT ON offer_items TO anon;
GRANT SELECT ON offer_items TO authenticated;

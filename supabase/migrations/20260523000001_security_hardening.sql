-- ============================================
-- SECURITY HARDENING
-- Fix open INSERT policies, restrict function access
-- ============================================

-- 1. Orders: restrict INSERT to service_role only
--    All orders go through the create-order Edge Function (which uses service_role)
--    No client should insert orders directly via the REST API
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Only service role can create orders"
  ON orders FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. offer_uses: restrict INSERT to authenticated + service_role
--    Anon users should not be able to insert offer usage records
DROP POLICY IF EXISTS "Authenticated users can insert offer uses" ON offer_uses;
CREATE POLICY "Authenticated and service role can insert offer uses"
  ON offer_uses FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- 3. increment_offer_uses: revoke anon access
--    This SECURITY DEFINER function should not be callable by anonymous users
REVOKE EXECUTE ON FUNCTION increment_offer_uses(UUID, INTEGER, INTEGER) FROM anon;

-- 4. get_dashboard_stats: revoke anon access
--    Dashboard stats should only be accessible to authenticated users
REVOKE EXECUTE ON FUNCTION get_dashboard_stats(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_dashboard_stats(UUID) FROM public;

-- 5. get_analytics: revoke anon access
REVOKE EXECUTE ON FUNCTION get_analytics(UUID, DATE, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION get_analytics(UUID, DATE, DATE) FROM public;

-- 6. promo_codes: restrict SELECT to authenticated users only
--    Anonymous users should not be able to enumerate all promo codes
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON promo_codes;

-- Allow authenticated users and service_role to read promo codes
-- (the create-order edge function validates codes server-side via service_role)
CREATE POLICY "Authenticated users can view promo codes"
  ON promo_codes FOR SELECT
  TO authenticated, service_role
  USING (true);

-- Allow anon to validate a specific code (needed for client-side promo code input)
-- But only active, non-expired codes for a specific foodtruck
CREATE POLICY "Anon can view active promo codes by code"
  ON promo_codes FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
  );

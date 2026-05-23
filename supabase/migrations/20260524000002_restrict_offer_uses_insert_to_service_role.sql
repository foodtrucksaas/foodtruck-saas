-- ============================================
-- ITEM 2: Restrict offer_uses INSERT to service_role only
-- The only legitimate INSERT path is the create-order Edge Function
-- which runs as service_role (bypasses RLS). No frontend code
-- inserts into offer_uses directly.
-- ============================================

DROP POLICY IF EXISTS "Authenticated and service role can insert offer uses" ON offer_uses;
DROP POLICY IF EXISTS "Authenticated users can insert offer uses" ON offer_uses;

-- No INSERT policy needed: service_role bypasses RLS by definition.
-- Any authenticated/anon INSERT attempt will now be denied by RLS.

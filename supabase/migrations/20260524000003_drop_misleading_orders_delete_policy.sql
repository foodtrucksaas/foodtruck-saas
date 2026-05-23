-- ============================================
-- ITEM 4: Drop misleading DELETE policy on orders
-- The trigger `prevent_order_deletion` (from migration
-- 20260117000002_order_management_rules.sql) already blocks
-- all DELETE attempts unconditionally. Keeping a DELETE policy
-- that can never succeed is misleading — it suggests deletion
-- is possible for owners when it is not.
-- ============================================

DROP POLICY IF EXISTS "Owners can delete orders" ON orders;

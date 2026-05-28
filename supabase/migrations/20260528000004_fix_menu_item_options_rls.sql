-- Fix: remove overly broad "service role full access" policies.
-- In Supabase, service_role already bypasses RLS entirely, so these
-- policies just open a hole for all authenticated users.

DROP POLICY IF EXISTS "Service role full access menu item option groups" ON menu_item_option_groups;
DROP POLICY IF EXISTS "Service role full access menu item options" ON menu_item_options;
DROP POLICY IF EXISTS "Service role full access option templates" ON option_templates;

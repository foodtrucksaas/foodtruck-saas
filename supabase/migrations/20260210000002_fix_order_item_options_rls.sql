-- Fix order_item_options RLS to match order_items accessibility
-- Problem: orders and order_items are readable by anyone (USING TRUE),
-- but order_item_options requires auth.email() match, so options
-- don't display on the OrderStatus page for anonymous/mismatched users.

DROP POLICY IF EXISTS "Order owners can view their order item options" ON order_item_options;
DROP POLICY IF EXISTS "Anyone can read order item options" ON order_item_options;

-- Match the same accessibility as order_items (USING TRUE)
-- Security relies on UUID opacity (same pattern as orders/order_items)
CREATE POLICY "Anyone can read order item options"
  ON order_item_options FOR SELECT
  USING (true);

GRANT SELECT ON order_item_options TO anon;
GRANT SELECT ON order_item_options TO authenticated;

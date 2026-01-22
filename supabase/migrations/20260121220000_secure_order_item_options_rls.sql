-- ============================================
-- SECURE ORDER_ITEM_OPTIONS RLS
-- Fix overly permissive RLS policy
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view order item options" ON order_item_options;

-- Create proper policy: only order owners or foodtruck owners can view
CREATE POLICY "Order owners can view their order item options"
  ON order_item_options FOR SELECT
  USING (
    order_item_id IN (
      SELECT oi.id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE
        -- Customer can view their own order options
        LOWER(o.customer_email) = LOWER(auth.email())
        OR
        -- Foodtruck owner can view their order options
        o.foodtruck_id IN (
          SELECT f.id FROM foodtrucks f WHERE f.user_id = auth.uid()
        )
    )
  );

-- Note: For unauthenticated users viewing their order via secret link,
-- they need to access through the API which uses service role

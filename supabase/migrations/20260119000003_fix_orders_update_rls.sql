-- Fix: Ensure orders UPDATE policy exists and works correctly

-- Drop and recreate the UPDATE policy
DROP POLICY IF EXISTS "Owners can update orders" ON orders;

CREATE POLICY "Owners can update orders"
  ON orders FOR UPDATE
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Also ensure SELECT policy exists for owners
DROP POLICY IF EXISTS "Owners can view foodtruck orders" ON orders;

CREATE POLICY "Owners can view foodtruck orders"
  ON orders FOR SELECT
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, UPDATE ON orders TO authenticated;

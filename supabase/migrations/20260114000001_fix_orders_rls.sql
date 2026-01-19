-- Fix orders RLS policies for UPDATE and add DELETE

-- Drop existing UPDATE policy and recreate with proper permissions
DROP POLICY IF EXISTS "Owners can update orders" ON orders;

CREATE POLICY "Owners can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = orders.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = orders.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

-- Add DELETE policy for foodtruck owners
DROP POLICY IF EXISTS "Owners can delete orders" ON orders;

CREATE POLICY "Owners can delete orders"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM foodtrucks
      WHERE foodtrucks.id = orders.foodtruck_id
      AND foodtrucks.user_id = auth.uid()
    )
  );

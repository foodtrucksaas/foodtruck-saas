-- Fix orders update policy - add WITH CHECK clause

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

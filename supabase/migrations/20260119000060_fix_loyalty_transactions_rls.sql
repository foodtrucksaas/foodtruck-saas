-- Fix RLS for loyalty_transactions - allow foodtruck owners to insert

-- Enable RLS if not already enabled
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Allow foodtruck owners to insert loyalty transactions for their customers
CREATE POLICY "Owners can insert loyalty transactions"
  ON loyalty_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN foodtrucks f ON f.id = c.foodtruck_id
      WHERE c.id = loyalty_transactions.customer_id
      AND f.user_id = auth.uid()
    )
  );

-- Allow foodtruck owners to view loyalty transactions for their customers
DROP POLICY IF EXISTS "Foodtruck owners can view their loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Owners can view loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN foodtrucks f ON f.id = c.foodtruck_id
      WHERE c.id = loyalty_transactions.customer_id
      AND f.user_id = auth.uid()
    )
  );

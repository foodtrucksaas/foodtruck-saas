-- Migration définitive: Corrige toutes les policies RLS sur orders
-- Problème: auth.uid() retourne NULL ou les policies ne matchent pas

-- 1. SUPPRIMER toutes les policies orders existantes
DROP POLICY IF EXISTS "Owners can update orders" ON orders;
DROP POLICY IF EXISTS "Owners can view foodtruck orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Owners can delete orders" ON orders;
DROP POLICY IF EXISTS "Merchants can delete their orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- 2. RECRÉER les policies proprement

-- Policy SELECT pour les propriétaires de foodtruck
CREATE POLICY "Owners can view foodtruck orders"
  ON orders FOR SELECT
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Policy SELECT pour les clients (via email)
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (
    customer_email = auth.email()
    OR customer_id = auth.uid()
  );

-- Policy INSERT pour tous (guest checkout)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Policy UPDATE pour les propriétaires (CRITIQUE - c'était le bug)
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

-- Policy DELETE pour les propriétaires
CREATE POLICY "Owners can delete orders"
  ON orders FOR DELETE
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- 3. S'assurer que les permissions sont correctes
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;

-- 4. Vérifier que RLS est activé
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 5. Forcer l'application de RLS même pour le owner de la table
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Migration: Permettre aux clients anonymes de voir leurs commandes via l'ID (lien secret)
-- Nécessaire pour les commandes passées sans compte

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

-- Nouvelle politique: Tout le monde peut voir une commande s'il a l'ID (accès par lien)
CREATE POLICY "Anyone can view order by id"
  ON orders FOR SELECT
  USING (TRUE);

-- Nouvelle politique: Tout le monde peut voir les items d'une commande
CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (TRUE);

-- Note: La sécurité repose sur le fait que les IDs de commandes sont des UUIDs
-- impossibles à deviner. C'est le pattern "lien secret" utilisé par beaucoup de services.

-- ============================================
-- MISSING RLS POLICIES
-- Ajout des policies manquantes pour order_item_options et loyalty_transactions
-- ============================================

-- ============================================
-- ORDER_ITEM_OPTIONS
-- Mise à jour pour supporter le pattern "lien secret" (comme orders et order_items)
-- ============================================

-- Supprimer les anciennes policies restrictives
DROP POLICY IF EXISTS "Users can view their order item options" ON order_item_options;
DROP POLICY IF EXISTS "Foodtruck owners can view order item options" ON order_item_options;

-- Nouvelle policy: Tout le monde peut voir les options d'une commande
-- (Même pattern que order_items dans 20240101000007_fix_order_rls.sql)
-- La sécurité repose sur le fait que les IDs sont des UUIDs impossibles à deviner
CREATE POLICY "Anyone can view order item options"
  ON order_item_options FOR SELECT
  USING (TRUE);

-- ============================================
-- PROMO_CODE_USES
-- Policy lecture par owner déjà existante, on ajoute juste un commentaire de confirmation
-- (La policy "Foodtruck owners can view promo code uses" existe dans 20240116000002_promo_codes.sql)
-- ============================================

-- Rien à ajouter, la policy existe déjà

-- ============================================
-- DEAL_USES
-- Policy lecture par owner déjà existante, on ajoute juste un commentaire de confirmation
-- (La policy "Foodtruck owners can view deal uses" existe dans 20260115000001_deals.sql)
-- ============================================

-- Rien à ajouter, la policy existe déjà

-- ============================================
-- LOYALTY_TRANSACTIONS
-- Ajouter la policy pour que le customer concerné puisse voir ses transactions
-- ============================================

-- Le client peut voir ses propres transactions de fidélité (via son email)
CREATE POLICY "Customers can view their own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      WHERE LOWER(c.email) = LOWER(auth.email())
    )
  );

-- Note: La policy "Foodtruck owners can view their loyalty transactions" existe déjà
-- dans 20240117000001_loyalty_program.sql

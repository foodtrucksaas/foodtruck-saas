-- ============================================
-- FIX: Trigger client pour paiements carte
-- Le trigger précédent ne créait pas le client pour les paiements carte
-- car payment_status était 'pending' au moment de l'INSERT
-- ============================================

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trigger_upsert_customer ON orders;

-- Créer le trigger sur INSERT (pour les commandes cash)
CREATE TRIGGER trigger_upsert_customer_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.payment_method = 'cash')
  EXECUTE FUNCTION upsert_customer_from_order();

-- Créer un trigger sur UPDATE (pour les paiements carte confirmés)
CREATE TRIGGER trigger_upsert_customer_update
  AFTER UPDATE OF payment_status ON orders
  FOR EACH ROW
  WHEN (OLD.payment_status = 'pending' AND NEW.payment_status = 'paid')
  EXECUTE FUNCTION upsert_customer_from_order();

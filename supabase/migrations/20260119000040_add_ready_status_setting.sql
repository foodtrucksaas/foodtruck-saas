-- ============================================
-- AJOUTER LE RÉGLAGE POUR LE STATUT "PRÊT"
-- ============================================

-- Ajouter la colonne pour activer/désactiver le statut "Prêt"
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS use_ready_status BOOLEAN DEFAULT FALSE;

-- Commentaire
COMMENT ON COLUMN foodtrucks.use_ready_status IS 'Si true, affiche un bouton intermédiaire "Prêt" entre "Acceptée" et "Retirée"';

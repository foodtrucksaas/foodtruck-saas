-- Migration: Ajouter le paramètre d'affichage du popup de nouvelle commande
-- Permet aux commerçants de désactiver le popup même avec l'acceptation manuelle

ALTER TABLE foodtrucks
ADD COLUMN IF NOT EXISTS show_order_popup BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN foodtrucks.show_order_popup IS 'Afficher le popup de nouvelle commande (si acceptation manuelle activée)';

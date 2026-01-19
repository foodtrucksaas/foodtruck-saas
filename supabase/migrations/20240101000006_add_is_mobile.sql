-- Migration: Ajouter le champ is_mobile pour distinguer foodtrucks fixes et itinérants
-- Fixe = FALSE (par défaut), Itinérant = TRUE

ALTER TABLE foodtrucks ADD COLUMN is_mobile BOOLEAN DEFAULT FALSE;

-- Mettre à jour le foodtruck de test comme itinérant pour la démo
UPDATE foodtrucks SET is_mobile = TRUE WHERE id = '11111111-1111-1111-1111-111111111111';

-- Migration: Rendre l'adresse et les coordonnées optionnelles pour les emplacements
-- Permet de mettre soit une vraie adresse (avec GPS) soit juste un nom de lieu

-- Rendre address optionnel
ALTER TABLE locations ALTER COLUMN address DROP NOT NULL;

-- Rendre latitude optionnel
ALTER TABLE locations ALTER COLUMN latitude DROP NOT NULL;

-- Rendre longitude optionnel
ALTER TABLE locations ALTER COLUMN longitude DROP NOT NULL;

-- Ajouter une contrainte : si latitude est fourni, longitude doit l'être aussi (et vice versa)
ALTER TABLE locations ADD CONSTRAINT coordinates_both_or_none
  CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

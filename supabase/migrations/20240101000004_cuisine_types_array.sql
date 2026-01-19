-- Migration: Change cuisine_type from TEXT to TEXT[] (array)
-- Permet aux foodtrucks d'avoir plusieurs types de cuisine

-- 1. Ajouter une nouvelle colonne
ALTER TABLE foodtrucks ADD COLUMN cuisine_types TEXT[];

-- 2. Migrer les données existantes (convertir la valeur unique en tableau)
UPDATE foodtrucks
SET cuisine_types = ARRAY[cuisine_type]
WHERE cuisine_type IS NOT NULL;

-- 3. Supprimer l'ancienne colonne
ALTER TABLE foodtrucks DROP COLUMN cuisine_type;

-- 4. Ajouter une contrainte pour s'assurer qu'il y a au moins un type
ALTER TABLE foodtrucks ADD CONSTRAINT cuisine_types_not_empty
  CHECK (cuisine_types IS NULL OR array_length(cuisine_types, 1) > 0);

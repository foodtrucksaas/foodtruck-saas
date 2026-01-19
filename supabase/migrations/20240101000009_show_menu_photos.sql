-- Migration: Ajouter option pour afficher ou masquer les photos dans le menu
-- Le commerçant peut choisir si son menu présenté au client comporte des photos ou pas

ALTER TABLE foodtrucks ADD COLUMN show_menu_photos BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN foodtrucks.show_menu_photos IS 'Afficher les photos des plats dans le menu côté client';

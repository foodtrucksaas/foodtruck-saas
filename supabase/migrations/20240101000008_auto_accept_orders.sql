-- Migration: Ajouter les options de gestion des commandes
-- auto_accept_orders: TRUE = acceptées automatiquement, FALSE = validation manuelle (défaut)
-- max_orders_per_slot: Nombre max de commandes par créneau horaire (NULL = illimité)

ALTER TABLE foodtrucks ADD COLUMN auto_accept_orders BOOLEAN DEFAULT FALSE;
ALTER TABLE foodtrucks ADD COLUMN max_orders_per_slot INTEGER DEFAULT NULL;

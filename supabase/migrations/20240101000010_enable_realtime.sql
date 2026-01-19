-- Migration: Activer Realtime sur la table orders
-- Permet de recevoir les notifications en temps réel pour les nouvelles commandes

-- Activer realtime pour la table orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Ajout du champ unsubscribed_at pour tracer les désabonnements
ALTER TABLE customers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Index pour les désabonnements
CREATE INDEX IF NOT EXISTS idx_customers_unsubscribed ON customers(foodtruck_id, unsubscribed_at) WHERE unsubscribed_at IS NOT NULL;

-- Policy pour permettre aux edge functions de mettre à jour les désabonnements
-- (service role a déjà accès complet)

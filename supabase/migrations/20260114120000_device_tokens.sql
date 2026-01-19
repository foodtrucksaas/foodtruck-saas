-- Table pour stocker les tokens de notification push
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  foodtruck_id UUID REFERENCES foodtrucks(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(token)
);

-- Index pour rechercher les tokens d'un foodtruck
CREATE INDEX idx_device_tokens_foodtruck ON device_tokens(foodtruck_id);

-- RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Le propriétaire peut voir/gérer ses tokens
CREATE POLICY "Users can manage their own tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Les service_role peuvent tout faire (pour les edge functions)
CREATE POLICY "Service role can manage all tokens" ON device_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CUSTOMER CRM & MARKETING CAMPAIGNS
-- Gestion des clients et campagnes marketing
-- ============================================

-- Table clients (CRM)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,

  -- Consentements RGPD
  email_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in BOOLEAN DEFAULT FALSE,
  opted_in_at TIMESTAMPTZ,

  -- Stats (mises à jour via trigger)
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,  -- en centimes

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un client unique par email par foodtruck
  UNIQUE(foodtruck_id, email)
);

-- Index pour recherches fréquentes
CREATE INDEX idx_customers_foodtruck ON customers(foodtruck_id);
CREATE INDEX idx_customers_email_opt_in ON customers(foodtruck_id, email_opt_in) WHERE email_opt_in = TRUE;
CREATE INDEX idx_customers_last_order ON customers(foodtruck_id, last_order_at);

-- Historique des emplacements par client
CREATE TABLE customer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  order_count INTEGER DEFAULT 1,
  total_spent INTEGER DEFAULT 0,
  last_order_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, location_id)
);

CREATE INDEX idx_customer_locations_customer ON customer_locations(customer_id);
CREATE INDEX idx_customer_locations_location ON customer_locations(location_id);

-- Types de campagnes
CREATE TYPE campaign_type AS ENUM ('manual', 'automated');
CREATE TYPE campaign_trigger AS ENUM (
  'manual',           -- Envoi manuel
  'location_day',     -- Jour d'un emplacement (ex: tous les jeudis à Fontevraud)
  'inactive',         -- Client inactif depuis X jours
  'welcome',          -- 1ère commande
  'milestone',        -- X commandes atteintes
  'birthday'          -- Anniversaire 1ère commande
);
CREATE TYPE campaign_channel AS ENUM ('email', 'sms', 'both');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Table campagnes
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL REFERENCES foodtrucks(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  type campaign_type NOT NULL DEFAULT 'manual',
  trigger_type campaign_trigger NOT NULL DEFAULT 'manual',
  channel campaign_channel NOT NULL DEFAULT 'email',
  status campaign_status NOT NULL DEFAULT 'draft',

  -- Ciblage (JSON flexible)
  -- Exemples:
  -- {"segment": "all"}
  -- {"segment": "location", "location_id": "xxx"}
  -- {"segment": "inactive", "days": 30}
  -- {"segment": "loyal", "min_orders": 5}
  -- {"segment": "new", "days": 7}
  targeting JSONB NOT NULL DEFAULT '{"segment": "all"}',

  -- Contenu email
  email_subject TEXT,
  email_body TEXT,

  -- Contenu SMS (160 chars max conseillé)
  sms_body TEXT,

  -- Planification pour campagnes automatiques
  -- Pour location_day: {"day_of_week": 4, "send_time": "09:00"}
  -- Pour inactive: {"days": 30, "send_time": "10:00"}
  schedule JSONB,

  -- Stats
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,

  -- Dates
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_foodtruck ON campaigns(foodtruck_id);
CREATE INDEX idx_campaigns_status ON campaigns(status) WHERE status = 'active';
CREATE INDEX idx_campaigns_trigger ON campaigns(trigger_type);

-- Historique des envois
CREATE TYPE send_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');

CREATE TABLE campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  channel campaign_channel NOT NULL,
  status send_status NOT NULL DEFAULT 'pending',

  -- IDs externes pour tracking
  resend_id TEXT,        -- ID email Resend
  twilio_sid TEXT,       -- SID SMS Twilio

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_customer ON campaign_sends(customer_id);
CREATE INDEX idx_campaign_sends_status ON campaign_sends(status);

-- ============================================
-- TRIGGERS ET FONCTIONS
-- ============================================

-- Fonction pour créer/mettre à jour un client lors d'une commande
CREATE OR REPLACE FUNCTION upsert_customer_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_location_id UUID;
BEGIN
  -- Ignorer si pas d'email
  IF NEW.customer_email IS NULL OR NEW.customer_email = '' OR NEW.customer_email = 'surplace@local' THEN
    RETURN NEW;
  END IF;

  -- Créer ou mettre à jour le client
  INSERT INTO customers (foodtruck_id, email, name, first_order_at, last_order_at, total_orders, total_spent)
  VALUES (
    NEW.foodtruck_id,
    LOWER(TRIM(NEW.customer_email)),
    NEW.customer_name,
    NEW.created_at,
    NEW.created_at,
    1,
    NEW.total_amount
  )
  ON CONFLICT (foodtruck_id, email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, customers.name),
    last_order_at = EXCLUDED.last_order_at,
    total_orders = customers.total_orders + 1,
    total_spent = customers.total_spent + EXCLUDED.total_spent,
    updated_at = NOW()
  RETURNING id INTO v_customer_id;

  -- Trouver l'emplacement du jour de la commande
  SELECT s.location_id INTO v_location_id
  FROM schedules s
  WHERE s.foodtruck_id = NEW.foodtruck_id
    AND s.day_of_week = EXTRACT(DOW FROM NEW.pickup_time)::INTEGER
    AND s.is_active = TRUE
  LIMIT 1;

  -- Mettre à jour customer_locations si on a trouvé un emplacement
  IF v_location_id IS NOT NULL THEN
    INSERT INTO customer_locations (customer_id, location_id, order_count, total_spent, last_order_at)
    VALUES (v_customer_id, v_location_id, 1, NEW.total_amount, NEW.created_at)
    ON CONFLICT (customer_id, location_id) DO UPDATE SET
      order_count = customer_locations.order_count + 1,
      total_spent = customer_locations.total_spent + EXCLUDED.total_spent,
      last_order_at = EXCLUDED.last_order_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur les nouvelles commandes payées
DROP TRIGGER IF EXISTS trigger_upsert_customer ON orders;
CREATE TRIGGER trigger_upsert_customer
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' OR NEW.payment_method = 'cash')
  EXECUTE FUNCTION upsert_customer_from_order();

-- Fonction pour mettre à jour les stats d'une campagne
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET
    sent_count = (SELECT COUNT(*) FROM campaign_sends WHERE campaign_id = NEW.campaign_id AND status != 'pending' AND status != 'failed'),
    delivered_count = (SELECT COUNT(*) FROM campaign_sends WHERE campaign_id = NEW.campaign_id AND status IN ('delivered', 'opened', 'clicked')),
    opened_count = (SELECT COUNT(*) FROM campaign_sends WHERE campaign_id = NEW.campaign_id AND status IN ('opened', 'clicked')),
    clicked_count = (SELECT COUNT(*) FROM campaign_sends WHERE campaign_id = NEW.campaign_id AND status = 'clicked'),
    updated_at = NOW()
  WHERE id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON campaign_sends;
CREATE TRIGGER trigger_update_campaign_stats
  AFTER UPDATE OF status ON campaign_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour obtenir les destinataires d'une campagne
CREATE OR REPLACE FUNCTION get_campaign_recipients(
  p_campaign_id UUID
)
RETURNS TABLE (
  customer_id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  email_opt_in BOOLEAN,
  sms_opt_in BOOLEAN
) AS $$
DECLARE
  v_campaign RECORD;
  v_segment TEXT;
  v_location_id UUID;
  v_days INTEGER;
  v_min_orders INTEGER;
BEGIN
  -- Récupérer la campagne
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_segment := v_campaign.targeting->>'segment';

  -- Tous les clients opt-in
  IF v_segment = 'all' THEN
    RETURN QUERY
    SELECT c.id, c.email, c.name, c.phone, c.email_opt_in, c.sms_opt_in
    FROM customers c
    WHERE c.foodtruck_id = v_campaign.foodtruck_id
      AND (c.email_opt_in = TRUE OR c.sms_opt_in = TRUE);

  -- Clients d'un emplacement
  ELSIF v_segment = 'location' THEN
    v_location_id := (v_campaign.targeting->>'location_id')::UUID;
    RETURN QUERY
    SELECT c.id, c.email, c.name, c.phone, c.email_opt_in, c.sms_opt_in
    FROM customers c
    JOIN customer_locations cl ON cl.customer_id = c.id
    WHERE c.foodtruck_id = v_campaign.foodtruck_id
      AND cl.location_id = v_location_id
      AND (c.email_opt_in = TRUE OR c.sms_opt_in = TRUE);

  -- Clients inactifs
  ELSIF v_segment = 'inactive' THEN
    v_days := COALESCE((v_campaign.targeting->>'days')::INTEGER, 30);
    RETURN QUERY
    SELECT c.id, c.email, c.name, c.phone, c.email_opt_in, c.sms_opt_in
    FROM customers c
    WHERE c.foodtruck_id = v_campaign.foodtruck_id
      AND c.last_order_at < NOW() - (v_days || ' days')::INTERVAL
      AND (c.email_opt_in = TRUE OR c.sms_opt_in = TRUE);

  -- Clients fidèles
  ELSIF v_segment = 'loyal' THEN
    v_min_orders := COALESCE((v_campaign.targeting->>'min_orders')::INTEGER, 5);
    RETURN QUERY
    SELECT c.id, c.email, c.name, c.phone, c.email_opt_in, c.sms_opt_in
    FROM customers c
    WHERE c.foodtruck_id = v_campaign.foodtruck_id
      AND c.total_orders >= v_min_orders
      AND (c.email_opt_in = TRUE OR c.sms_opt_in = TRUE);

  -- Nouveaux clients
  ELSIF v_segment = 'new' THEN
    v_days := COALESCE((v_campaign.targeting->>'days')::INTEGER, 7);
    RETURN QUERY
    SELECT c.id, c.email, c.name, c.phone, c.email_opt_in, c.sms_opt_in
    FROM customers c
    WHERE c.foodtruck_id = v_campaign.foodtruck_id
      AND c.first_order_at > NOW() - (v_days || ' days')::INTERVAL
      AND (c.email_opt_in = TRUE OR c.sms_opt_in = TRUE);

  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour compter les destinataires potentiels
CREATE OR REPLACE FUNCTION count_campaign_recipients(
  p_foodtruck_id UUID,
  p_targeting JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_segment TEXT;
  v_location_id UUID;
  v_days INTEGER;
  v_min_orders INTEGER;
BEGIN
  v_segment := p_targeting->>'segment';

  IF v_segment = 'all' THEN
    SELECT COUNT(*) INTO v_count
    FROM customers
    WHERE foodtruck_id = p_foodtruck_id
      AND (email_opt_in = TRUE OR sms_opt_in = TRUE);

  ELSIF v_segment = 'location' THEN
    v_location_id := (p_targeting->>'location_id')::UUID;
    SELECT COUNT(DISTINCT c.id) INTO v_count
    FROM customers c
    JOIN customer_locations cl ON cl.customer_id = c.id
    WHERE c.foodtruck_id = p_foodtruck_id
      AND cl.location_id = v_location_id
      AND (c.email_opt_in = TRUE OR c.sms_opt_in = TRUE);

  ELSIF v_segment = 'inactive' THEN
    v_days := COALESCE((p_targeting->>'days')::INTEGER, 30);
    SELECT COUNT(*) INTO v_count
    FROM customers
    WHERE foodtruck_id = p_foodtruck_id
      AND last_order_at < NOW() - (v_days || ' days')::INTERVAL
      AND (email_opt_in = TRUE OR sms_opt_in = TRUE);

  ELSIF v_segment = 'loyal' THEN
    v_min_orders := COALESCE((p_targeting->>'min_orders')::INTEGER, 5);
    SELECT COUNT(*) INTO v_count
    FROM customers
    WHERE foodtruck_id = p_foodtruck_id
      AND total_orders >= v_min_orders
      AND (email_opt_in = TRUE OR sms_opt_in = TRUE);

  ELSIF v_segment = 'new' THEN
    v_days := COALESCE((p_targeting->>'days')::INTEGER, 7);
    SELECT COUNT(*) INTO v_count
    FROM customers
    WHERE foodtruck_id = p_foodtruck_id
      AND first_order_at > NOW() - (v_days || ' days')::INTERVAL
      AND (email_opt_in = TRUE OR sms_opt_in = TRUE);

  ELSE
    v_count := 0;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

-- Policies pour customers
CREATE POLICY "Foodtruck owners can manage their customers"
  ON customers FOR ALL
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Policies pour customer_locations
CREATE POLICY "Foodtruck owners can view customer locations"
  ON customer_locations FOR ALL
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      JOIN foodtrucks f ON f.id = c.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Policies pour campaigns
CREATE POLICY "Foodtruck owners can manage their campaigns"
  ON campaigns FOR ALL
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

-- Policies pour campaign_sends
CREATE POLICY "Foodtruck owners can view their campaign sends"
  ON campaign_sends FOR ALL
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN foodtrucks f ON f.id = c.foodtruck_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customer_locations TO authenticated;
GRANT ALL ON campaigns TO authenticated;
GRANT ALL ON campaign_sends TO authenticated;

GRANT EXECUTE ON FUNCTION get_campaign_recipients(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_campaign_recipients(UUID, JSONB) TO authenticated;

-- Phase 1.1 Billing: subscriptions, admins, admin_actions, webhook idempotence

---------------------------------------------------
-- 1. subscriptions
---------------------------------------------------
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foodtruck_id UUID NOT NULL UNIQUE REFERENCES foodtrucks(id) ON DELETE CASCADE,

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'paused',
    'expired_trial'
  )),

  -- Key dates
  trial_started_at TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_ends_at
  ON subscriptions(trial_ends_at)
  WHERE status = 'trialing';
CREATE INDEX idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own subscription" ON subscriptions
  FOR SELECT USING (
    foodtruck_id IN (SELECT id FROM foodtrucks WHERE user_id = auth.uid())
  );

---------------------------------------------------
-- 2. get_access_state function
---------------------------------------------------
CREATE OR REPLACE FUNCTION get_access_state(p_status TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN p_status IN ('trialing', 'active', 'past_due') THEN 'full'
    ELSE 'degraded'
  END;
$$;

---------------------------------------------------
-- 3. Trigger: auto-create trial subscription on foodtruck creation
---------------------------------------------------
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (foodtruck_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trialing', NOW(), NOW() + INTERVAL '14 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_foodtruck_created
  AFTER INSERT ON foodtrucks
  FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();

---------------------------------------------------
-- 4. Backfill existing foodtrucks
---------------------------------------------------
INSERT INTO subscriptions (foodtruck_id, status, trial_started_at, trial_ends_at)
SELECT id, 'trialing', NOW(), NOW() + INTERVAL '14 days'
FROM foodtrucks
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE foodtruck_id = foodtrucks.id);

---------------------------------------------------
-- 5. admins
---------------------------------------------------
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read admins" ON admins
  FOR SELECT USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

---------------------------------------------------
-- 6. admin_actions
---------------------------------------------------
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id),
  action TEXT NOT NULL,
  target_foodtruck_id UUID REFERENCES foodtrucks(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read admin_actions" ON admin_actions
  FOR SELECT USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

---------------------------------------------------
-- 7. stripe_webhook_events (idempotence)
---------------------------------------------------
CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: only service_role accesses this table

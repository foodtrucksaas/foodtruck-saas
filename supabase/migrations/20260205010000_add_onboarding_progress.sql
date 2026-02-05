-- Add onboarding progress tracking columns to foodtrucks table
ALTER TABLE foodtrucks
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['cash', 'card'],
ADD COLUMN IF NOT EXISTS pickup_slot_interval INTEGER DEFAULT 15;

-- Add comment for documentation
COMMENT ON COLUMN foodtrucks.onboarding_step IS 'Current step in the onboarding assistant (0=not started, 6=completed)';
COMMENT ON COLUMN foodtrucks.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN foodtrucks.payment_methods IS 'Payment methods accepted (cash, card, contactless, ticket_resto)';
COMMENT ON COLUMN foodtrucks.pickup_slot_interval IS 'Interval in minutes between pickup slots (default 15)';

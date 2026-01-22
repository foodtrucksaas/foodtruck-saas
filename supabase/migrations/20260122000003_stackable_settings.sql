-- Add global stackability settings to foodtrucks
-- This simplifies the per-offer stackable flag

-- offers_stackable: if true, multiple offers can stack; if false, only best offer applies
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS offers_stackable BOOLEAN DEFAULT FALSE;

-- promo_codes_stackable: if true, promo codes can stack with offers; if false, promo codes disabled when offer is applied
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS promo_codes_stackable BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN foodtrucks.offers_stackable IS 'When true, multiple offers can stack together. When false, only the best offer applies.';
COMMENT ON COLUMN foodtrucks.promo_codes_stackable IS 'When true, promo codes can be applied on top of offers. When false, promo codes are disabled when an offer is active.';

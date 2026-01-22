-- ============================================
-- ADD PROFILE FIELDS FOR MERCHANTS
-- Social media, payment methods, business info
-- ============================================

-- Social media links
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Business info
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS siret VARCHAR(14);

-- Payment methods accepted (array of strings)
-- Possible values: 'cash', 'card', 'contactless', 'lydia', 'paylib', 'check'
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['cash', 'card']::TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN foodtrucks.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN foodtrucks.facebook_url IS 'Facebook page URL';
COMMENT ON COLUMN foodtrucks.tiktok_url IS 'TikTok profile URL';
COMMENT ON COLUMN foodtrucks.website_url IS 'Personal website URL';
COMMENT ON COLUMN foodtrucks.siret IS 'French business registration number (14 digits)';
COMMENT ON COLUMN foodtrucks.payment_methods IS 'Array of accepted payment methods: cash, card, contactless, lydia, paylib, check';

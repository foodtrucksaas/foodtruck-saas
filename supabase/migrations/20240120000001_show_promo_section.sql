-- Add show_promo_section field to foodtrucks
ALTER TABLE foodtrucks 
ADD COLUMN IF NOT EXISTS show_promo_section BOOLEAN DEFAULT TRUE;

-- Comment
COMMENT ON COLUMN foodtrucks.show_promo_section IS 'Whether to show the promo code section to customers at checkout';

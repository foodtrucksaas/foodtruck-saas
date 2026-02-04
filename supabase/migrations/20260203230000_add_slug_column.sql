-- Enable unaccent extension for slug generation (removes accents)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add slug column for subdomain routing
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_foodtrucks_slug ON foodtrucks(slug) WHERE slug IS NOT NULL;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(name),
        '[^a-zA-Z0-9]+', '-', 'g'
      ),
      '^-|-$', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate existing foodtrucks with generated slugs
-- Add a suffix with first 4 chars of UUID to ensure uniqueness
UPDATE foodtrucks
SET slug = generate_slug(name) || '-' || substring(id::text, 1, 4)
WHERE slug IS NULL;

-- Make slug NOT NULL after population
ALTER TABLE foodtrucks ALTER COLUMN slug SET NOT NULL;

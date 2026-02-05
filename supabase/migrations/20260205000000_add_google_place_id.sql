-- Add Google Place ID to locations for better address management
-- This allows:
-- 1. Storing the Google Place ID for reliable place lookup
-- 2. Keeping a simple display name separate from the full address

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Add index for potential lookups by place_id
CREATE INDEX IF NOT EXISTS idx_locations_google_place_id
ON locations(google_place_id)
WHERE google_place_id IS NOT NULL;

-- Comment explaining the fields
COMMENT ON COLUMN locations.name IS 'Simple display name for clients (e.g., "Marché des Halles")';
COMMENT ON COLUMN locations.address IS 'Full formatted address from Google Places (e.g., "Place des Halles, 75001 Paris, France")';
COMMENT ON COLUMN locations.google_place_id IS 'Google Place ID for reliable place identification and directions';

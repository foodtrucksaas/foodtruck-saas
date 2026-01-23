-- Add theme column to foodtrucks table
-- Allows merchants to customize their client-facing app colors

ALTER TABLE foodtrucks
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'coral';

-- Add comment for documentation
COMMENT ON COLUMN foodtrucks.theme IS 'Color theme for client app. Valid values: coral, orange, emerald, blue, purple, red';

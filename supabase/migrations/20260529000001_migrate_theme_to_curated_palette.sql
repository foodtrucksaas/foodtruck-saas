-- Migrate theme column from old generic Tailwind palette (6 themes)
-- to curated Mediterranean palette (8 themes).
-- Old IDs: coral, orange, emerald, blue, purple, red
-- New IDs: corail, marine, olive, terracotta, safran, anthracite, aubergine, vertsapin

-- Map old values to new equivalents
UPDATE foodtrucks SET theme = 'corail'     WHERE theme = 'coral';
UPDATE foodtrucks SET theme = 'terracotta' WHERE theme = 'orange';
UPDATE foodtrucks SET theme = 'olive'      WHERE theme = 'emerald';
UPDATE foodtrucks SET theme = 'marine'     WHERE theme = 'blue';
UPDATE foodtrucks SET theme = 'aubergine'  WHERE theme = 'purple';
UPDATE foodtrucks SET theme = 'terracotta' WHERE theme = 'red';

-- Catch any unknown values
UPDATE foodtrucks SET theme = 'corail'
  WHERE theme NOT IN ('corail', 'marine', 'olive', 'terracotta', 'safran', 'anthracite', 'aubergine', 'vertsapin');

-- Update default
ALTER TABLE foodtrucks ALTER COLUMN theme SET DEFAULT 'corail';

-- Add CHECK constraint for allowed values
ALTER TABLE foodtrucks ADD CONSTRAINT foodtrucks_theme_check
  CHECK (theme IN ('corail', 'marine', 'olive', 'terracotta', 'safran', 'anthracite', 'aubergine', 'vertsapin'));

-- Update comment
COMMENT ON COLUMN foodtrucks.theme IS 'Color theme for client app. Valid values: corail, marine, olive, terracotta, safran, anthracite, aubergine, vertsapin';

-- Drop tagline column from foodtrucks table (if it exists)
ALTER TABLE foodtrucks DROP COLUMN IF EXISTS tagline;

-- Add tagline column to foodtrucks table
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);

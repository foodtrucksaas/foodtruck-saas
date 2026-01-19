-- Add min_preparation_time field to foodtrucks table
-- Defines the minimum time (in minutes) before a customer can pick up an order

ALTER TABLE foodtrucks
ADD COLUMN min_preparation_time INTEGER DEFAULT 15 CHECK (min_preparation_time IN (5, 10, 15));

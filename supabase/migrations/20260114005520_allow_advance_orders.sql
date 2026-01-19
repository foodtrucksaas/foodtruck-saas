-- Add allow_advance_orders field to foodtrucks table
-- When true: customers can order in advance for same-day pickup (even before opening)
-- When false: customers can only order during open hours

ALTER TABLE foodtrucks
ADD COLUMN allow_advance_orders BOOLEAN DEFAULT true;

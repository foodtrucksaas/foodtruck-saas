-- Add order slot interval setting (5, 10, or 15 minutes)
ALTER TABLE foodtrucks
ADD COLUMN order_slot_interval INTEGER DEFAULT 15 CHECK (order_slot_interval IN (5, 10, 15));

COMMENT ON COLUMN foodtrucks.order_slot_interval IS 'Time slot interval for orders in minutes (5, 10, or 15)';

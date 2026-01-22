-- Add advance_order_days field to limit how far in advance customers can order
-- Default is 7 days (one week)
ALTER TABLE foodtrucks
ADD COLUMN IF NOT EXISTS advance_order_days INTEGER DEFAULT 7;

-- Comment for documentation
COMMENT ON COLUMN foodtrucks.advance_order_days IS 'Maximum number of days in advance that customers can place orders. NULL means unlimited.';

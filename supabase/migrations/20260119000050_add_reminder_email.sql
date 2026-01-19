-- Add send_reminder_email setting to foodtrucks table
-- When true, a reminder email is sent 30 min before pickup if order was placed > 2h before
ALTER TABLE foodtrucks
ADD COLUMN send_reminder_email BOOLEAN DEFAULT false;

COMMENT ON COLUMN foodtrucks.send_reminder_email IS 'Send reminder email 30 min before pickup (if order placed > 2h before)';

-- Add reminder_sent_at to orders table to track when reminder was sent
ALTER TABLE orders
ADD COLUMN reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.reminder_sent_at IS 'Timestamp when the reminder email was sent';

-- Create index for efficient reminder query
CREATE INDEX idx_orders_reminder_pending ON orders (pickup_time, reminder_sent_at)
WHERE reminder_sent_at IS NULL AND status = 'confirmed';

-- Add send_confirmation_email setting to foodtrucks table
-- When true (default), an email is sent to the customer when their order is confirmed

ALTER TABLE foodtrucks
ADD COLUMN send_confirmation_email BOOLEAN DEFAULT true;

COMMENT ON COLUMN foodtrucks.send_confirmation_email IS 'Send confirmation email to customer when order is confirmed';

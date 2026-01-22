-- Add allow_asap_orders field for "Au plus vite" order option
ALTER TABLE foodtrucks ADD COLUMN IF NOT EXISTS allow_asap_orders BOOLEAN DEFAULT FALSE;

-- Add is_asap field to orders to identify ASAP orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_asap BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN foodtrucks.allow_asap_orders IS 'When true, customers can choose "Au plus vite" instead of a specific pickup slot';
COMMENT ON COLUMN orders.is_asap IS 'When true, this order was placed with "Au plus vite" option - merchant assigns pickup time';

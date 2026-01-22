-- Fix: orders.deal_id was referencing deals table but now uses offers table
-- Drop the old foreign key constraint that causes errors with unified offers system

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_deal_id_fkey;

-- Add new foreign key to offers table (optional, allows NULL)
-- Using ON DELETE SET NULL to preserve order history if offer is deleted
ALTER TABLE orders
ADD CONSTRAINT orders_deal_id_fkey
FOREIGN KEY (deal_id) REFERENCES offers(id) ON DELETE SET NULL;

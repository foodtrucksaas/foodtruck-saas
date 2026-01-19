-- Allow zero unit_price for bundle items where the price is on another item
-- Drop the existing constraint and recreate with >= 0
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_unit_price_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_unit_price_check CHECK (unit_price >= 0);

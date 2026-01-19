-- Migration: Remove unused item-specific options tables
-- We only use category_options, not item-specific options

-- 1. Remove foreign key constraint from order_item_options
-- (option_id was referencing options table, but we use category_options)
ALTER TABLE order_item_options
DROP CONSTRAINT IF EXISTS order_item_options_option_id_fkey;

-- 2. Add new foreign key to category_options (optional, SET NULL if deleted)
ALTER TABLE order_item_options
ADD CONSTRAINT order_item_options_option_id_fkey
FOREIGN KEY (option_id) REFERENCES category_options(id) ON DELETE SET NULL;

-- 3. Drop unused tables
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS option_groups CASCADE;

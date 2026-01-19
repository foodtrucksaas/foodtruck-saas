-- Add is_archived column for soft delete of menu items
-- This preserves order history while hiding archived items from the menu

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Index for filtering archived items
CREATE INDEX IF NOT EXISTS idx_menu_items_is_archived ON menu_items(is_archived);

-- Comment explaining the column
COMMENT ON COLUMN menu_items.is_archived IS 'Soft delete flag - archived items are hidden but preserved for order history';

-- Add display_order column to offers table for drag-and-drop reordering
ALTER TABLE offers ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set initial display_order based on created_at for existing offers
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY foodtruck_id ORDER BY created_at DESC) - 1 as rn
  FROM offers
)
UPDATE offers SET display_order = ordered.rn
FROM ordered
WHERE offers.id = ordered.id AND offers.display_order IS NULL;

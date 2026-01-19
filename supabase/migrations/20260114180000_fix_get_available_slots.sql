-- Fix get_available_slots function
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_foodtruck_id UUID,
  p_date DATE,
  p_interval_minutes INTEGER DEFAULT 15,
  p_max_orders_per_slot INTEGER DEFAULT 5
)
RETURNS TABLE (
  slot_time TIME,
  available BOOLEAN,
  order_count INTEGER
) AS $$
DECLARE
  schedule_rec RECORD;
  current_slot TIME;
  slot_datetime TIMESTAMPTZ;
  orders_in_slot INTEGER;
BEGIN
  -- Get schedule for this day
  SELECT s.start_time, s.end_time INTO schedule_rec
  FROM schedules s
  WHERE s.foodtruck_id = p_foodtruck_id
  AND s.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
  AND s.is_active = TRUE
  LIMIT 1;

  -- If no schedule found, return empty
  IF schedule_rec IS NULL THEN
    RETURN;
  END IF;

  -- Check for exceptions (closed day)
  IF EXISTS (
    SELECT 1 FROM schedule_exceptions se
    WHERE se.foodtruck_id = p_foodtruck_id
    AND se.date = p_date
    AND se.is_closed = TRUE
  ) THEN
    RETURN;
  END IF;

  current_slot := schedule_rec.start_time;

  WHILE current_slot < schedule_rec.end_time LOOP
    slot_datetime := (p_date::TIMESTAMP + current_slot::INTERVAL)::TIMESTAMPTZ;

    SELECT COUNT(*) INTO orders_in_slot
    FROM orders o
    WHERE o.foodtruck_id = p_foodtruck_id
    AND o.pickup_time >= slot_datetime
    AND o.pickup_time < slot_datetime + (p_interval_minutes * INTERVAL '1 minute')
    AND o.status NOT IN ('cancelled', 'completed');

    slot_time := current_slot;
    order_count := orders_in_slot;
    available := orders_in_slot < p_max_orders_per_slot;

    RETURN NEXT;

    current_slot := current_slot + (p_interval_minutes * INTERVAL '1 minute');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

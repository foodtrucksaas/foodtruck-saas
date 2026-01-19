-- Fix get_available_slots function - use TIMESTAMP for generate_series
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
BEGIN
  -- Check for closed exception first
  IF EXISTS (
    SELECT 1 FROM schedule_exceptions se
    WHERE se.foodtruck_id = p_foodtruck_id
    AND se.date = p_date
    AND se.is_closed = TRUE
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH schedule AS (
    SELECT s.start_time, s.end_time
    FROM schedules s
    WHERE s.foodtruck_id = p_foodtruck_id
    AND s.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
    AND s.is_active = TRUE
    LIMIT 1
  ),
  time_slots AS (
    SELECT (gs)::TIME AS slot
    FROM schedule,
    generate_series(
      (p_date + schedule.start_time)::TIMESTAMP,
      (p_date + schedule.end_time - (p_interval_minutes || ' minutes')::INTERVAL)::TIMESTAMP,
      (p_interval_minutes || ' minutes')::INTERVAL
    ) AS gs
  ),
  slot_orders AS (
    SELECT
      ts.slot,
      COALESCE(COUNT(o.id), 0)::INTEGER AS cnt
    FROM time_slots ts
    LEFT JOIN orders o ON
      o.foodtruck_id = p_foodtruck_id
      AND o.pickup_time::DATE = p_date
      AND o.pickup_time::TIME >= ts.slot
      AND o.pickup_time::TIME < ts.slot + (p_interval_minutes || ' minutes')::INTERVAL
      AND o.status NOT IN ('cancelled', 'completed')
    GROUP BY ts.slot
  )
  SELECT
    so.slot AS slot_time,
    (so.cnt < p_max_orders_per_slot) AS available,
    so.cnt AS order_count
  FROM slot_orders so
  ORDER BY so.slot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

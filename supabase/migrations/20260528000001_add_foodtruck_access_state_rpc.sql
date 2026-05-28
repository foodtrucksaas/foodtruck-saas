-- RPC to expose foodtruck access state to anonymous clients.
-- The subscriptions table has RLS requiring auth.uid(), so anon
-- clients cannot read it directly. This SECURITY DEFINER function
-- bypasses RLS to return only the access state (full | degraded).

CREATE OR REPLACE FUNCTION public.get_foodtruck_access_state(
  p_foodtruck_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM subscriptions
  WHERE foodtruck_id = p_foodtruck_id;

  -- No subscription = legacy data or trigger race; treat as full
  IF v_status IS NULL THEN
    RETURN 'full';
  END IF;

  RETURN get_access_state(v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_foodtruck_access_state(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.get_foodtruck_access_state IS
'Returns the access_state (full | degraded) for a foodtruck. SECURITY DEFINER to bypass RLS on subscriptions without exposing table details.';

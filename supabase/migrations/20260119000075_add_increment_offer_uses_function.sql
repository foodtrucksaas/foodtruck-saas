-- Function to increment offer usage stats
CREATE OR REPLACE FUNCTION increment_offer_uses(p_offer_id UUID, p_count INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE offers
  SET
    current_uses = COALESCE(current_uses, 0) + p_count,
    updated_at = NOW()
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_offer_uses TO anon, authenticated, service_role;

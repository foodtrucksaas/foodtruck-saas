-- ============================================
-- FIX RACE CONDITIONS IN SQL FUNCTIONS
-- ============================================

-- 1. Update increment_offer_uses to also handle total_discount_given atomically
-- This prevents the read-modify-write race condition
CREATE OR REPLACE FUNCTION increment_offer_uses(
  p_offer_id UUID,
  p_count INTEGER DEFAULT 1,
  p_discount_amount INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE offers
  SET
    current_uses = COALESCE(current_uses, 0) + p_count,
    total_discount_given = COALESCE(total_discount_given, 0) + p_discount_amount,
    updated_at = NOW()
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_offer_uses(UUID, INTEGER, INTEGER) TO anon, authenticated, service_role;


-- 2. Fix redeem_loyalty_reward to use atomic operation
-- Uses UPDATE with WHERE clause instead of SELECT then UPDATE
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_customer_id UUID,
  p_order_id UUID,
  p_threshold INTEGER,
  p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_new_balance INTEGER;
  v_total_deduction INTEGER;
BEGIN
  v_total_deduction := p_threshold * p_count;

  -- Atomically deduct points - only succeeds if customer has enough points
  -- Uses FOR UPDATE SKIP LOCKED to prevent concurrent redemptions
  UPDATE customers
  SET
    loyalty_points = loyalty_points - v_total_deduction,
    updated_at = NOW()
  WHERE id = p_customer_id
    AND loyalty_points >= v_total_deduction  -- Ensure sufficient balance
  RETURNING loyalty_points INTO v_new_balance;

  -- If no row was updated, the customer didn't have enough points
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Record the transaction
  INSERT INTO loyalty_transactions (customer_id, order_id, type, points, balance_after, description)
  VALUES (p_customer_id, p_order_id, 'redeem', -v_total_deduction, v_new_balance,
          CASE WHEN p_count > 1
               THEN 'Récompenses fidélité x' || p_count
               ELSE 'Récompense fidélité'
          END);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, UUID, INTEGER, INTEGER) TO authenticated, service_role;


-- 3. Fix apply_promo_code to check max_uses atomically
-- Prevents race condition between validation and application
CREATE OR REPLACE FUNCTION apply_promo_code(
  p_promo_code_id UUID,
  p_order_id UUID,
  p_customer_email TEXT,
  p_discount_applied INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  -- Atomically increment usage count, but only if max_uses not exceeded
  -- This prevents race conditions where multiple orders could exceed the limit
  UPDATE promo_codes
  SET
    current_uses = current_uses + 1,
    total_discount_given = total_discount_given + p_discount_applied,
    updated_at = NOW()
  WHERE id = p_promo_code_id
    AND is_active = TRUE
    AND (max_uses IS NULL OR current_uses < max_uses);

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  -- If no row was updated, the promo code is no longer valid
  IF v_updated_rows = 0 THEN
    RETURN FALSE;
  END IF;

  -- Record the usage (this can't race since we already claimed the slot)
  INSERT INTO promo_code_uses (promo_code_id, order_id, customer_email, discount_applied)
  VALUES (p_promo_code_id, p_order_id, p_customer_email, p_discount_applied)
  ON CONFLICT (promo_code_id, order_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute
GRANT EXECUTE ON FUNCTION apply_promo_code(UUID, UUID, TEXT, INTEGER) TO authenticated, service_role;


-- 4. Fix apply_deal to use atomic increment
CREATE OR REPLACE FUNCTION apply_deal(
  p_deal_id UUID,
  p_order_id UUID,
  p_customer_email TEXT,
  p_discount_applied INTEGER,
  p_free_item_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Record the usage
  INSERT INTO deal_uses (deal_id, order_id, customer_email, discount_applied, free_item_name)
  VALUES (p_deal_id, p_order_id, p_customer_email, p_discount_applied, p_free_item_name)
  ON CONFLICT (deal_id, order_id) DO NOTHING;

  -- Atomically update stats
  UPDATE deals SET
    times_used = times_used + 1,
    total_discount_given = total_discount_given + p_discount_applied,
    updated_at = NOW()
  WHERE id = p_deal_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute
GRANT EXECUTE ON FUNCTION apply_deal(UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated, service_role;

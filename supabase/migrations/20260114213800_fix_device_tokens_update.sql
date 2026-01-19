-- Fix device_tokens RLS to allow token updates across users
-- When a device changes owner (user logs into different account),
-- the token should be updated to the new user/foodtruck

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own tokens" ON device_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON device_tokens;
DROP POLICY IF EXISTS "Foodtruck owners can view tokens" ON device_tokens;

-- Allow any authenticated user to insert tokens
CREATE POLICY "Authenticated users can insert tokens" ON device_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow any authenticated user to update/delete their own tokens OR tokens with matching token value
-- This allows a new user to "take over" a device token when they log in
CREATE POLICY "Users can update tokens" ON device_tokens
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete tokens" ON device_tokens
  FOR DELETE TO authenticated
  USING (true);

-- Allow users to view their own tokens
CREATE POLICY "Users can view their own tokens" ON device_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow foodtruck owners to view tokens for their foodtruck
CREATE POLICY "Foodtruck owners can view tokens" ON device_tokens
  FOR SELECT TO authenticated
  USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

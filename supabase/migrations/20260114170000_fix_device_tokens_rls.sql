-- Fix RLS policies for device_tokens
DROP POLICY IF EXISTS "Users can manage their own tokens" ON device_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON device_tokens;

-- Authenticated users can insert their own tokens
CREATE POLICY "Users can insert their own tokens" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own tokens
CREATE POLICY "Users can manage their own tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Allow reading tokens for the foodtruck owner (for debugging)
CREATE POLICY "Foodtruck owners can view tokens" ON device_tokens
  FOR SELECT USING (
    foodtruck_id IN (
      SELECT id FROM foodtrucks WHERE user_id = auth.uid()
    )
  );

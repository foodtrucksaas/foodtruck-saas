-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for foodtruck images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'foodtruck-images',
  'foodtruck-images',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Foodtruck images: Anyone can view
CREATE POLICY "Anyone can view foodtruck images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'foodtruck-images');

-- Foodtruck images: Authenticated users can upload their own
CREATE POLICY "Users can upload foodtruck images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'foodtruck-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Foodtruck images: Users can update their own
CREATE POLICY "Users can update own foodtruck images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'foodtruck-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Foodtruck images: Users can delete their own
CREATE POLICY "Users can delete own foodtruck images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'foodtruck-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Menu images: Anyone can view
CREATE POLICY "Anyone can view menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Menu images: Authenticated users can upload their own
CREATE POLICY "Users can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'menu-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Menu images: Users can update their own
CREATE POLICY "Users can update own menu images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'menu-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Menu images: Users can delete their own
CREATE POLICY "Users can delete own menu images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'menu-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

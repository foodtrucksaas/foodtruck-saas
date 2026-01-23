import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';

interface UseImageUploadOptions {
  bucket: string;
  folder: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  /** Custom compression function, or pass compressLogo/compressCover */
  compress?: (file: File) => Promise<File>;
}

interface UseImageUploadReturn {
  uploading: boolean;
  uploadImage: (file: File) => Promise<string | null>;
  deleteImage: (url: string) => Promise<boolean>;
}

export function useImageUpload({
  bucket,
  folder,
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  compress = compressImage,
}: UseImageUploadOptions): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        console.error(`Type de fichier non supporté. Utilisez: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
        return null;
      }

      // Validate file size (before compression)
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        console.error(`Le fichier est trop volumineux. Maximum: ${maxSizeMB}MB`);
        return null;
      }

      setUploading(true);

      try {
        // Compress image before upload
        const compressedFile = await compress(file);

        // Generate unique filename with correct extension
        const fileExt = compressedFile.name.split('.').pop()?.toLowerCase() || 'webp';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      } catch (error) {
        console.error('Erreur lors du téléchargement de l\'image:', error);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [bucket, folder, maxSizeMB, allowedTypes, compress]
  );

  const deleteImage = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        // Extract file path from URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
        if (pathParts.length < 2) {
          return false;
        }
        const filePath = decodeURIComponent(pathParts[1]);

        const { error } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        console.error('Error deleting image:', error);
        return false;
      }
    },
    [bucket]
  );

  return {
    uploading,
    uploadImage,
    deleteImage,
  };
}

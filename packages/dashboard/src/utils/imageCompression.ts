/**
 * Image compression utility using Canvas API
 * No external dependencies required
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  outputType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  outputType: 'image/webp',
};

/**
 * Compress an image file using Canvas API
 * - Resizes if larger than maxWidth/maxHeight
 * - Converts to WebP (better compression)
 * - Applies quality compression
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for GIFs (animated) and already small files
  if (file.type === 'image/gif') {
    return file;
  }

  // If file is already small (< 200KB), skip compression
  if (file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not compress image'));
            return;
          }

          // Determine file extension
          const ext = opts.outputType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const newFileName = `${baseName}.${ext}`;

          // Create new file
          const compressedFile = new File([blob], newFileName, {
            type: opts.outputType,
            lastModified: Date.now(),
          });

          // Log compression stats
          const savedPercent = Math.round((1 - compressedFile.size / file.size) * 100);
          console.log(
            `Image compressed: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)} (-${savedPercent}%)`
          );

          resolve(compressedFile);
        },
        opts.outputType,
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error('Could not load image'));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image specifically for logos (smaller dimensions)
 */
export async function compressLogo(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    outputType: 'image/webp',
  });
}

/**
 * Compress image specifically for cover/banner images
 */
export async function compressCover(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 640,
    quality: 0.8,
    outputType: 'image/webp',
  });
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

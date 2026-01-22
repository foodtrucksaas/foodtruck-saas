import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  width?: number;
  height?: number;
  lazy?: boolean;
}

/**
 * Optimized image component with:
 * - Lazy loading via Intersection Observer
 * - Fallback for missing/broken images
 * - Loading state
 * - WebP format support detection
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  fallback,
  width,
  height,
  lazy = true,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg
          className="w-1/3 h-1/3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Convert Supabase storage URLs to optimized format if applicable
  const optimizedSrc = getOptimizedSrc(src, width);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Placeholder shown while loading */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ width, height }}
        />
      )}

      <img
        ref={imgRef}
        src={isVisible ? optimizedSrc : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
      />
    </div>
  );
}

/**
 * Get optimized image URL with transformation
 * Works with Supabase Storage or other providers
 */
function getOptimizedSrc(src: string, width?: number): string {
  // Supabase Storage image transformation
  // Format: /render/image/[bucket]/[path]?width=X&format=webp
  if (src.includes('supabase') && src.includes('/storage/v1/object/')) {
    // Check if browser supports WebP
    const supportsWebP = checkWebPSupport();
    const params = new URLSearchParams();

    if (width) {
      params.set('width', String(width * 2)); // 2x for retina
    }

    if (supportsWebP) {
      params.set('format', 'webp');
    }

    params.set('quality', '80');

    // Transform to render endpoint
    const renderUrl = src.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );

    return params.toString() ? `${renderUrl}?${params.toString()}` : renderUrl;
  }

  return src;
}

// Cached WebP support check
let webPSupported: boolean | null = null;

function checkWebPSupport(): boolean {
  if (webPSupported !== null) return webPSupported;

  if (typeof document === 'undefined') {
    webPSupported = false;
    return false;
  }

  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    webPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } else {
    webPSupported = false;
  }

  return webPSupported;
}

export default OptimizedImage;

import { useState, useRef, useEffect, useCallback, memo } from 'react';

// WebP support detection (cached)
let webpSupportPromise: Promise<boolean> | null = null;

function checkWebPSupport(): Promise<boolean> {
  if (webpSupportPromise) return webpSupportPromise;

  webpSupportPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });

  return webpSupportPromise;
}

// Hook for WebP support
export function useWebPSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    checkWebPSupport().then(setSupported);
  }, []);

  return supported;
}

// Generate srcset for responsive images
function generateSrcSet(src: string, widths: number[]): string {
  // If src is from Supabase storage, we can potentially use transforms
  if (src.includes('supabase.co/storage')) {
    return widths
      .map((w) => {
        const transformedUrl = addWidthToSupabaseUrl(src, w);
        return `${transformedUrl} ${w}w`;
      })
      .join(', ');
  }

  // For other URLs, return original
  return src;
}

// Add width transform to Supabase storage URL
function addWidthToSupabaseUrl(url: string, width: number): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}&resize=contain`;
}

// Generate placeholder data URL
function generatePlaceholderDataUrl(color = '#e5e7eb'): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E`;
}

export interface OptimizedImageProps {
  /** Image source URL */
  src: string | null | undefined;
  /** Alt text for accessibility */
  alt: string;
  /** Width of the image */
  width?: number | string;
  /** Height of the image */
  height?: number | string;
  /** CSS class names */
  className?: string;
  /** Fallback content when image fails to load */
  fallback?: React.ReactNode;
  /** Placeholder color for blur effect */
  placeholderColor?: string;
  /** Custom placeholder element */
  placeholder?: React.ReactNode;
  /** Whether to show loading skeleton */
  showSkeleton?: boolean;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Disable lazy loading */
  eager?: boolean;
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Aspect ratio (e.g., "1/1", "16/9", "4/3") */
  aspectRatio?: string;
  /** Enable blur-up effect */
  blurUp?: boolean;
}

/**
 * OptimizedImage component for dashboard
 * Features:
 * - Native lazy loading
 * - Blur placeholder effect
 * - Error state with fallback
 * - Responsive srcset
 * - Layout shift prevention
 */
function OptimizedImageComponent({
  src,
  alt,
  width,
  height,
  className = '',
  fallback,
  placeholderColor = '#e5e7eb',
  placeholder,
  showSkeleton = true,
  sizes,
  eager = false,
  objectFit = 'cover',
  onLoad,
  onError,
  aspectRatio,
  blurUp = true,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(eager);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (eager || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before in viewport
        threshold: 0,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [eager]);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  // No src provided - show fallback or nothing
  if (!src) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // Error state - show fallback
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
          aspectRatio,
        }}
        aria-label={alt}
      >
        <span className="text-2xl">🍽️</span>
      </div>
    );
  }

  // Generate responsive srcset
  const srcSet = generateSrcSet(src, [320, 480, 640, 768, 1024]);
  const defaultSizes = sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  // Object fit class
  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }[objectFit];

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        aspectRatio,
      }}
    >
      {/* Placeholder/Skeleton */}
      {showSkeleton && !loaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ backgroundColor: placeholderColor }}
          aria-hidden="true"
        >
          {placeholder}
        </div>
      )}

      {/* Blur placeholder background */}
      {blurUp && !loaded && (
        <div
          className="absolute inset-0 scale-110 blur-lg"
          style={{
            backgroundImage: `url(${generatePlaceholderDataUrl(placeholderColor)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      {inView && (
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet !== src ? srcSet : undefined}
          sizes={srcSet !== src ? defaultSizes : undefined}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full ${objectFitClass} transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OptimizedImage = memo(OptimizedImageComponent);

/**
 * Preloads an image in the background
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export default OptimizedImage;

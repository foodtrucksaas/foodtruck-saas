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

export function useWebPSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    checkWebPSupport().then(setSupported);
  }, []);

  return supported;
}

function generateSrcSet(src: string, widths: number[]): string {
  if (src.includes('supabase.co/storage')) {
    return widths
      .map((w) => {
        const separator = src.includes('?') ? '&' : '?';
        return `${src}${separator}width=${w}&resize=contain ${w}w`;
      })
      .join(', ');
  }
  return src;
}

function generatePlaceholderDataUrl(color = '#e5e7eb'): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E`;
}

export interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  fallback?: React.ReactNode;
  placeholderColor?: string;
  placeholder?: React.ReactNode;
  showSkeleton?: boolean;
  sizes?: string;
  eager?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: string;
  blurUp?: boolean;
}

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
        rootMargin: '50px',
        threshold: 0,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [eager]);

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

  if (!src) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  if (error) {
    if (fallback) return <>{fallback}</>;
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

  const srcSet = generateSrcSet(src, [320, 480, 640, 768, 1024]);
  const defaultSizes = sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

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
      {showSkeleton && !loaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ backgroundColor: placeholderColor }}
          aria-hidden="true"
        >
          {placeholder}
        </div>
      )}

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

export const OptimizedImage = memo(OptimizedImageComponent);

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function useImagePreload(urls: string[]): boolean {
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    if (urls.length === 0) {
      setAllLoaded(true);
      return;
    }

    Promise.all(urls.filter(Boolean).map(preloadImage))
      .then(() => setAllLoaded(true))
      .catch(() => setAllLoaded(true));
  }, [urls]);

  return allLoaded;
}

export default OptimizedImage;

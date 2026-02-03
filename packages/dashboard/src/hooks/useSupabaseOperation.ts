import { useCallback, useRef } from 'react';

/**
 * Debounce function for preventing rapid API calls
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Hook that returns a debounced version of a callback
 * The debounced function will delay invoking the callback until after
 * `delay` milliseconds have elapsed since the last time it was invoked
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook that returns a throttled version of a callback
 * The throttled function will only invoke the callback at most once
 * per every `limit` milliseconds
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  limit: number
): T {
  const lastRan = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();

      if (now - lastRan.current >= limit) {
        callback(...args);
        lastRan.current = now;
      } else {
        // Schedule a trailing call
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(
          () => {
            callback(...args);
            lastRan.current = Date.now();
          },
          limit - (now - lastRan.current)
        );
      }
    }) as T,
    [callback, limit]
  );
}

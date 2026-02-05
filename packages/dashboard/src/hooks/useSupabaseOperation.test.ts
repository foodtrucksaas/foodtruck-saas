import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { debounce, useDebouncedCallback, useThrottledCallback } from './useSupabaseOperation';

describe('useSupabaseOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn();
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);

      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to callback', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should only call with the last arguments', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('third');
    });
  });

  describe('useDebouncedCallback', () => {
    it('should debounce callback invocations', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 200));

      act(() => {
        result.current();
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on each call', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 200));

      act(() => {
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to callback', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 200));

      act(() => {
        result.current('hello', 123);
        vi.advanceTimersByTime(200);
      });

      expect(callback).toHaveBeenCalledWith('hello', 123);
    });

    it('should only execute once after rapid calls', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 100));

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current(i);
          vi.advanceTimersByTime(50);
        }
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(9);
    });
  });

  describe('useThrottledCallback', () => {
    it('should execute immediately on first call', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 200));

      act(() => {
        result.current();
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls within limit', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 200));

      act(() => {
        result.current('first');
        result.current('second');
        result.current('third');
      });

      // First call executes immediately
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should execute trailing call after throttle period', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 200));

      act(() => {
        result.current('first');
        result.current('second');
      });

      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('second');
    });

    it('should allow new call after throttle period expires', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 200));

      act(() => {
        result.current('first');
      });

      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(200);
        result.current('after-throttle');
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('after-throttle');
    });

    it('should handle multiple throttle periods', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 100));

      act(() => {
        result.current('a');
      });
      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(100);
        result.current('b');
      });
      expect(callback).toHaveBeenCalledTimes(2);

      act(() => {
        vi.advanceTimersByTime(100);
        result.current('c');
      });
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should pass arguments correctly', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 200));

      act(() => {
        result.current('arg1', 'arg2', 123);
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should execute trailing call after limit and allow new immediate call', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 200));

      act(() => {
        result.current('first');
        result.current('trailing');
      });

      // First call is immediate
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');

      // Wait for trailing call
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Trailing call executes
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('trailing');
    });
  });
});

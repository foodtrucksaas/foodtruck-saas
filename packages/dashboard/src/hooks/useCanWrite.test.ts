import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanWrite } from './useCanWrite';

const mockAccessState = vi.hoisted(() => ({ value: 'full' as string }));

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    accessState: mockAccessState.value,
    subscription: null,
    isLoading: false,
    daysRemainingInTrial: null,
    refetch: vi.fn(),
  }),
}));

describe('useCanWrite', () => {
  it('returns true when accessState is full', () => {
    mockAccessState.value = 'full';
    const { result } = renderHook(() => useCanWrite());
    expect(result.current).toBe(true);
  });

  it('returns false when accessState is degraded', () => {
    mockAccessState.value = 'degraded';
    const { result } = renderHook(() => useCanWrite());
    expect(result.current).toBe(false);
  });
});

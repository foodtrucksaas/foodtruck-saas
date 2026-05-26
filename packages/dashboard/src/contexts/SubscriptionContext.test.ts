import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { SubscriptionProvider, useSubscription } from './SubscriptionContext';

// Mock FoodtruckContext
const mockFoodtruck = { id: 'ft-1', name: 'Test Truck' };
let currentFoodtruck: typeof mockFoodtruck | null = mockFoodtruck;

vi.mock('./FoodtruckContext', () => ({
  useFoodtruck: () => ({ foodtruck: currentFoodtruck }),
}));

// Mock API
const mockGetSubscription = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    billing: {
      getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
    },
  },
}));

const trialingSub = {
  id: 'sub-1',
  foodtruck_id: 'ft-1',
  status: 'trialing',
  trial_started_at: '2026-05-10T00:00:00Z',
  trial_ends_at: '2026-05-30T00:00:00Z',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  canceled_at: null,
  created_at: '2026-05-10T00:00:00Z',
  updated_at: '2026-05-10T00:00:00Z',
};

const activeSub = {
  ...trialingSub,
  status: 'active',
  stripe_subscription_id: 'sub_stripe_123',
};

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(SubscriptionProvider, null, children);

describe('SubscriptionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentFoodtruck = mockFoodtruck;
    mockGetSubscription.mockResolvedValue(trialingSub);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches subscription on mount', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetSubscription).toHaveBeenCalledWith('ft-1');
    expect(result.current.subscription).toEqual(trialingSub);
    expect(result.current.accessState).toBe('full');
  });

  it('returns null subscription when no foodtruck', async () => {
    vi.useRealTimers();
    currentFoodtruck = null;
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toBeNull();
    expect(mockGetSubscription).not.toHaveBeenCalled();
  });

  it('computes daysRemainingInTrial for trialing subscription', async () => {
    vi.useRealTimers();
    // Set trial_ends_at to 5 days from now
    const fiveDaysFromNow = new Date(Date.now() + 5 * 86400000).toISOString();
    mockGetSubscription.mockResolvedValue({ ...trialingSub, trial_ends_at: fiveDaysFromNow });

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.daysRemainingInTrial).toBe(5);
  });

  it('returns null daysRemainingInTrial for active subscription', async () => {
    vi.useRealTimers();
    mockGetSubscription.mockResolvedValue(activeSub);
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.daysRemainingInTrial).toBeNull();
  });

  it('returns degraded access state for expired_trial', async () => {
    vi.useRealTimers();
    mockGetSubscription.mockResolvedValue({ ...trialingSub, status: 'expired_trial' });
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accessState).toBe('degraded');
  });

  it('returns full access state for past_due', async () => {
    vi.useRealTimers();
    mockGetSubscription.mockResolvedValue({ ...trialingSub, status: 'past_due' });
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accessState).toBe('full');
  });

  it('polls every 60 seconds', async () => {
    renderHook(() => useSubscription(), { wrapper });

    // Wait for initial fetch
    await vi.advanceTimersByTimeAsync(0);

    expect(mockGetSubscription).toHaveBeenCalledTimes(1);

    // Advance 60 seconds
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockGetSubscription).toHaveBeenCalledTimes(2);

    // Advance another 60 seconds
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockGetSubscription).toHaveBeenCalledTimes(3);
  });

  it('throws if used outside provider', () => {
    expect(() => {
      renderHook(() => useSubscription());
    }).toThrow('useSubscription must be used within a SubscriptionProvider');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
// Using fake timers, so no waitFor needed
import { useLoyalty, calculateLoyaltyDiscount } from './useLoyalty';
import type { CustomerLoyaltyInfo } from '@foodtruck/shared';

// Mock the api module
const mockGetCustomerLoyalty = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    loyalty: {
      getCustomerLoyalty: (...args: unknown[]) => mockGetCustomerLoyalty(...args),
    },
  },
}));

// Helper to advance timers and flush all pending work
async function advanceTimersAndFlush(ms: number) {
  // Advance timers
  vi.advanceTimersByTime(ms);
  // Flush all micro-tasks and promises
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useLoyalty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockFoodtruckId = 'foodtruck-123';
  const mockEmail = 'test@example.com';

  const mockLoyaltyInfo: CustomerLoyaltyInfo = {
    customer_id: 'customer-123',
    loyalty_points: 45,
    loyalty_threshold: 50,
    loyalty_reward: 500, // 5 euros
    loyalty_allow_multiple: false,
    loyalty_points_per_euro: 1,
    loyalty_opt_in: true,
    can_redeem: false,
    redeemable_count: 0,
    max_discount: 0,
    progress_percent: 90,
  };

  const mockLoyaltyInfoWithReward: CustomerLoyaltyInfo = {
    customer_id: 'customer-123',
    loyalty_points: 100,
    loyalty_threshold: 50,
    loyalty_reward: 500, // 5 euros
    loyalty_allow_multiple: true,
    loyalty_points_per_euro: 1,
    loyalty_opt_in: true,
    can_redeem: true,
    redeemable_count: 2,
    max_discount: 1000, // 10 euros (2 rewards)
    progress_percent: 100,
  };

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      expect(result.current.loyaltyInfo).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.useLoyaltyReward).toBe(true);
    });

    it('should not fetch when foodtruckId is undefined', async () => {
      const { result } = renderHook(() =>
        useLoyalty(undefined, mockEmail)
      );

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.loyaltyInfo).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockGetCustomerLoyalty).not.toHaveBeenCalled();
    });

    it('should not fetch when email is empty', async () => {
      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, '')
      );

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.loyaltyInfo).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockGetCustomerLoyalty).not.toHaveBeenCalled();
    });

    it('should not fetch when email is invalid', async () => {
      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, 'invalid-email')
      );

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.loyaltyInfo).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockGetCustomerLoyalty).not.toHaveBeenCalled();
    });
  });

  describe('fetching loyalty info', () => {
    it('should fetch loyalty info when email is valid', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfo);

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Advance timers past debounce and flush promises
      await advanceTimersAndFlush(600);

      expect(mockGetCustomerLoyalty).toHaveBeenCalledWith(mockFoodtruckId, mockEmail);
      expect(result.current.loyaltyInfo).toEqual(mockLoyaltyInfo);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: CustomerLoyaltyInfo) => void;
      mockGetCustomerLoyalty.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise and flush
      await act(async () => {
        resolvePromise!(mockLoyaltyInfo);
        await Promise.resolve();
      });

      // Should no longer be loading
      expect(result.current.loading).toBe(false);
      expect(result.current.loyaltyInfo).toEqual(mockLoyaltyInfo);
    });

    it('should debounce email changes', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfo);

      const { result, rerender } = renderHook(
        ({ email }) => useLoyalty(mockFoodtruckId, email),
        { initialProps: { email: 'test@example.com' } }
      );

      // Change email multiple times quickly
      rerender({ email: 'test2@example.com' });
      rerender({ email: 'test3@example.com' });
      rerender({ email: 'final@example.com' });

      // Advance timers but not enough to trigger
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Should not have called API yet
      expect(mockGetCustomerLoyalty).not.toHaveBeenCalled();

      // Advance past debounce
      await advanceTimersAndFlush(600);

      // Should only call with final email
      expect(mockGetCustomerLoyalty).toHaveBeenCalledTimes(1);
      expect(mockGetCustomerLoyalty).toHaveBeenCalledWith(mockFoodtruckId, 'final@example.com');
      expect(result.current.loyaltyInfo).toEqual(mockLoyaltyInfo);
    });

    it('should handle customer with rewards available', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfoWithReward);

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Advance timers past debounce
      await advanceTimersAndFlush(600);

      expect(result.current.loyaltyInfo?.can_redeem).toBe(true);
      expect(result.current.loyaltyInfo?.redeemable_count).toBe(2);
      expect(result.current.loyaltyInfo?.max_discount).toBe(1000);
    });
  });

  describe('loyalty disabled for foodtruck', () => {
    it('should handle null response (loyalty disabled)', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Advance timers past debounce
      await advanceTimersAndFlush(600);

      expect(result.current.loyaltyInfo).toBeNull();
    });

    it('should reset loyalty info when switching to foodtruck without loyalty', async () => {
      mockGetCustomerLoyalty
        .mockResolvedValueOnce(mockLoyaltyInfo)
        .mockResolvedValueOnce(null);

      const { result, rerender } = renderHook(
        ({ foodtruckId }) => useLoyalty(foodtruckId, mockEmail),
        { initialProps: { foodtruckId: 'foodtruck-with-loyalty' } }
      );

      // First fetch
      await advanceTimersAndFlush(600);
      expect(result.current.loyaltyInfo).toEqual(mockLoyaltyInfo);

      // Switch to foodtruck without loyalty
      rerender({ foodtruckId: 'foodtruck-without-loyalty' });

      await advanceTimersAndFlush(600);
      expect(result.current.loyaltyInfo).toBeNull();
    });
  });

  describe('useLoyaltyReward toggle', () => {
    it('should allow toggling useLoyaltyReward', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfoWithReward);

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Initially true
      expect(result.current.useLoyaltyReward).toBe(true);

      // Toggle off
      act(() => {
        result.current.setUseLoyaltyReward(false);
      });

      expect(result.current.useLoyaltyReward).toBe(false);

      // Toggle on
      act(() => {
        result.current.setUseLoyaltyReward(true);
      });

      expect(result.current.useLoyaltyReward).toBe(true);
    });

    it('should maintain useLoyaltyReward state across loyalty info fetches', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfoWithReward);

      const { result, rerender } = renderHook(
        ({ email }) => useLoyalty(mockFoodtruckId, email),
        { initialProps: { email: 'test@example.com' } }
      );

      // Toggle off
      act(() => {
        result.current.setUseLoyaltyReward(false);
      });

      expect(result.current.useLoyaltyReward).toBe(false);

      // Change email to trigger new fetch
      rerender({ email: 'other@example.com' });

      await advanceTimersAndFlush(600);

      // Should maintain the toggle state
      expect(result.current.useLoyaltyReward).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGetCustomerLoyalty.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Advance timers past debounce
      await advanceTimersAndFlush(600);

      // Should set loyaltyInfo to null on error
      expect(result.current.loyaltyInfo).toBeNull();
    });

    it('should reset loading state on error', async () => {
      mockGetCustomerLoyalty.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      await advanceTimersAndFlush(600);

      expect(result.current.loading).toBe(false);
      expect(result.current.loyaltyInfo).toBeNull();
    });

    it('should recover after error when valid data is returned', async () => {
      mockGetCustomerLoyalty
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLoyaltyInfo);

      const { result, rerender } = renderHook(
        ({ email }) => useLoyalty(mockFoodtruckId, email),
        { initialProps: { email: 'test@example.com' } }
      );

      // First fetch (error)
      await advanceTimersAndFlush(600);

      expect(result.current.loyaltyInfo).toBeNull();

      // Retry with different email
      rerender({ email: 'retry@example.com' });

      await advanceTimersAndFlush(600);
      expect(result.current.loyaltyInfo).toEqual(mockLoyaltyInfo);
    });
  });

  describe('cleanup', () => {
    it('should cancel pending fetch on unmount', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfo);

      const { unmount } = renderHook(() =>
        useLoyalty(mockFoodtruckId, mockEmail)
      );

      // Unmount before debounce completes
      unmount();

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // API should not be called since timer was cleared
      expect(mockGetCustomerLoyalty).not.toHaveBeenCalled();
    });

    it('should clear loyalty info when email becomes invalid', async () => {
      mockGetCustomerLoyalty.mockResolvedValue(mockLoyaltyInfo);

      const { result, rerender } = renderHook(
        ({ email }) => useLoyalty(mockFoodtruckId, email),
        { initialProps: { email: 'valid@example.com' } }
      );

      // First fetch
      await advanceTimersAndFlush(600);
      expect(result.current.loyaltyInfo).toEqual(mockLoyaltyInfo);

      // Change to invalid email
      rerender({ email: 'invalid' });

      // Should immediately clear loyalty info
      expect(result.current.loyaltyInfo).toBeNull();
    });
  });
});

describe('calculateLoyaltyDiscount', () => {
  const mockLoyaltyInfo: CustomerLoyaltyInfo = {
    customer_id: 'customer-123',
    loyalty_points: 100,
    loyalty_threshold: 50,
    loyalty_reward: 500,
    loyalty_allow_multiple: true,
    loyalty_points_per_euro: 1,
    loyalty_opt_in: true,
    can_redeem: true,
    redeemable_count: 2,
    max_discount: 1000,
    progress_percent: 100,
  };

  describe('max discount calculation', () => {
    it('should return max discount when all conditions are met', () => {
      const result = calculateLoyaltyDiscount(mockLoyaltyInfo, true, true);

      expect(result.discount).toBe(1000);
      expect(result.rewardCount).toBe(2);
    });

    it('should return zero discount when loyalty is not opted in', () => {
      const result = calculateLoyaltyDiscount(mockLoyaltyInfo, true, false);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });

    it('should return zero discount when useLoyaltyReward is false', () => {
      const result = calculateLoyaltyDiscount(mockLoyaltyInfo, false, true);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });

    it('should return zero discount when loyaltyInfo is null', () => {
      const result = calculateLoyaltyDiscount(null, true, true);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });

    it('should return zero discount when customer cannot redeem', () => {
      const infoWithNoRedeem: CustomerLoyaltyInfo = {
        ...mockLoyaltyInfo,
        can_redeem: false,
        redeemable_count: 0,
        max_discount: 0,
      };

      const result = calculateLoyaltyDiscount(infoWithNoRedeem, true, true);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });

    it('should handle single reward redemption', () => {
      const singleRewardInfo: CustomerLoyaltyInfo = {
        ...mockLoyaltyInfo,
        loyalty_allow_multiple: false,
        redeemable_count: 1,
        max_discount: 500,
      };

      const result = calculateLoyaltyDiscount(singleRewardInfo, true, true);

      expect(result.discount).toBe(500);
      expect(result.rewardCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle customer with partial progress', () => {
      const partialProgressInfo: CustomerLoyaltyInfo = {
        ...mockLoyaltyInfo,
        loyalty_points: 25,
        can_redeem: false,
        redeemable_count: 0,
        max_discount: 0,
        progress_percent: 50,
      };

      const result = calculateLoyaltyDiscount(partialProgressInfo, true, true);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });

    it('should handle new customer without loyalty opt-in', () => {
      const newCustomerInfo: CustomerLoyaltyInfo = {
        ...mockLoyaltyInfo,
        customer_id: null,
        loyalty_points: 0,
        loyalty_opt_in: null,
        can_redeem: false,
        redeemable_count: 0,
        max_discount: 0,
        progress_percent: 0,
      };

      const result = calculateLoyaltyDiscount(newCustomerInfo, true, true);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });

    it('should handle all false conditions', () => {
      const result = calculateLoyaltyDiscount(null, false, false);

      expect(result.discount).toBe(0);
      expect(result.rewardCount).toBe(0);
    });
  });
});

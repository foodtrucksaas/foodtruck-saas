import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrderPreview } from './useOrderPreview';
import type { CartItem, OrderCalculation } from '@foodtruck/shared';

const mockPreviewOrder = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    orders: {
      previewOrder: (...args: unknown[]) => mockPreviewOrder(...args),
    },
  },
}));

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    menuItem: { id: 'item-1', name: 'Burger', price: 1000 } as CartItem['menuItem'],
    quantity: 1,
    selectedOptions: [],
    ...overrides,
  } as CartItem;
}

const mockCalculation: OrderCalculation = {
  line_items: [
    {
      menu_item_id: 'item-1',
      name: 'Burger',
      category_id: null,
      base_price: 1000,
      options: [],
      unit_price: 1000,
      quantity: 1,
      line_total: 1000,
    },
  ],
  subtotal: 1000,
  discounts: [],
  total: 1000,
  loyalty_points_earned: 10,
  warnings: [],
};

async function advanceTimersAndFlush(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe('useOrderPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    mockPreviewOrder.mockResolvedValue(mockCalculation);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should return null data when no foodtruckId', () => {
      const { result } = renderHook(() =>
        useOrderPreview({ foodtruckId: undefined, items: [makeCartItem()] })
      );

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.warnings).toEqual([]);
    });

    it('should return null data when items are empty', () => {
      const { result } = renderHook(() => useOrderPreview({ foodtruckId: 'ft-1', items: [] }));

      expect(result.current.data).toBeNull();
    });

    it('should return null data when disabled', () => {
      const { result } = renderHook(() =>
        useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()], enabled: false })
      );

      expect(result.current.data).toBeNull();
    });
  });

  describe('debounce', () => {
    it('should not call API before debounce delay', async () => {
      renderHook(() => useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()] }));

      await advanceTimersAndFlush(300);
      expect(mockPreviewOrder).not.toHaveBeenCalled();
    });

    it('should call API after 400ms debounce', async () => {
      renderHook(() => useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()] }));

      await advanceTimersAndFlush(500);
      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce on payload change', async () => {
      const { rerender } = renderHook(
        ({ qty }) =>
          useOrderPreview({
            foodtruckId: 'ft-1',
            items: [makeCartItem({ quantity: qty })],
          }),
        { initialProps: { qty: 1 } }
      );

      await advanceTimersAndFlush(300);
      expect(mockPreviewOrder).not.toHaveBeenCalled();

      // Change payload — debounce resets
      rerender({ qty: 2 });
      await advanceTimersAndFlush(300);
      expect(mockPreviewOrder).not.toHaveBeenCalled();

      await advanceTimersAndFlush(200);
      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('should set isLoading true immediately and false after response', async () => {
      let resolveApi: (v: OrderCalculation) => void;
      mockPreviewOrder.mockImplementation(
        () =>
          new Promise<OrderCalculation>((resolve) => {
            resolveApi = resolve;
          })
      );

      const { result } = renderHook(() =>
        useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()] })
      );

      // Before debounce fires
      expect(result.current.isLoading).toBe(true);

      // Fire debounce
      await advanceTimersAndFlush(500);
      expect(result.current.isLoading).toBe(true);

      // Resolve API
      await act(async () => {
        resolveApi!(mockCalculation);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockCalculation);
    });
  });

  describe('data & warnings', () => {
    it('should return data and warnings from API response', async () => {
      const withWarnings: OrderCalculation = {
        ...mockCalculation,
        warnings: ['Item X is unavailable'],
      };
      mockPreviewOrder.mockResolvedValue(withWarnings);

      const { result } = renderHook(() =>
        useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()] })
      );

      await advanceTimersAndFlush(500);

      expect(result.current.data).toEqual(withWarnings);
      expect(result.current.warnings).toEqual(['Item X is unavailable']);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set error on API failure', async () => {
      // Only reject once, then succeed on retry
      mockPreviewOrder
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockCalculation);

      const { result } = renderHook(() =>
        useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()] })
      );

      await advanceTimersAndFlush(500);

      // After error, the hook resets lastKeyRef so it will retry on next render.
      // The error state is set before the retry cycle kicks in.
      await waitFor(() => {
        expect(result.current.error).toEqual(new Error('Network error'));
      });
      expect(result.current.data).toBeNull();
    });

    it('should wrap non-Error rejections', async () => {
      mockPreviewOrder.mockRejectedValue('something went wrong');

      const { result } = renderHook(() =>
        useOrderPreview({ foodtruckId: 'ft-1', items: [makeCartItem()] })
      );

      await advanceTimersAndFlush(500);

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Preview failed');
    });
  });

  describe('cache (no re-call on identical payload)', () => {
    it('should not re-call API when rerendered with same payload', async () => {
      const items = [makeCartItem()];
      const { rerender } = renderHook(
        ({ items: i }) => useOrderPreview({ foodtruckId: 'ft-1', items: i }),
        { initialProps: { items } }
      );

      await advanceTimersAndFlush(500);
      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);

      // Rerender with a new array reference but same content
      rerender({ items: [makeCartItem()] });
      await advanceTimersAndFlush(500);

      // Should still be 1 call — payload key is the same
      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);
    });

    it('should re-call API when payload actually changes', async () => {
      const { rerender } = renderHook(
        ({ code }) =>
          useOrderPreview({
            foodtruckId: 'ft-1',
            items: [makeCartItem()],
            promoCode: code,
          }),
        { initialProps: { code: undefined as string | undefined } }
      );

      await advanceTimersAndFlush(500);
      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);

      rerender({ code: 'WELCOME10' });
      await advanceTimersAndFlush(500);

      expect(mockPreviewOrder).toHaveBeenCalledTimes(2);
    });
  });

  describe('abort on rapid change', () => {
    it('should ignore stale response when payload changes quickly', async () => {
      let callCount = 0;
      mockPreviewOrder.mockImplementation(() => {
        callCount++;
        const currentCall = callCount;
        return new Promise<OrderCalculation>((resolve) => {
          // Simulate different response times
          setTimeout(() => {
            resolve({
              ...mockCalculation,
              total: currentCall === 1 ? 500 : 900,
            });
          }, 100);
        });
      });

      const { result, rerender } = renderHook(
        ({ qty }) =>
          useOrderPreview({
            foodtruckId: 'ft-1',
            items: [makeCartItem({ quantity: qty })],
          }),
        { initialProps: { qty: 1 } }
      );

      // First debounce fires
      await advanceTimersAndFlush(500);

      // Quickly change payload before first response arrives
      rerender({ qty: 2 });

      // First response arrives — should be ignored (aborted)
      await advanceTimersAndFlush(100);

      // Second debounce fires
      await advanceTimersAndFlush(400);

      // Second response arrives
      await advanceTimersAndFlush(100);

      // Should have the second response's total, not the first
      expect(result.current.data?.total).toBe(900);
    });
  });

  describe('payload building', () => {
    it('should build correct payload with options', async () => {
      const item = makeCartItem({
        menuItem: { id: 'burger-1', name: 'Burger', price: 1200 } as CartItem['menuItem'],
        quantity: 2,
        selectedOptions: [
          { optionId: 'opt-1', name: 'Cheddar', price: 100, groupId: 'g1', groupName: 'Cheese' },
        ] as CartItem['selectedOptions'],
      });

      renderHook(() =>
        useOrderPreview({
          foodtruckId: 'ft-1',
          items: [item],
          promoCode: 'CODE10',
          useLoyaltyReward: true,
          loyaltyRewardCount: 2,
        })
      );

      await advanceTimersAndFlush(500);

      expect(mockPreviewOrder).toHaveBeenCalledWith({
        foodtruck_id: 'ft-1',
        items: [
          {
            menu_item_id: 'burger-1',
            quantity: 2,
            selected_option_ids: ['opt-1'],
          },
        ],
        customer: undefined,
        promo_code: 'CODE10',
        use_loyalty_reward: true,
        loyalty_reward_count: 2,
      });
    });

    it('should build correct payload for bundle items', async () => {
      const item = makeCartItem({
        quantity: 1,
        bundleInfo: {
          bundleId: 'bundle-1',
          bundleName: 'Formule',
          selections: [
            {
              menuItem: { id: 'main-1', name: 'Pizza' } as CartItem['menuItem'],
              selectedOptions: [{ optionId: 'opt-a' }],
            },
            {
              menuItem: { id: 'drink-1', name: 'Cola' } as CartItem['menuItem'],
              selectedOptions: [],
            },
          ],
        } as CartItem['bundleInfo'],
      });

      renderHook(() => useOrderPreview({ foodtruckId: 'ft-1', items: [item] }));

      await advanceTimersAndFlush(500);

      const payload = mockPreviewOrder.mock.calls[0][0];
      expect(payload.items).toEqual([
        {
          menu_item_id: 'main-1',
          quantity: 1,
          selected_option_ids: ['opt-a'],
          bundle_id: 'bundle-1',
        },
        {
          menu_item_id: 'drink-1',
          quantity: 1,
          selected_option_ids: [],
          bundle_id: 'bundle-1',
        },
      ]);
    });
  });

  describe('cleanup', () => {
    it('should clear data when items become empty', async () => {
      const { result, rerender } = renderHook(
        ({ items }) => useOrderPreview({ foodtruckId: 'ft-1', items }),
        { initialProps: { items: [makeCartItem()] } }
      );

      await advanceTimersAndFlush(500);
      expect(result.current.data).toEqual(mockCalculation);

      rerender({ items: [] });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});

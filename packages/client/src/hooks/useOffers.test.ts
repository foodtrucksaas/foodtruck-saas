import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOffers } from './useOffers';

// Mock the api module
const mockGetApplicable = vi.fn();
const mockGetOptimized = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    offers: {
      getApplicable: (...args: unknown[]) => mockGetApplicable(...args),
      getOptimized: (...args: unknown[]) => mockGetOptimized(...args),
    },
  },
}));

describe('useOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFoodtruckId = 'foodtruck-123';
  // Use any to avoid complex MenuItem type requirements in tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockCartItems: any[] = [
    {
      menuItem: {
        id: 'item-1',
        foodtruck_id: mockFoodtruckId,
        category_id: 'category-pizza',
        name: 'Pizza',
        price: 1200,
        is_available: true,
      },
      quantity: 2,
    },
    {
      menuItem: {
        id: 'item-2',
        foodtruck_id: mockFoodtruckId,
        category_id: 'category-drinks',
        name: 'Soda',
        price: 350,
        is_available: true,
      },
      quantity: 1,
    },
  ];
  const mockTotal = 2750;

  describe('initialization', () => {
    it('should initialize with empty offers', () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });

      const { result } = renderHook(() => useOffers(mockFoodtruckId, mockCartItems, mockTotal));

      expect(result.current.applicableOffers).toEqual([]);
    });

    it('should not fetch when foodtruckId is undefined', () => {
      const { result } = renderHook(() => useOffers(undefined, mockCartItems, mockTotal));

      expect(result.current.loading).toBe(false);
      expect(mockGetApplicable).not.toHaveBeenCalled();
    });

    it('should not fetch when cart is empty', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });

      const { result } = renderHook(() => useOffers(mockFoodtruckId, [], mockTotal));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.applicableOffers).toEqual([]);
    });
  });

  describe('fetching offers', () => {
    it('should fetch applicable offers on mount', async () => {
      const mockOffers = [
        {
          offer_id: 'offer-1',
          offer_name: 'Buy 2 pizzas get 1 drink free',
          offer_type: 'buy_x_get_y',
          is_applicable: true,
          calculated_discount: 350,
        },
      ];
      const mockAppliedOffers = [
        {
          offer_id: 'offer-1',
          offer_name: 'Buy 2 pizzas get 1 drink free',
          offer_type: 'buy_x_get_y',
          times_applied: 1,
          discount_amount: 350,
          items_consumed: [],
          free_item_name: null,
        },
      ];

      mockGetApplicable.mockResolvedValue(mockOffers);
      mockGetOptimized.mockResolvedValue({
        applied_offers: mockAppliedOffers,
        total_discount: 350,
      });

      const { result } = renderHook(() => useOffers(mockFoodtruckId, mockCartItems, mockTotal));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.applicableOffers).toEqual(mockOffers);
      expect(result.current.appliedOffers).toEqual(mockAppliedOffers);
      expect(result.current.totalOfferDiscount).toBe(350);
      expect(mockGetApplicable).toHaveBeenCalled();
      expect(mockGetOptimized).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockGetApplicable.mockRejectedValue(new Error('Network error'));
      mockGetOptimized.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOffers(mockFoodtruckId, mockCartItems, mockTotal));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.applicableOffers).toEqual([]);
      expect(result.current.appliedOffers).toEqual([]);
    });
  });

  describe('totalOfferDiscount', () => {
    it('should sum all applied offer discounts', async () => {
      const mockAppliedOffers = [
        {
          offer_id: 'offer-1',
          offer_name: 'A',
          offer_type: 'buy_x_get_y',
          times_applied: 1,
          discount_amount: 200,
          items_consumed: [],
          free_item_name: null,
        },
        {
          offer_id: 'offer-2',
          offer_name: 'B',
          offer_type: 'buy_x_get_y',
          times_applied: 1,
          discount_amount: 300,
          items_consumed: [],
          free_item_name: null,
        },
      ];

      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({
        applied_offers: mockAppliedOffers,
        total_discount: 500,
      });

      const { result } = renderHook(() => useOffers(mockFoodtruckId, mockCartItems, mockTotal));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalOfferDiscount).toBe(500);
    });

    it('should return 0 when no applied offers', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });

      const { result } = renderHook(() => useOffers(mockFoodtruckId, mockCartItems, mockTotal));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalOfferDiscount).toBe(0);
    });
  });
});

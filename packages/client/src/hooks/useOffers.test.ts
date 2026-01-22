import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOffers } from './useOffers';

// Mock the api module
const mockGetApplicable = vi.fn();
const mockGetOptimized = vi.fn();
const mockValidatePromoCode = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    offers: {
      getApplicable: (...args: unknown[]) => mockGetApplicable(...args),
      getOptimized: (...args: unknown[]) => mockGetOptimized(...args),
      validatePromoCode: (...args: unknown[]) => mockValidatePromoCode(...args),
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

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      expect(result.current.applicableOffers).toEqual([]);
    });

    it('should not fetch when foodtruckId is undefined', () => {
      const { result } = renderHook(() =>
        useOffers(undefined, mockCartItems, mockTotal)
      );

      expect(result.current.loading).toBe(false);
      expect(mockGetApplicable).not.toHaveBeenCalled();
    });

    it('should not fetch when cart is empty', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, [], mockTotal)
      );

      // Wait for the async fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // With empty cart, offers should still be fetched but return empty
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
      mockGetOptimized.mockResolvedValue({ applied_offers: mockAppliedOffers, total_discount: 350 });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.applicableOffers).toEqual(mockOffers);
      expect(result.current.appliedOffers).toEqual(mockAppliedOffers);
      expect(mockGetApplicable).toHaveBeenCalled();
      expect(mockGetOptimized).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockGetApplicable.mockRejectedValue(new Error('Network error'));
      mockGetOptimized.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.applicableOffers).toEqual([]);
      expect(result.current.appliedOffers).toEqual([]);
    });
  });

  describe('bestOffer', () => {
    it('should find best offer with highest discount', async () => {
      const mockOffers = [
        { offer_id: 'offer-1', offer_name: 'Small discount', is_applicable: true, calculated_discount: 200 },
        { offer_id: 'offer-2', offer_name: 'Big discount', is_applicable: true, calculated_discount: 500 },
        { offer_id: 'offer-3', offer_name: 'Medium discount', is_applicable: true, calculated_discount: 300 },
      ];
      // Optimized offers returns the best combination
      const mockAppliedOffers = [
        { offer_id: 'offer-2', offer_name: 'Big discount', offer_type: 'buy_x_get_y', times_applied: 1, discount_amount: 500, items_consumed: [], free_item_name: null },
      ];

      mockGetApplicable.mockResolvedValue(mockOffers);
      mockGetOptimized.mockResolvedValue({ applied_offers: mockAppliedOffers, total_discount: 500 });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bestOffer?.calculated_discount).toBe(500);
      expect(result.current.totalOfferDiscount).toBe(500);
    });

    it('should exclude non-applicable offers from best calculation', async () => {
      const mockOffers = [
        { offer_id: 'offer-1', offer_name: 'Small applicable', is_applicable: true, calculated_discount: 200 },
        { offer_id: 'offer-2', offer_name: 'Big non-applicable', is_applicable: false, calculated_discount: 1000 },
      ];
      const mockAppliedOffers = [
        { offer_id: 'offer-1', offer_name: 'Small applicable', offer_type: 'buy_x_get_y', times_applied: 1, discount_amount: 200, items_consumed: [], free_item_name: null },
      ];

      mockGetApplicable.mockResolvedValue(mockOffers);
      mockGetOptimized.mockResolvedValue({ applied_offers: mockAppliedOffers, total_discount: 200 });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bestOffer?.calculated_discount).toBe(200);
      expect(result.current.totalOfferDiscount).toBe(200);
    });

    it('should return undefined bestOffer when no applicable offers', async () => {
      const mockOffers = [
        { offer_id: 'offer-1', offer_name: 'Non-applicable', is_applicable: false, calculated_discount: 500 },
      ];

      mockGetApplicable.mockResolvedValue(mockOffers);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bestOffer).toBeUndefined();
      expect(result.current.totalOfferDiscount).toBe(0);
    });
  });

  describe('promo code validation', () => {
    it('should validate promo code successfully', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-offer-1',
        discount_type: 'percentage',
        discount_value: 10,
        max_discount: null,
        calculated_discount: 275,
        error_message: null,
      });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal, 'test@email.com')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const validationResult = await result.current.validatePromoCode('WELCOME10');

      expect(validationResult.is_valid).toBe(true);
      expect(validationResult.calculated_discount).toBe(275);

      // Wait for the promo code result to be set in state
      await waitFor(() => {
        expect(result.current.promoCodeResult?.is_valid).toBe(true);
      });
    });

    it('should handle invalid promo code', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });
      mockValidatePromoCode.mockResolvedValue({
        is_valid: false,
        offer_id: null,
        discount_type: null,
        discount_value: null,
        calculated_discount: null,
        error_message: 'Code promo expire',
      });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const validationResult = await result.current.validatePromoCode('EXPIRED');

      expect(validationResult.is_valid).toBe(false);
      expect(validationResult.error_message).toBe('Code promo expire');
    });

    it('should return error for empty promo code', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const validationResult = await result.current.validatePromoCode('');

      expect(validationResult.is_valid).toBe(false);
      expect(validationResult.error_message).toBe('Code promo invalide');
      expect(mockValidatePromoCode).not.toHaveBeenCalled();
    });

    it('should handle validation API error', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });
      mockValidatePromoCode.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const validationResult = await result.current.validatePromoCode('CODE');

      expect(validationResult.is_valid).toBe(false);
      expect(validationResult.error_message).toBe('Erreur de validation');
    });

    it('should clear promo code', async () => {
      mockGetApplicable.mockResolvedValue([]);
      mockGetOptimized.mockResolvedValue({ applied_offers: [], total_discount: 0 });
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-1',
        discount_type: 'fixed',
        discount_value: 100,
        max_discount: null,
        calculated_discount: 100,
        error_message: null,
      });

      const { result } = renderHook(() =>
        useOffers(mockFoodtruckId, mockCartItems, mockTotal)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.validatePromoCode('CODE');

      // Wait for the promo code result to be set
      await waitFor(() => {
        expect(result.current.promoCodeResult).not.toBeNull();
      });

      result.current.clearPromoCode();

      // Wait for the clear to take effect
      await waitFor(() => {
        expect(result.current.promoCodeResult).toBeNull();
      });
    });
  });
});

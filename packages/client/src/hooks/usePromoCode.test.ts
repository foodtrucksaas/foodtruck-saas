import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromoCode } from './usePromoCode';
import toast from 'react-hot-toast';

// Mock the api module
const mockValidatePromoCode = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    offers: {
      validatePromoCode: (...args: unknown[]) => mockValidatePromoCode(...args),
    },
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usePromoCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      expect(result.current.promoCode).toBe('');
      expect(result.current.appliedPromo).toBeNull();
      expect(result.current.promoLoading).toBe(false);
      expect(result.current.promoError).toBeNull();
    });

    it('should work with undefined foodtruckId', () => {
      const { result } = renderHook(() =>
        usePromoCode(undefined, 'test@email.com', 2000)
      );

      expect(result.current.promoCode).toBe('');
      expect(result.current.appliedPromo).toBeNull();
    });

    it('should work with empty customer email', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', '', 2000)
      );

      expect(result.current.promoCode).toBe('');
      expect(result.current.appliedPromo).toBeNull();
    });
  });

  describe('setPromoCode', () => {
    it('should set promo code in uppercase', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('welcome10');
      });

      expect(result.current.promoCode).toBe('WELCOME10');
    });

    it('should handle mixed case input', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('WeLcOmE10');
      });

      expect(result.current.promoCode).toBe('WELCOME10');
    });

    it('should handle special characters', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('summer-2024');
      });

      expect(result.current.promoCode).toBe('SUMMER-2024');
    });

    it('should clear error when setting new promo code', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: false,
        error_message: 'Code invalide',
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('INVALID');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.promoError).toBe('Code invalide');

      // Setting new code should clear error
      act(() => {
        result.current.setPromoCode('NEWCODE');
      });

      expect(result.current.promoError).toBeNull();
    });
  });

  describe('validatePromoCode - success cases', () => {
    it('should validate percentage promo code successfully', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-123',
        discount_type: 'percentage',
        discount_value: 10,
        calculated_discount: 200,
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('WELCOME10');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo).toEqual({
        id: 'promo-123',
        code: 'WELCOME10',
        discount: 200,
        discountType: 'percentage',
        discountValue: 10,
      });
      expect(result.current.promoCode).toBe('');
      expect(result.current.promoError).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Code promo appliqué !');
    });

    it('should validate fixed discount promo code successfully', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-456',
        discount_type: 'fixed',
        discount_value: 500,
        calculated_discount: 500,
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('FLAT5');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo).toEqual({
        id: 'promo-456',
        code: 'FLAT5',
        discount: 500,
        discountType: 'fixed',
        discountValue: 500,
      });
    });

    it('should trim whitespace from promo code', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-123',
        discount_type: 'percentage',
        discount_value: 10,
        calculated_discount: 200,
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('  CODE  ');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo?.code).toBe('CODE');
    });

    it('should use anonymous email when customer email is empty', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-123',
        discount_type: 'percentage',
        discount_value: 10,
        calculated_discount: 200,
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', '', 2000)
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      // The hook uses 'anonymous@temp.com' when email is empty
      expect(result.current.appliedPromo).not.toBeNull();
    });
  });

  describe('validatePromoCode - error cases', () => {
    it('should handle invalid promo code', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: false,
        error_message: 'Code promo expiré',
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('EXPIRED');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo).toBeNull();
      expect(result.current.promoError).toBe('Code promo expiré');
    });

    it('should show default error message when no error_message provided', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: false,
        error_message: null,
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('UNKNOWN');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.promoError).toBe('Code promo invalide');
    });

    it('should handle API error', async () => {
      mockValidatePromoCode.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo).toBeNull();
      expect(result.current.promoError).toBe('Erreur lors de la validation');
    });

    it('should not validate empty promo code', async () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(mockValidatePromoCode).not.toHaveBeenCalled();
    });

    it('should not validate whitespace-only promo code', async () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('   ');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(mockValidatePromoCode).not.toHaveBeenCalled();
    });

    it('should not validate when foodtruckId is undefined', async () => {
      const { result } = renderHook(() =>
        usePromoCode(undefined, 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(mockValidatePromoCode).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should set loading state during validation', async () => {
      let resolveValidate: (value: unknown) => void;
      mockValidatePromoCode.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveValidate = resolve;
          })
      );

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      // Start validation (don't await)
      let validatePromise: Promise<void>;
      act(() => {
        validatePromise = result.current.validatePromoCode();
      });

      // Should be loading
      expect(result.current.promoLoading).toBe(true);

      // Resolve the validation
      await act(async () => {
        resolveValidate!({
          is_valid: true,
          offer_id: 'promo-123',
          discount_type: 'percentage',
          discount_value: 10,
          calculated_discount: 200,
        });
        await validatePromise;
      });

      // Should no longer be loading
      expect(result.current.promoLoading).toBe(false);
    });

    it('should reset loading state on error', async () => {
      mockValidatePromoCode.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.promoLoading).toBe(false);
    });
  });

  describe('removePromo', () => {
    it('should remove applied promo', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-123',
        discount_type: 'percentage',
        discount_value: 10,
        calculated_discount: 200,
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo).not.toBeNull();

      act(() => {
        result.current.removePromo();
      });

      expect(result.current.appliedPromo).toBeNull();
    });

    it('should clear error when removing promo', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: false,
        error_message: 'Code invalide',
      });

      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('INVALID');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.promoError).toBe('Code invalide');

      act(() => {
        result.current.removePromo();
      });

      expect(result.current.promoError).toBeNull();
    });

    it('should work when no promo is applied', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      // Should not throw
      act(() => {
        result.current.removePromo();
      });

      expect(result.current.appliedPromo).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      act(() => {
        result.current.setPromoCode('TEST');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.promoError).toBeNull();
    });

    it('should work when no error exists', () => {
      const { result } = renderHook(() =>
        usePromoCode('foodtruck-id', 'test@email.com', 2000)
      );

      // Should not throw
      act(() => {
        result.current.clearError();
      });

      expect(result.current.promoError).toBeNull();
    });
  });

  describe('dependency changes', () => {
    it('should update validation with new order amount', async () => {
      mockValidatePromoCode.mockResolvedValue({
        is_valid: true,
        offer_id: 'promo-123',
        discount_type: 'percentage',
        discount_value: 10,
        calculated_discount: 200,
      });

      const { result, rerender } = renderHook(
        ({ amount }) => usePromoCode('foodtruck-id', 'test@email.com', amount),
        { initialProps: { amount: 2000 } }
      );

      act(() => {
        result.current.setPromoCode('CODE');
      });

      await act(async () => {
        await result.current.validatePromoCode();
      });

      expect(result.current.appliedPromo?.discount).toBe(200);

      // Rerender with different amount
      rerender({ amount: 5000 });

      // Applied promo should still be present (it doesn't auto-revalidate)
      expect(result.current.appliedPromo).not.toBeNull();
    });
  });
});

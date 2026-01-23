import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface AppliedPromo {
  id: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

interface UsePromoCodeResult {
  promoCode: string;
  setPromoCode: (code: string) => void;
  appliedPromo: AppliedPromo | null;
  promoLoading: boolean;
  promoError: string | null;
  validatePromoCode: () => Promise<void>;
  removePromo: () => void;
  clearError: () => void;
}

export function usePromoCode(
  foodtruckId: string | undefined,
  customerEmail: string,
  orderAmount: number
): UsePromoCodeResult {
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const validatePromoCode = useCallback(async () => {
    if (!promoCode.trim() || !foodtruckId) return;

    setPromoLoading(true);
    setPromoError(null);

    try {
      // Use new offers system for promo codes
      const result = await api.offers.validatePromoCode(
        foodtruckId,
        promoCode.trim(),
        customerEmail || 'anonymous@temp.com',
        orderAmount
      );

      if (!result.is_valid) {
        setPromoError(result.error_message || 'Code promo invalide');
        return;
      }

      setAppliedPromo({
        id: result.offer_id!,
        code: promoCode.trim().toUpperCase(),
        discount: result.calculated_discount!,
        discountType: result.discount_type! as 'percentage' | 'fixed',
        discountValue: result.discount_value!,
      });
      setPromoCode('');
    } catch {
      setPromoError('Erreur lors de la validation');
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, foodtruckId, customerEmail, orderAmount]);

  const removePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoError(null);
  }, []);

  const clearError = useCallback(() => {
    setPromoError(null);
  }, []);

  const handleSetPromoCode = useCallback((code: string) => {
    setPromoCode(code.toUpperCase());
    setPromoError(null);
  }, []);

  return {
    promoCode,
    setPromoCode: handleSetPromoCode,
    appliedPromo,
    promoLoading,
    promoError,
    validatePromoCode,
    removePromo,
    clearError,
  };
}

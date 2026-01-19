import { useState, useEffect, useCallback } from 'react';
import type { ApplicableOffer, CartItem, ValidateOfferPromoCodeResult } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseOffersResult {
  applicableOffers: ApplicableOffer[];
  loading: boolean;
  bestOffer: ApplicableOffer | undefined;
  totalOfferDiscount: number;
  validatePromoCode: (code: string) => Promise<ValidateOfferPromoCodeResult>;
  promoCodeResult: ValidateOfferPromoCodeResult | null;
  promoCodeLoading: boolean;
  clearPromoCode: () => void;
}

export function useOffers(
  foodtruckId: string | undefined,
  items: CartItem[],
  orderAmount: number,
  customerEmail: string = ''
): UseOffersResult {
  const [applicableOffers, setApplicableOffers] = useState<ApplicableOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoCodeResult, setPromoCodeResult] = useState<ValidateOfferPromoCodeResult | null>(null);
  const [promoCodeLoading, setPromoCodeLoading] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);

  // Fetch applicable offers when cart changes
  useEffect(() => {
    if (!foodtruckId || items.length === 0) {
      setApplicableOffers([]);
      return;
    }

    const fetchOffers = async () => {
      setLoading(true);
      try {
        // Build cart items JSON for the API call
        const cartItems = items.map((item) => {
          const sizeOption = item.selectedOptions?.find((opt) => opt.isSizeOption);
          const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;
          const supplementsTotal =
            item.selectedOptions?.reduce(
              (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier),
              0
            ) || 0;
          return {
            menu_item_id: item.menuItem.id,
            category_id: item.menuItem.category_id,
            quantity: item.quantity,
            price: basePrice + supplementsTotal,
          };
        });

        const offers = await api.offers.getApplicable(
          foodtruckId,
          cartItems,
          orderAmount,
          appliedPromoCode || undefined
        );
        setApplicableOffers(offers);
      } catch (error) {
        console.error('Error fetching offers:', error);
      }
      setLoading(false);
    };

    fetchOffers();
  }, [foodtruckId, items, orderAmount, appliedPromoCode]);

  // Validate promo code
  const validatePromoCode = useCallback(
    async (code: string): Promise<ValidateOfferPromoCodeResult> => {
      if (!foodtruckId || !code.trim()) {
        const invalidResult: ValidateOfferPromoCodeResult = {
          is_valid: false,
          offer_id: null,
          discount_type: null,
          discount_value: null,
          max_discount: null,
          calculated_discount: null,
          error_message: 'Code promo invalide',
        };
        return invalidResult;
      }

      setPromoCodeLoading(true);
      try {
        const result = await api.offers.validatePromoCode(
          foodtruckId,
          code,
          customerEmail,
          orderAmount
        );
        setPromoCodeResult(result);
        if (result.is_valid) {
          setAppliedPromoCode(code);
        }
        return result;
      } catch (error) {
        const errorResult: ValidateOfferPromoCodeResult = {
          is_valid: false,
          offer_id: null,
          discount_type: null,
          discount_value: null,
          max_discount: null,
          calculated_discount: null,
          error_message: 'Erreur de validation',
        };
        setPromoCodeResult(errorResult);
        return errorResult;
      } finally {
        setPromoCodeLoading(false);
      }
    },
    [foodtruckId, customerEmail, orderAmount]
  );

  const clearPromoCode = useCallback(() => {
    setPromoCodeResult(null);
    setAppliedPromoCode(null);
  }, []);

  // Find best applicable offer (highest discount)
  const applicableOffersFiltered = applicableOffers.filter((o) => o.is_applicable);
  const bestOffer = applicableOffersFiltered.reduce<ApplicableOffer | undefined>(
    (best, current) => {
      if (!best) return current;
      return current.calculated_discount > best.calculated_discount ? current : best;
    },
    undefined
  );

  // Total discount from the best offer
  const totalOfferDiscount = bestOffer?.calculated_discount || 0;

  return {
    applicableOffers,
    loading,
    bestOffer,
    totalOfferDiscount,
    validatePromoCode,
    promoCodeResult,
    promoCodeLoading,
    clearPromoCode,
  };
}

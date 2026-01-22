import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ApplicableOffer,
  AppliedOfferDetail,
  CartItem,
  ValidateOfferPromoCodeResult,
} from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseOffersResult {
  applicableOffers: ApplicableOffer[];
  loading: boolean;
  // NEW: Multiple applied offers (optimized combination)
  appliedOffers: AppliedOfferDetail[];
  // DEPRECATED: Still available for backward compatibility
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
  const [appliedOffers, setAppliedOffers] = useState<AppliedOfferDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoCodeResult, setPromoCodeResult] = useState<ValidateOfferPromoCodeResult | null>(null);
  const [promoCodeLoading, setPromoCodeLoading] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);

  // Create a stable cart signature to ensure useEffect re-runs when cart content changes
  // Filter out bundle items (they have synthetic IDs) - they're handled separately
  const cartSignature = useMemo(() => {
    const regularItems = items.filter(item => !item.bundleInfo);
    return regularItems.map(item => {
      const sizeOption = item.selectedOptions?.find(opt => opt.isSizeOption);
      return `${item.menuItem.id}:${item.quantity}:${item.menuItem.category_id}:${sizeOption?.optionId || ''}`;
    }).sort().join('|');
  }, [items]);

  // Fetch optimized offers when cart changes
  useEffect(() => {
    if (!foodtruckId) {
      setApplicableOffers([]);
      setAppliedOffers([]);
      return;
    }

    // Filter out bundle items - they have synthetic menu item IDs
    const regularItems = items.filter(item => !item.bundleInfo);

    const fetchOffers = async () => {
      setLoading(true);
      try {
        // Build cart items JSON for the API call
        const cartItems = regularItems.map((item) => {
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
            size_id: sizeOption?.optionId || null,
            name: item.menuItem.name, // Include name for display in SQL
          };
        });

        // Use the new optimized offers API
        const optimizedResult = await api.offers.getOptimized(
          foodtruckId,
          cartItems,
          orderAmount,
          appliedPromoCode || undefined
        );

        setAppliedOffers(optimizedResult.applied_offers);

        // Also fetch regular applicable offers for backward compatibility and progress display
        const offers = await api.offers.getApplicable(
          foodtruckId,
          cartItems,
          orderAmount,
          appliedPromoCode || undefined
        );
        setApplicableOffers(offers);
      } catch (error) {
        console.error('Error fetching offers:', error);
        setAppliedOffers([]);
      }
      setLoading(false);
    };

    fetchOffers();
  }, [foodtruckId, cartSignature, orderAmount, appliedPromoCode]);

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

  // DEPRECATED: Find best single applicable offer (for backward compatibility)
  const applicableOffersFiltered = applicableOffers.filter((o) => o.is_applicable);
  const bestOffer = applicableOffersFiltered.reduce<ApplicableOffer | undefined>(
    (best, current) => {
      if (!best) return current;
      return current.calculated_discount > best.calculated_discount ? current : best;
    },
    undefined
  );

  // Total discount from ALL applied offers (not just best single one)
  const totalOfferDiscount = appliedOffers.reduce(
    (sum, offer) => sum + offer.discount_amount,
    0
  );

  return {
    applicableOffers,
    loading,
    appliedOffers,
    bestOffer,
    totalOfferDiscount,
    validatePromoCode,
    promoCodeResult,
    promoCodeLoading,
    clearPromoCode,
  };
}

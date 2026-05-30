import { useState, useEffect, useMemo, useRef } from 'react';
import type { ApplicableOffer, AppliedOfferDetail, CartItem } from '@foodtruck/shared';
import { computeCartItemUnitPrice } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseOffersResult {
  applicableOffers: ApplicableOffer[];
  loading: boolean;
  appliedOffers: AppliedOfferDetail[];
  totalOfferDiscount: number;
}

export function useOffers(
  foodtruckId: string | undefined,
  items: CartItem[],
  orderAmount: number
): UseOffersResult {
  const [applicableOffers, setApplicableOffers] = useState<ApplicableOffer[]>([]);
  const [appliedOffers, setAppliedOffers] = useState<AppliedOfferDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // Ref to track if component is mounted (prevents state updates after unmount)
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create a stable cart signature to ensure useEffect re-runs when cart content changes
  // Filter out bundle items (they have synthetic IDs) - they're handled separately
  const cartSignature = useMemo(() => {
    const regularItems = items.filter((item) => !item.bundleInfo);
    return regularItems
      .map((item) => {
        const absoluteOption = item.selectedOptions?.find(
          (opt) => opt.priceMode === 'absolute' || opt.isSizeOption
        );
        return `${item.menuItem.id}:${item.quantity}:${item.menuItem.category_id}:${absoluteOption?.optionId || ''}`;
      })
      .sort()
      .join('|');
  }, [items]);

  // Fetch optimized offers when cart changes
  useEffect(() => {
    if (!foodtruckId) {
      setApplicableOffers([]);
      setAppliedOffers([]);
      return;
    }

    // Filter out bundle items - they have synthetic menu item IDs
    // Capture items in local variable to avoid stale closure
    const regularItems = items.filter((item) => !item.bundleInfo);

    // Track if this effect is still active (for cleanup)
    let isActive = true;

    const fetchOffers = async () => {
      setLoading(true);
      try {
        // Build cart items JSON for the API call
        const cartItems = regularItems.map((item) => {
          const absoluteOption = item.selectedOptions?.find(
            (opt) => opt.priceMode === 'absolute' || opt.isSizeOption
          );
          const price = computeCartItemUnitPrice(item.menuItem.price, item.selectedOptions);
          return {
            menu_item_id: item.menuItem.id,
            category_id: item.menuItem.category_id,
            quantity: item.quantity,
            price,
            size_id: absoluteOption?.optionId || null,
            name: item.menuItem.name,
          };
        });

        // Use the optimized offers API
        const optimizedResult = await api.offers.getOptimized(foodtruckId, cartItems, orderAmount);

        // Only update state if effect is still active and component is mounted
        if (isActive && isMountedRef.current) {
          setAppliedOffers(optimizedResult.applied_offers);
        }

        // Fetch applicable offers for progress display on menu page
        const offers = await api.offers.getApplicable(foodtruckId, cartItems, orderAmount);

        // Only update state if effect is still active and component is mounted
        if (isActive && isMountedRef.current) {
          setApplicableOffers(offers);
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
        if (isActive && isMountedRef.current) {
          setAppliedOffers([]);
        }
      }

      // Only update loading state if effect is still active and component is mounted
      if (isActive && isMountedRef.current) {
        setLoading(false);
      }
    };

    fetchOffers();

    // Cleanup function: mark this effect as inactive
    return () => {
      isActive = false;
    };
    // Note: items is NOT in deps because cartSignature already captures its meaningful content.
    // The items are captured in the closure when the effect runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodtruckId, cartSignature, orderAmount]);

  // Total discount from ALL applied offers
  const totalOfferDiscount = appliedOffers.reduce((sum, offer) => sum + offer.discount_amount, 0);

  return {
    applicableOffers,
    loading,
    appliedOffers,
    totalOfferDiscount,
  };
}

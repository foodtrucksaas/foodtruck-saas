import { useState, useEffect } from 'react';
import type { ApplicableDeal, CartItem } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseDealsResult {
  applicableDeals: ApplicableDeal[];
  loading: boolean;
  bestDeal: ApplicableDeal | undefined;
  totalDealDiscount: number;
}

export function useDeals(
  foodtruckId: string | undefined,
  items: CartItem[]
): UseDealsResult {
  const [applicableDeals, setApplicableDeals] = useState<ApplicableDeal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!foodtruckId || items.length === 0) {
      setApplicableDeals([]);
      return;
    }

    const fetchDeals = async () => {
      setLoading(true);
      try {
        // Build cart items JSON for the API call
        const cartItems = items.map((item) => {
          const sizeOption = item.selectedOptions?.find(opt => opt.isSizeOption);
          const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;
          const supplementsTotal = item.selectedOptions?.reduce(
            (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier), 0
          ) || 0;
          return {
            menu_item_id: item.menuItem.id,
            category_id: item.menuItem.category_id,
            quantity: item.quantity,
            price: basePrice + supplementsTotal,
            name: item.menuItem.name,
            selected_option_ids: item.selectedOptions?.map((opt) => opt.optionId) || [],
          };
        });

        const deals = await api.deals.getApplicable(foodtruckId, cartItems);
        setApplicableDeals(deals);
      } catch {
        // Silent fail
      }
      setLoading(false);
    };

    fetchDeals();
  }, [foodtruckId, items]);

  // Find best applicable deal
  const bestDeal = applicableDeals.find((d) => d.is_applicable);
  const totalDealDiscount = bestDeal?.calculated_discount || 0;

  return {
    applicableDeals,
    loading,
    bestDeal,
    totalDealDiscount,
  };
}

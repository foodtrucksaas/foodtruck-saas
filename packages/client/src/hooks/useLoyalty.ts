import { useState, useEffect } from 'react';
import { isValidEmail, type CustomerLoyaltyInfo } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseLoyaltyResult {
  loyaltyInfo: CustomerLoyaltyInfo | null;
  loading: boolean;
  useLoyaltyReward: boolean;
  setUseLoyaltyReward: (use: boolean) => void;
}

export function useLoyalty(foodtruckId: string | undefined, email: string): UseLoyaltyResult {
  const [loyaltyInfo, setLoyaltyInfo] = useState<CustomerLoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [useLoyaltyReward, setUseLoyaltyReward] = useState(true);

  useEffect(() => {
    if (!foodtruckId || !email || !isValidEmail(email)) {
      setLoyaltyInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const info = await api.loyalty.getCustomerLoyalty(foodtruckId, email);
        setLoyaltyInfo(info);
      } catch {
        setLoyaltyInfo(null);
      }
      setLoading(false);
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [foodtruckId, email]);

  return {
    loyaltyInfo,
    loading,
    useLoyaltyReward,
    setUseLoyaltyReward,
  };
}

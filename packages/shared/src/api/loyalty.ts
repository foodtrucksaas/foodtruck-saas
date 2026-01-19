import type { TypedSupabaseClient } from './client';
import type { CustomerLoyaltyInfo } from '../types';

export function createLoyaltyApi(supabase: TypedSupabaseClient) {
  return {
    // Get customer loyalty info
    async getCustomerLoyalty(
      foodtruckId: string,
      email: string
    ): Promise<CustomerLoyaltyInfo | null> {
      const { data, error } = await supabase.rpc('get_customer_loyalty', {
        p_foodtruck_id: foodtruckId,
        p_email: email,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0] as CustomerLoyaltyInfo;
      }
      return null;
    },
  };
}

export type LoyaltyApi = ReturnType<typeof createLoyaltyApi>;

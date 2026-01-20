import type { TypedSupabaseClient } from './client';
import { handleResponse } from './client';
import type { ValidatePromoCodeResult } from '../types';

export function createPromoCodesApi(supabase: TypedSupabaseClient) {
  return {
    // Validate a promo code
    async validate(
      foodtruckId: string,
      code: string,
      customerEmail: string,
      orderAmount: number
    ): Promise<ValidatePromoCodeResult> {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_foodtruck_id: foodtruckId,
        p_code: code,
        p_customer_email: customerEmail || 'anonymous@temp.com',
        p_order_amount: Math.round(orderAmount),
      });

      if (error) throw error;

      const result = data?.[0] as ValidatePromoCodeResult | undefined;
      if (!result) {
        return {
          is_valid: false,
          promo_code_id: null,
          discount_type: null,
          discount_value: null,
          max_discount: null,
          calculated_discount: null,
          error_message: 'Code promo invalide',
        };
      }
      return result;
    },

    // Count active promo codes for a foodtruck (now checks offers table)
    async countActive(foodtruckId: string): Promise<number> {
      const { count, error } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruckId)
        .eq('offer_type', 'promo_code')
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },

    // Get all promo codes for a foodtruck
    async getByFoodtruck(foodtruckId: string) {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .order('created_at', { ascending: false });

      return handleResponse(data, error);
    },
  };
}

export type PromoCodesApi = ReturnType<typeof createPromoCodesApi>;

/**
 * Promo Code Engine — "BIENVENUE : -10% sur la commande"
 *
 * Runs LAST in the pipeline so percentage discounts apply on the
 * already-reduced running total (cascade, not flat).
 *
 * Validates: active, date range, min order, max uses, max per customer.
 */

import type { DiscountEngine, DiscountContext, DiscountResult } from '../types.ts';

export const promoCodeEngine: DiscountEngine = {
  type: 'promo_code',
  priority: 6,

  async evaluate(ctx: DiscountContext): Promise<DiscountResult[]> {
    if (!ctx.promoCode) return [];

    // Use the SQL RPC which handles all validation
    const { data, error } = await ctx.supabase.rpc('validate_offer_promo_code', {
      p_foodtruck_id: ctx.foodtruckId,
      p_code: ctx.promoCode,
      p_customer_email: ctx.customer?.email ?? 'anonymous@temp.com',
      // Apply on running total (cascade), not on subtotal
      p_order_amount: ctx.runningTotal,
    });

    if (error || !data) return [];

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.is_valid || !result.calculated_discount) return [];

    let discount = result.calculated_discount as number;

    // Don't exceed running total
    discount = Math.min(discount, ctx.runningTotal);

    if (discount <= 0) return [];

    ctx.runningTotal -= discount;

    return [
      {
        type: 'promo_code',
        label: `Code promo : ${ctx.promoCode.toUpperCase()}`,
        amount: discount,
        offer_id: result.offer_id as string,
        metadata: {
          code: ctx.promoCode.toUpperCase(),
          discount_type: result.discount_type,
          discount_value: result.discount_value,
        },
      },
    ];
  },
};

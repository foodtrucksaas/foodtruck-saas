/**
 * Threshold Discount Engine — "-10% au-dela de 50EUR"
 *
 * Config: { min_amount: 5000, discount_type: 'percentage'|'fixed', discount_value: 10 }
 * Applies to the running total (after bundle/buy_x_get_y/happy_hour).
 */

import type { DiscountEngine, DiscountContext, DiscountResult } from '../types.ts';

interface ThresholdConfig {
  min_amount: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export const thresholdDiscountEngine: DiscountEngine = {
  type: 'threshold_discount',
  priority: 4,

  async evaluate(ctx: DiscountContext): Promise<DiscountResult[]> {
    const { data: offers, error } = await ctx.supabase
      .from('offers')
      .select('*')
      .eq('foodtruck_id', ctx.foodtruckId)
      .eq('offer_type', 'threshold_discount')
      .eq('is_active', true);

    if (error || !offers || offers.length === 0) return [];

    const now = new Date();
    const results: DiscountResult[] = [];

    for (const offer of offers) {
      // Check date validity
      if (offer.start_date && new Date(offer.start_date) > now) continue;
      if (offer.end_date && new Date(offer.end_date) < now) continue;

      // Check day of week
      if (offer.days_of_week && offer.days_of_week.length > 0) {
        const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
        if (!offer.days_of_week.includes(parisNow.getDay())) continue;
      }

      const config = offer.config as ThresholdConfig;
      if (!config.min_amount || !config.discount_value) continue;

      // Check if running total meets threshold
      if (ctx.runningTotal < config.min_amount) continue;

      let discount: number;
      if (config.discount_type === 'percentage') {
        discount = Math.floor((ctx.runningTotal * config.discount_value) / 100);
      } else {
        discount = Math.min(config.discount_value, ctx.runningTotal);
      }

      if (discount <= 0) continue;

      discount = Math.min(discount, ctx.runningTotal);

      results.push({
        type: 'threshold_discount',
        label: offer.name,
        amount: discount,
        offer_id: offer.id,
      });

      ctx.runningTotal -= discount;
    }

    return results;
  },
};

/**
 * Happy Hour Engine — time-based discount on categories or all items.
 *
 * Config: { discount_type: 'percentage'|'fixed', discount_value: 20,
 *           applies_to: 'all'|'category', category_id?: 'uuid' }
 */

import type { DiscountEngine, DiscountContext, DiscountResult } from '../types.ts';

interface HappyHourConfig {
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to: 'all' | 'category';
  category_id?: string;
}

export const happyHourEngine: DiscountEngine = {
  type: 'happy_hour',
  priority: 3,

  async evaluate(ctx: DiscountContext): Promise<DiscountResult[]> {
    // Fetch active happy_hour offers
    const { data: offers, error } = await ctx.supabase
      .from('offers')
      .select('*')
      .eq('foodtruck_id', ctx.foodtruckId)
      .eq('offer_type', 'happy_hour')
      .eq('is_active', true);

    if (error || !offers || offers.length === 0) return [];

    const now = new Date();
    const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const currentDow = parisNow.getDay(); // 0=Sunday
    const currentMinutes = parisNow.getHours() * 60 + parisNow.getMinutes();

    const results: DiscountResult[] = [];

    for (const offer of offers) {
      // Check date validity
      if (offer.start_date && new Date(offer.start_date) > now) continue;
      if (offer.end_date && new Date(offer.end_date) < now) continue;

      // Check day of week
      if (offer.days_of_week && offer.days_of_week.length > 0) {
        if (!offer.days_of_week.includes(currentDow)) continue;
      }

      // Check time window
      if (offer.time_start && offer.time_end) {
        const [startH, startM] = (offer.time_start as string).split(':').map(Number);
        const [endH, endM] = (offer.time_end as string).split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (currentMinutes < startMinutes || currentMinutes >= endMinutes) continue;
      }

      const config = offer.config as HappyHourConfig;
      if (!config.discount_type || !config.discount_value) continue;

      // Calculate discount on applicable items
      let applicableTotal = 0;
      const affectedItemIds: string[] = [];

      for (const item of ctx.lineItems) {
        if (config.applies_to === 'category' && config.category_id) {
          if (item.category_id !== config.category_id) continue;
        }
        applicableTotal += item.line_total;
        affectedItemIds.push(item.menu_item_id);
      }

      if (applicableTotal <= 0) continue;

      let discount: number;
      if (config.discount_type === 'percentage') {
        discount = Math.floor((applicableTotal * config.discount_value) / 100);
      } else {
        discount = Math.min(config.discount_value, applicableTotal);
      }

      if (discount <= 0) continue;

      // Don't exceed running total
      discount = Math.min(discount, ctx.runningTotal);

      results.push({
        type: 'happy_hour',
        label: offer.name,
        amount: discount,
        offer_id: offer.id,
        line_item_ids: affectedItemIds,
      });

      ctx.runningTotal -= discount;
    }

    return results;
  },
};

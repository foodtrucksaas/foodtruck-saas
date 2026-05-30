/**
 * Buy X Get Y Engine — "3 pizzas achetees = 1 offerte"
 *
 * Delegates to the SQL RPC `process_buy_x_get_y_offers` which handles
 * fair pricing (cheapest item free, with anti-gaming skip logic).
 */

import type { DiscountEngine, DiscountContext, DiscountResult } from '../types.ts';

export const buyXGetYEngine: DiscountEngine = {
  type: 'buy_x_get_y',
  priority: 2,

  async evaluate(ctx: DiscountContext): Promise<DiscountResult[]> {
    const expandedJson = JSON.stringify(ctx.expandedItems);

    const { data, error } = await ctx.supabase.rpc('process_buy_x_get_y_offers', {
      p_foodtruck_id: ctx.foodtruckId,
      p_items: expandedJson,
    });

    if (error || !data || data.length === 0) {
      return [];
    }

    const row = data[0];
    if (!row.total_discount || row.total_discount <= 0) {
      return [];
    }

    // Update expanded items with used flags
    const remainingItems =
      typeof row.remaining_items === 'string'
        ? JSON.parse(row.remaining_items)
        : row.remaining_items;

    if (Array.isArray(remainingItems)) {
      for (let i = 0; i < ctx.expandedItems.length && i < remainingItems.length; i++) {
        ctx.expandedItems[i].used = remainingItems[i].used === true;
      }
    }

    // Parse results into DiscountResult[]
    const results = typeof row.results === 'string' ? JSON.parse(row.results) : row.results;

    if (!Array.isArray(results)) return [];

    return results.map((r: Record<string, unknown>) => ({
      type: 'buy_x_get_y' as const,
      label: r.offer_name as string,
      amount: r.calculated_discount as number,
      offer_id: r.offer_id as string,
      metadata: {
        times_applied: r.times_applied,
        items_consumed: r.items_consumed,
        free_item_name: r.free_item_name,
      },
    }));
  },
};

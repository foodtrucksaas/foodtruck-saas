/**
 * Server-side Authoritative Pricing Pipeline
 *
 * Single source of truth for order total calculation.
 * Resolves items from DB, runs discount engines in priority order,
 * applies max_discount_percent_per_order cap.
 *
 * Discount cascade order:
 *   1. Bundle (item-level offers via SQL RPC)
 *   2. BuyXGetY (item-level offers via SQL RPC)
 *   3. HappyHour (time-based category/all discount)
 *   4. ThresholdDiscount (min amount trigger)
 *   5. LoyaltyReward (points redemption)
 *   6. PromoCode (applied on already-reduced total)
 *
 * This matches the CLIENT display order, resolving Bug #3 from the audit
 * (client cascaded, server was flat — now both cascade).
 */

import type {
  SupabaseAdmin,
  ClientLineItem,
  DiscountContext,
  DiscountEngine,
  DiscountResult,
  OrderCalculation,
} from './types.ts';
import { resolveLineItems, expandItems } from './resolve-line-items.ts';
import { bundleEngine } from './engines/bundle.ts';
import { buyXGetYEngine } from './engines/buy-x-get-y.ts';
import { happyHourEngine } from './engines/happy-hour.ts';
import { thresholdDiscountEngine } from './engines/threshold-discount.ts';
import { loyaltyRewardEngine } from './engines/loyalty-reward.ts';
import { promoCodeEngine } from './engines/promo-code.ts';

/** All registered engines, sorted by priority. */
const engines: DiscountEngine[] = [
  bundleEngine,
  buyXGetYEngine,
  happyHourEngine,
  thresholdDiscountEngine,
  loyaltyRewardEngine,
  promoCodeEngine,
].sort((a, b) => a.priority - b.priority);

export interface CalculateOrderInput {
  foodtruckId: string;
  items: ClientLineItem[];
  customer?: { email: string; phone?: string };
  promoCode?: string;
  useLoyaltyReward?: boolean;
  loyaltyRewardCount?: number;
}

/**
 * Calculate the full order total with all applicable discounts.
 *
 * This is the AUTHORITATIVE calculation — the client displays whatever
 * this function returns, with no local recalculation.
 */
export async function calculateOrderTotal(
  supabase: SupabaseAdmin,
  input: CalculateOrderInput
): Promise<OrderCalculation> {
  // 1. Resolve line items from DB (current prices)
  const lineItems = await resolveLineItems(supabase, input.foodtruckId, input.items);

  // 2. Calculate subtotal
  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  // 3. Build context
  const ctx: DiscountContext = {
    foodtruckId: input.foodtruckId,
    lineItems,
    subtotal,
    runningTotal: subtotal,
    expandedItems: expandItems(lineItems),
    customer: input.customer,
    promoCode: input.promoCode,
    useLoyaltyReward: input.useLoyaltyReward,
    loyaltyRewardCount: input.loyaltyRewardCount,
    supabase,
  };

  // 4. Run engines in priority order, collecting all discounts
  const allDiscounts: DiscountResult[] = [];

  for (const engine of engines) {
    const results = await engine.evaluate(ctx);
    for (const result of results) {
      allDiscounts.push(result);
    }
  }

  // 5. Apply max_discount_percent_per_order cap
  const { data: foodtruck } = await supabase
    .from('foodtrucks')
    .select('max_discount_percent_per_order, loyalty_enabled, loyalty_points_per_euro')
    .eq('id', input.foodtruckId)
    .single();

  const maxPct = foodtruck?.max_discount_percent_per_order ?? 50;
  const maxDiscount = Math.floor((subtotal * maxPct) / 100);
  const rawTotalDiscount = allDiscounts.reduce((sum, d) => sum + d.amount, 0);

  let finalDiscounts = allDiscounts;

  if (rawTotalDiscount > maxDiscount && rawTotalDiscount > 0) {
    // Truncate proportionally
    const ratio = maxDiscount / rawTotalDiscount;
    finalDiscounts = allDiscounts.map((d) => ({
      ...d,
      amount: Math.floor(d.amount * ratio),
    }));
  }

  const totalDiscount = finalDiscounts.reduce((sum, d) => sum + d.amount, 0);
  const total = Math.max(0, subtotal - totalDiscount);

  // 6. Calculate loyalty points earned (on final total)
  let loyaltyPointsEarned = 0;
  if (foodtruck?.loyalty_enabled && foodtruck.loyalty_points_per_euro > 0) {
    loyaltyPointsEarned = Math.floor((total / 100) * foodtruck.loyalty_points_per_euro);
  }

  return {
    line_items: lineItems,
    subtotal,
    discounts: finalDiscounts,
    total,
    loyalty_points_earned: loyaltyPointsEarned,
  };
}

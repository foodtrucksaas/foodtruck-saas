/**
 * Loyalty Reward Engine — "5EUR offerts tous les 50 points"
 *
 * Uses foodtruck.loyalty_reward (amount per redemption) and
 * the customer's redeemable_count from get_customer_loyalty RPC.
 */

import type { DiscountEngine, DiscountContext, DiscountResult } from '../types.ts';

export const loyaltyRewardEngine: DiscountEngine = {
  type: 'loyalty_reward',
  priority: 5,

  async evaluate(ctx: DiscountContext): Promise<DiscountResult[]> {
    if (!ctx.useLoyaltyReward || !ctx.loyaltyRewardCount || ctx.loyaltyRewardCount <= 0) {
      return [];
    }
    if (!ctx.customer?.email) return [];

    // Fetch foodtruck loyalty config
    const { data: foodtruck, error: ftError } = await ctx.supabase
      .from('foodtrucks')
      .select('loyalty_enabled, loyalty_reward')
      .eq('id', ctx.foodtruckId)
      .single();

    if (ftError || !foodtruck || !foodtruck.loyalty_enabled || !foodtruck.loyalty_reward) {
      return [];
    }

    // Verify customer can actually redeem
    const { data: loyaltyData, error: loyaltyError } = await ctx.supabase.rpc(
      'get_customer_loyalty',
      {
        p_foodtruck_id: ctx.foodtruckId,
        p_email: ctx.customer.email,
      }
    );

    if (loyaltyError || !loyaltyData) return [];

    const loyaltyInfo = Array.isArray(loyaltyData) ? loyaltyData[0] : loyaltyData;
    if (!loyaltyInfo?.can_redeem) return [];

    // Cap reward count to what customer actually has
    const actualRewardCount = Math.min(ctx.loyaltyRewardCount, loyaltyInfo.redeemable_count ?? 0);

    if (actualRewardCount <= 0) return [];

    let discount = foodtruck.loyalty_reward * actualRewardCount;

    // Don't exceed running total
    discount = Math.min(discount, ctx.runningTotal);

    if (discount <= 0) return [];

    ctx.runningTotal -= discount;

    return [
      {
        type: 'loyalty_reward',
        label:
          actualRewardCount > 1
            ? `Fidélité : ${actualRewardCount} récompenses`
            : 'Récompense fidélité',
        amount: discount,
        metadata: {
          reward_count: actualRewardCount,
          reward_per_unit: foodtruck.loyalty_reward,
          loyalty_customer_id: loyaltyInfo.customer_id,
        },
      },
    ];
  },
};

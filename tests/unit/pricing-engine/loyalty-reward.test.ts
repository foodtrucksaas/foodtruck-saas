import { describe, it, expect } from 'vitest';
import { loyaltyRewardEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/loyalty-reward';
import { createMockSupabase, makeLineItem, makeContext } from './helpers';

function makeLoyaltySupabase(opts: {
  loyaltyEnabled?: boolean;
  loyaltyReward?: number;
  canRedeem?: boolean;
  redeemableCount?: number;
  customerId?: string;
}) {
  return createMockSupabase({
    tables: {
      foodtrucks: [
        {
          id: 'ft-1',
          loyalty_enabled: opts.loyaltyEnabled ?? true,
          loyalty_reward: opts.loyaltyReward ?? 500,
        },
      ],
    },
    rpc: (fnName) => {
      if (fnName === 'get_customer_loyalty') {
        return {
          data: [
            {
              can_redeem: opts.canRedeem ?? true,
              redeemable_count: opts.redeemableCount ?? 1,
              customer_id: opts.customerId ?? 'cust-1',
              total_points: 100,
              max_discount: (opts.loyaltyReward ?? 500) * (opts.redeemableCount ?? 1),
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: 'unknown rpc' } };
    },
  });
}

describe('LoyaltyRewardEngine', () => {
  it('returns empty when loyalty not requested', async () => {
    const supabase = makeLoyaltySupabase({});
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      useLoyaltyReward: false,
      customer: { email: 'test@test.com' },
    });
    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('returns empty when no customer email', async () => {
    const supabase = makeLoyaltySupabase({});
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 1,
    });
    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('applies single reward', async () => {
    const supabase = makeLoyaltySupabase({ loyaltyReward: 500, redeemableCount: 1 });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 1,
      customer: { email: 'test@test.com' },
    });

    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('loyalty_reward');
    expect(results[0].amount).toBe(500);
    expect(results[0].label).toBe('Récompense fidélité');
  });

  it('applies multiple rewards', async () => {
    const supabase = makeLoyaltySupabase({ loyaltyReward: 500, redeemableCount: 3 });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 5000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 2,
      customer: { email: 'test@test.com' },
    });

    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(1000); // 500 * 2
    expect(results[0].label).toContain('2 récompenses');
  });

  it('caps reward count to redeemable count', async () => {
    const supabase = makeLoyaltySupabase({ loyaltyReward: 500, redeemableCount: 1 });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 5000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 5, // Requests 5 but only 1 available
      customer: { email: 'test@test.com' },
    });

    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results[0].amount).toBe(500); // Capped to 1 * 500
  });

  it('caps discount at running total', async () => {
    const supabase = makeLoyaltySupabase({ loyaltyReward: 5000, redeemableCount: 2 });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 800, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 2,
      customer: { email: 'test@test.com' },
    });

    const results = await loyaltyRewardEngine.evaluate(ctx);
    // 5000 * 2 = 10000, but running total is only 800
    expect(results[0].amount).toBe(800);
  });

  it('returns empty when loyalty disabled', async () => {
    const supabase = makeLoyaltySupabase({ loyaltyEnabled: false });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 1,
      customer: { email: 'test@test.com' },
    });
    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('returns empty when customer cannot redeem', async () => {
    const supabase = makeLoyaltySupabase({ canRedeem: false });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 1,
      customer: { email: 'test@test.com' },
    });
    const results = await loyaltyRewardEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('decreases runningTotal', async () => {
    const supabase = makeLoyaltySupabase({ loyaltyReward: 300 });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 1 })],
      useLoyaltyReward: true,
      loyaltyRewardCount: 1,
      customer: { email: 'test@test.com' },
    });

    expect(ctx.runningTotal).toBe(1000);
    await loyaltyRewardEngine.evaluate(ctx);
    expect(ctx.runningTotal).toBe(700);
  });
});

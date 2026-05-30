import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { thresholdDiscountEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/threshold-discount';
import { createMockSupabase, makeLineItem, makeContext } from './helpers';

describe('ThresholdDiscountEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty when no threshold offers exist', async () => {
    const supabase = createMockSupabase({ tables: { offers: [] } });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 5000, quantity: 1 })],
    });
    const results = await thresholdDiscountEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('applies percentage discount when threshold met', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'td-1',
            foodtruck_id: 'ft-1',
            offer_type: 'threshold_discount',
            is_active: true,
            name: '-10% des 50EUR',
            start_date: null,
            end_date: null,
            days_of_week: null,
            config: { min_amount: 5000, discount_type: 'percentage', discount_value: 10 },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 6000, quantity: 1 })],
    });

    const results = await thresholdDiscountEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(600); // 10% of 6000
    expect(results[0].label).toBe('-10% des 50EUR');
  });

  it('does not apply when below threshold', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'td-1',
            foodtruck_id: 'ft-1',
            offer_type: 'threshold_discount',
            is_active: true,
            name: '-10% des 50EUR',
            start_date: null,
            end_date: null,
            days_of_week: null,
            config: { min_amount: 5000, discount_type: 'percentage', discount_value: 10 },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 3000, quantity: 1 })],
    });

    const results = await thresholdDiscountEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('applies fixed discount capped at running total', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'td-1',
            foodtruck_id: 'ft-1',
            offer_type: 'threshold_discount',
            is_active: true,
            name: '5EUR offerts des 20EUR',
            start_date: null,
            end_date: null,
            days_of_week: null,
            config: { min_amount: 2000, discount_type: 'fixed', discount_value: 500 },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2500, quantity: 1 })],
    });

    const results = await thresholdDiscountEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(500);
  });

  it('uses runningTotal for threshold check (cascade)', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'td-1',
            foodtruck_id: 'ft-1',
            offer_type: 'threshold_discount',
            is_active: true,
            name: '-10% des 50EUR',
            start_date: null,
            end_date: null,
            days_of_week: null,
            config: { min_amount: 5000, discount_type: 'percentage', discount_value: 10 },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 5500, quantity: 1 })],
    });

    // Simulate previous discount reducing runningTotal below threshold
    ctx.runningTotal = 4500;

    const results = await thresholdDiscountEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('decreases runningTotal after applying', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'td-1',
            foodtruck_id: 'ft-1',
            offer_type: 'threshold_discount',
            is_active: true,
            name: 'Test',
            start_date: null,
            end_date: null,
            days_of_week: null,
            config: { min_amount: 1000, discount_type: 'fixed', discount_value: 200 },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 2000, quantity: 1 })],
    });

    expect(ctx.runningTotal).toBe(2000);
    await thresholdDiscountEngine.evaluate(ctx);
    expect(ctx.runningTotal).toBe(1800);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { happyHourEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/happy-hour';
import { createMockSupabase, makeLineItem, makeContext } from './helpers';

describe('HappyHourEngine', () => {
  beforeEach(() => {
    // Fix time to Wednesday 12:30 Paris time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T10:30:00Z')); // UTC 10:30 = Paris 12:30 (CEST)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty when no happy_hour offers exist', async () => {
    const supabase = createMockSupabase({ tables: { offers: [] } });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 2 })],
    });
    const results = await happyHourEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('applies percentage discount on all items', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'hh-1',
            foodtruck_id: 'ft-1',
            offer_type: 'happy_hour',
            is_active: true,
            name: 'Happy Hour -20%',
            start_date: null,
            end_date: null,
            days_of_week: [3], // Wednesday
            time_start: '12:00',
            time_end: '14:00',
            config: { discount_type: 'percentage', discount_value: 20, applies_to: 'all' },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [
        makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 2 }),
        makeLineItem({ menu_item_id: 'b', unit_price: 500, quantity: 1 }),
      ],
    });

    const results = await happyHourEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('happy_hour');
    // Total = 2000 + 500 = 2500, 20% = 500
    expect(results[0].amount).toBe(500);
    expect(results[0].label).toBe('Happy Hour -20%');
  });

  it('applies discount only on target category', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'hh-1',
            foodtruck_id: 'ft-1',
            offer_type: 'happy_hour',
            is_active: true,
            name: 'Happy Hour Boissons',
            start_date: null,
            end_date: null,
            days_of_week: [3],
            time_start: '12:00',
            time_end: '14:00',
            config: {
              discount_type: 'percentage',
              discount_value: 50,
              applies_to: 'category',
              category_id: 'cat-drinks',
            },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [
        makeLineItem({
          menu_item_id: 'pizza',
          unit_price: 1200,
          quantity: 1,
          category_id: 'cat-food',
        }),
        makeLineItem({
          menu_item_id: 'cola',
          unit_price: 300,
          quantity: 2,
          category_id: 'cat-drinks',
        }),
      ],
    });

    const results = await happyHourEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    // Only drinks: 300 * 2 = 600, 50% = 300
    expect(results[0].amount).toBe(300);
  });

  it('skips offer outside time window', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'hh-1',
            foodtruck_id: 'ft-1',
            offer_type: 'happy_hour',
            is_active: true,
            name: 'Evening HH',
            start_date: null,
            end_date: null,
            days_of_week: [3],
            time_start: '18:00',
            time_end: '20:00', // current time is 12:30
            config: { discount_type: 'percentage', discount_value: 20, applies_to: 'all' },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 1 })],
    });

    const results = await happyHourEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('skips offer on wrong day', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'hh-1',
            foodtruck_id: 'ft-1',
            offer_type: 'happy_hour',
            is_active: true,
            name: 'Monday HH',
            start_date: null,
            end_date: null,
            days_of_week: [1], // Monday, but we're on Wednesday
            time_start: '12:00',
            time_end: '14:00',
            config: { discount_type: 'percentage', discount_value: 20, applies_to: 'all' },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 1 })],
    });

    const results = await happyHourEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('applies fixed discount capped at applicable total', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'hh-1',
            foodtruck_id: 'ft-1',
            offer_type: 'happy_hour',
            is_active: true,
            name: 'HH 5EUR off',
            start_date: null,
            end_date: null,
            days_of_week: null,
            time_start: '00:00',
            time_end: '23:59',
            config: { discount_type: 'fixed', discount_value: 9999, applies_to: 'all' },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 300, quantity: 1 })],
    });

    const results = await happyHourEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    // Fixed 9999 capped at line total 300, then capped at runningTotal 300
    expect(results[0].amount).toBe(300);
  });

  it('decreases runningTotal after applying', async () => {
    const supabase = createMockSupabase({
      tables: {
        offers: [
          {
            id: 'hh-1',
            foodtruck_id: 'ft-1',
            offer_type: 'happy_hour',
            is_active: true,
            name: 'HH -10%',
            start_date: null,
            end_date: null,
            days_of_week: null,
            time_start: '00:00',
            time_end: '23:59',
            config: { discount_type: 'percentage', discount_value: 10, applies_to: 'all' },
          },
        ],
      },
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 1000, quantity: 1 })],
    });

    expect(ctx.runningTotal).toBe(1000);
    await happyHourEngine.evaluate(ctx);
    expect(ctx.runningTotal).toBe(900); // 1000 - 100
  });
});

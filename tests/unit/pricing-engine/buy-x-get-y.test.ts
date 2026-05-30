import { describe, it, expect } from 'vitest';
import { buyXGetYEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/buy-x-get-y';
import { createMockSupabase, makeLineItem, makeContext } from './helpers';

describe('BuyXGetYEngine', () => {
  it('returns empty when no offers apply', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [{ total_discount: 0, results: '[]', remaining_items: '[]' }],
        error: null,
      }),
    });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'pizza-1', unit_price: 1000, quantity: 2 })],
    });
    const results = await buyXGetYEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('returns discount when 3+1 applies', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [
          {
            total_discount: 1000,
            results: JSON.stringify([
              {
                offer_id: 'offer-bxgy-1',
                offer_name: '3 pizzas = 1 offerte',
                times_applied: 1,
                calculated_discount: 1000,
                items_consumed: [
                  { menu_item_id: 'pizza-1', role: 'trigger' },
                  { menu_item_id: 'pizza-1', role: 'trigger' },
                  { menu_item_id: 'pizza-1', role: 'trigger' },
                  { menu_item_id: 'pizza-1', role: 'reward' },
                ],
                free_item_name: 'Pizza Margherita',
              },
            ]),
            remaining_items: JSON.stringify([
              { menu_item_id: 'pizza-1', used: true },
              { menu_item_id: 'pizza-1', used: true },
              { menu_item_id: 'pizza-1', used: true },
              { menu_item_id: 'pizza-1', used: true },
            ]),
          },
        ],
        error: null,
      }),
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'pizza-1', unit_price: 1000, quantity: 4 })],
    });

    const results = await buyXGetYEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('buy_x_get_y');
    expect(results[0].amount).toBe(1000);
    expect(results[0].label).toBe('3 pizzas = 1 offerte');
    expect(results[0].metadata?.free_item_name).toBe('Pizza Margherita');
  });

  it('marks all expanded items as used', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [
          {
            total_discount: 500,
            results: JSON.stringify([
              {
                offer_id: 'o1',
                offer_name: 'Buy2Get1',
                times_applied: 1,
                calculated_discount: 500,
                items_consumed: [],
                free_item_name: null,
              },
            ]),
            remaining_items: JSON.stringify([
              { menu_item_id: 'a', used: true },
              { menu_item_id: 'a', used: true },
              { menu_item_id: 'a', used: true },
            ]),
          },
        ],
        error: null,
      }),
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', unit_price: 500, quantity: 3 })],
    });

    await buyXGetYEngine.evaluate(ctx);
    expect(ctx.expandedItems.every((i) => i.used)).toBe(true);
  });

  it('returns empty on RPC error', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({ data: null, error: { message: 'fail' } }),
    });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', quantity: 4 })],
    });
    const results = await buyXGetYEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });
});

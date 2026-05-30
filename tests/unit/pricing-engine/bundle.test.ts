import { describe, it, expect } from 'vitest';
import { bundleEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/bundle';
import { createMockSupabase, makeLineItem, makeContext } from './helpers';

describe('BundleEngine', () => {
  it('returns empty when no bundle offers exist', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [{ total_discount: 0, results: '[]', remaining_items: '[]' }],
        error: null,
      }),
    });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'pizza-1', unit_price: 1200, quantity: 1 })],
    });
    const results = await bundleEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });

  it('returns discount when bundle applies', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [
          {
            total_discount: 400,
            results: JSON.stringify([
              {
                offer_id: 'offer-1',
                offer_name: 'Menu Midi',
                times_applied: 1,
                calculated_discount: 400,
                items_consumed: [{ menu_item_id: 'pizza-1' }, { menu_item_id: 'dessert-1' }],
              },
            ]),
            remaining_items: JSON.stringify([
              { menu_item_id: 'pizza-1', used: true },
              { menu_item_id: 'dessert-1', used: true },
            ]),
          },
        ],
        error: null,
      }),
    });

    const ctx = makeContext({
      supabase,
      lineItems: [
        makeLineItem({ menu_item_id: 'pizza-1', unit_price: 1200, quantity: 1 }),
        makeLineItem({ menu_item_id: 'dessert-1', unit_price: 600, quantity: 1 }),
      ],
    });

    const results = await bundleEngine.evaluate(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('bundle');
    expect(results[0].amount).toBe(400);
    expect(results[0].label).toBe('Menu Midi');
    expect(results[0].offer_id).toBe('offer-1');
  });

  it('marks expanded items as used', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [
          {
            total_discount: 200,
            results: JSON.stringify([
              {
                offer_id: 'offer-1',
                offer_name: 'Duo',
                times_applied: 1,
                calculated_discount: 200,
                items_consumed: [],
              },
            ]),
            remaining_items: JSON.stringify([
              { menu_item_id: 'a', used: true },
              { menu_item_id: 'b', used: false },
            ]),
          },
        ],
        error: null,
      }),
    });

    const ctx = makeContext({
      supabase,
      lineItems: [
        makeLineItem({ menu_item_id: 'a', quantity: 1 }),
        makeLineItem({ menu_item_id: 'b', quantity: 1 }),
      ],
    });

    await bundleEngine.evaluate(ctx);
    expect(ctx.expandedItems[0].used).toBe(true);
    expect(ctx.expandedItems[1].used).toBe(false);
  });

  it('handles multi-application bundles', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({
        data: [
          {
            total_discount: 800,
            results: JSON.stringify([
              {
                offer_id: 'offer-1',
                offer_name: 'Menu Midi',
                times_applied: 2,
                calculated_discount: 800,
                items_consumed: [],
              },
            ]),
            remaining_items: '[]',
          },
        ],
        error: null,
      }),
    });

    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', quantity: 4 })],
    });

    const results = await bundleEngine.evaluate(ctx);
    expect(results[0].label).toBe('Menu Midi x2');
    expect(results[0].amount).toBe(800);
  });

  it('returns empty on RPC error', async () => {
    const supabase = createMockSupabase({
      rpc: () => ({ data: null, error: { message: 'db error' } }),
    });
    const ctx = makeContext({
      supabase,
      lineItems: [makeLineItem({ menu_item_id: 'a', quantity: 1 })],
    });
    const results = await bundleEngine.evaluate(ctx);
    expect(results).toEqual([]);
  });
});

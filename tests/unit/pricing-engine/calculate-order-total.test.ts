import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateOrderTotal } from '../../../supabase/functions/_shared/pricing-engine/calculate-order-total';
import { createMockSupabase } from './helpers';
import type { SupabaseAdmin } from '../../../supabase/functions/_shared/pricing-engine/types';

// Mock resolveLineItems to avoid DB calls
vi.mock('../../../supabase/functions/_shared/pricing-engine/resolve-line-items', () => ({
  resolveLineItems: vi.fn(),
  expandItems: vi.fn(),
}));

// Mock all engines to control their behavior
vi.mock('../../../supabase/functions/_shared/pricing-engine/engines/bundle', () => ({
  bundleEngine: { type: 'bundle', priority: 1, evaluate: vi.fn() },
}));
vi.mock('../../../supabase/functions/_shared/pricing-engine/engines/buy-x-get-y', () => ({
  buyXGetYEngine: { type: 'buy_x_get_y', priority: 2, evaluate: vi.fn() },
}));
vi.mock('../../../supabase/functions/_shared/pricing-engine/engines/happy-hour', () => ({
  happyHourEngine: { type: 'happy_hour', priority: 3, evaluate: vi.fn() },
}));
vi.mock('../../../supabase/functions/_shared/pricing-engine/engines/threshold-discount', () => ({
  thresholdDiscountEngine: { type: 'threshold_discount', priority: 4, evaluate: vi.fn() },
}));
vi.mock('../../../supabase/functions/_shared/pricing-engine/engines/loyalty-reward', () => ({
  loyaltyRewardEngine: { type: 'loyalty_reward', priority: 5, evaluate: vi.fn() },
}));
vi.mock('../../../supabase/functions/_shared/pricing-engine/engines/promo-code', () => ({
  promoCodeEngine: { type: 'promo_code', priority: 6, evaluate: vi.fn() },
}));

import {
  resolveLineItems,
  expandItems,
} from '../../../supabase/functions/_shared/pricing-engine/resolve-line-items';
import { bundleEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/bundle';
import { buyXGetYEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/buy-x-get-y';
import { happyHourEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/happy-hour';
import { thresholdDiscountEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/threshold-discount';
import { loyaltyRewardEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/loyalty-reward';
import { promoCodeEngine } from '../../../supabase/functions/_shared/pricing-engine/engines/promo-code';
import type { ResolvedLineItem } from '../../../supabase/functions/_shared/pricing-engine/types';

const mockResolve = resolveLineItems as ReturnType<typeof vi.fn>;
const mockExpand = expandItems as ReturnType<typeof vi.fn>;

function setupMocks(lineItems: ResolvedLineItem[]) {
  mockResolve.mockResolvedValue(lineItems);
  mockExpand.mockReturnValue([]);

  // Default: all engines return no discounts
  (bundleEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (buyXGetYEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (happyHourEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (thresholdDiscountEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (loyaltyRewardEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (promoCodeEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

function makeItem(id: string, unitPrice: number, qty: number): ResolvedLineItem {
  return {
    menu_item_id: id,
    name: `Item ${id}`,
    category_id: 'cat-1',
    base_price: unitPrice,
    options: [],
    unit_price: unitPrice,
    quantity: qty,
    line_total: unitPrice * qty,
  };
}

describe('calculateOrderTotal', () => {
  let supabase: SupabaseAdmin;

  beforeEach(() => {
    vi.clearAllMocks();

    supabase = createMockSupabase({
      tables: {
        foodtrucks: [
          {
            id: 'ft-1',
            max_discount_percent_per_order: 50,
            loyalty_enabled: true,
            loyalty_points_per_euro: 1,
          },
        ],
      },
    });
  });

  it('returns subtotal with no discounts', async () => {
    const items = [makeItem('pizza', 1200, 2)];
    setupMocks(items);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [{ menu_item_id: 'pizza', quantity: 2, selected_option_ids: [] }],
    });

    expect(result.subtotal).toBe(2400);
    expect(result.total).toBe(2400);
    expect(result.discounts).toEqual([]);
    // 24EUR * 1 pt/EUR = 24 pts
    expect(result.loyalty_points_earned).toBe(24);
  });

  it('applies single discount', async () => {
    const items = [makeItem('pizza', 1200, 2)];
    setupMocks(items);

    (bundleEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'bundle', label: 'Menu Midi', amount: 400, offer_id: 'o1' },
    ]);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [{ menu_item_id: 'pizza', quantity: 2, selected_option_ids: [] }],
    });

    expect(result.subtotal).toBe(2400);
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].amount).toBe(400);
    expect(result.total).toBe(2000);
  });

  it('applies multiple discounts from different engines', async () => {
    const items = [makeItem('pizza', 1500, 3)];
    setupMocks(items);

    (buyXGetYEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'buy_x_get_y', label: '3=1 offerte', amount: 1500, offer_id: 'o1' },
    ]);
    (promoCodeEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'promo_code', label: 'PROMO10', amount: 300, offer_id: 'o2' },
    ]);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [{ menu_item_id: 'pizza', quantity: 3, selected_option_ids: [] }],
    });

    expect(result.subtotal).toBe(4500);
    expect(result.discounts).toHaveLength(2);
    expect(result.total).toBe(2700); // 4500 - 1500 - 300
  });

  it('applies max_discount_percent_per_order cap with proportional truncation', async () => {
    const items = [makeItem('pizza', 1000, 1)];
    setupMocks(items);

    // Total discount = 800 (80% of 1000), but cap is 50%
    (bundleEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'bundle', label: 'Bundle', amount: 400, offer_id: 'o1' },
    ]);
    (promoCodeEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'promo_code', label: 'Promo', amount: 400, offer_id: 'o2' },
    ]);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [{ menu_item_id: 'pizza', quantity: 1, selected_option_ids: [] }],
    });

    // Max = 50% of 1000 = 500. Raw = 800. Ratio = 500/800 = 0.625
    // Each discount: floor(400 * 0.625) = 250
    expect(result.discounts[0].amount).toBe(250);
    expect(result.discounts[1].amount).toBe(250);
    expect(result.total).toBe(500); // 1000 - 250 - 250
  });

  it('calculates loyalty points on final total', async () => {
    const items = [makeItem('pizza', 2000, 1)];
    setupMocks(items);

    (promoCodeEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'promo_code', label: 'PROMO', amount: 500, offer_id: 'o1' },
    ]);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [{ menu_item_id: 'pizza', quantity: 1, selected_option_ids: [] }],
    });

    // Final total = 2000 - 500 = 1500 = 15EUR, 1 pt/EUR = 15 pts
    expect(result.loyalty_points_earned).toBe(15);
  });

  it('handles zero items gracefully', async () => {
    setupMocks([]);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [],
    });

    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.discounts).toEqual([]);
  });

  it('total never goes below zero', async () => {
    const items = [makeItem('freebie', 100, 1)];
    setupMocks(items);

    // Discount exceeds subtotal after cap doesn't apply (50% of 100 = 50, but let's test with cap = 100%)
    supabase = createMockSupabase({
      tables: {
        foodtrucks: [
          {
            id: 'ft-1',
            max_discount_percent_per_order: 100,
            loyalty_enabled: false,
            loyalty_points_per_euro: 0,
          },
        ],
      },
    });

    (loyaltyRewardEngine.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: 'loyalty_reward', label: 'Reward', amount: 500 },
    ]);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [{ menu_item_id: 'freebie', quantity: 1, selected_option_ids: [] }],
    });

    expect(result.total).toBe(0); // Not negative
  });

  it('returns line_items from resolution', async () => {
    const items = [makeItem('pizza', 1200, 1), makeItem('drink', 300, 2)];
    setupMocks(items);

    const result = await calculateOrderTotal(supabase, {
      foodtruckId: 'ft-1',
      items: [
        { menu_item_id: 'pizza', quantity: 1, selected_option_ids: [] },
        { menu_item_id: 'drink', quantity: 2, selected_option_ids: [] },
      ],
    });

    expect(result.line_items).toHaveLength(2);
    expect(result.line_items[0].name).toBe('Item pizza');
    expect(result.line_items[1].line_total).toBe(600);
  });
});

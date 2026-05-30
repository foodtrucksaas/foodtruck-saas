/**
 * Test helpers for pricing engine unit tests.
 */

import type {
  DiscountContext,
  ResolvedLineItem,
  ExpandedItem,
  SupabaseAdmin,
} from '../../../supabase/functions/_shared/pricing-engine/types';

// ============================================
// Mock Supabase builder
// ============================================

type RpcHandler = (
  fnName: string,
  params: Record<string, unknown>
) => { data: unknown; error: null } | { data: null; error: { message: string } };
interface MockQueryBuilder {
  select: (cols?: string) => MockQueryBuilder;
  eq: (col: string, val: unknown) => MockQueryBuilder;
  in: (col: string, vals: unknown[]) => MockQueryBuilder;
  single: () => Promise<
    { data: unknown; error: null } | { data: null; error: { message: string } }
  >;
  then: (resolve: (val: { data: unknown[]; error: null }) => void) => void;
  // Allow direct await
  _result: { data: unknown; error: null };
}

export function createMockSupabase(
  opts: {
    rpc?: RpcHandler;
    tables?: Record<string, unknown[]>;
  } = {}
): SupabaseAdmin {
  const tables = opts.tables ?? {};

  const createBuilder = (tableName: string): MockQueryBuilder => {
    const filters: Array<{ col: string; op: string; val: unknown }> = [];

    const builder: MockQueryBuilder = {
      _result: { data: tables[tableName] ?? [], error: null },
      select(_cols?: string) {
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push({ col, op: 'eq', val });
        return builder;
      },
      in(col: string, vals: unknown[]) {
        filters.push({ col, op: 'in', val: vals });
        return builder;
      },
      async single() {
        const rows = applyFilters(tables[tableName] ?? [], filters);
        if (rows.length === 0) return { data: null, error: { message: 'not found' } };
        return { data: rows[0], error: null };
      },
      then(resolve) {
        const rows = applyFilters(tables[tableName] ?? [], filters);
        resolve({ data: rows, error: null });
      },
    };

    return builder;
  };

  function applyFilters(
    rows: unknown[],
    filters: Array<{ col: string; op: string; val: unknown }>
  ): unknown[] {
    let result = [...rows];
    for (const f of filters) {
      result = result.filter((row) => {
        const r = row as Record<string, unknown>;
        if (f.op === 'eq') return r[f.col] === f.val;
        if (f.op === 'in') return (f.val as unknown[]).includes(r[f.col]);
        return true;
      });
    }
    return result;
  }

  const mock = {
    from(table: string) {
      return createBuilder(table);
    },
    rpc(fnName: string, params: Record<string, unknown> = {}) {
      if (opts.rpc) {
        const result = opts.rpc(fnName, params);
        return Promise.resolve(result);
      }
      return Promise.resolve({ data: null, error: { message: `No mock for RPC ${fnName}` } });
    },
  };

  return mock as unknown as SupabaseAdmin;
}

// ============================================
// Factory functions
// ============================================

export function makeLineItem(
  overrides: Partial<ResolvedLineItem> & { menu_item_id: string }
): ResolvedLineItem {
  const base: ResolvedLineItem = {
    menu_item_id: overrides.menu_item_id,
    name: overrides.name ?? 'Test Item',
    category_id: overrides.category_id ?? 'cat-1',
    base_price: overrides.base_price ?? 1000,
    options: overrides.options ?? [],
    unit_price: overrides.unit_price ?? overrides.base_price ?? 1000,
    quantity: overrides.quantity ?? 1,
    line_total: 0,
    notes: overrides.notes,
    bundle_id: overrides.bundle_id,
  };
  base.line_total = overrides.line_total ?? base.unit_price * base.quantity;
  return base;
}

export function makeContext(
  overrides: Partial<DiscountContext> & { supabase: SupabaseAdmin }
): DiscountContext {
  const lineItems = overrides.lineItems ?? [];
  const subtotal = overrides.subtotal ?? lineItems.reduce((s, i) => s + i.line_total, 0);

  return {
    foodtruckId: overrides.foodtruckId ?? 'ft-1',
    lineItems,
    subtotal,
    runningTotal: overrides.runningTotal ?? subtotal,
    expandedItems: overrides.expandedItems ?? expandFromLineItems(lineItems),
    customer: overrides.customer,
    promoCode: overrides.promoCode,
    useLoyaltyReward: overrides.useLoyaltyReward,
    loyaltyRewardCount: overrides.loyaltyRewardCount,
    supabase: overrides.supabase,
  };
}

function expandFromLineItems(items: ResolvedLineItem[]): ExpandedItem[] {
  const expanded: ExpandedItem[] = [];
  for (const item of items) {
    const sizeOpt = item.options.find((o) => o.price_mode === 'absolute');
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({
        menu_item_id: item.menu_item_id,
        category_id: item.category_id,
        price: item.unit_price,
        name: item.name,
        size_id: sizeOpt?.id ?? null,
        used: false,
      });
    }
  }
  return expanded;
}

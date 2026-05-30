/**
 * Resolve client line items (IDs only) to full DB objects with current prices.
 */

import type {
  SupabaseAdmin,
  ClientLineItem,
  ResolvedLineItem,
  ResolvedOption,
  ExpandedItem,
} from './types.ts';

/** Compute unit price from base price and resolved options. */
export function computeUnitPrice(basePrice: number, options: ResolvedOption[]): number {
  const absoluteOpt = options.find((o) => o.price_mode === 'absolute');
  const resolvedBase = absoluteOpt ? absoluteOpt.price_modifier : basePrice;
  const modifiersTotal = options
    .filter((o) => o.price_mode !== 'absolute')
    .reduce((sum, o) => sum + o.price_modifier, 0);
  return resolvedBase + modifiersTotal;
}

export async function resolveLineItems(
  supabase: SupabaseAdmin,
  foodtruckId: string,
  items: ClientLineItem[]
): Promise<ResolvedLineItem[]> {
  // 1. Collect all menu item IDs and option IDs
  const menuItemIds = [...new Set(items.map((i) => i.menu_item_id))];
  const allOptionIds = [...new Set(items.flatMap((i) => i.selected_option_ids))];

  // 2. Fetch menu items
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, price, category_id, is_available')
    .in('id', menuItemIds)
    .eq('foodtruck_id', foodtruckId);

  if (menuError || !menuItems) {
    throw new Error(`Failed to fetch menu items: ${menuError?.message}`);
  }

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // 3. Fetch options with group info
  const optionMap = new Map<string, ResolvedOption>();

  if (allOptionIds.length > 0) {
    const { data: options, error: optError } = await supabase
      .from('menu_item_options')
      .select(
        'id, name, price_modifier, is_available, group_id:menu_item_option_group_id, group:menu_item_option_groups(id, name, price_mode)'
      )
      .in('id', allOptionIds);

    if (optError) {
      throw new Error(`Failed to fetch options: ${optError.message}`);
    }

    if (options) {
      for (const opt of options) {
        const group = opt.group as { id: string; name: string; price_mode: string } | null;
        optionMap.set(opt.id, {
          id: opt.id,
          name: opt.name,
          group_id: group?.id ?? '',
          group_name: group?.name ?? '',
          price_modifier: opt.price_modifier,
          price_mode: (group?.price_mode as 'absolute' | 'modifier') ?? 'modifier',
        });
      }
    }
  }

  // 4. Build resolved line items
  const resolved: ResolvedLineItem[] = [];

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menu_item_id);
    if (!menuItem) {
      throw new Error(`Menu item ${item.menu_item_id} not found`);
    }
    if (!menuItem.is_available) {
      throw new Error(`Menu item "${menuItem.name}" is no longer available`);
    }

    const options: ResolvedOption[] = item.selected_option_ids
      .map((id) => optionMap.get(id))
      .filter((o): o is ResolvedOption => o !== undefined);

    const unitPrice = computeUnitPrice(menuItem.price, options);

    resolved.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      category_id: menuItem.category_id,
      base_price: menuItem.price,
      options,
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: unitPrice * item.quantity,
      notes: item.notes,
      bundle_id: item.bundle_id,
    });
  }

  return resolved;
}

/**
 * Expand resolved line items into flat per-unit entries for SQL RPCs.
 * qty=3 becomes 3 separate entries with used=false.
 */
export function expandItems(items: ResolvedLineItem[]): ExpandedItem[] {
  const expanded: ExpandedItem[] = [];
  for (const item of items) {
    // Find size option ID for SQL compatibility
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

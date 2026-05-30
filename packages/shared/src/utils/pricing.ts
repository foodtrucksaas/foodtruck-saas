/**
 * Client-side pricing utilities for local display (cart, menu).
 *
 * Server-side counterpart: supabase/functions/_shared/pricing-engine/resolve-line-items.ts
 * (computeUnitPrice). The pricing engine is the single authority for order totals;
 * these functions are used only for instant UI feedback before preview-order responds.
 *
 * tests/integration/pricing-coherence.test.ts validates that both implementations
 * produce the same prices.
 */

import type { PriceMode, SelectedOption } from '../types';

// ============================================
// Regular menu item price computation
// ============================================

/** A group of options attached to a menu item, with its price_mode. */
export interface PricingOptionGroup {
  id: string;
  price_mode: PriceMode; // 'absolute' = full price, 'modifier' = delta
  display_order: number;
  options: PricingOption[];
}

/** A single option within a group. */
export interface PricingOption {
  id: string;
  price_modifier: number; // cents — absolute price if group is 'absolute', delta if 'modifier'
  is_available: boolean;
}

export interface MenuItemPriceBreakdown {
  basePrice: number; // cents — from absolute group selection, or menuItem.price
  modifiersTotal: number; // cents — sum of selected modifier options
  unitPrice: number; // cents — basePrice + modifiersTotal
}

/**
 * Compute the unit price of a menu item given its option groups and selected options.
 *
 * Rules:
 * - At most one group with price_mode='absolute' per item (enforced by UI).
 *   If multiple exist, use the first by display_order and log a warning.
 * - If an absolute group exists AND one of its options is selected:
 *   basePrice = that option's price_modifier (which is the full price).
 * - If no absolute group or no absolute option selected:
 *   basePrice = menuItemPrice (the item's base price from the DB).
 * - modifiersTotal = sum of price_modifier for all selected options in 'modifier' groups.
 * - unitPrice = basePrice + modifiersTotal
 *
 * All values in CENTIMES (integer).
 */
export function computeMenuItemPrice(
  menuItemPrice: number,
  groups: PricingOptionGroup[],
  selectedOptionIds: string[]
): MenuItemPriceBreakdown {
  const selectedSet = new Set(selectedOptionIds);

  // Find the absolute group (at most one; take first by display_order)
  const absoluteGroups = groups
    .filter((g) => g.price_mode === 'absolute')
    .sort((a, b) => a.display_order - b.display_order);

  if (absoluteGroups.length > 1) {
    console.warn(
      `[computeMenuItemPrice] Multiple absolute groups found (${absoluteGroups.length}). Using first by display_order.`
    );
  }

  let basePrice = menuItemPrice;
  const absoluteGroup = absoluteGroups[0];

  if (absoluteGroup) {
    const selectedAbsoluteOption = absoluteGroup.options.find(
      (o) => selectedSet.has(o.id) && o.is_available
    );
    if (selectedAbsoluteOption) {
      basePrice = selectedAbsoluteOption.price_modifier;
    }
  }

  // Sum modifiers from all 'modifier' groups
  let modifiersTotal = 0;
  for (const group of groups) {
    if (group.price_mode !== 'modifier') continue;
    for (const opt of group.options) {
      if (selectedSet.has(opt.id) && opt.is_available) {
        modifiersTotal += opt.price_modifier;
      }
    }
  }

  const unitPrice = basePrice + modifiersTotal;

  return { basePrice, modifiersTotal, unitPrice };
}

/**
 * Get the cheapest available option price from an absolute group.
 * Returns null if no absolute group or no available options.
 */
export function getCheapestAbsolutePrice(groups: PricingOptionGroup[]): number | null {
  const absoluteGroup = groups
    .filter((g) => g.price_mode === 'absolute')
    .sort((a, b) => a.display_order - b.display_order)[0];

  if (!absoluteGroup) return null;

  const availablePrices = absoluteGroup.options
    .filter((o) => o.is_available)
    .map((o) => o.price_modifier);

  if (availablePrices.length === 0) return null;

  return Math.min(...availablePrices);
}

/**
 * Check if a SelectedOption is an absolute price (replaces base).
 * Supports both new `priceMode` and legacy `isSizeOption`.
 */
function isAbsoluteOption(opt: SelectedOption): boolean {
  if (opt.priceMode) return opt.priceMode === 'absolute';
  return opt.isSizeOption === true;
}

/**
 * Compute unit price from a cart item's selectedOptions.
 * Works with both new `priceMode` and legacy `isSizeOption` fields.
 *
 * Returns the unit price (base + modifiers) in centimes.
 */
export function computeCartItemUnitPrice(
  menuItemPrice: number,
  selectedOptions?: SelectedOption[]
): number {
  if (!selectedOptions || selectedOptions.length === 0) return menuItemPrice;

  const absoluteOption = selectedOptions.find(isAbsoluteOption);
  const basePrice = absoluteOption ? absoluteOption.priceModifier : menuItemPrice;
  const modifiersTotal = selectedOptions.reduce(
    (sum, opt) => sum + (isAbsoluteOption(opt) ? 0 : opt.priceModifier),
    0
  );

  return basePrice + modifiersTotal;
}

// ============================================
// Bundle price computation (existing)
// ============================================

export interface BundlePriceInput {
  fixedPrice: number;
  freeOptions: boolean;
  selections: Array<{
    supplement: number;
    selectedOptions?: Array<{ priceModifier: number }>;
  }>;
}

export interface BundlePriceBreakdown {
  fixedPrice: number;
  supplementsTotal: number;
  optionsTotal: number;
  unitPrice: number;
  total: number;
}

/**
 * Calculate the total price for a manual bundle.
 *
 * Formula: (fixedPrice + supplementsTotal + optionsTotal) * quantity
 *
 * - fixedPrice: base bundle price from offer config
 * - supplementsTotal: sum of per-selection supplements (size surcharges from bundle config)
 * - optionsTotal: sum of all option priceModifiers (size deltas + extras), skipped if freeOptions
 *
 * NOTE: Bundle options must NOT set isSizeOption=true. For bundles, priceModifier
 * is a delta (e.g. 0/300/600) added on top of fixedPrice, unlike regular items
 * where isSizeOption.priceModifier is the full price replacing the base price.
 */
export function calculateBundlePrice(
  bundleInfo: BundlePriceInput,
  quantity = 1
): BundlePriceBreakdown {
  const { fixedPrice, freeOptions, selections } = bundleInfo;

  const supplementsTotal = selections.reduce((sum, sel) => sum + (sel.supplement || 0), 0);

  let optionsTotal = 0;
  if (!freeOptions) {
    for (const sel of selections) {
      if (!sel.selectedOptions) continue;
      for (const opt of sel.selectedOptions) {
        optionsTotal += opt.priceModifier || 0;
      }
    }
  }

  const unitPrice = fixedPrice + supplementsTotal + optionsTotal;

  return {
    fixedPrice,
    supplementsTotal,
    optionsTotal,
    unitPrice,
    total: unitPrice * quantity,
  };
}

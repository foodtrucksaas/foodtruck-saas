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

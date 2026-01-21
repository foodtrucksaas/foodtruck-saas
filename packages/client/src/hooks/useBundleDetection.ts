import { useState, useEffect, useMemo } from 'react';
import type { CartItem, BundleCategoryConfig, Offer } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

interface BundleConfig {
  type?: 'specific_items' | 'category_choice';
  fixed_price: number;
  bundle_categories?: BundleCategoryConfig[];
  free_options?: boolean;
}

interface BundleOffer extends Offer {
  config: BundleConfig;
}

interface DetectedBundle {
  bundle: BundleOffer;
  matchedItems: CartItem[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
}

interface UseBundleDetectionResult {
  detectedBundles: DetectedBundle[];
  loading: boolean;
  bestBundle: DetectedBundle | null;
  totalBundleSavings: number;
}

// Get the price of a cart item (including options)
function getItemPrice(item: CartItem): number {
  const sizeOption = item.selectedOptions?.find(opt => opt.isSizeOption);
  const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;
  const supplementsTotal = item.selectedOptions?.reduce(
    (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier), 0
  ) || 0;
  return basePrice + supplementsTotal;
}

// Get the selected size ID from a cart item's options
function getSelectedSizeId(item: CartItem): string | null {
  const sizeOption = item.selectedOptions?.find(opt => opt.isSizeOption);
  return sizeOption?.optionId || null;
}

// Check if a cart item matches a bundle category
function itemMatchesCategory(
  item: CartItem,
  bundleCat: BundleCategoryConfig
): boolean {
  // Get eligible category IDs (support both new array format and legacy singular format)
  const eligibleCategoryIds = bundleCat.category_ids?.length
    ? bundleCat.category_ids
    : (bundleCat.category_id ? [bundleCat.category_id] : []);

  // Must be in one of the eligible categories
  if (!item.menuItem.category_id || !eligibleCategoryIds.includes(item.menuItem.category_id)) {
    return false;
  }

  // Must not be excluded
  if (bundleCat.excluded_items?.includes(item.menuItem.id)) return false;

  // Check size exclusions
  const sizeId = getSelectedSizeId(item);
  if (sizeId && bundleCat.excluded_sizes?.[item.menuItem.id]?.includes(sizeId)) {
    return false;
  }

  return true;
}

// Calculate the bundle price for matched items
function calculateBundlePrice(
  bundle: BundleOffer,
  matchedItems: { item: CartItem; bundleCat: BundleCategoryConfig }[]
): number {
  let price = bundle.config.fixed_price;

  // Add supplements for each matched item
  matchedItems.forEach(({ item, bundleCat }) => {
    const sizeId = getSelectedSizeId(item);
    const supplements = bundleCat.supplements || {};

    // Try size-specific supplement first
    if (sizeId) {
      const sizeKey = `${item.menuItem.id}:${sizeId}`;
      if (supplements[sizeKey] !== undefined) {
        price += supplements[sizeKey];
        return;
      }
    }

    // Fallback to item supplement
    if (supplements[item.menuItem.id] !== undefined) {
      price += supplements[item.menuItem.id];
    }
  });

  // Add options price (unless free_options)
  if (!bundle.config.free_options) {
    matchedItems.forEach(({ item }) => {
      const optionsPrice = item.selectedOptions?.reduce(
        (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier), 0
      ) || 0;
      price += optionsPrice;
    });
  }

  return price;
}

// Try to match a bundle to cart items
function tryMatchBundle(
  bundle: BundleOffer,
  cartItems: CartItem[]
): DetectedBundle | null {
  const bundleCategories = bundle.config.bundle_categories || [];
  if (bundleCategories.length === 0) return null;

  // Only consider non-bundle cart items
  const eligibleItems = cartItems.filter(item => !item.bundleInfo);
  if (eligibleItems.length === 0) return null;

  // For each bundle category, find a matching cart item
  const matchedItems: { item: CartItem; bundleCat: BundleCategoryConfig }[] = [];
  const usedItemIndices = new Set<number>();

  for (const bundleCat of bundleCategories) {
    let found = false;

    for (let i = 0; i < eligibleItems.length; i++) {
      if (usedItemIndices.has(i)) continue;

      const item = eligibleItems[i];
      if (itemMatchesCategory(item, bundleCat)) {
        matchedItems.push({ item, bundleCat });
        usedItemIndices.add(i);
        found = true;
        break;
      }
    }

    if (!found) {
      // Bundle requires this category but no matching item found
      return null;
    }
  }

  // All categories matched! Calculate prices
  const originalPrice = matchedItems.reduce(
    (sum, { item }) => sum + getItemPrice(item), 0
  );
  const bundlePrice = calculateBundlePrice(bundle, matchedItems);
  const savings = originalPrice - bundlePrice;

  // Only suggest if there are actual savings
  if (savings <= 0) return null;

  return {
    bundle,
    matchedItems: matchedItems.map(m => m.item),
    originalPrice,
    bundlePrice,
    savings,
  };
}

export function useBundleDetection(
  foodtruckId: string | undefined,
  items: CartItem[]
): UseBundleDetectionResult {
  const [bundles, setBundles] = useState<BundleOffer[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch active bundles for the foodtruck
  useEffect(() => {
    if (!foodtruckId) {
      setBundles([]);
      return;
    }

    const fetchBundles = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const { data } = await supabase
          .from('offers')
          .select('*')
          .eq('foodtruck_id', foodtruckId)
          .eq('offer_type', 'bundle')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`);

        if (data) {
          // Filter to only category_choice bundles
          const categoryBundles = (data as unknown as BundleOffer[]).filter(
            b => b.config?.type === 'category_choice' && b.config?.bundle_categories?.length
          );
          setBundles(categoryBundles);
        }
      } catch {
        // Silent fail
      }
      setLoading(false);
    };

    fetchBundles();
  }, [foodtruckId]);

  // Create a stable cart signature for bundle detection
  const cartSignature = useMemo(() => {
    // Only include non-bundle items for bundle detection
    const eligibleItems = items.filter(item => !item.bundleInfo);
    return eligibleItems.map(item => {
      const sizeId = getSelectedSizeId(item);
      return `${item.menuItem.id}:${item.quantity}:${item.menuItem.category_id}:${sizeId || ''}`;
    }).sort().join('|');
  }, [items]);

  // Detect applicable bundles
  const detectedBundles = useMemo(() => {
    if (bundles.length === 0 || items.length === 0) return [];

    const detected: DetectedBundle[] = [];

    for (const bundle of bundles) {
      const match = tryMatchBundle(bundle, items);
      if (match) {
        detected.push(match);
      }
    }

    // Sort by savings (highest first)
    detected.sort((a, b) => b.savings - a.savings);

    return detected;
  }, [bundles, items, cartSignature]);

  // Best bundle is the one with highest savings
  const bestBundle = detectedBundles.length > 0 ? detectedBundles[0] : null;
  const totalBundleSavings = bestBundle?.savings || 0;

  return {
    detectedBundles,
    loading,
    bestBundle,
    totalBundleSavings,
  };
}

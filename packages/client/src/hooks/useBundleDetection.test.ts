import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBundleDetection } from './useBundleDetection';
import type { CartItem, MenuItem, BundleCategoryConfig } from '@foodtruck/shared';

// Mock the supabase module
const mockSupabaseFrom = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// Helper to create a mock MenuItem
function createMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    foodtruck_id: 'foodtruck-1',
    category_id: 'category-1',
    name: 'Test Item',
    description: null,
    price: 1000, // 10.00 euros
    image_url: null,
    allergens: null,
    is_available: true,
    is_daily_special: false,
    is_archived: false,
    disabled_options: null,
    option_prices: null,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create a mock CartItem
function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    menuItem: createMenuItem(),
    quantity: 1,
    ...overrides,
  };
}

// Helper to create a mock bundle offer
function createBundleOffer(overrides: Partial<{
  id: string;
  name: string;
  fixed_price: number;
  bundle_categories: BundleCategoryConfig[];
  free_options: boolean;
}> = {}) {
  return {
    id: overrides.id ?? 'bundle-1',
    foodtruck_id: 'foodtruck-1',
    name: overrides.name ?? 'Test Bundle',
    description: 'Test bundle description',
    offer_type: 'bundle',
    config: {
      type: 'category_choice' as const,
      fixed_price: overrides.fixed_price ?? 1500,
      bundle_categories: overrides.bundle_categories ?? [],
      free_options: overrides.free_options ?? false,
    },
    is_active: true,
    start_date: null,
    end_date: null,
    time_start: null,
    time_end: null,
    days_of_week: null,
    max_uses: null,
    max_uses_per_customer: null,
    current_uses: 0,
    total_discount_given: 0,
    stackable: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Helper to setup supabase mock response
function setupSupabaseMock(data: unknown[] | null, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data, error }),
            }),
          }),
        }),
      }),
    }),
  });
}

// Helper to wait for bundles to be loaded
async function waitForBundlesLoaded() {
  // Wait for the mock to be called (indicates useEffect ran)
  await waitFor(() => {
    expect(mockSupabaseFrom).toHaveBeenCalled();
  });
  // Small delay to ensure setState has propagated
  await new Promise(resolve => setTimeout(resolve, 10));
}

describe('useBundleDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values after loading', async () => {
      setupSupabaseMock([]);

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', [])
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.bestBundle).toBeNull();
      expect(result.current.totalBundleSavings).toBe(0);
    });

    it('should not fetch bundles when foodtruckId is undefined', () => {
      setupSupabaseMock([]);

      const { result } = renderHook(() =>
        useBundleDetection(undefined, [])
      );

      expect(result.current.detectedBundles).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('should return empty bundles with empty cart', async () => {
      setupSupabaseMock([
        createBundleOffer({
          bundle_categories: [
            { category_ids: ['category-1'], quantity: 1 },
          ],
        }),
      ]);

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', [])
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toEqual([]);
      expect(result.current.bestBundle).toBeNull();
    });
  });

  describe('fetching active bundle offers', () => {
    it('should fetch bundles on mount', async () => {
      const mockBundles = [
        createBundleOffer({
          bundle_categories: [
            { category_ids: ['category-1'], quantity: 1 },
          ],
        }),
      ];
      setupSupabaseMock(mockBundles);

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', [])
      );

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitForBundlesLoaded();

      expect(mockSupabaseFrom).toHaveBeenCalledWith('offers');
    });

    it('should handle API errors gracefully', async () => {
      setupSupabaseMock(null, new Error('Network error'));

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', [createCartItem()])
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toEqual([]);
      expect(result.current.bestBundle).toBeNull();
    });

    it('should filter to only category_choice bundles', async () => {
      // Include a bundle without category_choice type - should be filtered out
      const bundles = [
        createBundleOffer({
          bundle_categories: [{ category_ids: ['category-1'], quantity: 1 }],
        }),
        {
          ...createBundleOffer({ id: 'bundle-2' }),
          config: { type: 'specific_items', fixed_price: 1000 }, // No bundle_categories
        },
      ];
      setupSupabaseMock(bundles);

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', [])
      );

      await waitForBundlesLoaded();

      // Only the category_choice bundle should be included (but no detection since empty cart)
      expect(result.current.detectedBundles).toEqual([]);
    });
  });

  describe('detecting when cart items match a bundle', () => {
    it('should detect a bundle when all categories are matched', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1500, // 15 euros
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-drink'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            name: 'Margherita',
            price: 1200,
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            name: 'Cola',
            price: 350,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
      expect(result.current.detectedBundles[0].bundle.id).toBe('bundle-1');
      expect(result.current.detectedBundles[0].matchedItems).toHaveLength(2);
    });

    it('should not detect a bundle when not all categories are matched', async () => {
      const bundleOffer = createBundleOffer({
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-drink'], quantity: 1 },
          { category_ids: ['category-dessert'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            price: 350,
          }),
        }),
        // Missing dessert!
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(0);
    });

    it('should ignore cart items that are already part of a bundle', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1500,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
          // This item is already part of another bundle
          bundleInfo: {
            bundleId: 'other-bundle',
            bundleName: 'Other Bundle',
            fixedPrice: 1000,
            freeOptions: false,
            selections: [],
          },
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(0);
    });
  });

  describe('calculating bundle savings', () => {
    it('should calculate correct savings', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1500, // 15 euros bundle price
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-drink'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200, // 12 euros
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            price: 500, // 5 euros
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
      const detected = result.current.detectedBundles[0];
      expect(detected.originalPrice).toBe(1700); // 12 + 5 = 17 euros
      expect(detected.bundlePrice).toBe(1500); // 15 euros
      expect(detected.savings).toBe(200); // 2 euros savings
      expect(result.current.totalBundleSavings).toBe(200);
    });

    it('should not suggest bundle if there are no savings', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 2000, // 20 euros - more expensive than items
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-drink'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1000, // 10 euros
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            price: 350, // 3.50 euros
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      // Original price: 13.50, bundle price: 20 - no savings!
      expect(result.current.detectedBundles).toHaveLength(0);
    });

    it('should include supplements in bundle price calculation', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1500,
        bundle_categories: [
          {
            category_ids: ['category-pizza'],
            quantity: 1,
            supplements: {
              'premium-pizza': 200, // 2 euro supplement for premium pizza
            },
          },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'premium-pizza',
            category_id: 'category-pizza',
            price: 1800, // 18 euros
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
      const detected = result.current.detectedBundles[0];
      expect(detected.originalPrice).toBe(1800);
      expect(detected.bundlePrice).toBe(1700); // 15 + 2 supplement
      expect(detected.savings).toBe(100);
    });

    it('should include size-specific supplements', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1200, // Lower bundle price to create savings
        bundle_categories: [
          {
            category_ids: ['category-pizza'],
            quantity: 1,
            supplements: {
              'pizza-1:size-large': 200, // 2 euro supplement for large size
            },
          },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
          selectedOptions: [
            {
              optionId: 'size-large',
              optionGroupId: 'sizes',
              name: 'Large',
              groupName: 'Size',
              priceModifier: 1600, // Size option replaces base price (16 euros)
              isSizeOption: true,
            },
          ],
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      // Bundle is detected because there are savings
      // originalPrice: 1600 (size option price)
      // bundlePrice: 1200 + 200 = 1400
      // savings: 200
      expect(result.current.detectedBundles).toHaveLength(1);
      const detected = result.current.detectedBundles[0];
      expect(detected.originalPrice).toBe(1600);
      expect(detected.bundlePrice).toBe(1400);
      expect(detected.savings).toBe(200);
    });

    it('should add options price to bundle (unless free_options)', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1000, // Lower bundle price to create savings
        free_options: false,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1400, // Higher base price
          }),
          selectedOptions: [
            {
              optionId: 'extra-cheese',
              optionGroupId: 'extras',
              name: 'Extra Cheese',
              groupName: 'Extras',
              priceModifier: 200, // 2 euro extra
              isSizeOption: false,
            },
          ],
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      // originalPrice: 1400 + 200 = 1600
      // bundlePrice: 1000 + 200 = 1200 (options not free)
      // savings: 400
      expect(result.current.detectedBundles).toHaveLength(1);
      const detected = result.current.detectedBundles[0];
      expect(detected.originalPrice).toBe(1600);
      expect(detected.bundlePrice).toBe(1200);
      expect(detected.savings).toBe(400);
    });

    it('should not add options price when free_options is true', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1500,
        free_options: true,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1800, // 18 euros
          }),
          selectedOptions: [
            {
              optionId: 'extra-cheese',
              optionGroupId: 'extras',
              name: 'Extra Cheese',
              groupName: 'Extras',
              priceModifier: 200, // 2 euro extra - should be free!
              isSizeOption: false,
            },
          ],
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
      const detected = result.current.detectedBundles[0];
      expect(detected.originalPrice).toBe(2000); // 18 + 2 extra
      expect(detected.bundlePrice).toBe(1500); // 15 (options are free!)
      expect(detected.savings).toBe(500); // 5 euros saved
    });
  });

  describe('handling multiple bundles', () => {
    it('should detect multiple applicable bundles', async () => {
      const bundles = [
        createBundleOffer({
          id: 'bundle-1',
          name: 'Lunch Menu',
          fixed_price: 1500,
          bundle_categories: [
            { category_ids: ['category-pizza'], quantity: 1 },
            { category_ids: ['category-drink'], quantity: 1 },
          ],
        }),
        createBundleOffer({
          id: 'bundle-2',
          name: 'Pizza Deal',
          fixed_price: 1200,
          bundle_categories: [
            { category_ids: ['category-pizza'], quantity: 1 },
          ],
        }),
      ];
      setupSupabaseMock(bundles);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1400,
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            price: 400,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(2);
    });

    it('should sort bundles by savings (highest first)', async () => {
      const bundles = [
        createBundleOffer({
          id: 'small-savings',
          name: 'Small Savings Bundle',
          fixed_price: 1700, // Small savings
          bundle_categories: [
            { category_ids: ['category-pizza'], quantity: 1 },
            { category_ids: ['category-drink'], quantity: 1 },
          ],
        }),
        createBundleOffer({
          id: 'big-savings',
          name: 'Big Savings Bundle',
          fixed_price: 1200, // Big savings
          bundle_categories: [
            { category_ids: ['category-pizza'], quantity: 1 },
            { category_ids: ['category-drink'], quantity: 1 },
          ],
        }),
      ];
      setupSupabaseMock(bundles);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1400,
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            price: 500,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      // Total original: 1900
      // small-savings bundle: 1700, savings: 200
      // big-savings bundle: 1200, savings: 700
      expect(result.current.detectedBundles).toHaveLength(2);
      expect(result.current.detectedBundles[0].bundle.id).toBe('big-savings');
      expect(result.current.detectedBundles[0].savings).toBe(700);
      expect(result.current.detectedBundles[1].bundle.id).toBe('small-savings');
      expect(result.current.detectedBundles[1].savings).toBe(200);
    });

    it('should return bestBundle as the one with highest savings', async () => {
      const bundles = [
        createBundleOffer({
          id: 'bundle-1',
          fixed_price: 1600,
          bundle_categories: [
            { category_ids: ['category-pizza'], quantity: 1 },
          ],
        }),
        createBundleOffer({
          id: 'bundle-2',
          fixed_price: 1000, // Better deal
          bundle_categories: [
            { category_ids: ['category-pizza'], quantity: 1 },
          ],
        }),
      ];
      setupSupabaseMock(bundles);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1800,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.bestBundle).not.toBeNull();
      expect(result.current.bestBundle?.bundle.id).toBe('bundle-2');
      expect(result.current.bestBundle?.savings).toBe(800);
      expect(result.current.totalBundleSavings).toBe(800);
    });
  });

  describe('category-based bundle detection', () => {
    it('should match items using category_ids array', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1200, // Lower than item price to create savings
        bundle_categories: [
          { category_ids: ['category-pizza', 'category-pasta'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pasta-1',
            category_id: 'category-pasta', // Matches second category in array
            price: 1400,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
    });

    it('should support legacy category_id field', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1200, // Lower than item price to create savings
        bundle_categories: [
          {
            category_ids: [], // Empty array
            category_id: 'category-pizza', // Legacy field
            quantity: 1,
          },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1400,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
    });

    it('should exclude items in excluded_items list', async () => {
      const bundleOffer = createBundleOffer({
        bundle_categories: [
          {
            category_ids: ['category-pizza'],
            quantity: 1,
            excluded_items: ['premium-pizza'], // This item is excluded
          },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'premium-pizza', // Excluded!
            category_id: 'category-pizza',
            price: 2000,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(0);
    });

    it('should exclude items with excluded sizes', async () => {
      const bundleOffer = createBundleOffer({
        bundle_categories: [
          {
            category_ids: ['category-pizza'],
            quantity: 1,
            excluded_sizes: {
              'pizza-1': ['size-xl'], // XL size excluded for this pizza
            },
          },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
          selectedOptions: [
            {
              optionId: 'size-xl', // Excluded size!
              optionGroupId: 'sizes',
              name: 'XL',
              groupName: 'Size',
              priceModifier: 1800,
              isSizeOption: true,
            },
          ],
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(0);
    });

    it('should allow items with non-excluded sizes', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1200, // Lower to create savings
        bundle_categories: [
          {
            category_ids: ['category-pizza'],
            quantity: 1,
            excluded_sizes: {
              'pizza-1': ['size-xl'], // Only XL is excluded
            },
          },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
          selectedOptions: [
            {
              optionId: 'size-medium', // Medium is allowed
              optionGroupId: 'sizes',
              name: 'Medium',
              groupName: 'Size',
              priceModifier: 1500, // Higher price to create savings
              isSizeOption: true,
            },
          ],
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      // originalPrice: 1500, bundlePrice: 1200, savings: 300
      expect(result.current.detectedBundles).toHaveLength(1);
    });

    it('should not match items without a category', async () => {
      const bundleOffer = createBundleOffer({
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'item-1',
            category_id: null, // No category
            price: 1200,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(0);
    });
  });

  describe('specific items bundle detection', () => {
    it('should match each cart item to only one bundle category', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 2000,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-pizza'], quantity: 1 }, // Needs 2 pizzas
        ],
      });
      setupSupabaseMock([bundleOffer]);

      // Only one pizza in cart - can't match both bundle categories
      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(0);
    });

    it('should match bundle requiring multiple items of same category', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 2000,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-pizza'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      // Two different pizzas in cart
      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
        }),
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-2',
            category_id: 'category-pizza',
            price: 1400,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
      expect(result.current.detectedBundles[0].matchedItems).toHaveLength(2);
      expect(result.current.detectedBundles[0].originalPrice).toBe(2600);
      expect(result.current.detectedBundles[0].bundlePrice).toBe(2000);
      expect(result.current.detectedBundles[0].savings).toBe(600);
    });
  });

  describe('dependency changes', () => {
    it('should refetch bundles when foodtruckId changes', async () => {
      setupSupabaseMock([]);

      const { rerender } = renderHook(
        ({ foodtruckId }) => useBundleDetection(foodtruckId, []),
        { initialProps: { foodtruckId: 'foodtruck-1' } }
      );

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
      });

      // Change foodtruckId
      rerender({ foodtruckId: 'foodtruck-2' });

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledTimes(2);
      });
    });

    it('should redetect bundles when cart items change', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1500,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
          { category_ids: ['category-drink'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const initialItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
        }),
      ];

      const { result, rerender } = renderHook(
        ({ items }) => useBundleDetection('foodtruck-1', items),
        { initialProps: { items: initialItems } }
      );

      await waitForBundlesLoaded();

      // Only pizza - bundle not detected
      expect(result.current.detectedBundles).toHaveLength(0);

      // Add drink to cart
      const updatedItems: CartItem[] = [
        ...initialItems,
        createCartItem({
          menuItem: createMenuItem({
            id: 'drink-1',
            category_id: 'category-drink',
            price: 500,
          }),
        }),
      ];

      rerender({ items: updatedItems });

      await waitFor(() => {
        expect(result.current.detectedBundles).toHaveLength(1);
      });

      expect(result.current.detectedBundles[0].savings).toBe(200);
    });
  });

  describe('edge cases', () => {
    it('should handle bundles with no bundle_categories', async () => {
      const bundleOffer = createBundleOffer({
        bundle_categories: [], // Empty categories
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      // Should not crash and return no detected bundles
      expect(result.current.detectedBundles).toHaveLength(0);
    });

    it('should handle items with no selectedOptions', async () => {
      const bundleOffer = createBundleOffer({
        fixed_price: 1000,
        bundle_categories: [
          { category_ids: ['category-pizza'], quantity: 1 },
        ],
      });
      setupSupabaseMock([bundleOffer]);

      const cartItems: CartItem[] = [
        createCartItem({
          menuItem: createMenuItem({
            id: 'pizza-1',
            category_id: 'category-pizza',
            price: 1200,
          }),
          selectedOptions: undefined, // No options
        }),
      ];

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', cartItems)
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toHaveLength(1);
      expect(result.current.detectedBundles[0].savings).toBe(200);
    });

    it('should handle null data from API', async () => {
      setupSupabaseMock(null);

      const { result } = renderHook(() =>
        useBundleDetection('foodtruck-1', [createCartItem()])
      );

      await waitForBundlesLoaded();

      expect(result.current.detectedBundles).toEqual([]);
    });
  });
});

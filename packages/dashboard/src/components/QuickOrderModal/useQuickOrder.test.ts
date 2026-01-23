import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Category } from '@foodtruck/shared';

// Mock Supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  order_slot_interval: 15,
  max_orders_per_slot: 10,
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock fetch for order creation
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import { useQuickOrder, type MenuItemWithOptions } from './useQuickOrder';

describe('useQuickOrder', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', foodtruck_id: 'ft-1', name: 'Plats', display_order: 0, created_at: '2024-01-01' },
    { id: 'cat-2', foodtruck_id: 'ft-1', name: 'Boissons', display_order: 1, created_at: '2024-01-01' },
  ];

  const mockMenuItems: MenuItemWithOptions[] = [
    {
      id: 'item-1',
      foodtruck_id: 'ft-1',
      category_id: 'cat-1',
      name: 'Burger Classic',
      description: 'Delicious burger',
      price: 1200,
      image_url: null,
      allergens: null,
      is_available: true,
      is_daily_special: false,
      is_archived: false,
      display_order: 0,
      disabled_options: {},
      option_prices: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      option_groups: [],
    },
    {
      id: 'item-2',
      foodtruck_id: 'ft-1',
      category_id: 'cat-1',
      name: 'Burger Deluxe',
      description: 'Premium burger',
      price: 1500,
      image_url: null,
      allergens: null,
      is_available: true,
      is_daily_special: false,
      is_archived: false,
      display_order: 1,
      disabled_options: {},
      option_prices: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      option_groups: [
        {
          id: 'og-1',
          menu_item_id: 'item-2',
          name: 'Cuisson',
          is_required: true,
          is_multiple: false,
          display_order: 0,
          created_at: '2024-01-01',
          options: [
            { id: 'opt-1', option_group_id: 'og-1', name: 'Saignant', price_modifier: 0, is_available: true, is_default: false, display_order: 0, created_at: '2024-01-01' },
            { id: 'opt-2', option_group_id: 'og-1', name: 'À point', price_modifier: 0, is_available: true, is_default: true, display_order: 1, created_at: '2024-01-01' },
          ],
        },
        {
          id: 'og-2',
          menu_item_id: 'item-2',
          name: 'Suppléments',
          is_required: false,
          is_multiple: true,
          display_order: 1,
          created_at: '2024-01-01',
          options: [
            { id: 'opt-3', option_group_id: 'og-2', name: 'Bacon', price_modifier: 200, is_available: true, is_default: false, display_order: 0, created_at: '2024-01-01' },
            { id: 'opt-4', option_group_id: 'og-2', name: 'Fromage', price_modifier: 100, is_available: true, is_default: false, display_order: 1, created_at: '2024-01-01' },
          ],
        },
      ],
    },
    {
      id: 'item-3',
      foodtruck_id: 'ft-1',
      category_id: 'cat-2',
      name: 'Coca-Cola',
      description: 'Refreshing',
      price: 300,
      image_url: null,
      allergens: null,
      is_available: true,
      is_daily_special: false,
      is_archived: false,
      display_order: 0,
      disabled_options: {},
      option_prices: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      option_groups: [],
    },
  ];

  const mockSlots = [
    { slot_time: '12:00:00', available: true, order_count: 2 },
    { slot_time: '12:15:00', available: true, order_count: 5 },
    { slot_time: '12:30:00', available: false, order_count: 10 },
  ];

  const mockOnClose = vi.fn();
  const mockOnOrderCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Supabase mocks
    mockFrom.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockCategories, error: null }),
            }),
          }),
        };
      }
      if (table === 'menu_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockMenuItems, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
    });

    mockRpc.mockResolvedValue({ data: mockSlots, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ orderId: 'order-123' }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values when modal is closed', () => {
      const { result } = renderHook(() => useQuickOrder(false, mockOnClose, mockOnOrderCreated));

      expect(result.current.cart).toEqual([]);
      expect(result.current.step).toBe('products');
      expect(result.current.customerName).toBe('');
      expect(result.current.pickupTime).toBe('now');
      expect(result.current.loading).toBe(true);
    });

    it('should fetch data when modal opens', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.filteredItems).toHaveLength(3);
    });

    it('should set slot availability from API response', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.slotAvailability['12:00']).toEqual({ available: true, orderCount: 2 });
      expect(result.current.slotAvailability['12:30']).toEqual({ available: false, orderCount: 10 });
    });

    it('should reset state when modal opens', async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useQuickOrder(isOpen, mockOnClose, mockOnOrderCreated),
        { initialProps: { isOpen: false } }
      );

      // Open modal
      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add item to cart
      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
      });

      expect(result.current.cart).toHaveLength(1);

      // Close and reopen
      rerender({ isOpen: false });
      rerender({ isOpen: true });

      await waitFor(() => {
        expect(result.current.cart).toEqual([]);
      });
    });
  });

  describe('category filtering', () => {
    it('should filter items by category', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // All items
      expect(result.current.filteredItems).toHaveLength(3);

      // Filter by Plats
      act(() => {
        result.current.setSelectedCategory('cat-1');
      });

      expect(result.current.filteredItems).toHaveLength(2);
      expect(result.current.filteredItems.every(i => i.category_id === 'cat-1')).toBe(true);

      // Filter by Boissons
      act(() => {
        result.current.setSelectedCategory('cat-2');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Coca-Cola');
    });

    it('should filter items by search query', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('burger');
      });

      expect(result.current.filteredItems).toHaveLength(2);
      expect(result.current.filteredItems.every(i => i.name.toLowerCase().includes('burger'))).toBe(true);
    });

    it('should combine category and search filters', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSelectedCategory('cat-1');
        result.current.setSearchQuery('deluxe');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Burger Deluxe');
    });
  });

  describe('cart management', () => {
    it('should add item without options directly to cart', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]); // Burger Classic (no options)
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].menuItem.name).toBe('Burger Classic');
      expect(result.current.cart[0].quantity).toBe(1);
      expect(result.current.step).toBe('products');
    });

    it('should open options step for item with options', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[1]); // Burger Deluxe (has options)
      });

      expect(result.current.step).toBe('options');
      expect(result.current.pendingItem?.id).toBe('item-2');
      expect(result.current.cart).toHaveLength(0);
    });

    it('should increment quantity when adding same item', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(2);
    });

    it('should update quantity correctly', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
      });

      const uniqueId = result.current.cart[0].uniqueId;

      act(() => {
        result.current.updateQuantity(uniqueId, 2);
      });

      expect(result.current.cart[0].quantity).toBe(3);

      act(() => {
        result.current.updateQuantity(uniqueId, -1);
      });

      expect(result.current.cart[0].quantity).toBe(2);
    });

    it('should remove item when quantity reaches 0', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
      });

      const uniqueId = result.current.cart[0].uniqueId;

      act(() => {
        result.current.updateQuantity(uniqueId, -1);
      });

      expect(result.current.cart).toHaveLength(0);
    });

    it('should remove item from cart', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
        result.current.handleItemClick(mockMenuItems[2]);
      });

      expect(result.current.cart).toHaveLength(2);

      const uniqueId = result.current.cart[0].uniqueId;

      act(() => {
        result.current.removeFromCart(uniqueId);
      });

      expect(result.current.cart).toHaveLength(1);
    });
  });

  describe('cart calculations', () => {
    it('should calculate cart total correctly', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]); // 1200
        result.current.handleItemClick(mockMenuItems[2]); // 300
      });

      expect(result.current.cartTotal).toBe(1500);
    });

    it('should calculate cart items count correctly', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
        result.current.handleItemClick(mockMenuItems[0]);
        result.current.handleItemClick(mockMenuItems[2]);
      });

      expect(result.current.cartItemsCount).toBe(3);
    });

    it('should include option prices in total', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add item with options
      act(() => {
        result.current.handleItemClick(mockMenuItems[1]); // Opens options step
      });

      act(() => {
        result.current.toggleOption('og-1', 'opt-1', false); // Cuisson (required)
        result.current.toggleOption('og-2', 'opt-3', true); // Bacon +200
        result.current.toggleOption('og-2', 'opt-4', true); // Fromage +100
      });

      act(() => {
        result.current.confirmOptions();
      });

      // 1500 (base) + 200 (bacon) + 100 (fromage) = 1800
      expect(result.current.cartTotal).toBe(1800);
    });
  });

  describe('options handling', () => {
    it('should toggle single-select option (replace)', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[1]);
      });

      act(() => {
        result.current.toggleOption('og-1', 'opt-1', false);
      });

      expect(result.current.pendingOptions['og-1']).toEqual(['opt-1']);

      act(() => {
        result.current.toggleOption('og-1', 'opt-2', false);
      });

      expect(result.current.pendingOptions['og-1']).toEqual(['opt-2']);
    });

    it('should toggle multi-select option (add/remove)', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[1]);
      });

      act(() => {
        result.current.toggleOption('og-2', 'opt-3', true);
      });

      expect(result.current.pendingOptions['og-2']).toEqual(['opt-3']);

      act(() => {
        result.current.toggleOption('og-2', 'opt-4', true);
      });

      expect(result.current.pendingOptions['og-2']).toEqual(['opt-3', 'opt-4']);

      act(() => {
        result.current.toggleOption('og-2', 'opt-3', true);
      });

      expect(result.current.pendingOptions['og-2']).toEqual(['opt-4']);
    });

    it('should not confirm options when required option is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[1]);
      });

      // Don't select required option (Cuisson)
      act(() => {
        result.current.confirmOptions();
      });

      expect(result.current.cart).toHaveLength(0);
      expect(result.current.step).toBe('options');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should cancel options and return to products', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[1]);
      });

      expect(result.current.step).toBe('options');

      act(() => {
        result.current.cancelOptions();
      });

      expect(result.current.step).toBe('products');
      expect(result.current.pendingItem).toBeNull();
      expect(result.current.pendingOptions).toEqual({});
    });
  });

  describe('available time slots', () => {
    it('should generate time slots based on interval', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have time slots generated (at least some)
      expect(result.current.availableTimeSlots.length).toBeGreaterThan(0);

      // Each slot should be in HH:MM format
      result.current.availableTimeSlots.forEach(slot => {
        expect(slot).toMatch(/^\d{2}:\d{2}$/);
      });
    });
  });

  describe('order submission', () => {
    it('should not submit with empty cart', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setCustomerName('John Doe');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not submit without customer name', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should submit order successfully', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
        result.current.setCustomerName('John Doe');
        result.current.setNotes('Extra sauce');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/create-order'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('John Doe'),
        })
      );

      expect(mockOnOrderCreated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle submission error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
        result.current.setCustomerName('John Doe');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockOnOrderCreated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should set isSubmitting during submission', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleItemClick(mockMenuItems[0]);
        result.current.setCustomerName('John Doe');
      });

      // Start submission
      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.isSubmitting).toBe(true);

      // Complete submission
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ orderId: 'order-123' }),
        });
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('mobile cart', () => {
    it('should toggle mobile cart visibility', async () => {
      const { result } = renderHook(() => useQuickOrder(true, mockOnClose, mockOnOrderCreated));

      expect(result.current.showMobileCart).toBe(false);

      act(() => {
        result.current.setShowMobileCart(true);
      });

      expect(result.current.showMobileCart).toBe(true);
    });
  });
});

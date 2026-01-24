import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import type { MenuItem, BundleCartInfo, SelectedOption } from '@foodtruck/shared';
import { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

const createMenuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: 'item-1',
  foodtruck_id: 'ft-1',
  category_id: 'cat-1',
  name: 'Test Item',
  description: 'Test description',
  price: 1000, // 10€ in centimes
  is_available: true,
  is_archived: false,
  is_daily_special: false,
  display_order: 0,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  allergens: null,
  image_url: null,
  disabled_options: [],
  option_prices: {},
  ...overrides,
});

const createSelectedOption = (overrides: Partial<SelectedOption> = {}): SelectedOption => ({
  optionId: 'opt-1',
  optionGroupId: 'og-1',
  name: 'Medium',
  groupName: 'Size',
  priceModifier: 200, // +2€
  isSizeOption: false,
  ...overrides,
});

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.foodtruckId).toBeNull();
    });

    it('should throw when used outside provider', () => {
      expect(() => {
        renderHook(() => useCart());
      }).toThrow('useCart must be used within a CartProvider');
    });

    it('should load cart from localStorage', () => {
      const menuItem = createMenuItem();
      const storedCart = {
        items: [{ menuItem, quantity: 2 }],
        foodtruckId: 'ft-1',
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedCart));

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.foodtruckId).toBe('ft-1');
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json');

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('should add a new item to cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].menuItem).toEqual(menuItem);
      expect(result.current.items[0].quantity).toBe(1);
    });

    it('should increment quantity for existing item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1);
      });
      act(() => {
        result.current.addItem(menuItem, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('should add notes to item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1, 'No onions please');
      });

      expect(result.current.items[0].notes).toBe('No onions please');
    });

    it('should treat items with different options as separate items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();
      const option1 = createSelectedOption({ optionId: 'opt-1' });
      const option2 = createSelectedOption({ optionId: 'opt-2' });

      act(() => {
        result.current.addItem(menuItem, 1, undefined, [option1]);
      });
      act(() => {
        result.current.addItem(menuItem, 1, undefined, [option2]);
      });

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1);
      });

      const cartKey = result.current.getCartKey(menuItem.id);
      act(() => {
        result.current.removeItem(cartKey);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should remove correct item when multiple items exist', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem1 = createMenuItem({ id: 'item-1', name: 'Item 1' });
      const menuItem2 = createMenuItem({ id: 'item-2', name: 'Item 2' });

      act(() => {
        result.current.addItem(menuItem1, 1);
        result.current.addItem(menuItem2, 1);
      });

      const cartKey1 = result.current.getCartKey(menuItem1.id);
      act(() => {
        result.current.removeItem(cartKey1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].menuItem.id).toBe('item-2');
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1);
      });

      const cartKey = result.current.getCartKey(menuItem.id);
      act(() => {
        result.current.updateQuantity(cartKey, 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1);
      });

      const cartKey = result.current.getCartKey(menuItem.id);
      act(() => {
        result.current.updateQuantity(cartKey, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should remove item when quantity set to negative', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 2);
      });

      const cartKey = result.current.getCartKey(menuItem.id);
      act(() => {
        result.current.updateQuantity(cartKey, -1);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should remove all items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem1 = createMenuItem({ id: 'item-1' });
      const menuItem2 = createMenuItem({ id: 'item-2' });

      act(() => {
        result.current.addItem(menuItem1, 1);
        result.current.addItem(menuItem2, 2);
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    it('should reset foodtruckId', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.setFoodtruck('ft-1');
      });
      act(() => {
        result.current.clearCart();
      });

      expect(result.current.foodtruckId).toBeNull();
    });
  });

  describe('setFoodtruck', () => {
    it('should set foodtruckId', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.setFoodtruck('ft-1');
      });

      expect(result.current.foodtruckId).toBe('ft-1');
    });

    it('should clear cart when switching foodtrucks', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.setFoodtruck('ft-1');
        result.current.addItem(menuItem, 1);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.setFoodtruck('ft-2');
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.foodtruckId).toBe('ft-2');
    });

    it('should not clear cart when setting same foodtruck', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.setFoodtruck('ft-1');
        result.current.addItem(menuItem, 1);
      });

      act(() => {
        result.current.setFoodtruck('ft-1');
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('total calculation', () => {
    it('should calculate total for single item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem({ price: 1000 }); // 10€

      act(() => {
        result.current.addItem(menuItem, 1);
      });

      expect(result.current.total).toBe(1000);
    });

    it('should calculate total for multiple items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem1 = createMenuItem({ id: 'item-1', price: 1000 });
      const menuItem2 = createMenuItem({ id: 'item-2', price: 500 });

      act(() => {
        result.current.addItem(menuItem1, 2); // 20€
        result.current.addItem(menuItem2, 3); // 15€
      });

      expect(result.current.total).toBe(3500); // 35€
    });

    it('should include supplement options in total', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem({ price: 1000 });
      const supplement = createSelectedOption({
        name: 'Extra cheese',
        priceModifier: 200,
        isSizeOption: false,
      });

      act(() => {
        result.current.addItem(menuItem, 1, undefined, [supplement]);
      });

      expect(result.current.total).toBe(1200); // 10€ + 2€
    });

    it('should use size option price as base price', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem({ price: 1000 }); // Default price
      const sizeOption = createSelectedOption({
        name: 'Large',
        priceModifier: 1500, // Large size costs 15€
        isSizeOption: true,
      });

      act(() => {
        result.current.addItem(menuItem, 1, undefined, [sizeOption]);
      });

      expect(result.current.total).toBe(1500); // Size option replaces base price
    });

    it('should combine size option and supplements correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem({ price: 1000 });
      const sizeOption = createSelectedOption({
        optionId: 'size-l',
        name: 'Large',
        priceModifier: 1500,
        isSizeOption: true,
      });
      const supplement = createSelectedOption({
        optionId: 'extra-cheese',
        name: 'Extra cheese',
        priceModifier: 200,
        isSizeOption: false,
      });

      act(() => {
        result.current.addItem(menuItem, 1, undefined, [sizeOption, supplement]);
      });

      expect(result.current.total).toBe(1700); // 15€ (size) + 2€ (supplement)
    });
  });

  describe('itemCount', () => {
    it('should count total items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem1 = createMenuItem({ id: 'item-1' });
      const menuItem2 = createMenuItem({ id: 'item-2' });

      act(() => {
        result.current.addItem(menuItem1, 2);
        result.current.addItem(menuItem2, 3);
      });

      expect(result.current.itemCount).toBe(5);
    });
  });

  describe('getCartKey', () => {
    it('should return item id for items without options', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const key = result.current.getCartKey('item-1');

      expect(key).toBe('item-1');
    });

    it('should include options in key', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const options: SelectedOption[] = [
        createSelectedOption({ optionId: 'opt-a' }),
        createSelectedOption({ optionId: 'opt-b' }),
      ];

      const key = result.current.getCartKey('item-1', options);

      expect(key).toBe('item-1:opt-a-opt-b');
    });

    it('should sort option ids for consistent keys', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const options1: SelectedOption[] = [
        createSelectedOption({ optionId: 'opt-b' }),
        createSelectedOption({ optionId: 'opt-a' }),
      ];
      const options2: SelectedOption[] = [
        createSelectedOption({ optionId: 'opt-a' }),
        createSelectedOption({ optionId: 'opt-b' }),
      ];

      const key1 = result.current.getCartKey('item-1', options1);
      const key2 = result.current.getCartKey('item-1', options2);

      expect(key1).toBe(key2);
    });

    it('should handle bundle items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const key = result.current.getCartKey('item-1', [], 'bundle-1');

      expect(key).toBe('bundle:bundle-1:');
    });
  });

  describe('addBundleItem', () => {
    it('should add bundle to cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();
      const bundleInfo: BundleCartInfo = {
        bundleId: 'bundle-1',
        bundleName: 'Test Bundle',
        fixedPrice: 1500,
        freeOptions: false,
        selections: [
          {
            menuItem,
            categoryId: 'cat-1',
            categoryName: 'Main',
            supplement: 0,
          },
        ],
      };

      act(() => {
        result.current.addBundleItem(bundleInfo, 1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].bundleInfo).toBeDefined();
      expect(result.current.items[0].bundleInfo?.bundleName).toBe('Test Bundle');
    });

    it('should calculate bundle price correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();
      const bundleInfo: BundleCartInfo = {
        bundleId: 'bundle-1',
        bundleName: 'Test Bundle',
        fixedPrice: 1500, // 15€
        freeOptions: false,
        selections: [
          {
            menuItem,
            categoryId: 'cat-1',
            categoryName: 'Main',
            supplement: 300, // +3€ supplement
          },
        ],
      };

      act(() => {
        result.current.addBundleItem(bundleInfo, 1);
      });

      expect(result.current.total).toBe(1800); // 15€ + 3€
    });

    it('should include options price when freeOptions is false', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();
      const option = createSelectedOption({ priceModifier: 200, isSizeOption: false });
      const bundleInfo: BundleCartInfo = {
        bundleId: 'bundle-1',
        bundleName: 'Test Bundle',
        fixedPrice: 1500,
        freeOptions: false,
        selections: [
          {
            menuItem,
            categoryId: 'cat-1',
            categoryName: 'Main',
            supplement: 0,
            selectedOptions: [option],
          },
        ],
      };

      act(() => {
        result.current.addBundleItem(bundleInfo, 1);
      });

      expect(result.current.total).toBe(1700); // 15€ + 2€ option
    });

    it('should not include options price when freeOptions is true', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();
      const option = createSelectedOption({ priceModifier: 200, isSizeOption: false });
      const bundleInfo: BundleCartInfo = {
        bundleId: 'bundle-1',
        bundleName: 'Test Bundle',
        fixedPrice: 1500,
        freeOptions: true, // Options are free
        selections: [
          {
            menuItem,
            categoryId: 'cat-1',
            categoryName: 'Main',
            supplement: 0,
            selectedOptions: [option],
          },
        ],
      };

      act(() => {
        result.current.addBundleItem(bundleInfo, 1);
      });

      expect(result.current.total).toBe(1500); // Only fixed price
    });

    it('should not add bundle with empty selections', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const bundleInfo: BundleCartInfo = {
        bundleId: 'bundle-1',
        bundleName: 'Test Bundle',
        fixedPrice: 1500,
        freeOptions: false,
        selections: [],
      };

      act(() => {
        result.current.addBundleItem(bundleInfo, 1);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('should save cart to localStorage on changes', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const menuItem = createMenuItem();

      act(() => {
        result.current.addItem(menuItem, 1);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)?.[1] || '{}');
      expect(savedData.items).toHaveLength(1);
    });
  });
});

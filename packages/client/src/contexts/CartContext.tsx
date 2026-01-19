import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, MenuItem, SelectedOption, BundleCartInfo } from '@foodtruck/shared';

interface CartContextType {
  items: CartItem[];
  foodtruckId: string | null;
  addItem: (menuItem: MenuItem, quantity: number, notes?: string, selectedOptions?: SelectedOption[]) => void;
  addBundleItem: (bundleInfo: BundleCartInfo, quantity: number) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  setFoodtruck: (id: string) => void;
  total: number;
  itemCount: number;
  getCartKey: (menuItemId: string, selectedOptions?: SelectedOption[], bundleId?: string) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'foodtruck-cart';

// Generate a unique key for cart items based on menu item and selected options
function generateCartKey(menuItemId: string, selectedOptions?: SelectedOption[], bundleId?: string): string {
  if (bundleId) {
    // For bundles, use bundleId + selection option ids
    const optionIds = selectedOptions?.map(o => o.optionId).sort().join('-') || '';
    return `bundle:${bundleId}:${optionIds}`;
  }
  if (!selectedOptions || selectedOptions.length === 0) {
    return menuItemId;
  }
  const optionIds = selectedOptions.map(o => o.optionId).sort().join('-');
  return `${menuItemId}:${optionIds}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [foodtruckId, setFoodtruckId] = useState<string | null>(null);

  // Load cart from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setItems(parsed.items || []);
        setFoodtruckId(parsed.foodtruckId || null);
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items, foodtruckId })
    );
  }, [items, foodtruckId]);

  const getCartKey = (menuItemId: string, selectedOptions?: SelectedOption[], bundleId?: string) => {
    return generateCartKey(menuItemId, selectedOptions, bundleId);
  };

  const addItem = (menuItem: MenuItem, quantity: number, notes?: string, selectedOptions?: SelectedOption[]) => {
    setItems((prev) => {
      const cartKey = generateCartKey(menuItem.id, selectedOptions);
      const existing = prev.find((item) =>
        !item.bundleInfo && generateCartKey(item.menuItem.id, item.selectedOptions) === cartKey
      );

      if (existing) {
        return prev.map((item) =>
          !item.bundleInfo && generateCartKey(item.menuItem.id, item.selectedOptions) === cartKey
            ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
            : item
        );
      }
      return [...prev, { menuItem, quantity, notes, selectedOptions }];
    });
  };

  const addBundleItem = (bundleInfo: BundleCartInfo, quantity: number) => {
    setItems((prev) => {
      // Use first selection's menuItem as the "representative" item for the bundle
      // This is just for cart key generation
      const firstSelection = bundleInfo.selections[0];
      if (!firstSelection) return prev;

      // Create a unique key based on bundle and all selections
      const allOptionIds = bundleInfo.selections
        .flatMap(s => s.selectedOptions?.map(o => o.optionId) || [])
        .sort()
        .join('-');
      const cartKey = `bundle:${bundleInfo.bundleId}:${allOptionIds}`;

      const existing = prev.find((item) =>
        item.bundleInfo?.bundleId === bundleInfo.bundleId &&
        generateCartKey(item.menuItem.id, undefined, item.bundleInfo?.bundleId) === cartKey
      );

      // For bundles, we don't merge - each bundle addition is unique
      // unless exact same selections
      if (existing) {
        return prev.map((item) =>
          item.bundleInfo?.bundleId === bundleInfo.bundleId &&
          generateCartKey(item.menuItem.id, undefined, item.bundleInfo?.bundleId) === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      // Create a "virtual" menu item for the bundle
      const bundleMenuItem: MenuItem = {
        id: `bundle-${bundleInfo.bundleId}-${Date.now()}`,
        foodtruck_id: firstSelection.menuItem.foodtruck_id,
        category_id: null,
        name: bundleInfo.bundleName,
        description: bundleInfo.selections.map(s => s.menuItem.name).join(' + '),
        price: bundleInfo.fixedPrice, // Will be recalculated in total
        is_available: true,
        is_archived: false,
        is_daily_special: false,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        allergens: null,
        image_url: null,
        disabled_options: [],
        option_prices: {},
      };

      return [...prev, {
        menuItem: bundleMenuItem,
        quantity,
        bundleInfo,
      }];
    });
  };

  const removeItem = (cartKey: string) => {
    setItems((prev) => prev.filter((item) =>
      generateCartKey(item.menuItem.id, item.selectedOptions) !== cartKey
    ));
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartKey);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        generateCartKey(item.menuItem.id, item.selectedOptions) === cartKey
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setFoodtruckId(null);
  };

  const setFoodtruck = (id: string) => {
    if (foodtruckId && foodtruckId !== id) {
      // Clear cart if switching foodtrucks
      setItems([]);
    }
    setFoodtruckId(id);
  };

  const total = items.reduce((sum, item) => {
    // Bundle items have special pricing
    if (item.bundleInfo) {
      const bundlePrice = item.bundleInfo.fixedPrice;

      // Add supplements from bundle selections
      const supplementsTotal = item.bundleInfo.selections.reduce(
        (selSum, sel) => selSum + sel.supplement, 0
      );

      // Add options price (unless free_options is enabled)
      let optionsTotal = 0;
      if (!item.bundleInfo.freeOptions) {
        item.bundleInfo.selections.forEach(sel => {
          const selOptionPrice = sel.selectedOptions?.reduce(
            (optSum, opt) => optSum + (opt.isSizeOption ? 0 : opt.priceModifier), 0
          ) || 0;
          optionsTotal += selOptionPrice;
        });
      }

      return sum + (bundlePrice + supplementsTotal + optionsTotal) * item.quantity;
    }

    // Regular items
    // Check if there's a size option (which contains the full price)
    const sizeOption = item.selectedOptions?.find(opt => opt.isSizeOption);

    // Base price: size option price if exists, otherwise menu item price
    const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;

    // Add supplements (non-size options)
    const supplementsTotal = item.selectedOptions?.reduce(
      (optSum, opt) => optSum + (opt.isSizeOption ? 0 : opt.priceModifier), 0
    ) || 0;

    return sum + (basePrice + supplementsTotal) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        foodtruckId,
        addItem,
        addBundleItem,
        removeItem,
        updateQuantity,
        clearCart,
        setFoodtruck,
        total,
        itemCount,
        getCartKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { calculateBundlePrice, computeCartItemUnitPrice } from '@foodtruck/shared';
import type { CartItem, MenuItem, SelectedOption, BundleCartInfo } from '@foodtruck/shared';

interface CartContextType {
  items: CartItem[];
  foodtruckId: string | null;
  addItem: (
    menuItem: MenuItem,
    quantity: number,
    notes?: string,
    selectedOptions?: SelectedOption[]
  ) => void;
  addBundleItem: (bundleInfo: BundleCartInfo, quantity: number) => void;
  decomposeBundleItem: (cartKey: string) => void;
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
function generateCartKey(
  menuItemId: string,
  selectedOptions?: SelectedOption[],
  bundleId?: string
): string {
  if (bundleId) {
    // For bundles, use bundleId + selection option ids
    const optionIds =
      selectedOptions
        ?.map((o) => o.optionId)
        .sort()
        .join('-') || '';
    return `bundle:${bundleId}:${optionIds}`;
  }
  if (!selectedOptions || selectedOptions.length === 0) {
    return menuItemId;
  }
  const optionIds = selectedOptions
    .map((o) => o.optionId)
    .sort()
    .join('-');
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
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, foodtruckId }));
    } catch {
      // Quota exceeded or private browsing — cart won't persist but app continues
    }
  }, [items, foodtruckId]);

  const getCartKey = useCallback(
    (menuItemId: string, selectedOptions?: SelectedOption[], bundleId?: string) => {
      return generateCartKey(menuItemId, selectedOptions, bundleId);
    },
    []
  );

  const addItem = useCallback(
    (menuItem: MenuItem, quantity: number, notes?: string, selectedOptions?: SelectedOption[]) => {
      setItems((prev) => {
        const cartKey = generateCartKey(menuItem.id, selectedOptions);
        const existing = prev.find(
          (item) =>
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
    },
    []
  );

  const addBundleItem = useCallback((bundleInfo: BundleCartInfo, quantity: number) => {
    setItems((prev) => {
      const firstSelection = bundleInfo.selections[0];
      if (!firstSelection) return prev;

      const allOptionIds = bundleInfo.selections
        .flatMap((s) => s.selectedOptions?.map((o) => o.optionId) || [])
        .sort()
        .join('-');
      const cartKey = `bundle:${bundleInfo.bundleId}:${allOptionIds}`;

      const existing = prev.find(
        (item) =>
          item.bundleInfo?.bundleId === bundleInfo.bundleId &&
          generateCartKey(item.menuItem.id, undefined, item.bundleInfo?.bundleId) === cartKey
      );

      if (existing) {
        return prev.map((item) =>
          item.bundleInfo?.bundleId === bundleInfo.bundleId &&
          generateCartKey(item.menuItem.id, undefined, item.bundleInfo?.bundleId) === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      const bundleMenuItem: MenuItem = {
        id: `bundle-${bundleInfo.bundleId}-${Date.now()}`,
        foodtruck_id: firstSelection.menuItem.foodtruck_id,
        category_id: null,
        name: bundleInfo.bundleName,
        description: bundleInfo.selections.map((s) => s.menuItem.name).join(' + '),
        price: bundleInfo.fixedPrice,
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

      return [
        ...prev,
        {
          menuItem: bundleMenuItem,
          quantity,
          bundleInfo,
        },
      ];
    });
  }, []);

  const decomposeBundleItem = useCallback((cartKey: string) => {
    setItems((prev) => {
      const bundleItem = prev.find(
        (item) =>
          item.bundleInfo && generateCartKey(item.menuItem.id, item.selectedOptions) === cartKey
      );
      if (!bundleItem?.bundleInfo) return prev;

      const withoutBundle = prev.filter(
        (item) => generateCartKey(item.menuItem.id, item.selectedOptions) !== cartKey
      );

      const newItems: CartItem[] = bundleItem.bundleInfo.selections.map((sel) => ({
        menuItem: sel.menuItem,
        quantity: bundleItem.quantity,
        selectedOptions: sel.selectedOptions,
      }));

      return [...withoutBundle, ...newItems];
    });
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) =>
      prev.filter((item) => generateCartKey(item.menuItem.id, item.selectedOptions) !== cartKey)
    );
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter((item) => generateCartKey(item.menuItem.id, item.selectedOptions) !== cartKey)
      );
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        generateCartKey(item.menuItem.id, item.selectedOptions) === cartKey
          ? { ...item, quantity }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setFoodtruckId(null);
  }, []);

  const setFoodtruck = useCallback((id: string) => {
    setFoodtruckId((prevFoodtruckId) => {
      if (prevFoodtruckId !== id) {
        if (prevFoodtruckId !== null) {
          setItems([]);
        } else {
          // First load — clear only if items belong to a different foodtruck
          setItems((prevItems) =>
            prevItems.some((item) => item.menuItem.foodtruck_id !== id) ? [] : prevItems
          );
        }
      }
      return id;
    });
  }, []);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (item.bundleInfo) {
          return sum + calculateBundlePrice(item.bundleInfo, item.quantity).total;
        }
        const unitPrice = computeCartItemUnitPrice(item.menuItem.price, item.selectedOptions);
        return sum + unitPrice * item.quantity;
      }, 0),
    [items]
  );

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      foodtruckId,
      addItem,
      addBundleItem,
      decomposeBundleItem,
      removeItem,
      updateQuantity,
      clearCart,
      setFoodtruck,
      total,
      itemCount,
      getCartKey,
    }),
    [
      items,
      foodtruckId,
      addItem,
      addBundleItem,
      decomposeBundleItem,
      removeItem,
      updateQuantity,
      clearCart,
      setFoodtruck,
      total,
      itemCount,
      getCartKey,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

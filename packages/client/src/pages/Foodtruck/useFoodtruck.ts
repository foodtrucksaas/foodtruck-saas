import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Foodtruck,
  MenuItem,
  Category,
  Schedule,
  Location,
  CategoryOptionGroup,
  CategoryOption,
  SelectedOption,
  Offer,
  BundleConfig,
  BuyXGetYConfig,
} from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';

export interface ScheduleWithLocation extends Schedule {
  location: Location;
}

export interface TodayException {
  is_closed: boolean;
  location?: Location | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface CategoryOptionGroupWithOptions extends CategoryOptionGroup {
  category_options: CategoryOption[];
}

export interface CategoryWithOptions extends Category {
  category_option_groups?: CategoryOptionGroupWithOptions[];
}

// Bundle offer with category choice config
export interface BundleOffer extends Offer {
  config: BundleConfig;
}

// Bundle item for specific_items bundles
export interface BundleOfferItem {
  id: string;
  menu_item_id: string;
  quantity: number;
}

// Specific items bundle offer
export interface SpecificItemsBundleOffer extends Offer {
  config: BundleConfig;
  offer_items: BundleOfferItem[];
}

// Buy X Get Y offer
export interface BuyXGetYOffer extends Offer {
  config: BuyXGetYConfig;
}

interface UseFoodtruckResult {
  // Data
  foodtruck: Foodtruck | null;
  categories: CategoryWithOptions[];
  menuItems: MenuItem[];
  schedules: ScheduleWithLocation[];
  bundles: BundleOffer[];
  specificItemsBundles: SpecificItemsBundleOffer[];
  buyXGetYOffers: BuyXGetYOffer[];
  loading: boolean;

  // Active tab
  activeTab: 'menu' | 'info';
  setActiveTab: (tab: 'menu' | 'info') => void;

  // Options modal state
  selectedMenuItem: MenuItem | null;
  selectedCategory: CategoryWithOptions | null;
  showOptionsModal: boolean;

  // Bundle modal state
  selectedBundle: BundleOffer | null;
  showBundleModal: boolean;

  // Specific items bundle modal state
  selectedSpecificBundle: SpecificItemsBundleOffer | null;
  showSpecificBundleModal: boolean;

  // Buy X Get Y modal state
  selectedBuyXGetY: BuyXGetYOffer | null;
  showBuyXGetYModal: boolean;

  // Computed values
  todaySchedules: ScheduleWithLocation[];
  todaySchedule: ScheduleWithLocation | undefined;
  groupedItems: Record<string, MenuItem[]>;
  dailySpecials: MenuItem[];

  // Cart data
  items: ReturnType<typeof useCart>['items'];
  total: number;
  itemCount: number;

  // Handlers
  getCategoryOptions: (categoryId: string | null) => CategoryWithOptions | null;
  getItemQuantity: (itemId: string) => number;
  handleAddItem: (item: MenuItem) => void;
  handleOptionsConfirm: (selectedOptions: SelectedOption[], quantity: number, notes?: string) => void;
  handleUpdateQuantity: (itemId: string, delta: number) => void;
  closeOptionsModal: () => void;
  navigateBack: () => void;

  // Bundle handlers
  handleSelectBundle: (bundle: BundleOffer) => void;
  handleBundleConfirm: (bundleSelections: BundleSelection[]) => void;
  closeBundleModal: () => void;

  // Specific items bundle handlers
  handleSelectSpecificBundle: (bundle: SpecificItemsBundleOffer) => void;
  handleSpecificBundleConfirm: (bundleSelections: BundleSelection[]) => void;
  closeSpecificBundleModal: () => void;

  // Buy X Get Y handlers
  handleSelectBuyXGetY: (offer: BuyXGetYOffer) => void;
  handleBuyXGetYConfirm: (items: { menuItem: MenuItem; selectedOptions: SelectedOption[]; isFree: boolean }[]) => void;
  closeBuyXGetYModal: () => void;
}

// Bundle selection (one item per category)
export interface BundleSelection {
  categoryId: string;
  menuItem: MenuItem;
  selectedOptions: SelectedOption[];
  supplement: number; // Bundle supplement price in cents
}

export function useFoodtruck(foodtruckId: string | undefined): UseFoodtruckResult {
  const navigate = useNavigate();
  const { items, addItem, addBundleItem, updateQuantity, setFoodtruck, total, itemCount, getCartKey } = useCart();

  const [foodtruck, setFoodtruckData] = useState<Foodtruck | null>(null);
  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithLocation[]>([]);
  const [bundles, setBundles] = useState<BundleOffer[]>([]);
  const [specificItemsBundles, setSpecificItemsBundles] = useState<SpecificItemsBundleOffer[]>([]);
  const [buyXGetYOffers, setBuyXGetYOffers] = useState<BuyXGetYOffer[]>([]);
  const [todayException, setTodayException] = useState<TodayException | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'info'>('menu');

  // Options modal state
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithOptions | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Bundle modal state
  const [selectedBundle, setSelectedBundle] = useState<BundleOffer | null>(null);
  const [showBundleModal, setShowBundleModal] = useState(false);

  // Specific items bundle modal state
  const [selectedSpecificBundle, setSelectedSpecificBundle] = useState<SpecificItemsBundleOffer | null>(null);
  const [showSpecificBundleModal, setShowSpecificBundleModal] = useState(false);

  // Buy X Get Y modal state
  const [selectedBuyXGetY, setSelectedBuyXGetY] = useState<BuyXGetYOffer | null>(null);
  const [showBuyXGetYModal, setShowBuyXGetYModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!foodtruckId) return;

      // Fetch foodtruck data
      const foodtruckRes = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('id', foodtruckId)
        .single();

      const foodtruckData = foodtruckRes.data as Foodtruck | null;
      if (foodtruckData) {
        setFoodtruckData(foodtruckData);
        setFoodtruck(foodtruckData.id);
      }

      // Fetch other data in parallel
      const todayStr = formatLocalDate(new Date());
      const now = new Date().toISOString();
      const [categoriesRes, menuRes, schedulesRes, exceptionRes, bundlesRes, buyXGetYRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*, category_option_groups(*, category_options(*))')
          .eq('foodtruck_id', foodtruckId)
          .order('display_order'),
        supabase
          .from('menu_items')
          .select('*')
          .eq('foodtruck_id', foodtruckId)
          .eq('is_available', true)
          .or('is_archived.is.null,is_archived.eq.false')
          .order('display_order'),
        supabase
          .from('schedules')
          .select('*, location:locations(*)')
          .eq('foodtruck_id', foodtruckId)
          .eq('is_active', true)
          .order('day_of_week'),
        supabase
          .from('schedule_exceptions')
          .select('*, location:locations(*)')
          .eq('foodtruck_id', foodtruckId)
          .gte('date', todayStr)
          .order('date'),
        // Fetch active bundle offers (with offer_items for specific_items bundles)
        supabase
          .from('offers')
          .select('*, offer_items(id, menu_item_id, quantity)')
          .eq('foodtruck_id', foodtruckId)
          .eq('offer_type', 'bundle')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`),
        // Fetch active buy_x_get_y offers (category_choice type only)
        supabase
          .from('offers')
          .select('*')
          .eq('foodtruck_id', foodtruckId)
          .eq('offer_type', 'buy_x_get_y')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`),
      ]);

      setCategories((categoriesRes.data as CategoryWithOptions[]) || []);
      setMenuItems((menuRes.data as MenuItem[]) || []);
      setSchedules((schedulesRes.data as ScheduleWithLocation[]) || []);

      // Separate bundles by type
      const allBundles = (bundlesRes.data || []) as unknown as (BundleOffer & { offer_items?: BundleOfferItem[] })[];

      // Category choice bundles
      const categoryChoiceBundles = allBundles.filter(
        (b) => b.config?.type === 'category_choice' && b.config?.bundle_categories?.length
      );
      setBundles(categoryChoiceBundles);

      // Specific items bundles
      const specificBundles = allBundles
        .filter((b) => b.config?.type === 'specific_items' && b.offer_items && b.offer_items.length > 0)
        .map((b) => ({
          ...b,
          offer_items: b.offer_items!.filter(item => item.menu_item_id),
        })) as SpecificItemsBundleOffer[];
      setSpecificItemsBundles(specificBundles);

      // Buy X Get Y offers (only category_choice type for modal selection)
      const buyXGetYData = (buyXGetYRes.data || []) as unknown as BuyXGetYOffer[];
      const categoryChoiceBuyXGetY = buyXGetYData.filter(
        (o) => o.config?.type === 'category_choice' &&
               o.config?.trigger_category_ids?.length &&
               o.config?.reward_category_ids?.length
      );
      setBuyXGetYOffers(categoryChoiceBuyXGetY);

      // Find today's exception from the list
      const exceptions = exceptionRes.data || [];
      const todayExc = exceptions.find((e: { date: string }) => e.date === todayStr);
      if (todayExc) {
        setTodayException({
          is_closed: todayExc.is_closed ?? false,
          location: todayExc.location,
          start_time: todayExc.start_time,
          end_time: todayExc.end_time,
        });
      }

      setLoading(false);
    }

    fetchData();
  }, [foodtruckId, setFoodtruck]);

  const getCategoryOptions = useCallback((categoryId: string | null) => {
    if (!categoryId) return null;
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.category_option_groups) return null;

    const hasAvailableOptions = category.category_option_groups.some(
      (g) => g.category_options?.some((o) => o.is_available)
    );
    return hasAvailableOptions ? category : null;
  }, [categories]);

  const getItemQuantity = useCallback((itemId: string) => {
    // For items without options, get total quantity
    const cartItems = items.filter((item) => item.menuItem.id === itemId);
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const handleAddItem = useCallback((item: MenuItem) => {
    const categoryWithOptions = getCategoryOptions(item.category_id);

    if (categoryWithOptions) {
      setSelectedMenuItem(item);
      setSelectedCategory(categoryWithOptions);
      setShowOptionsModal(true);
    } else {
      addItem(item, 1);
    }
  }, [getCategoryOptions, addItem]);

  const handleOptionsConfirm = useCallback((selectedOptions: SelectedOption[], quantity: number, notes?: string) => {
    if (selectedMenuItem) {
      addItem(selectedMenuItem, quantity, notes, selectedOptions);
      setShowOptionsModal(false);
      setSelectedMenuItem(null);
      setSelectedCategory(null);
    }
  }, [selectedMenuItem, addItem]);

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    // For simple items without options, find by menuItem.id
    const cartItem = items.find((item) => item.menuItem.id === itemId && !item.selectedOptions?.length);
    if (cartItem) {
      const cartKey = getCartKey(itemId, cartItem.selectedOptions);
      updateQuantity(cartKey, cartItem.quantity + delta);
    }
  }, [items, getCartKey, updateQuantity]);

  const closeOptionsModal = useCallback(() => {
    setShowOptionsModal(false);
    setSelectedMenuItem(null);
    setSelectedCategory(null);
  }, []);

  const navigateBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Bundle handlers
  const handleSelectBundle = useCallback((bundle: BundleOffer) => {
    setSelectedBundle(bundle);
    setShowBundleModal(true);
  }, []);

  const handleBundleConfirm = useCallback((bundleSelections: BundleSelection[]) => {
    if (!selectedBundle) return;

    // Create bundle cart info from selections
    const bundleCartInfo = {
      bundleId: selectedBundle.id,
      bundleName: selectedBundle.name,
      fixedPrice: selectedBundle.config.fixed_price,
      freeOptions: selectedBundle.config.free_options || false,
      selections: bundleSelections.map(sel => {
        const category = categories.find(c => c.id === sel.categoryId);
        return {
          categoryId: sel.categoryId,
          categoryName: category?.name || '',
          menuItem: sel.menuItem,
          selectedOptions: sel.selectedOptions,
          supplement: sel.supplement,
        };
      }),
    };

    // Add bundle to cart
    addBundleItem(bundleCartInfo, 1);

    setShowBundleModal(false);
    setSelectedBundle(null);
  }, [selectedBundle, categories, addBundleItem]);

  const closeBundleModal = useCallback(() => {
    setShowBundleModal(false);
    setSelectedBundle(null);
  }, []);

  // Specific items bundle handlers
  const handleSelectSpecificBundle = useCallback((bundle: SpecificItemsBundleOffer) => {
    setSelectedSpecificBundle(bundle);
    setShowSpecificBundleModal(true);
  }, []);

  const handleSpecificBundleConfirm = useCallback((bundleSelections: BundleSelection[]) => {
    if (!selectedSpecificBundle) return;

    // Create bundle cart info from selections
    const bundleCartInfo = {
      bundleId: selectedSpecificBundle.id,
      bundleName: selectedSpecificBundle.name,
      fixedPrice: selectedSpecificBundle.config.fixed_price,
      freeOptions: selectedSpecificBundle.config.free_options || false,
      selections: bundleSelections.map(sel => {
        const category = categories.find(c => c.id === sel.categoryId);
        return {
          categoryId: sel.categoryId,
          categoryName: category?.name || '',
          menuItem: sel.menuItem,
          selectedOptions: sel.selectedOptions,
          supplement: sel.supplement,
        };
      }),
    };

    // Add bundle to cart
    addBundleItem(bundleCartInfo, 1);

    setShowSpecificBundleModal(false);
    setSelectedSpecificBundle(null);
  }, [selectedSpecificBundle, categories, addBundleItem]);

  const closeSpecificBundleModal = useCallback(() => {
    setShowSpecificBundleModal(false);
    setSelectedSpecificBundle(null);
  }, []);

  // Buy X Get Y handlers
  const handleSelectBuyXGetY = useCallback((offer: BuyXGetYOffer) => {
    setSelectedBuyXGetY(offer);
    setShowBuyXGetYModal(true);
  }, []);

  const handleBuyXGetYConfirm = useCallback((selectedItems: { menuItem: MenuItem; selectedOptions: SelectedOption[]; isFree: boolean }[]) => {
    if (!selectedBuyXGetY) return;

    // Add all selected items to cart
    selectedItems.forEach(({ menuItem, selectedOptions }) => {
      addItem(menuItem, 1, undefined, selectedOptions);
    });

    setShowBuyXGetYModal(false);
    setSelectedBuyXGetY(null);
  }, [selectedBuyXGetY, addItem]);

  const closeBuyXGetYModal = useCallback(() => {
    setShowBuyXGetYModal(false);
    setSelectedBuyXGetY(null);
  }, []);

  // Get all schedules for today (considering exceptions)
  const todaySchedules = useMemo(() => {
    // If there's an exception for today
    if (todayException) {
      // If exception says closed, return empty
      if (todayException.is_closed) {
        return [];
      }
      // If exception opens the day with custom hours/location
      if (todayException.location && todayException.start_time && todayException.end_time) {
        return [{
          id: 'exception-today',
          foodtruck_id: foodtruck?.id || '',
          location_id: todayException.location.id,
          day_of_week: new Date().getDay(),
          start_time: todayException.start_time,
          end_time: todayException.end_time,
          is_active: true,
          location: todayException.location,
        } as ScheduleWithLocation];
      }
    }

    // No exception, use recurring schedules
    const today = new Date().getDay();
    return schedules
      .filter((s) => s.day_of_week === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules, todayException, foodtruck?.id]);

  const todaySchedule = todaySchedules[0];

  const groupedItems = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category.id] = menuItems.filter((item) => item.category_id === category.id);
        return acc;
      },
      {} as Record<string, MenuItem[]>
    );
  }, [categories, menuItems]);

  const dailySpecials = useMemo(() => {
    return menuItems.filter((item) => item.is_daily_special);
  }, [menuItems]);

  return {
    // Data
    foodtruck,
    categories,
    menuItems,
    schedules,
    bundles,
    specificItemsBundles,
    buyXGetYOffers,
    loading,

    // Active tab
    activeTab,
    setActiveTab,

    // Options modal state
    selectedMenuItem,
    selectedCategory,
    showOptionsModal,

    // Bundle modal state
    selectedBundle,
    showBundleModal,

    // Specific items bundle modal state
    selectedSpecificBundle,
    showSpecificBundleModal,

    // Buy X Get Y modal state
    selectedBuyXGetY,
    showBuyXGetYModal,

    // Computed values
    todaySchedules,
    todaySchedule,
    groupedItems,
    dailySpecials,

    // Cart data
    items,
    total,
    itemCount,

    // Handlers
    getCategoryOptions,
    getItemQuantity,
    handleAddItem,
    handleOptionsConfirm,
    handleUpdateQuantity,
    closeOptionsModal,
    navigateBack,

    // Bundle handlers
    handleSelectBundle,
    handleBundleConfirm,
    closeBundleModal,

    // Specific items bundle handlers
    handleSelectSpecificBundle,
    handleSpecificBundleConfirm,
    closeSpecificBundleModal,

    // Buy X Get Y handlers
    handleSelectBuyXGetY,
    handleBuyXGetYConfirm,
    closeBuyXGetYModal,
  };
}

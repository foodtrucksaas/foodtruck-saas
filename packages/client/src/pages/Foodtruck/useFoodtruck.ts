import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type {
  Foodtruck,
  MenuItem,
  Category,
  Schedule,
  Location,
  CategoryOptionGroup,
  CategoryOption,
  SelectedOption,
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

interface UseFoodtruckResult {
  // Data
  foodtruck: Foodtruck | null;
  categories: CategoryWithOptions[];
  menuItems: MenuItem[];
  schedules: ScheduleWithLocation[];
  loading: boolean;
  error: string | null;

  // Active tab
  activeTab: 'menu' | 'offers' | 'info';
  setActiveTab: (tab: 'menu' | 'offers' | 'info') => void;

  // Options modal state
  selectedMenuItem: MenuItem | null;
  selectedCategory: CategoryWithOptions | null;
  showOptionsModal: boolean;

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
}

export function useFoodtruck(foodtruckId: string | undefined): UseFoodtruckResult {
  const navigate = useNavigate();
  const { items, addItem, updateQuantity, setFoodtruck, total, itemCount, getCartKey } = useCart();

  const [foodtruck, setFoodtruckData] = useState<Foodtruck | null>(null);
  const [categories, setCategories] = useState<CategoryWithOptions[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithLocation[]>([]);
  const [todayException, setTodayException] = useState<TodayException | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'offers' | 'info'>('menu');

  // Options modal state
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithOptions | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!foodtruckId) return;

      setError(null);

      try {
        // Fetch foodtruck data - select only needed fields
        const foodtruckRes = await supabase
          .from('foodtrucks')
          .select('id, user_id, name, description, cuisine_types, logo_url, cover_image_url, phone, email, website_url, instagram_url, facebook_url, tiktok_url, siret, payment_methods, show_menu_photos, is_mobile, loyalty_enabled, loyalty_points_per_euro, loyalty_threshold, loyalty_reward, order_slot_interval, max_orders_per_slot')
          .eq('id', foodtruckId)
          .single();

        if (foodtruckRes.error) {
          console.error('Erreur lors du chargement du food truck:', foodtruckRes.error);
          if (foodtruckRes.error.code === 'PGRST116') {
            setError('Ce food truck n\'existe pas ou n\'est plus disponible.');
          } else {
            setError('Impossible de charger les informations. Veuillez reessayer.');
          }
          setLoading(false);
          return;
        }

        const foodtruckData = foodtruckRes.data as Foodtruck | null;
        if (foodtruckData) {
          setFoodtruckData(foodtruckData);
          setFoodtruck(foodtruckData.id);
        }

        // Fetch other data in parallel
        const todayStr = formatLocalDate(new Date());
        const [categoriesRes, menuRes, schedulesRes, exceptionRes] = await Promise.all([
          supabase
            .from('categories')
            .select('*, category_option_groups(*, category_options(*))')
            .eq('foodtruck_id', foodtruckId)
            .order('display_order'),
          supabase
            .from('menu_items')
            .select('id, foodtruck_id, category_id, name, description, price, image_url, allergens, is_available, is_daily_special, display_order, disabled_options, option_prices')
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
        ]);

        if (categoriesRes.error) {
          console.error('Erreur lors du chargement des categories:', categoriesRes.error);
        }
        if (menuRes.error) {
          console.error('Erreur lors du chargement du menu:', menuRes.error);
          toast.error('Impossible de charger le menu complet.');
        }

        setCategories((categoriesRes.data as CategoryWithOptions[]) || []);
        setMenuItems((menuRes.data as MenuItem[]) || []);
        setSchedules((schedulesRes.data as ScheduleWithLocation[]) || []);

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
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError('Probleme de connexion. Verifiez votre connexion internet et reessayez.');
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

  // Get all schedules for today (considering exceptions)
  const todaySchedules = useMemo(() => {
    const today = new Date().getDay();
    const regularSchedules = schedules
      .filter((s) => s.day_of_week === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

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
          day_of_week: today,
          start_time: todayException.start_time,
          end_time: todayException.end_time,
          is_active: true,
          location: todayException.location,
        } as ScheduleWithLocation];
      }
      // Exception with is_closed: false but no full details
      // Use regular schedules if available, otherwise create a placeholder
      if (regularSchedules.length > 0) {
        return regularSchedules;
      }
      // No regular schedules - create a placeholder to show as "open"
      // This happens when opening on a normally closed day without specifying location
      if (todayException.start_time && todayException.end_time) {
        return [{
          id: 'exception-today-no-location',
          foodtruck_id: foodtruck?.id || '',
          location_id: '',
          day_of_week: today,
          start_time: todayException.start_time,
          end_time: todayException.end_time,
          is_active: true,
          location: { id: '', foodtruck_id: foodtruck?.id || '', name: '', address: '', latitude: null, longitude: null, created_at: null },
        } as ScheduleWithLocation];
      }
    }

    // No exception, use recurring schedules
    return regularSchedules;
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
    loading,
    error,

    // Active tab
    activeTab,
    setActiveTab,

    // Options modal state
    selectedMenuItem,
    selectedCategory,
    showOptionsModal,

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
  };
}

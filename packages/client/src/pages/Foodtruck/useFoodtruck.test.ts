import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Foodtruck, MenuItem, Location, CartItem } from '@foodtruck/shared';
import { useFoodtruck, type ScheduleWithLocation, type CategoryWithOptions } from './useFoodtruck';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock applyTheme
vi.mock('@foodtruck/shared', async () => {
  const actual = await vi.importActual('@foodtruck/shared');
  return {
    ...actual,
    applyTheme: vi.fn(),
    formatLocalDate: () => '2024-01-15',
  };
});

// Mock CartContext
const mockAddItem = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockSetFoodtruck = vi.fn();
const mockGetCartKey = vi.fn((itemId: string, options?: unknown[]) => {
  if (!options || options.length === 0) return itemId;
  return `${itemId}:options`;
});

const mockCartItems: CartItem[] = [];

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    items: mockCartItems,
    addItem: mockAddItem,
    updateQuantity: mockUpdateQuantity,
    setFoodtruck: mockSetFoodtruck,
    total: 0,
    itemCount: 0,
    getCartKey: mockGetCartKey,
  }),
}));

describe('useFoodtruck', () => {
  const mockFoodtruckData: Foodtruck = {
    id: 'ft-1',
    user_id: 'user-1',
    name: 'Test Foodtruck',
    description: 'A test foodtruck',
    cuisine_types: ['burger'],
    is_mobile: true,
    show_menu_photos: true,
    theme: null,
    logo_url: null,
    cover_image_url: null,
    phone: null,
    email: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    loyalty_enabled: false,
    loyalty_points_per_euro: 1,
    loyalty_threshold: 50,
    loyalty_reward: 500,
    loyalty_allow_multiple: true,
    auto_accept_orders: false,
    max_orders_per_slot: null,
    order_slot_interval: 15,
    show_order_popup: true,
    use_ready_status: false,
    allow_advance_orders: true,
    advance_order_days: 7,
    allow_asap_orders: false,
    min_preparation_time: 15,
    send_confirmation_email: true,
    send_reminder_email: false,
    offers_stackable: false,
    promo_codes_stackable: true,
    facebook_url: null,
    instagram_url: null,
    tiktok_url: null,
    website_url: null,
    is_active: true,
    payment_methods: null,
    siret: null,
    show_promo_section: false,
    stripe_account_id: null,
    stripe_onboarding_complete: false,
  };

  const mockLocations: Location[] = [
    { id: 'loc-1', foodtruck_id: 'ft-1', name: 'Marche Central', address: '1 Place du Marche', latitude: 48.8566, longitude: 2.3522, created_at: '2024-01-01' },
  ];

  const mockCategories: CategoryWithOptions[] = [
    {
      id: 'cat-1',
      foodtruck_id: 'ft-1',
      name: 'Burgers',
      display_order: 0,
      created_at: '2024-01-01',
      category_option_groups: [
        {
          id: 'group-1',
          category_id: 'cat-1',
          name: 'Taille',
          is_required: true,
          is_multiple: false,
          display_order: 0,
          created_at: '2024-01-01',
          category_options: [
            { id: 'opt-1', option_group_id: 'group-1', name: 'Normal', price_modifier: 0, is_available: true, is_default: true, display_order: 0, created_at: '2024-01-01' },
            { id: 'opt-2', option_group_id: 'group-1', name: 'XL', price_modifier: 200, is_available: true, is_default: false, display_order: 1, created_at: '2024-01-01' },
          ],
        },
      ],
    },
    {
      id: 'cat-2',
      foodtruck_id: 'ft-1',
      name: 'Boissons',
      display_order: 1,
      created_at: '2024-01-01',
      category_option_groups: [],
    },
  ];

  const mockMenuItems: MenuItem[] = [
    {
      id: 'item-1',
      foodtruck_id: 'ft-1',
      category_id: 'cat-1',
      name: 'Classic Burger',
      description: 'Le burger classique',
      price: 1200,
      is_available: true,
      is_daily_special: false,
      allergens: ['gluten'],
      display_order: 0,
      created_at: '2024-01-01',
      image_url: null,
      is_archived: false,
      disabled_options: null,
      option_prices: null,
      updated_at: null,
    },
    {
      id: 'item-2',
      foodtruck_id: 'ft-1',
      category_id: 'cat-2',
      name: 'Coca-Cola',
      description: null,
      price: 300,
      is_available: true,
      is_daily_special: true,
      allergens: [],
      display_order: 0,
      created_at: '2024-01-01',
      image_url: null,
      is_archived: false,
      disabled_options: null,
      option_prices: null,
      updated_at: null,
    },
  ];

  const mockSchedules: ScheduleWithLocation[] = [
    {
      id: 'sched-1',
      foodtruck_id: 'ft-1',
      location_id: 'loc-1',
      day_of_week: new Date().getDay(),
      start_time: '11:00',
      end_time: '14:00',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      location: mockLocations[0],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'foodtrucks') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockFoodtruckData, error: null }),
            }),
          }),
        };
      }
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
                or: () => ({
                  order: () => Promise.resolve({ data: mockMenuItems, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'schedules') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockSchedules, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'schedule_exceptions') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'offers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  or: () => ({
                    or: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch foodtruck data', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.foodtruck).toEqual(mockFoodtruckData);
    });

    it('should fetch categories', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(2);
    });

    it('should fetch menu items', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.menuItems).toHaveLength(2);
    });

    it('should fetch schedules', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toHaveLength(1);
    });

    it('should set foodtruck in cart context', async () => {
      renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(mockSetFoodtruck).toHaveBeenCalledWith('ft-1');
      });
    });

    it('should not fetch if foodtruckId is undefined', async () => {
      const { result } = renderHook(() => useFoodtruck(undefined));

      expect(result.current.loading).toBe(true);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('activeTab', () => {
    it('should initialize with menu tab', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      expect(result.current.activeTab).toBe('menu');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should switch to info tab', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setActiveTab('info');
      });

      expect(result.current.activeTab).toBe('info');
    });
  });

  describe('groupedItems', () => {
    it('should group items by category', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groupedItems['cat-1']).toHaveLength(1);
      expect(result.current.groupedItems['cat-1'][0].name).toBe('Classic Burger');
      expect(result.current.groupedItems['cat-2']).toHaveLength(1);
      expect(result.current.groupedItems['cat-2'][0].name).toBe('Coca-Cola');
    });
  });

  describe('dailySpecials', () => {
    it('should filter daily specials', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dailySpecials).toHaveLength(1);
      expect(result.current.dailySpecials[0].name).toBe('Coca-Cola');
    });
  });

  describe('todaySchedules', () => {
    it('should filter schedules for today', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.todaySchedules).toHaveLength(1);
    });

    it('should set todaySchedule to first schedule', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.todaySchedule).toBeDefined();
      expect(result.current.todaySchedule?.location.name).toBe('Marche Central');
    });
  });

  describe('getCategoryOptions', () => {
    it('should return category with options', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const category = result.current.getCategoryOptions('cat-1');
      expect(category).not.toBeNull();
      expect(category?.name).toBe('Burgers');
    });

    it('should return null for category without options', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const category = result.current.getCategoryOptions('cat-2');
      expect(category).toBeNull();
    });

    it('should return null for null categoryId', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const category = result.current.getCategoryOptions(null);
      expect(category).toBeNull();
    });
  });

  describe('getItemQuantity', () => {
    it('should return quantity for item in cart', async () => {
      mockCartItems.push({
        menuItem: mockMenuItems[0],
        quantity: 2,
      });

      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const quantity = result.current.getItemQuantity('item-1');
      expect(quantity).toBe(2);

      // Cleanup
      mockCartItems.length = 0;
    });

    it('should return 0 for item not in cart', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const quantity = result.current.getItemQuantity('non-existent');
      expect(quantity).toBe(0);
    });
  });

  describe('handleAddItem', () => {
    it('should add item directly if no options required', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleAddItem(mockMenuItems[1]);
      });

      expect(mockAddItem).toHaveBeenCalledWith(mockMenuItems[1], 1);
    });

    it('should open options modal if category has options', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleAddItem(mockMenuItems[0]);
      });

      expect(result.current.showOptionsModal).toBe(true);
      expect(result.current.selectedMenuItem).toEqual(mockMenuItems[0]);
      expect(result.current.selectedCategory).not.toBeNull();
    });
  });

  describe('handleOptionsConfirm', () => {
    it('should add item with options and close modal', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First open options modal
      act(() => {
        result.current.handleAddItem(mockMenuItems[0]);
      });

      const selectedOptions = [
        { optionId: 'opt-1', name: 'Normal', optionGroupId: 'group-1', groupName: 'Taille', priceModifier: 0, isSizeOption: true },
      ];

      act(() => {
        result.current.handleOptionsConfirm(selectedOptions, 2, 'Extra sauce');
      });

      expect(mockAddItem).toHaveBeenCalledWith(mockMenuItems[0], 2, 'Extra sauce', selectedOptions);
      expect(result.current.showOptionsModal).toBe(false);
      expect(result.current.selectedMenuItem).toBeNull();
    });
  });

  describe('handleUpdateQuantity', () => {
    it('should update quantity for item in cart', async () => {
      mockCartItems.push({
        menuItem: mockMenuItems[1],
        quantity: 1,
      });

      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleUpdateQuantity('item-2', 1);
      });

      expect(mockUpdateQuantity).toHaveBeenCalledWith('item-2', 2);

      // Cleanup
      mockCartItems.length = 0;
    });
  });

  describe('closeOptionsModal', () => {
    it('should close modal and reset state', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First open modal
      act(() => {
        result.current.handleAddItem(mockMenuItems[0]);
      });

      expect(result.current.showOptionsModal).toBe(true);

      act(() => {
        result.current.closeOptionsModal();
      });

      expect(result.current.showOptionsModal).toBe(false);
      expect(result.current.selectedMenuItem).toBeNull();
      expect(result.current.selectedCategory).toBeNull();
    });
  });

  describe('navigateBack', () => {
    it('should call navigate with -1', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.navigateBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('bundles and offers', () => {
    it('should initialize with empty bundles', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bundles).toEqual([]);
      expect(result.current.specificItemsBundles).toEqual([]);
      expect(result.current.buyXGetYOffers).toEqual([]);
    });
  });

  describe('cart data', () => {
    it('should return cart data from context', async () => {
      const { result } = renderHook(() => useFoodtruck('ft-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });
  });
});

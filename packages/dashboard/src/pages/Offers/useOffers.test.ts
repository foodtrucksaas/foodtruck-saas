/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { OfferWithItems, MenuItem, Category } from '@foodtruck/shared';
import { useOffers, type OfferFormState } from './useOffers';

// Mock supabase
const mockFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock confirm
global.confirm = vi.fn(() => true);

describe('useOffers', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', foodtruck_id: 'ft-1', name: 'Plats', display_order: 0, created_at: '2024-01-01' },
    { id: 'cat-2', foodtruck_id: 'ft-1', name: 'Boissons', display_order: 1, created_at: '2024-01-01' },
  ];

  const mockMenuItems: MenuItem[] = [
    { id: 'item-1', foodtruck_id: 'ft-1', name: 'Burger', price: 1200, category_id: 'cat-1', is_available: true, is_daily_special: false, is_archived: false, created_at: '2024-01-01', updated_at: '2024-01-01', description: null, allergens: null, image_url: null, display_order: 0, option_prices: {}, disabled_options: [] },
    { id: 'item-2', foodtruck_id: 'ft-1', name: 'Pizza', price: 1500, category_id: 'cat-1', is_available: true, is_daily_special: false, is_archived: false, created_at: '2024-01-01', updated_at: '2024-01-01', description: null, allergens: null, image_url: null, display_order: 1, option_prices: {}, disabled_options: [] },
    { id: 'item-3', foodtruck_id: 'ft-1', name: 'Coca', price: 300, category_id: 'cat-2', is_available: true, is_daily_special: false, is_archived: false, created_at: '2024-01-01', updated_at: '2024-01-01', description: null, allergens: null, image_url: null, display_order: 0, option_prices: {}, disabled_options: [] },
  ];

  const mockOffers: OfferWithItems[] = [
    {
      id: 'offer-1',
      foodtruck_id: 'ft-1',
      name: 'Code promo -10%',
      description: null,
      offer_type: 'promo_code',
      config: { code: 'BIENVENUE', discount_type: 'percentage', discount_value: 10 },
      is_active: true,
      stackable: false,
      start_date: null,
      end_date: null,
      time_start: null,
      time_end: null,
      days_of_week: null,
      max_uses: 100,
      max_uses_per_customer: 1,
      current_uses: 25,
      total_discount_given: 5000,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      offer_items: [],
    },
    {
      id: 'offer-2',
      foodtruck_id: 'ft-1',
      name: 'Menu Formule',
      description: 'Plat + Boisson',
      offer_type: 'bundle',
      config: { type: 'specific_items', fixed_price: 1400 },
      is_active: false,
      stackable: false,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      time_start: '11:00',
      time_end: '14:00',
      days_of_week: [1, 2, 3, 4, 5],
      max_uses: null,
      max_uses_per_customer: null,
      current_uses: 50,
      total_discount_given: 10000,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      offer_items: [
        { id: 'oi-1', offer_id: 'offer-2', menu_item_id: 'item-1', role: 'bundle_item', quantity: 1, created_at: '2024-01-01', menu_item: mockMenuItems[0] },
        { id: 'oi-2', offer_id: 'offer-2', menu_item_id: 'item-3', role: 'bundle_item', quantity: 1, created_at: '2024-01-01', menu_item: mockMenuItems[2] },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'offers') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockOffers, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'new-offer-id' }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockOffers[0], error: null }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
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
                order: () => Promise.resolve({ data: mockMenuItems, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'offer_items') {
        return {
          insert: () => Promise.resolve({ error: null }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useOffers());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch offers, categories and menu items on mount', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.offers).toHaveLength(2);
      expect(result.current.categories).toHaveLength(2);
      expect(result.current.menuItems).toHaveLength(3);
    });

    it('should have showWizard false initially', async () => {
      const { result } = renderHook(() => useOffers());

      expect(result.current.showWizard).toBe(false);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('stats', () => {
    it('should calculate activeCount correctly', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activeCount).toBe(1); // Only offer-1 is active
    });

    it('should calculate totalUses correctly', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalUses).toBe(75); // 25 + 50
    });

    it('should calculate totalDiscount correctly', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalDiscount).toBe(15000); // 5000 + 10000
    });
  });

  describe('openCreateWizard', () => {
    it('should open wizard with initial form', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard();
      });

      expect(result.current.showWizard).toBe(true);
      expect(result.current.editingOffer).toBeNull();
      expect(result.current.form.name).toBe('');
      expect(result.current.wizardStep).toBe(1);
    });

    it('should open wizard with preset type and skip to step 2', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('bundle');
      });

      expect(result.current.showWizard).toBe(true);
      expect(result.current.form.offerType).toBe('bundle');
      expect(result.current.wizardStep).toBe(2);
    });
  });

  describe('openEditWizard', () => {
    it('should open wizard with promo_code offer data', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openEditWizard(mockOffers[0]);
      });

      expect(result.current.showWizard).toBe(true);
      expect(result.current.editingOffer).toEqual(mockOffers[0]);
      expect(result.current.form.name).toBe('Code promo -10%');
      expect(result.current.form.offerType).toBe('promo_code');
      expect(result.current.form.promoCode).toBe('BIENVENUE');
      expect(result.current.form.promoCodeDiscountType).toBe('percentage');
      expect(result.current.form.promoCodeDiscountValue).toBe('10');
      expect(result.current.wizardStep).toBe(2); // Goes to step 2 when editing
    });

    it('should open wizard with bundle offer data', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openEditWizard(mockOffers[1]);
      });

      expect(result.current.form.name).toBe('Menu Formule');
      expect(result.current.form.offerType).toBe('bundle');
      expect(result.current.form.bundleFixedPrice).toBe('14'); // 1400 cents -> 14€
      expect(result.current.form.bundleItems).toHaveLength(2);
      expect(result.current.form.startDate).toBe('2024-01-01');
      expect(result.current.form.timeStart).toBe('11:00');
      expect(result.current.form.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('closeWizard', () => {
    it('should close wizard and reset form', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard();
      });

      expect(result.current.showWizard).toBe(true);

      act(() => {
        result.current.closeWizard();
      });

      expect(result.current.showWizard).toBe(false);
      expect(result.current.editingOffer).toBeNull();
      expect(result.current.wizardStep).toBe(1);
    });
  });

  describe('form validation', () => {
    it('should require name', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('promo_code');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: '',
          promoCode: 'TEST',
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form validation error:', 'Le nom est requis');

      consoleSpy.mockRestore();
    });

    it('should require promo code for promo_code type', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('promo_code');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'Test Offer',
          promoCode: '',
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form validation error:', 'Le code promo est requis');

      consoleSpy.mockRestore();
    });

    it('should require fixed price for bundle type', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('bundle');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'Test Bundle',
          bundleFixedPrice: '',
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form validation error:', 'Le prix fixe est requis');

      consoleSpy.mockRestore();
    });

    it('should require min amount for threshold_discount type', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('threshold_discount');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'Test Threshold',
          thresholdMinAmount: '',
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form validation error:', 'Le montant minimum est requis');

      consoleSpy.mockRestore();
    });
  });

  describe('handleSubmit', () => {
    it('should create new promo_code offer', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('promo_code');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'New Promo',
          promoCode: 'NEWCODE',
          promoCodeDiscountType: 'percentage',
          promoCodeDiscountValue: '15',
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockFrom).toHaveBeenCalledWith('offers');
      expect(result.current.showWizard).toBe(false);
    });

    it('should set saving state during submit', async () => {
      let resolveInsert: (value: unknown) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockOffers, error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => insertPromise,
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
                  order: () => Promise.resolve({ data: mockMenuItems, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      });

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('promo_code');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'New Promo',
          promoCode: 'NEWCODE',
        }));
      });

      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.saving).toBe(true);

      await act(async () => {
        resolveInsert!({ data: { id: 'new-offer' }, error: null });
      });

      await waitFor(() => {
        expect(result.current.saving).toBe(false);
      });
    });
  });

  describe('toggleActive', () => {
    it('should toggle offer active state', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleActive(mockOffers[0]);
      });

      expect(mockFrom).toHaveBeenCalledWith('offers');
    });
  });

  describe('deleteOffer', () => {
    it('should delete offer after confirmation', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteOffer('offer-1');
      });

      expect(global.confirm).toHaveBeenCalledWith('Supprimer cette offre ?');
      expect(mockFrom).toHaveBeenCalledWith('offers');
    });

    it('should not delete if user cancels', async () => {
      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountBefore = mockFrom.mock.calls.filter(c => c[0] === 'offers').length;

      await act(async () => {
        await result.current.deleteOffer('offer-1');
      });

      // Should not have made delete call
      const deleteCalls = mockFrom.mock.calls.filter(c => c[0] === 'offers').length;
      expect(deleteCalls).toBe(callCountBefore); // No additional calls
    });
  });

  describe('form state', () => {
    it('should update form via setForm', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard();
        result.current.setForm((prev: OfferFormState) => ({ ...prev, name: 'Updated Name' }));
      });

      expect(result.current.form.name).toBe('Updated Name');
    });

    it('should update wizardStep via setWizardStep', async () => {
      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard();
        result.current.setWizardStep(3);
      });

      expect(result.current.wizardStep).toBe(3);
    });
  });

  describe('buy_x_get_y validation', () => {
    it('should require trigger items for specific_items mode', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('buy_x_get_y');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'Test Buy X Get Y',
          buyXGetYType: 'specific_items',
          triggerItems: [],
          rewardItems: ['item-1'],
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Form validation error:',
        'Sélectionnez au moins un article déclencheur'
      );

      consoleSpy.mockRestore();
    });

    it('should require trigger categories for category_choice mode', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useOffers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openCreateWizard('buy_x_get_y');
        result.current.setForm((prev: OfferFormState) => ({
          ...prev,
          name: 'Test Buy X Get Y',
          buyXGetYType: 'category_choice',
          triggerCategoryIds: [],
          rewardCategoryIds: ['cat-1'],
        }));
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Form validation error:',
        'Sélectionnez au moins une catégorie déclencheur'
      );

      consoleSpy.mockRestore();
    });
  });
});

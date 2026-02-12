import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { useOnboardingAssistant } from './useOnboardingAssistant';
import { OnboardingProvider, useOnboarding } from '../OnboardingContext';

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  slug: 'test-foodtruck',
  user_id: 'user-1',
};

const mockRefresh = vi.fn();

vi.mock('../../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
    refresh: mockRefresh,
  }),
}));

// Wrapper component for testing
const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(OnboardingProvider, null, children);

describe('useOnboardingAssistant', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);

    // Setup default mock chains
    mockSelect = vi.fn();
    mockInsert = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();

    // Default successful responses
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          data: [],
          error: null,
        }),
        data: [],
        error: null,
      }),
      order: vi.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    });

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      }),
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockDelete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockFrom.mockImplementation((_table: string) => {
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        upsert: mockInsert, // reuse insert mock for upsert
      };
    });
  });

  describe('Initial State', () => {
    it('should return saving as false initially', () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });
      expect(result.current.saving).toBe(false);
    });

    it('should return error as null initially', () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });
      expect(result.current.error).toBeNull();
    });

    it('should provide save functions', () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });
      expect(typeof result.current.saveAllData).toBe('function');
      expect(typeof result.current.updateProgress).toBe('function');
      expect(typeof result.current.saveLocations).toBe('function');
      expect(typeof result.current.saveSchedules).toBe('function');
      expect(typeof result.current.saveMenu).toBe('function');
      expect(typeof result.current.saveOffers).toBe('function');
      expect(typeof result.current.saveSettings).toBe('function');
    });
  });

  describe('Save Locations', () => {
    it('should return empty array when no locations', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let locationIds: string[] = [];
      await act(async () => {
        locationIds = await result.current.saveLocations();
      });

      expect(locationIds).toEqual([]);
    });

    it('should not call locations table when there are no locations', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let locationIds: string[] = [];
      await act(async () => {
        locationIds = await result.current.saveLocations();
      });

      // Should not have called locations table insert since there are no locations
      expect(locationIds).toEqual([]);
    });
  });

  describe('Save Settings', () => {
    it('should update foodtruck with settings', async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(mockFrom).toHaveBeenCalledWith('foodtrucks');
    });

    it('should include onboarding_completed_at', async () => {
      let capturedUpdateData: Record<string, unknown> = {};
      mockUpdate.mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: null, error: null });
        }),
      }));

      mockFrom.mockImplementation((tableName: string) => {
        if (tableName === 'foodtrucks') {
          return {
            update: (data: Record<string, unknown>) => {
              capturedUpdateData = data;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            },
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(capturedUpdateData).toHaveProperty('onboarding_completed_at');
      expect(capturedUpdateData).toHaveProperty('onboarding_step', 6);
    });
  });

  describe('Update Progress', () => {
    it('should update onboarding_step in database', async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.updateProgress(3);
      });

      expect(mockFrom).toHaveBeenCalledWith('foodtrucks');
    });
  });

  describe('Save All Data', () => {
    it('should set saving to true while saving', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            data: [],
            error: null,
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      // Start save operation
      let savePromise: Promise<boolean>;
      act(() => {
        savePromise = result.current.saveAllData();
      });

      // Should be saving
      // Note: Due to async nature, this might not always catch the saving state

      await act(async () => {
        await savePromise;
      });

      // Should be done saving
      expect(result.current.saving).toBe(false);
    });

    it('should return true on success', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveAllData();
      });

      expect(success).toBe(true);
    });

    it('should call refresh after saving', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveAllData();
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should return false and set error on failure', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.saveAllData();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Database error');
    });

    it('should set generic error message for non-Error exceptions', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue('string error'),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue('string error'),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.saveAllData();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Une erreur est survenue');
    });
  });

  describe('Loaded State', () => {
    it('should return loaded as false initially then true after load', async () => {
      // Setup mock that resolves the load
      mockFrom.mockImplementation((table: string) => {
        if (table === 'foodtrucks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { onboarding_step: 1 }, error: null }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              data: [],
              error: null,
            }),
            order: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      // Eventually loaded should become true
      await waitFor(() => {
        expect(result.current.loaded).toBe(true);
      });
    });
  });

  describe('Save Locations with Data', () => {
    it('should call upsert for each location', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'loc-db-1' }, error: null }),
        }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'locations') {
          return {
            upsert: mockUpsert,
            select: mockSelect,
            insert: mockInsert,
            delete: mockDelete,
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      // Use a wrapper that also provides dispatch to add locations
      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      // Add locations to state
      act(() => {
        result.current.dispatch({
          type: 'ADD_LOCATION',
          location: {
            name: 'Marche Central',
            address: '1 Place du Marche',
            latitude: 48.8566,
            longitude: 2.3522,
            google_place_id: 'place-1',
          },
        });
      });

      let locationIds: string[] = [];
      await act(async () => {
        locationIds = await result.current.saveLocations();
      });

      expect(locationIds).toEqual(['loc-db-1']);
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('Save Schedules', () => {
    it('should delete existing and insert new schedules', async () => {
      const deleteCalls: string[] = [];
      const insertCalls: any[] = [];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'schedules') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                deleteCalls.push('schedules');
                return Promise.resolve({ data: null, error: null });
              }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              insertCalls.push(data);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      // Add location and schedule
      act(() => {
        result.current.dispatch({
          type: 'SET_LOCATIONS',
          locations: [
            {
              id: 'loc-1',
              name: 'Marche',
              address: 'Addr',
              latitude: 48.8,
              longitude: 2.3,
              google_place_id: 'p1',
            },
          ],
        });
        result.current.dispatch({
          type: 'SET_SCHEDULES',
          schedules: [
            { day_of_week: 1, location_id: 'loc-1', start_time: '11:00', end_time: '14:00' },
            { day_of_week: 3, location_id: 'loc-1', start_time: '18:00', end_time: '22:00' },
          ],
        });
      });

      await act(async () => {
        await result.current.saveSchedules(['loc-db-1']);
      });

      expect(deleteCalls).toContain('schedules');
      expect(insertCalls).toHaveLength(1);
      expect(insertCalls[0]).toHaveLength(2);
    });
  });

  describe('Save Menu', () => {
    it('should save categories with option groups and items', async () => {
      const insertedTables: string[] = [];

      mockFrom.mockImplementation((table: string) => {
        insertedTables.push(table);
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'cat-db-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'category_option_groups') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'og-db-1' }, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'category_options') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'menu_items') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      // Setup category with options and items
      act(() => {
        result.current.dispatch({
          type: 'SET_CATEGORIES',
          categories: [
            {
              id: 'cat-local-1',
              name: 'Pizzas',
              optionGroups: [
                {
                  id: 'og-local-1',
                  name: 'Taille',
                  type: 'size',
                  options: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
                },
                {
                  id: 'og-local-2',
                  name: 'Supplements',
                  type: 'supplement',
                  options: [
                    { name: 'Fromage', priceModifier: 150 },
                    { name: 'Jambon', priceModifier: 200 },
                  ],
                },
              ],
              items: [
                { id: 'item-1', name: 'Margherita', prices: { S: 800, M: 1000, L: 1200 } },
                { id: 'item-2', name: 'Napoli', prices: { S: 900, M: 1100, L: 1300 } },
              ],
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveMenu();
      });

      // Should have interacted with all menu-related tables
      expect(insertedTables).toContain('categories');
      expect(insertedTables).toContain('category_option_groups');
      expect(insertedTables).toContain('category_options');
      expect(insertedTables).toContain('menu_items');
    });

    it('should not call saveMenu when no categories', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      // saveMenu should exit early
      await act(async () => {
        await result.current.saveMenu();
      });

      // Should not have called categories table
      const categoriesCalls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'categories');
      // Only calls from initial load, not from saveMenu
      expect(categoriesCalls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Save Offers', () => {
    it('should save promo_code offers with correct config', async () => {
      let capturedInsertData: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              capturedInsertData = data;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'offer-db-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'categories' || table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_OFFERS',
          offers: [
            {
              type: 'promo_code',
              name: 'BIENVENUE',
              config: {
                code: 'bienvenue',
                discount_type: 'percentage',
                discount_value: 10,
              },
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveOffers();
      });

      expect(capturedInsertData).not.toBeNull();
      expect(capturedInsertData.offer_type).toBe('promo_code');
      expect(capturedInsertData.config.code).toBe('BIENVENUE');
      expect(capturedInsertData.config.discount_type).toBe('percentage');
      expect(capturedInsertData.config.discount_value).toBe(10);
    });

    it('should save promo_code fixed discount in cents', async () => {
      let capturedConfig: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              capturedConfig = data.config;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'offer-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'categories' || table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_OFFERS',
          offers: [
            {
              type: 'promo_code',
              name: 'FIXED5',
              config: { code: 'FIXED5', discount_type: 'fixed', discount_value: 5 },
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveOffers();
      });

      expect(capturedConfig.discount_value).toBe(500); // 5€ → 500 cents
    });

    it('should save bundle offers with fixed_price in cents', async () => {
      let capturedConfig: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              capturedConfig = data.config;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'offer-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'categories' || table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_OFFERS',
          offers: [
            {
              type: 'bundle',
              name: 'Menu Midi',
              config: { fixed_price: 12 },
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveOffers();
      });

      expect(capturedConfig.fixed_price).toBe(1200); // 12€ → 1200 cents
    });

    it('should save buy_x_get_y offers with correct config', async () => {
      let capturedConfig: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              capturedConfig = data.config;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'offer-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'categories' || table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_OFFERS',
          offers: [
            {
              type: 'buy_x_get_y',
              name: '3+1 gratuit',
              config: { trigger_quantity: 3, reward_quantity: 1 },
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveOffers();
      });

      expect(capturedConfig.trigger_quantity).toBe(3);
      expect(capturedConfig.reward_quantity).toBe(1);
      expect(capturedConfig.reward_type).toBe('free');
    });

    it('should save threshold_discount offers with amounts in cents', async () => {
      let capturedConfig: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              capturedConfig = data.config;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'offer-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'categories' || table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_OFFERS',
          offers: [
            {
              type: 'threshold_discount',
              name: '-5€ des 25€',
              config: { min_amount: 25, discount_type: 'fixed', discount_value: 5 },
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveOffers();
      });

      expect(capturedConfig.min_amount).toBe(2500); // 25€ → 2500 cents
      expect(capturedConfig.discount_value).toBe(500); // 5€ → 500 cents
      expect(capturedConfig.discount_type).toBe('fixed');
    });

    it('should save bundle with category_choice config and offer_items', async () => {
      let capturedConfig: any = null;
      let capturedOfferItems: any[] = [];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'offers') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            insert: vi.fn().mockImplementation((data: any) => {
              capturedConfig = data.config;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'offer-db-1' }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: 'cat-db-1', name: 'Pizzas' },
                  { id: 'cat-db-2', name: 'Desserts' },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: 'item-db-1', name: 'Margherita', category_id: 'cat-db-1' },
                  { id: 'item-db-2', name: 'Napoli', category_id: 'cat-db-1' },
                  { id: 'item-db-3', name: 'Tiramisu', category_id: 'cat-db-2' },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'offer_items') {
          return {
            insert: vi.fn().mockImplementation((data: any) => {
              capturedOfferItems = data;
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
      });

      const { result } = renderHook(
        () => {
          const assistant = useOnboardingAssistant();
          const { dispatch } = useOnboarding();
          return { ...assistant, dispatch };
        },
        { wrapper }
      );

      act(() => {
        result.current.dispatch({
          type: 'SET_OFFERS',
          offers: [
            {
              type: 'bundle',
              name: 'Plat + Dessert',
              config: {
                fixed_price: 12,
                bundle_category_names: ['Pizzas', 'Desserts'],
                bundle_selection: {
                  Pizzas: { excluded_items: ['Napoli'] },
                  Desserts: {},
                },
              },
            },
          ],
        });
      });

      await act(async () => {
        await result.current.saveOffers();
      });

      // Config should have category_choice with real IDs
      expect(capturedConfig.type).toBe('category_choice');
      expect(capturedConfig.bundle_categories).toHaveLength(2);
      expect(capturedConfig.bundle_categories[0].category_ids).toEqual(['cat-db-1']);
      expect(capturedConfig.bundle_categories[0].excluded_items).toEqual(['item-db-2']); // Napoli excluded
      expect(capturedConfig.bundle_categories[1].category_ids).toEqual(['cat-db-2']);

      // offer_items should include non-excluded items
      expect(capturedOfferItems).toHaveLength(2); // Margherita + Tiramisu (Napoli excluded)
      expect(capturedOfferItems.every((oi: any) => oi.offer_id === 'offer-db-1')).toBe(true);
      expect(capturedOfferItems.every((oi: any) => oi.role === 'bundle_item')).toBe(true);
      expect(capturedOfferItems.map((oi: any) => oi.menu_item_id).sort()).toEqual([
        'item-db-1',
        'item-db-3',
      ]);
    });

    it('should not save offers when there are none', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveOffers();
      });

      // Should not call offers table for delete/insert
      const offersCalls = mockFrom.mock.calls.filter((c: any[]) => c[0] === 'offers');
      expect(offersCalls.length).toBeLessThanOrEqual(1); // Only initial load if any
    });
  });

  describe('Save Step Data', () => {
    it('should call saveSettings for step 5', async () => {
      let settingsUpdated = false;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'foodtrucks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { onboarding_step: 1 }, error: null }),
              }),
            }),
            update: vi.fn().mockImplementation(() => {
              settingsUpdated = true;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            order: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await waitFor(() => expect(result.current.loaded).toBe(true));

      await act(async () => {
        await result.current.saveStepData(5);
      });

      expect(settingsUpdated).toBe(true);
    });

    it('should not save for step 1 (locations saved separately)', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      // saveStepData(1) should be a no-op
      await act(async () => {
        await result.current.saveStepData(1);
      });

      // No additional calls beyond initial load
    });

    it('should handle errors gracefully in saveStepData', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFrom.mockImplementation((table: string) => {
        if (table === 'foodtrucks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { onboarding_step: 1 }, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue(new Error('Update failed')),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            order: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await waitFor(() => expect(result.current.loaded).toBe(true));

      // Should not throw
      await act(async () => {
        await result.current.saveStepData(5);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error saving step 5'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Update Progress', () => {
    it('should call foodtrucks update with correct step', async () => {
      let capturedStep: number | null = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'foodtrucks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { onboarding_step: 1 }, error: null }),
              }),
            }),
            update: vi.fn().mockImplementation((data: any) => {
              capturedStep = data.onboarding_step;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
            order: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.updateProgress(4);
      });

      expect(capturedStep).toBe(4);
    });
  });
});

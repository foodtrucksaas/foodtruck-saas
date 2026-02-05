import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { FoodtruckProvider, useFoodtruck } from './FoodtruckContext';

// Mock user data
const mockUser = { id: 'user-123', email: 'test@example.com' };
let mockAuthUser: typeof mockUser | null = mockUser;

// Mock AuthContext
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
}));

// Mock data
const mockFoodtruck = {
  id: 'ft-1',
  user_id: 'user-123',
  name: 'Test Foodtruck',
  slug: 'test-foodtruck',
  description: 'A test foodtruck',
};

const mockCategories = [
  { id: 'cat-1', name: 'Pizzas', foodtruck_id: 'ft-1', display_order: 0 },
  { id: 'cat-2', name: 'Desserts', foodtruck_id: 'ft-1', display_order: 1 },
];

const mockMenuItems = [
  {
    id: 'item-1',
    name: 'Margherita',
    price: 1200,
    category_id: 'cat-1',
    foodtruck_id: 'ft-1',
    display_order: 0,
    is_available: true,
  },
  {
    id: 'item-2',
    name: 'Tiramisu',
    price: 600,
    category_id: 'cat-2',
    foodtruck_id: 'ft-1',
    display_order: 1,
    is_available: true,
  },
];

// Mock Supabase
const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

// Create wrapper
const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(FoodtruckProvider, null, children);

describe('FoodtruckContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = mockUser;

    // Setup default mock chain for fetching foodtruck
    mockFrom.mockImplementation((table: string) => {
      if (table === 'foodtrucks') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: mockFoodtruck, error: null }),
            }),
          }),
          update: () => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({
              order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
            }),
          }),
        };
      }
      if (table === 'menu_items') {
        return {
          select: () => ({
            eq: () => ({
              or: () => ({
                order: () => ({
                  order: vi.fn().mockResolvedValue({ data: mockMenuItems, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });
  });

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      // Loading initially
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should load foodtruck data when user is authenticated', async () => {
      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.foodtruck).toEqual(mockFoodtruck);
      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.menuItems).toEqual(mockMenuItems);
    });

    it('should have empty data when user is not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.foodtruck).toBeNull();
      expect(result.current.categories).toEqual([]);
      expect(result.current.menuItems).toEqual([]);
    });
  });

  describe('updateFoodtruck', () => {
    it('should update foodtruck in database and local state', async () => {
      let capturedUpdate: Record<string, unknown> = {};
      mockFrom.mockImplementation((table: string) => {
        if (table === 'foodtrucks') {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockFoodtruck, error: null }),
              }),
            }),
            update: (data: Record<string, unknown>) => {
              capturedUpdate = data;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'categories') {
          return {
            select: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
              }),
            }),
          };
        }
        if (table === 'menu_items') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  order: () => ({
                    order: vi.fn().mockResolvedValue({ data: mockMenuItems, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.foodtruck).toEqual(mockFoodtruck);
      });

      await act(async () => {
        await result.current.updateFoodtruck({ name: 'Updated Name' });
      });

      expect(capturedUpdate).toEqual({ name: 'Updated Name' });
      expect(result.current.foodtruck?.name).toBe('Updated Name');
    });

    it('should throw error when no foodtruck exists', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await result.current.updateFoodtruck({ name: 'Test' });
      }).rejects.toThrow('No foodtruck');
    });
  });

  describe('updateMenuItemsOrder', () => {
    it('should update menu items order locally', async () => {
      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.menuItems).toEqual(mockMenuItems);
      });

      const reorderedItems = [
        { ...mockMenuItems[1], display_order: 0 },
        { ...mockMenuItems[0], display_order: 1 },
      ];

      act(() => {
        result.current.updateMenuItemsOrder(reorderedItems);
      });

      // Items should have updated display_order
      const item1 = result.current.menuItems.find((i) => i.id === 'item-1');
      const item2 = result.current.menuItems.find((i) => i.id === 'item-2');
      expect(item1?.display_order).toBe(1);
      expect(item2?.display_order).toBe(0);
    });
  });

  describe('updateCategoriesOrder', () => {
    it('should update categories order locally', async () => {
      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.categories).toEqual(mockCategories);
      });

      const reorderedCategories = [mockCategories[1], mockCategories[0]];

      act(() => {
        result.current.updateCategoriesOrder(reorderedCategories);
      });

      expect(result.current.categories[0].id).toBe('cat-2');
      expect(result.current.categories[0].display_order).toBe(0);
      expect(result.current.categories[1].id).toBe('cat-1');
      expect(result.current.categories[1].display_order).toBe(1);
    });
  });

  describe('refresh', () => {
    it('should refetch all data', async () => {
      let fetchCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'foodtrucks') {
          fetchCount++;
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockFoodtruck, error: null }),
              }),
            }),
          };
        }
        if (table === 'categories') {
          return {
            select: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
              }),
            }),
          };
        }
        if (table === 'menu_items') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  order: () => ({
                    order: vi.fn().mockResolvedValue({ data: mockMenuItems, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialFetchCount = fetchCount;

      await act(async () => {
        await result.current.refresh();
      });

      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    });
  });

  describe('useFoodtruck hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useFoodtruck());
      }).toThrow('useFoodtruck must be used within a FoodtruckProvider');
    });

    it('should provide all context methods', async () => {
      const { result } = renderHook(() => useFoodtruck(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.updateFoodtruck).toBe('function');
      expect(typeof result.current.updateMenuItemsOrder).toBe('function');
      expect(typeof result.current.updateCategoriesOrder).toBe('function');
    });
  });
});

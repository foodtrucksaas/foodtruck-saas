import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMenuItems } from './useMenuItems';
import type { MenuItem, MenuItemInsert, MenuItemUpdate } from '@foodtruck/shared';

// Mock the api module
const mockCreateItem = vi.fn();
const mockUpdateItem = vi.fn();
const mockDeleteItem = vi.fn();
const mockToggleAvailability = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    menu: {
      createItem: (item: MenuItemInsert) => mockCreateItem(item),
      updateItem: (id: string, updates: MenuItemUpdate) => mockUpdateItem(id, updates),
      deleteItem: (id: string) => mockDeleteItem(id),
      toggleAvailability: (id: string, isAvailable: boolean) => mockToggleAvailability(id, isAvailable),
    },
  },
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

// Mock console.error to avoid noise in test output
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('useMenuItems', () => {
  const mockMenuItem: MenuItem = {
    id: 'item-1',
    foodtruck_id: 'ft-1',
    category_id: 'cat-1',
    name: 'Burger Classic',
    description: 'A delicious burger',
    price: 1200, // 12.00 EUR in cents
    image_url: null,
    allergens: ['gluten', 'dairy'],
    is_available: true,
    is_daily_special: false,
    is_archived: false,
    disabled_options: null,
    option_prices: null,
    display_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockMenuItemInsert: MenuItemInsert = {
    foodtruck_id: 'ft-1',
    category_id: 'cat-1',
    name: 'Burger Classic',
    description: 'A delicious burger',
    price: 1200,
    allergens: ['gluten', 'dairy'],
    is_daily_special: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    mockConsoleError.mockClear();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================
  describe('Initialization', () => {
    it('should initialize with saving false', () => {
      const { result } = renderHook(() => useMenuItems());

      expect(result.current.saving).toBe(false);
    });

    it('should return all expected functions', () => {
      const { result } = renderHook(() => useMenuItems());

      expect(result.current.createItem).toBeDefined();
      expect(result.current.updateItem).toBeDefined();
      expect(result.current.deleteItem).toBeDefined();
      expect(result.current.toggleAvailability).toBeDefined();
      expect(typeof result.current.createItem).toBe('function');
      expect(typeof result.current.updateItem).toBe('function');
      expect(typeof result.current.deleteItem).toBe('function');
      expect(typeof result.current.toggleAvailability).toBe('function');
    });
  });

  // ============================================
  // CREATE ITEM TESTS
  // ============================================
  describe('createItem', () => {
    it('should create item successfully and call onSuccess', async () => {
      const newItem = { ...mockMenuItem, id: 'item-new' };
      mockCreateItem.mockResolvedValue(newItem);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let createdItem: MenuItem | null = null;
      await act(async () => {
        createdItem = await result.current.createItem(mockMenuItemInsert);
      });

      expect(createdItem).toEqual(newItem);
      expect(mockCreateItem).toHaveBeenCalledWith(mockMenuItemInsert);
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.saving).toBe(false);
    });

    it('should set saving to true during creation', async () => {
      let resolveFn: (value: MenuItem) => void;
      mockCreateItem.mockReturnValue(
        new Promise<MenuItem>((resolve) => {
          resolveFn = resolve;
        })
      );

      const { result } = renderHook(() => useMenuItems());

      // Start the creation
      let createPromise: Promise<MenuItem | null>;
      act(() => {
        createPromise = result.current.createItem(mockMenuItemInsert);
      });

      // saving should be true while in progress
      expect(result.current.saving).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveFn!(mockMenuItem);
        await createPromise;
      });

      // saving should be false after completion
      expect(result.current.saving).toBe(false);
    });

    it('should handle create error and return null', async () => {
      mockCreateItem.mockRejectedValue(new Error('Create error'));

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let createdItem: MenuItem | null = null;
      await act(async () => {
        createdItem = await result.current.createItem(mockMenuItemInsert);
      });

      expect(createdItem).toBeNull();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.saving).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should work without onSuccess callback', async () => {
      const newItem = { ...mockMenuItem, id: 'item-new' };
      mockCreateItem.mockResolvedValue(newItem);

      const { result } = renderHook(() => useMenuItems());

      let createdItem: MenuItem | null = null;
      await act(async () => {
        createdItem = await result.current.createItem(mockMenuItemInsert);
      });

      expect(createdItem).toEqual(newItem);
    });
  });

  // ============================================
  // UPDATE ITEM TESTS
  // ============================================
  describe('updateItem', () => {
    it('should update item successfully and call onSuccess', async () => {
      mockUpdateItem.mockResolvedValue(mockMenuItem);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      const updates: MenuItemUpdate = { name: 'Burger Deluxe', price: 1500 };
      let success = false;
      await act(async () => {
        success = await result.current.updateItem('item-1', updates);
      });

      expect(success).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith('item-1', updates);
      expect(onSuccess).toHaveBeenCalled();
      expect(result.current.saving).toBe(false);
    });

    it('should set saving to true during update', async () => {
      let resolveFn: (value: MenuItem) => void;
      mockUpdateItem.mockReturnValue(
        new Promise<MenuItem>((resolve) => {
          resolveFn = resolve;
        })
      );

      const { result } = renderHook(() => useMenuItems());

      let updatePromise: Promise<boolean>;
      act(() => {
        updatePromise = result.current.updateItem('item-1', { name: 'New Name' });
      });

      expect(result.current.saving).toBe(true);

      await act(async () => {
        resolveFn!(mockMenuItem);
        await updatePromise;
      });

      expect(result.current.saving).toBe(false);
    });

    it('should handle update error and return false', async () => {
      mockUpdateItem.mockRejectedValue(new Error('Update error'));

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let success = false;
      await act(async () => {
        success = await result.current.updateItem('item-1', { name: 'New Name' });
      });

      expect(success).toBe(false);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.saving).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should work without onSuccess callback', async () => {
      mockUpdateItem.mockResolvedValue(mockMenuItem);

      const { result } = renderHook(() => useMenuItems());

      let success = false;
      await act(async () => {
        success = await result.current.updateItem('item-1', { name: 'New Name' });
      });

      expect(success).toBe(true);
    });

    it('should handle partial updates', async () => {
      mockUpdateItem.mockResolvedValue(mockMenuItem);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.updateItem('item-1', { description: 'Updated description' });
      });

      expect(mockUpdateItem).toHaveBeenCalledWith('item-1', { description: 'Updated description' });
    });
  });

  // ============================================
  // DELETE ITEM TESTS
  // ============================================
  describe('deleteItem', () => {
    it('should delete item after confirmation', async () => {
      mockDeleteItem.mockResolvedValue(undefined);
      mockConfirm.mockReturnValue(true);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let success = false;
      await act(async () => {
        success = await result.current.deleteItem(mockMenuItem);
      });

      expect(mockConfirm).toHaveBeenCalledWith('Supprimer "Burger Classic" ?');
      expect(mockDeleteItem).toHaveBeenCalledWith('item-1');
      expect(success).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should not delete if confirmation cancelled', async () => {
      mockConfirm.mockReturnValue(false);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let success = false;
      await act(async () => {
        success = await result.current.deleteItem(mockMenuItem);
      });

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteItem).not.toHaveBeenCalled();
      expect(success).toBe(false);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should handle delete error and return false', async () => {
      mockDeleteItem.mockRejectedValue(new Error('Delete error'));
      mockConfirm.mockReturnValue(true);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let success = false;
      await act(async () => {
        success = await result.current.deleteItem(mockMenuItem);
      });

      expect(success).toBe(false);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should work without onSuccess callback', async () => {
      mockDeleteItem.mockResolvedValue(undefined);
      mockConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useMenuItems());

      let success = false;
      await act(async () => {
        success = await result.current.deleteItem(mockMenuItem);
      });

      expect(success).toBe(true);
    });

    it('should include item name in confirmation message', async () => {
      mockConfirm.mockReturnValue(false);

      const customItem = { ...mockMenuItem, name: 'Pizza Margherita' };
      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.deleteItem(customItem);
      });

      expect(mockConfirm).toHaveBeenCalledWith('Supprimer "Pizza Margherita" ?');
    });
  });

  // ============================================
  // TOGGLE AVAILABILITY TESTS
  // ============================================
  describe('toggleAvailability', () => {
    it('should toggle availability from true to false', async () => {
      mockToggleAvailability.mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      const availableItem = { ...mockMenuItem, is_available: true };
      let success = false;
      await act(async () => {
        success = await result.current.toggleAvailability(availableItem);
      });

      expect(mockToggleAvailability).toHaveBeenCalledWith('item-1', false);
      expect(success).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should toggle availability from false to true', async () => {
      mockToggleAvailability.mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      const unavailableItem = { ...mockMenuItem, is_available: false };
      let success = false;
      await act(async () => {
        success = await result.current.toggleAvailability(unavailableItem);
      });

      expect(mockToggleAvailability).toHaveBeenCalledWith('item-1', true);
      expect(success).toBe(true);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle toggle error and return false', async () => {
      mockToggleAvailability.mockRejectedValue(new Error('Toggle error'));

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useMenuItems(onSuccess));

      let success = false;
      await act(async () => {
        success = await result.current.toggleAvailability(mockMenuItem);
      });

      expect(success).toBe(false);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should work without onSuccess callback', async () => {
      mockToggleAvailability.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMenuItems());

      let success = false;
      await act(async () => {
        success = await result.current.toggleAvailability(mockMenuItem);
      });

      expect(success).toBe(true);
    });

    it('should not require confirmation dialog', async () => {
      mockToggleAvailability.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.toggleAvailability(mockMenuItem);
      });

      expect(mockConfirm).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // DAILY SPECIAL TESTS (via updateItem)
  // ============================================
  describe('setDailySpecial (via updateItem)', () => {
    it('should set item as daily special', async () => {
      mockUpdateItem.mockResolvedValue(mockMenuItem);

      const { result } = renderHook(() => useMenuItems());

      let success = false;
      await act(async () => {
        success = await result.current.updateItem('item-1', { is_daily_special: true });
      });

      expect(success).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith('item-1', { is_daily_special: true });
    });

    it('should unset item as daily special', async () => {
      mockUpdateItem.mockResolvedValue(mockMenuItem);

      const { result } = renderHook(() => useMenuItems());

      let success = false;
      await act(async () => {
        success = await result.current.updateItem('item-1', { is_daily_special: false });
      });

      expect(success).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith('item-1', { is_daily_special: false });
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('Error handling', () => {
    it('should log error message on create failure', async () => {
      const error = new Error('Network error');
      mockCreateItem.mockRejectedValue(error);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.createItem(mockMenuItemInsert);
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Erreur lors de la création du plat',
        error
      );
    });

    it('should log error message on update failure', async () => {
      const error = new Error('Network error');
      mockUpdateItem.mockRejectedValue(error);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.updateItem('item-1', { name: 'New Name' });
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Erreur lors de la modification du plat',
        error
      );
    });

    it('should log error message on delete failure', async () => {
      const error = new Error('Network error');
      mockDeleteItem.mockRejectedValue(error);
      mockConfirm.mockReturnValue(true);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.deleteItem(mockMenuItem);
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Erreur lors de la suppression du plat',
        error
      );
    });

    it('should log error message on toggle availability failure', async () => {
      const error = new Error('Network error');
      mockToggleAvailability.mockRejectedValue(error);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.toggleAvailability(mockMenuItem);
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Erreur lors de la modification de disponibilité',
        error
      );
    });

    it('should reset saving state after any error', async () => {
      mockCreateItem.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await result.current.createItem(mockMenuItemInsert);
      });

      expect(result.current.saving).toBe(false);
    });
  });

  // ============================================
  // CALLBACK STABILITY TESTS
  // ============================================
  describe('Callback stability', () => {
    it('should maintain stable function references', () => {
      const onSuccess = vi.fn();
      const { result, rerender } = renderHook(() => useMenuItems(onSuccess));

      const firstCreateItem = result.current.createItem;
      const firstUpdateItem = result.current.updateItem;
      const firstDeleteItem = result.current.deleteItem;
      const firstToggleAvailability = result.current.toggleAvailability;

      rerender();

      expect(result.current.createItem).toBe(firstCreateItem);
      expect(result.current.updateItem).toBe(firstUpdateItem);
      expect(result.current.deleteItem).toBe(firstDeleteItem);
      expect(result.current.toggleAvailability).toBe(firstToggleAvailability);
    });

    it('should update function references when onSuccess changes', () => {
      const onSuccess1 = vi.fn();
      const { result, rerender } = renderHook(
        ({ onSuccess }) => useMenuItems(onSuccess),
        { initialProps: { onSuccess: onSuccess1 } }
      );

      const firstCreateItem = result.current.createItem;

      const onSuccess2 = vi.fn();
      rerender({ onSuccess: onSuccess2 });

      expect(result.current.createItem).not.toBe(firstCreateItem);
    });
  });

  // ============================================
  // CONCURRENT OPERATIONS TESTS
  // ============================================
  describe('Concurrent operations', () => {
    it('should handle multiple rapid creates', async () => {
      mockCreateItem
        .mockResolvedValueOnce({ ...mockMenuItem, id: 'item-1' })
        .mockResolvedValueOnce({ ...mockMenuItem, id: 'item-2' })
        .mockResolvedValueOnce({ ...mockMenuItem, id: 'item-3' });

      const { result } = renderHook(() => useMenuItems());

      let results: (MenuItem | null)[] = [];
      await act(async () => {
        results = await Promise.all([
          result.current.createItem({ ...mockMenuItemInsert, name: 'Item 1' }),
          result.current.createItem({ ...mockMenuItemInsert, name: 'Item 2' }),
          result.current.createItem({ ...mockMenuItemInsert, name: 'Item 3' }),
        ]);
      });

      expect(results.filter(r => r !== null)).toHaveLength(3);
      expect(mockCreateItem).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed operations', async () => {
      mockCreateItem.mockResolvedValue(mockMenuItem);
      mockUpdateItem.mockResolvedValue(mockMenuItem);
      mockToggleAvailability.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMenuItems());

      await act(async () => {
        await Promise.all([
          result.current.createItem(mockMenuItemInsert),
          result.current.updateItem('item-1', { name: 'New Name' }),
          result.current.toggleAvailability(mockMenuItem),
        ]);
      });

      expect(mockCreateItem).toHaveBeenCalledTimes(1);
      expect(mockUpdateItem).toHaveBeenCalledTimes(1);
      expect(mockToggleAvailability).toHaveBeenCalledTimes(1);
    });
  });
});

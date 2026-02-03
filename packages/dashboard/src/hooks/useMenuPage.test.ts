import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MenuItem, Category } from '@foodtruck/shared';
import { useMenuPage } from './useMenuPage';

// Mock API
const mockCreateItem = vi.fn();
const mockUpdateItem = vi.fn();
const mockDeleteItem = vi.fn();
const mockToggleAvailability = vi.fn();
const mockGetArchivedItems = vi.fn();
const mockRestoreItem = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockReorderCategories = vi.fn();
const mockReorderItems = vi.fn();
const mockGetCategoryOptionGroups = vi.fn();
const mockCreateCategoryOptionGroup = vi.fn();
const mockUpdateCategoryOptionGroup = vi.fn();
const mockDeleteCategoryOptionGroup = vi.fn();
const mockDeleteCategoryOptionGroupsByCategory = vi.fn();
const mockCreateCategoryOption = vi.fn();
const mockDeleteCategoryOptionsByGroup = vi.fn();
const mockGetCategoryRequiredGroups = vi.fn();
const mockGetCategorySupplementGroups = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    menu: {
      createItem: (...args: unknown[]) => mockCreateItem(...args),
      updateItem: (...args: unknown[]) => mockUpdateItem(...args),
      deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
      toggleAvailability: (...args: unknown[]) => mockToggleAvailability(...args),
      getArchivedItems: (...args: unknown[]) => mockGetArchivedItems(...args),
      restoreItem: (...args: unknown[]) => mockRestoreItem(...args),
      createCategory: (...args: unknown[]) => mockCreateCategory(...args),
      updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
      deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
      reorderCategories: (...args: unknown[]) => mockReorderCategories(...args),
      reorderItems: (...args: unknown[]) => mockReorderItems(...args),
      getCategoryOptionGroups: (...args: unknown[]) => mockGetCategoryOptionGroups(...args),
      createCategoryOptionGroup: (...args: unknown[]) => mockCreateCategoryOptionGroup(...args),
      updateCategoryOptionGroup: (...args: unknown[]) => mockUpdateCategoryOptionGroup(...args),
      deleteCategoryOptionGroup: (...args: unknown[]) => mockDeleteCategoryOptionGroup(...args),
      deleteCategoryOptionGroupsByCategory: (...args: unknown[]) =>
        mockDeleteCategoryOptionGroupsByCategory(...args),
      createCategoryOption: (...args: unknown[]) => mockCreateCategoryOption(...args),
      deleteCategoryOptionsByGroup: (...args: unknown[]) =>
        mockDeleteCategoryOptionsByGroup(...args),
      getCategoryRequiredGroups: (...args: unknown[]) => mockGetCategoryRequiredGroups(...args),
      getCategorySupplementGroups: (...args: unknown[]) => mockGetCategorySupplementGroups(...args),
    },
  },
}));

// Mock FoodtruckContext
const mockCategories: Category[] = [
  {
    id: 'cat-1',
    foodtruck_id: 'ft-1',
    name: 'Burgers',
    display_order: 0,
    created_at: '2024-01-01',
  },
  {
    id: 'cat-2',
    foodtruck_id: 'ft-1',
    name: 'Boissons',
    display_order: 1,
    created_at: '2024-01-01',
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
    category_id: 'cat-1',
    name: 'Cheese Burger',
    description: 'Avec fromage',
    price: 1400,
    is_available: true,
    is_daily_special: true,
    allergens: ['gluten', 'lait'],
    display_order: 1,
    created_at: '2024-01-01',
    image_url: null,
    is_archived: false,
    disabled_options: null,
    option_prices: null,
    updated_at: null,
  },
  {
    id: 'item-3',
    foodtruck_id: 'ft-1',
    category_id: 'cat-2',
    name: 'Coca-Cola',
    description: null,
    price: 300,
    is_available: true,
    is_daily_special: false,
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

const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
};

const mockRefresh = vi.fn();

const mockUpdateMenuItemsOrder = vi.fn();
const mockUpdateCategoriesOrder = vi.fn();

vi.mock('../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
    categories: mockCategories,
    menuItems: mockMenuItems,
    refresh: mockRefresh,
    updateMenuItemsOrder: mockUpdateMenuItemsOrder,
    updateCategoriesOrder: mockUpdateCategoriesOrder,
  }),
}));

// Mock confirm
global.confirm = vi.fn(() => true);

describe('useMenuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);
    mockCreateItem.mockResolvedValue({ id: 'new-item' });
    mockUpdateItem.mockResolvedValue(undefined);
    mockDeleteItem.mockResolvedValue(undefined);
    mockToggleAvailability.mockResolvedValue(undefined);
    mockGetArchivedItems.mockResolvedValue([]);
    mockRestoreItem.mockResolvedValue(undefined);
    mockCreateCategory.mockResolvedValue({ id: 'new-cat' });
    mockUpdateCategory.mockResolvedValue(undefined);
    mockDeleteCategory.mockResolvedValue(undefined);
    mockReorderCategories.mockResolvedValue(undefined);
    mockReorderItems.mockResolvedValue(undefined);
    mockGetCategoryOptionGroups.mockResolvedValue([]);
    mockCreateCategoryOptionGroup.mockResolvedValue({ id: 'new-group' });
    mockUpdateCategoryOptionGroup.mockResolvedValue(undefined);
    mockDeleteCategoryOptionGroup.mockResolvedValue(undefined);
    mockDeleteCategoryOptionGroupsByCategory.mockResolvedValue(undefined);
    mockCreateCategoryOption.mockResolvedValue({ id: 'new-option' });
    mockDeleteCategoryOptionsByGroup.mockResolvedValue(undefined);
    mockGetCategoryRequiredGroups.mockResolvedValue([]);
    mockGetCategorySupplementGroups.mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should return foodtruck data', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.foodtruck).toEqual(mockFoodtruck);
      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.menuItems).toEqual(mockMenuItems);
    });

    it('should initialize with showForm false', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.showForm).toBe(false);
    });

    it('should initialize with editingItem null', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.editingItem).toBeNull();
    });

    it('should initialize with empty form data', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.price).toBe('');
      expect(result.current.formData.category_id).toBe('');
    });
  });

  describe('groupedItems', () => {
    it('should group items by category', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.groupedItems['cat-1']).toHaveLength(2);
      expect(result.current.groupedItems['cat-2']).toHaveLength(1);
    });

    it('should sort items by display_order', () => {
      const { result } = renderHook(() => useMenuPage());

      const burgersItems = result.current.groupedItems['cat-1'];
      expect(burgersItems[0].name).toBe('Classic Burger');
      expect(burgersItems[1].name).toBe('Cheese Burger');
    });
  });

  describe('uncategorizedItems', () => {
    it('should return items without category', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.uncategorizedItems).toHaveLength(0);
    });
  });

  describe('handleEdit', () => {
    it('should set editingItem and populate form', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.handleEdit(mockMenuItems[0]);
      });

      expect(result.current.editingItem).toEqual(mockMenuItems[0]);
      expect(result.current.showForm).toBe(true);
      expect(result.current.formData.name).toBe('Classic Burger');
      expect(result.current.formData.price).toBe('12.00');
      expect(result.current.formData.category_id).toBe('cat-1');
      expect(result.current.formData.allergens).toEqual(['gluten']);
    });

    it('should convert price from cents to euros', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.handleEdit(mockMenuItems[1]);
      });

      expect(result.current.formData.price).toBe('14.00');
    });

    it('should set is_daily_special from item', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.handleEdit(mockMenuItems[1]);
      });

      expect(result.current.formData.is_daily_special).toBe(true);
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.handleEdit(mockMenuItems[0]);
      });

      expect(result.current.showForm).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.showForm).toBe(false);
      expect(result.current.editingItem).toBeNull();
      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.price).toBe('');
    });
  });

  describe('setFormData', () => {
    it('should update form data', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.setFormData((prev) => ({
          ...prev,
          name: 'New Item Name',
        }));
      });

      expect(result.current.formData.name).toBe('New Item Name');
    });
  });

  describe('toggleAvailability', () => {
    it('should toggle item availability', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.toggleAvailability(mockMenuItems[0]);
      });

      expect(mockToggleAvailability).toHaveBeenCalledWith('item-1', false);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should handle toggle error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockToggleAvailability.mockRejectedValueOnce(new Error('Toggle error'));

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.toggleAvailability(mockMenuItems[0]);
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('deleteItem', () => {
    it('should delete item after confirmation', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.deleteItem(mockMenuItems[0]);
      });

      expect(global.confirm).toHaveBeenCalledWith('Supprimer "Classic Burger" ?');
      expect(mockDeleteItem).toHaveBeenCalledWith('item-1');
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should not delete if user cancels', async () => {
      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.deleteItem(mockMenuItems[0]);
      });

      expect(mockDeleteItem).not.toHaveBeenCalled();
    });
  });

  describe('archived items', () => {
    it('should initialize with showArchivedSection false', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.showArchivedSection).toBe(false);
    });

    it('should toggle showArchivedSection', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.setShowArchivedSection(true);
      });

      expect(result.current.showArchivedSection).toBe(true);
    });

    it('should restore item', async () => {
      const archivedItem = { ...mockMenuItems[0], is_archived: true };

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.restoreItem(archivedItem);
      });

      expect(global.confirm).toHaveBeenCalledWith('Restaurer "Classic Burger" ?');
      expect(mockRestoreItem).toHaveBeenCalledWith('item-1');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('category management', () => {
    it('should initialize with showCategoryManager false', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.showCategoryManager).toBe(false);
    });

    it('should toggle showCategoryManager', () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.setShowCategoryManager(true);
      });

      expect(result.current.showCategoryManager).toBe(true);
    });

    it('should create category', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.createCategory({ name: 'New Category', display_order: 0 });
      });

      expect(mockCreateCategory).toHaveBeenCalledWith({
        foodtruck_id: 'ft-1',
        name: 'New Category',
        display_order: 2,
      });
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should update category', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.updateCategory('cat-1', { name: 'Updated Name', display_order: 0 });
      });

      expect(mockUpdateCategory).toHaveBeenCalledWith('cat-1', {
        name: 'Updated Name',
        display_order: 0,
      });
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should delete empty category', async () => {
      const emptyCategory = { ...mockCategories[0], id: 'empty-cat' };

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.deleteCategory(emptyCategory);
      });

      expect(mockDeleteCategory).toHaveBeenCalledWith('empty-cat');
    });

    it('should not delete category with items', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.deleteCategory(mockCategories[0]);
      });

      expect(mockDeleteCategory).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('category reordering', () => {
    it('should reorder categories', async () => {
      const { result } = renderHook(() => useMenuPage());

      const reorderedCategories = [mockCategories[1], mockCategories[0]];

      await act(async () => {
        await result.current.reorderCategories(reorderedCategories);
      });

      expect(mockReorderCategories).toHaveBeenCalledWith([
        { id: 'cat-2', display_order: 0 },
        { id: 'cat-1', display_order: 1 },
      ]);
    });
  });

  describe('item reordering', () => {
    it('should move item up', async () => {
      const { result } = renderHook(() => useMenuPage());

      const categoryItems = [mockMenuItems[0], mockMenuItems[1]];

      await act(async () => {
        await result.current.moveItemUp(mockMenuItems[1], categoryItems, 1);
      });

      expect(mockReorderItems).toHaveBeenCalledWith([
        { id: 'item-2', display_order: 0 },
        { id: 'item-1', display_order: 1 },
      ]);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should not move first item up', async () => {
      const { result } = renderHook(() => useMenuPage());

      const categoryItems = [mockMenuItems[0], mockMenuItems[1]];

      await act(async () => {
        await result.current.moveItemUp(mockMenuItems[0], categoryItems, 0);
      });

      expect(mockReorderItems).not.toHaveBeenCalled();
    });

    it('should move item down', async () => {
      const { result } = renderHook(() => useMenuPage());

      const categoryItems = [mockMenuItems[0], mockMenuItems[1]];

      await act(async () => {
        await result.current.moveItemDown(mockMenuItems[0], categoryItems, 0);
      });

      expect(mockReorderItems).toHaveBeenCalledWith([
        { id: 'item-1', display_order: 1 },
        { id: 'item-2', display_order: 0 },
      ]);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should not move last item down', async () => {
      const { result } = renderHook(() => useMenuPage());

      const categoryItems = [mockMenuItems[0], mockMenuItems[1]];

      await act(async () => {
        await result.current.moveItemDown(mockMenuItems[1], categoryItems, 1);
      });

      expect(mockReorderItems).not.toHaveBeenCalled();
    });
  });

  describe('options wizard', () => {
    it('should initialize with showOptionsWizard false', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.showOptionsWizard).toBe(false);
    });

    it('should open options wizard', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.openOptionsWizard(mockCategories[0]);
      });

      expect(result.current.showOptionsWizard).toBe(true);
      expect(result.current.optionsWizardCategory).toEqual(mockCategories[0]);
    });

    it('should close options wizard', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.openOptionsWizard(mockCategories[0]);
      });

      expect(result.current.showOptionsWizard).toBe(true);

      act(() => {
        result.current.closeOptionsWizard();
      });

      expect(result.current.showOptionsWizard).toBe(false);
      expect(result.current.optionsWizardCategory).toBeNull();
    });

    it('should load existing option groups when opening wizard', async () => {
      const existingGroups = [
        {
          id: 'group-1',
          name: 'Taille',
          is_multiple: false,
          options: [
            { name: 'S', price_modifier: 0, is_available: true },
            { name: 'M', price_modifier: 200, is_available: true },
          ],
        },
      ];
      mockGetCategoryOptionGroups.mockResolvedValueOnce(existingGroups);

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.openOptionsWizard(mockCategories[0]);
      });

      expect(mockGetCategoryOptionGroups).toHaveBeenCalledWith('cat-1');
      expect(result.current.optionsWizardGroups).toHaveLength(1);
      expect(result.current.optionsWizardGroups[0].name).toBe('Taille');
    });
  });

  describe('category options modal', () => {
    it('should initialize with showCategoryOptionsModal false', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.showCategoryOptionsModal).toBe(false);
    });

    it('should open category options modal', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.openCategoryOptionsModal(mockCategories[0]);
      });

      expect(result.current.showCategoryOptionsModal).toBe(true);
      expect(result.current.selectedCategoryForOptions).toEqual(mockCategories[0]);
    });

    it('should close category options modal', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.openCategoryOptionsModal(mockCategories[0]);
      });

      act(() => {
        result.current.closeCategoryOptionsModal();
      });

      expect(result.current.showCategoryOptionsModal).toBe(false);
      expect(result.current.selectedCategoryForOptions).toBeNull();
    });
  });

  describe('form visibility', () => {
    it('should toggle showForm', () => {
      const { result } = renderHook(() => useMenuPage());

      expect(result.current.showForm).toBe(false);

      act(() => {
        result.current.setShowForm(true);
      });

      expect(result.current.showForm).toBe(true);
    });
  });
});

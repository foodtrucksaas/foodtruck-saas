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
const mockGetMenuItemOptionGroups = vi.fn();
const mockCreateMenuItemOptionGroup = vi.fn();
const mockCreateMenuItemOption = vi.fn();
const mockDeleteMenuItemOptionGroupsByItem = vi.fn();
const mockGetOptionTemplates = vi.fn();
const mockCreateOptionTemplate = vi.fn();

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
      getMenuItemOptionGroups: (...args: unknown[]) => mockGetMenuItemOptionGroups(...args),
      createMenuItemOptionGroup: (...args: unknown[]) => mockCreateMenuItemOptionGroup(...args),
      createMenuItemOption: (...args: unknown[]) => mockCreateMenuItemOption(...args),
      deleteMenuItemOptionGroupsByItem: (...args: unknown[]) =>
        mockDeleteMenuItemOptionGroupsByItem(...args),
      getOptionTemplates: (...args: unknown[]) => mockGetOptionTemplates(...args),
      createOptionTemplate: (...args: unknown[]) => mockCreateOptionTemplate(...args),
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

// Mock react-hot-toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
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
    mockGetMenuItemOptionGroups.mockResolvedValue([]);
    mockCreateMenuItemOptionGroup.mockResolvedValue({ id: 'new-group' });
    mockCreateMenuItemOption.mockResolvedValue({ id: 'new-option' });
    mockDeleteMenuItemOptionGroupsByItem.mockResolvedValue(undefined);
    mockGetOptionTemplates.mockResolvedValue([]);
    mockCreateOptionTemplate.mockResolvedValue({
      id: 'new-template',
      name: 'Test',
      config: { groups: [] },
    });
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
      expect(result.current.formData.optionGroups).toEqual([]);
    });

    it('should load option templates on mount', () => {
      renderHook(() => useMenuPage());

      expect(mockGetOptionTemplates).toHaveBeenCalledWith('ft-1');
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
    it('should set editingItem and populate form', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.handleEdit(mockMenuItems[0]);
      });

      expect(result.current.editingItem).toEqual(mockMenuItems[0]);
      expect(result.current.showForm).toBe(true);
      expect(result.current.formData.name).toBe('Classic Burger');
      expect(result.current.formData.price).toBe('12.00');
      expect(result.current.formData.category_id).toBe('cat-1');
      expect(result.current.formData.allergens).toEqual(['gluten']);
    });

    it('should convert price from cents to euros', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.handleEdit(mockMenuItems[1]);
      });

      expect(result.current.formData.price).toBe('14.00');
    });

    it('should set is_daily_special from item', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.handleEdit(mockMenuItems[1]);
      });

      expect(result.current.formData.is_daily_special).toBe(true);
    });

    it('should load option groups for item', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          menu_item_id: 'item-1',
          name: 'Taille',
          price_mode: 'absolute',
          is_required: true,
          is_multiple: false,
          display_order: 0,
          created_at: '2024-01-01',
          menu_item_options: [
            {
              id: 'opt-1',
              option_group_id: 'group-1',
              name: 'S',
              price_modifier: 900,
              is_default: true,
              is_available: true,
              display_order: 0,
              created_at: '2024-01-01',
            },
          ],
        },
      ];
      mockGetMenuItemOptionGroups.mockResolvedValueOnce(mockGroups);

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.handleEdit(mockMenuItems[0]);
      });

      expect(mockGetMenuItemOptionGroups).toHaveBeenCalledWith('item-1');
      expect(result.current.formData.optionGroups).toHaveLength(1);
      expect(result.current.formData.optionGroups[0].name).toBe('Taille');
      expect(result.current.formData.optionGroups[0].price_mode).toBe('absolute');
      expect(result.current.formData.optionGroups[0].options[0].price_modifier).toBe('9.00');
    });
  });

  describe('handleSubmit', () => {
    it('should create new item with option groups', async () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.setFormData({
          name: 'New Burger',
          description: '',
          price: '10.00',
          category_id: 'cat-1',
          allergens: [],
          is_daily_special: false,
          optionGroups: [
            {
              name: 'Taille',
              price_mode: 'absolute',
              is_required: true,
              is_multiple: false,
              display_order: 0,
              options: [
                {
                  name: 'S',
                  price_modifier: '9.00',
                  is_default: true,
                  is_available: true,
                  display_order: 0,
                },
                {
                  name: 'M',
                  price_modifier: '11.00',
                  is_default: false,
                  is_available: true,
                  display_order: 1,
                },
              ],
            },
          ],
        });
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent);
      });

      // Base price should be cheapest absolute option (9.00 = 900 cents)
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 900,
          name: 'New Burger',
        })
      );

      // Should save option groups
      expect(mockDeleteMenuItemOptionGroupsByItem).toHaveBeenCalledWith('new-item');
      expect(mockCreateMenuItemOptionGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          menu_item_id: 'new-item',
          name: 'Taille',
          price_mode: 'absolute',
        })
      );
      expect(mockCreateMenuItemOption).toHaveBeenCalledTimes(2);
    });

    it('should use entered price when no absolute group', async () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.setFormData({
          name: 'Simple Burger',
          description: '',
          price: '12.50',
          category_id: 'cat-1',
          allergens: [],
          is_daily_special: false,
          optionGroups: [],
        });
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent);
      });

      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 1250,
        })
      );
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial state', async () => {
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.handleEdit(mockMenuItems[0]);
      });

      expect(result.current.showForm).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.showForm).toBe(false);
      expect(result.current.editingItem).toBeNull();
      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.price).toBe('');
      expect(result.current.formData.optionGroups).toEqual([]);
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
      mockToggleAvailability.mockRejectedValueOnce(new Error('Toggle error'));

      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.toggleAvailability(mockMenuItems[0]);
      });

      expect(mockToastError).toHaveBeenCalled();
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
      const { result } = renderHook(() => useMenuPage());

      await act(async () => {
        await result.current.deleteCategory(mockCategories[0]);
      });

      expect(mockDeleteCategory).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalled();
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
    it('should reorder category items', async () => {
      const { result } = renderHook(() => useMenuPage());

      const reorderedItems = [mockMenuItems[1], mockMenuItems[0]];

      await act(async () => {
        await result.current.reorderCategoryItems(reorderedItems);
      });

      expect(mockUpdateMenuItemsOrder).toHaveBeenCalledWith(reorderedItems);
      expect(mockReorderItems).toHaveBeenCalledWith([
        { id: 'item-2', display_order: 0 },
        { id: 'item-1', display_order: 1 },
      ]);
    });
  });

  describe('templates', () => {
    it('should apply template groups to form', () => {
      const { result } = renderHook(() => useMenuPage());

      const mockTemplate = {
        id: 'tmpl-1',
        foodtruck_id: 'ft-1',
        name: 'Burger Options',
        config: {
          groups: [
            {
              name: 'Taille',
              price_mode: 'absolute',
              is_required: true,
              is_multiple: false,
              display_order: 0,
              options: [
                { name: 'S', price_modifier: 900, is_default: true, display_order: 0 },
                { name: 'M', price_modifier: 1100, is_default: false, display_order: 1 },
              ],
            },
          ],
        },
        created_at: '2024-01-01',
        updated_at: null,
      };

      act(() => {
        result.current.handleApplyTemplate(mockTemplate);
      });

      expect(result.current.formData.optionGroups).toHaveLength(1);
      expect(result.current.formData.optionGroups[0].name).toBe('Taille');
      expect(result.current.formData.optionGroups[0].price_mode).toBe('absolute');
      expect(result.current.formData.optionGroups[0].options[0].price_modifier).toBe('9.00');
    });

    it('should save current groups as template', async () => {
      const { result } = renderHook(() => useMenuPage());

      act(() => {
        result.current.setFormData((prev) => ({
          ...prev,
          optionGroups: [
            {
              name: 'Taille',
              price_mode: 'absolute' as const,
              is_required: true,
              is_multiple: false,
              display_order: 0,
              options: [
                {
                  name: 'S',
                  price_modifier: '9.00',
                  is_default: true,
                  is_available: true,
                  display_order: 0,
                },
              ],
            },
          ],
        }));
      });

      await act(async () => {
        await result.current.handleSaveAsTemplate('My Template');
      });

      expect(mockCreateOptionTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          foodtruck_id: 'ft-1',
          name: 'My Template',
        })
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Template sauvegardé');
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

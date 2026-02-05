import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMenuApi } from './menu';

// Mock Supabase client
const createMockSupabase = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn(() => mockQuery),
    _mockQuery: mockQuery,
  };
};

describe('Menu API', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let menuApi: ReturnType<typeof createMenuApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    menuApi = createMenuApi(mockSupabase as any);
  });

  describe('Categories', () => {
    describe('getCategories', () => {
      it('should fetch all categories for a foodtruck', async () => {
        const mockCategories = [
          { id: 'cat-1', name: 'Pizzas', display_order: 0 },
          { id: 'cat-2', name: 'Desserts', display_order: 1 },
        ];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: mockCategories, error: null });

        const result = await menuApi.getCategories('ft-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('categories');
        expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('foodtruck_id', 'ft-1');
        expect(result).toEqual(mockCategories);
      });
    });

    describe('createCategory', () => {
      it('should create a new category', async () => {
        const newCategory = { foodtruck_id: 'ft-1', name: 'Burgers', display_order: 2 };
        const createdCategory = { id: 'cat-3', ...newCategory };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({
          data: createdCategory,
          error: null,
        });

        const result = await menuApi.createCategory(newCategory);

        expect(mockSupabase._mockQuery.insert).toHaveBeenCalledWith(newCategory);
        expect(result).toEqual(createdCategory);
      });
    });

    describe('updateCategory', () => {
      it('should update a category', async () => {
        const updates = { name: 'Updated Pizzas' };
        const updatedCategory = { id: 'cat-1', name: 'Updated Pizzas' };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({
          data: updatedCategory,
          error: null,
        });

        const result = await menuApi.updateCategory('cat-1', updates);

        expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith(updates);
        expect(result).toEqual(updatedCategory);
      });
    });

    describe('deleteCategory', () => {
      it('should delete a category', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: null });

        await expect(menuApi.deleteCategory('cat-1')).resolves.toBeUndefined();
        expect(mockSupabase._mockQuery.delete).toHaveBeenCalled();
      });

      it('should throw error on failure', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: new Error('Delete failed') });

        await expect(menuApi.deleteCategory('cat-1')).rejects.toThrow('Delete failed');
      });
    });

    describe('reorderCategories', () => {
      it('should reorder multiple categories', async () => {
        const categories = [
          { id: 'cat-2', display_order: 0 },
          { id: 'cat-1', display_order: 1 },
        ];
        mockSupabase._mockQuery.eq.mockResolvedValue({ error: null });

        await menuApi.reorderCategories(categories);

        expect(mockSupabase._mockQuery.update).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Menu Items', () => {
    describe('getItems', () => {
      it('should fetch all non-archived items', async () => {
        const mockItems = [
          { id: 'item-1', name: 'Margherita', is_archived: false },
          { id: 'item-2', name: 'Quattro Formaggi', is_archived: null },
        ];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: mockItems, error: null });

        const result = await menuApi.getItems('ft-1');

        expect(mockSupabase._mockQuery.or).toHaveBeenCalledWith(
          'is_archived.is.null,is_archived.eq.false'
        );
        expect(result).toEqual(mockItems);
      });
    });

    describe('getItemsWithOptions', () => {
      it('should fetch items with option groups', async () => {
        const mockItems = [
          {
            id: 'item-1',
            name: 'Margherita',
            option_groups: [{ id: 'og-1', name: 'Size', options: [{ id: 'opt-1', name: 'M' }] }],
          },
        ];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: mockItems, error: null });

        const result = await menuApi.getItemsWithOptions('ft-1');

        expect(result).toEqual(mockItems);
      });
    });

    describe('getItemById', () => {
      it('should fetch a single item with options', async () => {
        const mockItem = { id: 'item-1', name: 'Margherita', option_groups: [] };
        mockSupabase._mockQuery.maybeSingle.mockResolvedValueOnce({ data: mockItem, error: null });

        const result = await menuApi.getItemById('item-1');

        expect(result).toEqual(mockItem);
      });

      it('should return null when item not found', async () => {
        mockSupabase._mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        const result = await menuApi.getItemById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('createItem', () => {
      it('should create a new menu item', async () => {
        const newItem = {
          foodtruck_id: 'ft-1',
          category_id: 'cat-1',
          name: 'New Pizza',
          price: 1500,
        };
        const createdItem = { id: 'item-3', ...newItem };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: createdItem, error: null });

        const result = await menuApi.createItem(newItem);

        expect(mockSupabase._mockQuery.insert).toHaveBeenCalledWith(newItem);
        expect(result).toEqual(createdItem);
      });
    });

    describe('updateItem', () => {
      it('should update a menu item', async () => {
        const updates = { name: 'Updated Pizza', price: 1600 };
        const updatedItem = { id: 'item-1', ...updates };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: updatedItem, error: null });

        const result = await menuApi.updateItem('item-1', updates);

        expect(result).toEqual(updatedItem);
      });
    });

    describe('deleteItem', () => {
      it('should soft delete (archive) an item', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: null });

        await menuApi.deleteItem('item-1');

        expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
          is_archived: true,
          is_available: false,
        });
      });
    });

    describe('restoreItem', () => {
      it('should restore an archived item', async () => {
        const restoredItem = { id: 'item-1', is_archived: false };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: restoredItem, error: null });

        const result = await menuApi.restoreItem('item-1');

        expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({ is_archived: false });
        expect(result).toEqual(restoredItem);
      });
    });

    describe('getArchivedItems', () => {
      it('should fetch archived items', async () => {
        const archivedItems = [{ id: 'item-1', is_archived: true }];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: archivedItems, error: null });

        const result = await menuApi.getArchivedItems('ft-1');

        expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('is_archived', true);
        expect(result).toEqual(archivedItems);
      });
    });

    describe('toggleAvailability', () => {
      it('should toggle item availability', async () => {
        const updatedItem = { id: 'item-1', is_available: false };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: updatedItem, error: null });

        const result = await menuApi.toggleAvailability('item-1', false);

        expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({ is_available: false });
        expect(result).toEqual(updatedItem);
      });
    });

    describe('reorderItems', () => {
      it('should reorder multiple items', async () => {
        const items = [
          { id: 'item-2', display_order: 0 },
          { id: 'item-1', display_order: 1 },
        ];
        mockSupabase._mockQuery.eq.mockResolvedValue({ error: null });

        await menuApi.reorderItems(items);

        expect(mockSupabase._mockQuery.update).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Option Groups', () => {
    describe('createOptionGroup', () => {
      it('should create an option group', async () => {
        const newGroup = { menu_item_id: 'item-1', name: 'Size', is_required: true };
        const createdGroup = { id: 'og-1', ...newGroup };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: createdGroup, error: null });

        const result = await menuApi.createOptionGroup(newGroup);

        expect(result).toEqual(createdGroup);
      });
    });

    describe('updateOptionGroup', () => {
      it('should update an option group', async () => {
        const updates = { name: 'Updated Size' };
        const updatedGroup = { id: 'og-1', ...updates };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: updatedGroup, error: null });

        const result = await menuApi.updateOptionGroup('og-1', updates);

        expect(result).toEqual(updatedGroup);
      });
    });

    describe('deleteOptionGroup', () => {
      it('should delete an option group', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: null });

        await expect(menuApi.deleteOptionGroup('og-1')).resolves.toBeUndefined();
      });
    });
  });

  describe('Options', () => {
    describe('createOption', () => {
      it('should create an option', async () => {
        const newOption = { option_group_id: 'og-1', name: 'Large', price_modifier: 200 };
        const createdOption = { id: 'opt-1', ...newOption };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: createdOption, error: null });

        const result = await menuApi.createOption(newOption);

        expect(result).toEqual(createdOption);
      });
    });

    describe('updateOption', () => {
      it('should update an option', async () => {
        const updates = { price_modifier: 300 };
        const updatedOption = { id: 'opt-1', ...updates };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: updatedOption, error: null });

        const result = await menuApi.updateOption('opt-1', updates);

        expect(result).toEqual(updatedOption);
      });
    });

    describe('deleteOption', () => {
      it('should delete an option', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: null });

        await expect(menuApi.deleteOption('opt-1')).resolves.toBeUndefined();
      });
    });
  });

  describe('Category Option Groups', () => {
    describe('getCategoryOptionGroups', () => {
      it('should fetch category option groups with options', async () => {
        const mockGroups = [{ id: 'cog-1', name: 'Taille', options: [{ id: 'co-1', name: 'S' }] }];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: mockGroups, error: null });

        const result = await menuApi.getCategoryOptionGroups('cat-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('category_option_groups');
        expect(result).toEqual(mockGroups);
      });
    });

    describe('getCategoryOptionGroupsCount', () => {
      it('should count category option groups', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 3, error: null })),
          })),
        }));

        const result = await menuApi.getCategoryOptionGroupsCount('cat-1');

        expect(result).toBe(3);
      });
    });

    describe('createCategoryOptionGroup', () => {
      it('should create a category option group', async () => {
        const newGroup = { category_id: 'cat-1', name: 'Taille', is_required: true };
        const createdGroup = { id: 'cog-1', ...newGroup };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: createdGroup, error: null });

        const result = await menuApi.createCategoryOptionGroup(newGroup);

        expect(result).toEqual(createdGroup);
      });
    });

    describe('deleteCategoryOptionGroupsByCategory', () => {
      it('should delete all option groups for a category', async () => {
        mockSupabase.from = vi.fn((table: string) => {
          if (table === 'category_option_groups') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [{ id: 'cog-1' }], error: null })),
              })),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          if (table === 'category_options') {
            return {
              delete: vi.fn(() => ({
                in: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          return mockSupabase._mockQuery;
        });

        await expect(
          menuApi.deleteCategoryOptionGroupsByCategory('cat-1')
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('Category Options', () => {
    describe('getCategoryOptions', () => {
      it('should fetch options for a group', async () => {
        const mockOptions = [
          { id: 'co-1', name: 'S', price_modifier: 0 },
          { id: 'co-2', name: 'M', price_modifier: 200 },
        ];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: mockOptions, error: null });

        const result = await menuApi.getCategoryOptions('cog-1');

        expect(result).toEqual(mockOptions);
      });
    });

    describe('getCategoryOptionsByGroups', () => {
      it('should fetch available options for multiple groups', async () => {
        const mockOptions = [{ id: 'co-1', name: 'S', is_available: true }];
        mockSupabase._mockQuery.order.mockResolvedValueOnce({ data: mockOptions, error: null });

        const result = await menuApi.getCategoryOptionsByGroups(['cog-1', 'cog-2']);

        expect(mockSupabase._mockQuery.in).toHaveBeenCalledWith('option_group_id', [
          'cog-1',
          'cog-2',
        ]);
        expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('is_available', true);
        expect(result).toEqual(mockOptions);
      });
    });

    describe('createCategoryOption', () => {
      it('should create a category option', async () => {
        const newOption = { option_group_id: 'cog-1', name: 'L', price_modifier: 400 };
        const createdOption = { id: 'co-3', ...newOption };
        mockSupabase._mockQuery.single.mockResolvedValueOnce({ data: createdOption, error: null });

        const result = await menuApi.createCategoryOption(newOption);

        expect(result).toEqual(createdOption);
      });
    });

    describe('deleteCategoryOption', () => {
      it('should delete a category option', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: null });

        await expect(menuApi.deleteCategoryOption('co-1')).resolves.toBeUndefined();
      });
    });

    describe('deleteCategoryOptionsByGroup', () => {
      it('should delete all options for a group', async () => {
        mockSupabase._mockQuery.eq.mockResolvedValueOnce({ error: null });

        await menuApi.deleteCategoryOptionsByGroup('cog-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('category_options');
        expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('option_group_id', 'cog-1');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getCategorySizeOptions', () => {
      it('should fetch size options for a category', async () => {
        const mockGroups = [{ id: 'cog-1', name: 'Taille' }];
        const mockOptions = [{ id: 'co-1', name: 'S', is_available: true }];

        mockSupabase.from = vi.fn((table: string) => {
          if (table === 'category_option_groups') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve({ data: mockGroups, error: null })),
                      })),
                    })),
                  })),
                })),
              })),
            };
          }
          if (table === 'category_options') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: mockOptions, error: null })),
                  })),
                })),
              })),
            };
          }
          return mockSupabase._mockQuery;
        });

        const result = await menuApi.getCategorySizeOptions('cat-1');

        expect(result).toEqual(mockOptions);
      });

      it('should return empty array when no size group exists', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        }));

        const result = await menuApi.getCategorySizeOptions('cat-1');

        expect(result).toEqual([]);
      });
    });

    describe('getCategoryRequiredGroups', () => {
      it('should fetch required groups with sorted options', async () => {
        const mockGroups = [
          {
            id: 'cog-1',
            name: 'Taille',
            is_required: true,
            is_multiple: false,
            category_options: [
              { id: 'co-2', name: 'M', is_available: true, display_order: 1 },
              { id: 'co-1', name: 'S', is_available: true, display_order: 0 },
            ],
          },
        ];

        mockSupabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: mockGroups, error: null })),
                })),
              })),
            })),
          })),
        }));

        const result = await menuApi.getCategoryRequiredGroups('cat-1');

        expect(result[0].category_options[0].name).toBe('S');
        expect(result[0].category_options[1].name).toBe('M');
      });
    });

    describe('getCategorySupplements', () => {
      it('should fetch supplement options', async () => {
        const mockGroups = [{ id: 'cog-1' }];
        const mockOptions = [{ id: 'co-1', name: 'Extra Cheese', is_available: true }];

        mockSupabase.from = vi.fn((table: string) => {
          if (table === 'category_option_groups') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: mockGroups, error: null })),
                })),
              })),
            };
          }
          if (table === 'category_options') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: mockOptions, error: null })),
                  })),
                })),
              })),
            };
          }
          return mockSupabase._mockQuery;
        });

        const result = await menuApi.getCategorySupplements('cat-1');

        expect(result).toEqual(mockOptions);
      });
    });
  });
});

import type { TypedSupabaseClient } from './client';
import { handleResponse, handleOptionalResponse } from './client';
import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  MenuItem,
  MenuItemInsert,
  MenuItemUpdate,
  MenuItemWithOptions,
  OptionGroup,
  OptionGroupInsert,
  Option,
  OptionInsert,
  CategoryOptionGroup,
  CategoryOptionGroupInsert,
  CategoryOption,
  CategoryOptionInsert,
  CategoryOptionGroupWithOptions,
  CategoryOptionGroupWithCategoryOptions,
} from '../types';

export function createMenuApi(supabase: TypedSupabaseClient) {
  return {
    // === Categories ===

    async getCategories(foodtruckId: string): Promise<Category[]> {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .order('display_order');

      return handleResponse(data, error);
    },

    async createCategory(category: CategoryInsert): Promise<Category> {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async deleteCategory(id: string): Promise<void> {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async reorderCategories(categories: { id: string; display_order: number }[]): Promise<void> {
      const updates = categories.map(({ id, display_order }) =>
        supabase.from('categories').update({ display_order }).eq('id', id)
      );
      await Promise.all(updates);
    },

    // === Menu Items ===

    async getItems(foodtruckId: string): Promise<MenuItem[]> {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('created_at');

      return handleResponse(data, error);
    },

    async getItemsWithOptions(foodtruckId: string): Promise<MenuItemWithOptions[]> {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          option_groups (
            *,
            options (*)
          )
        `)
        .eq('foodtruck_id', foodtruckId)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('created_at');

      return handleResponse(data, error) as MenuItemWithOptions[];
    },

    async getItemById(id: string): Promise<MenuItemWithOptions | null> {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          option_groups (
            *,
            options (*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      return handleOptionalResponse(data, error) as MenuItemWithOptions | null;
    },

    async createItem(item: MenuItemInsert): Promise<MenuItem> {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async updateItem(id: string, updates: MenuItemUpdate): Promise<MenuItem> {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async deleteItem(id: string): Promise<void> {
      // Soft delete: archive the item instead of deleting
      // This preserves order history while hiding the item
      const { error } = await supabase
        .from('menu_items')
        .update({ is_archived: true, is_available: false })
        .eq('id', id);

      if (error) throw error;
    },

    async restoreItem(id: string): Promise<MenuItem> {
      // Restore an archived item
      const { data, error } = await supabase
        .from('menu_items')
        .update({ is_archived: false })
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async getArchivedItems(foodtruckId: string): Promise<MenuItem[]> {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      return handleResponse(data, error);
    },

    async toggleAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
      return this.updateItem(id, { is_available: isAvailable });
    },

    async reorderItems(items: { id: string; display_order: number }[]): Promise<void> {
      const updates = items.map(({ id, display_order }) =>
        supabase.from('menu_items').update({ display_order }).eq('id', id)
      );
      await Promise.all(updates);
    },

    // === Option Groups ===

    async createOptionGroup(group: OptionGroupInsert): Promise<OptionGroup> {
      const { data, error } = await supabase
        .from('option_groups')
        .insert(group)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async updateOptionGroup(id: string, updates: Partial<OptionGroup>): Promise<OptionGroup> {
      const { data, error } = await supabase
        .from('option_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async deleteOptionGroup(id: string): Promise<void> {
      const { error } = await supabase
        .from('option_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    // === Options ===

    async createOption(option: OptionInsert): Promise<Option> {
      const { data, error } = await supabase
        .from('options')
        .insert(option)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async updateOption(id: string, updates: Partial<Option>): Promise<Option> {
      const { data, error } = await supabase
        .from('options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async deleteOption(id: string): Promise<void> {
      const { error } = await supabase
        .from('options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    // === Category Option Groups ===

    async getCategoryOptionGroups(categoryId: string): Promise<CategoryOptionGroupWithOptions[]> {
      const { data, error } = await supabase
        .from('category_option_groups')
        .select(`
          *,
          options:category_options(*)
        `)
        .eq('category_id', categoryId)
        .order('display_order');

      return handleResponse(data, error) as CategoryOptionGroupWithOptions[];
    },

    async getCategoryOptionGroupsCount(categoryId: string): Promise<number> {
      const { count, error } = await supabase
        .from('category_option_groups')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;
      return count || 0;
    },

    async createCategoryOptionGroup(group: CategoryOptionGroupInsert): Promise<CategoryOptionGroup> {
      const { data, error } = await supabase
        .from('category_option_groups')
        .insert(group)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async updateCategoryOptionGroup(id: string, updates: Partial<CategoryOptionGroup>): Promise<CategoryOptionGroup> {
      const { data, error } = await supabase
        .from('category_option_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async deleteCategoryOptionGroup(id: string): Promise<void> {
      const { error } = await supabase
        .from('category_option_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async deleteCategoryOptionGroupsByCategory(categoryId: string): Promise<void> {
      // First get group IDs to delete their options
      const { data: groups } = await supabase
        .from('category_option_groups')
        .select('id')
        .eq('category_id', categoryId);

      if (groups && groups.length > 0) {
        const groupIds = groups.map(g => g.id);
        await supabase.from('category_options').delete().in('option_group_id', groupIds);
      }

      const { error } = await supabase
        .from('category_option_groups')
        .delete()
        .eq('category_id', categoryId);

      if (error) throw error;
    },

    // === Category Options ===

    async getCategoryOptions(optionGroupId: string): Promise<CategoryOption[]> {
      const { data, error } = await supabase
        .from('category_options')
        .select('*')
        .eq('option_group_id', optionGroupId)
        .order('display_order');

      return handleResponse(data, error);
    },

    async getCategoryOptionsByGroups(groupIds: string[]): Promise<CategoryOption[]> {
      const { data, error } = await supabase
        .from('category_options')
        .select('*')
        .in('option_group_id', groupIds)
        .eq('is_available', true)
        .order('display_order');

      return handleResponse(data, error);
    },

    async createCategoryOption(option: CategoryOptionInsert): Promise<CategoryOption> {
      const { data, error } = await supabase
        .from('category_options')
        .insert(option)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async updateCategoryOption(id: string, updates: Partial<CategoryOption>): Promise<CategoryOption> {
      const { data, error } = await supabase
        .from('category_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    async deleteCategoryOption(id: string): Promise<void> {
      const { error } = await supabase
        .from('category_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async deleteCategoryOptionsByGroup(optionGroupId: string): Promise<void> {
      const { error } = await supabase
        .from('category_options')
        .delete()
        .eq('option_group_id', optionGroupId);

      if (error) throw error;
    },

    // Helper to get size options for a category (required, single choice)
    // Only returns options from the FIRST required group (typically "Taille")
    async getCategorySizeOptions(categoryId: string): Promise<CategoryOption[]> {
      const { data: groups } = await supabase
        .from('category_option_groups')
        .select('id, name')
        .eq('category_id', categoryId)
        .eq('is_required', true)
        .eq('is_multiple', false)
        .order('display_order')
        .limit(1);

      if (!groups || groups.length === 0) return [];

      const { data, error } = await supabase
        .from('category_options')
        .select('*')
        .eq('option_group_id', groups[0].id)
        .eq('is_available', true)
        .order('display_order');

      return handleResponse(data, error);
    },

    // Get ALL required option groups with their options (for pricing in dashboard)
    async getCategoryRequiredGroups(categoryId: string): Promise<CategoryOptionGroupWithCategoryOptions[]> {
      const { data, error } = await supabase
        .from('category_option_groups')
        .select('*, category_options(*)')
        .eq('category_id', categoryId)
        .eq('is_required', true)
        .eq('is_multiple', false)
        .order('display_order');

      if (error) throw error;
      return (data || []).map(group => ({
        ...group,
        category_options: (group.category_options || [])
          .filter((o: CategoryOption) => o.is_available)
          .sort((a: CategoryOption, b: CategoryOption) => (a.display_order ?? 0) - (b.display_order ?? 0))
      }));
    },

    // Get supplement groups with their options (for variable pricing per size)
    async getCategorySupplementGroups(categoryId: string): Promise<CategoryOptionGroupWithCategoryOptions[]> {
      const { data, error } = await supabase
        .from('category_option_groups')
        .select('*, category_options(*)')
        .eq('category_id', categoryId)
        .eq('is_multiple', true)
        .order('display_order');

      if (error) throw error;
      return (data || []).map(group => ({
        ...group,
        category_options: (group.category_options || [])
          .filter((o: CategoryOption) => o.is_available)
          .sort((a: CategoryOption, b: CategoryOption) => (a.display_order ?? 0) - (b.display_order ?? 0))
      }));
    },

    // Helper to get supplements for a category (optional, multiple choice) - flat list
    async getCategorySupplements(categoryId: string): Promise<CategoryOption[]> {
      const { data: groups } = await supabase
        .from('category_option_groups')
        .select('id')
        .eq('category_id', categoryId)
        .eq('is_multiple', true);

      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map(g => g.id);
      const { data, error } = await supabase
        .from('category_options')
        .select('*')
        .in('option_group_id', groupIds)
        .eq('is_available', true)
        .order('display_order');

      return handleResponse(data, error);
    },
  };
}

export type MenuApi = ReturnType<typeof createMenuApi>;

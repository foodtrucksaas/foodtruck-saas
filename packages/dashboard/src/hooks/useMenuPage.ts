import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { MenuItem, Category, OptionTemplate } from '@foodtruck/shared';
import { api } from '../lib/api';
import { useFoodtruck } from '../contexts/FoodtruckContext';
import type { MenuItemFormData } from '../components/menu/MenuItemForm';
import type { CategoryFormData } from '../components/menu/CategoryManager';
import {
  convertGroupsToEditing,
  convertTemplateToEditing,
} from '../components/menu/InlineOptionsEditor';
import type { EditingGroup } from '../components/menu/InlineOptionsEditor';

const initialFormData: MenuItemFormData = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  allergens: [],
  is_daily_special: false,
  optionGroups: [],
};

export function useMenuPage() {
  const { foodtruck, categories, menuItems, refresh, updateMenuItemsOrder, updateCategoriesOrder } =
    useFoodtruck();

  // Menu item state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);

  // Option templates
  const [optionTemplates, setOptionTemplates] = useState<OptionTemplate[]>([]);

  // Category manager state
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Load option templates
  useEffect(() => {
    if (foodtruck) {
      api.menu
        .getOptionTemplates(foodtruck.id)
        .then(setOptionTemplates)
        .catch(() => {});
    }
  }, [foodtruck]);

  // Menu item functions
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setEditingItem(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback(async (item: MenuItem) => {
    // Load item's option groups from new model
    let optionGroups: EditingGroup[] = [];
    try {
      const groups = await api.menu.getMenuItemOptionGroups(item.id);
      optionGroups = convertGroupsToEditing(groups);
    } catch {
      // If no groups exist yet, start empty
    }

    setFormData({
      name: item.name,
      description: item.description || '',
      price: (item.price / 100).toFixed(2),
      category_id: item.category_id || '',
      allergens: item.allergens || [],
      is_daily_special: item.is_daily_special ?? false,
      optionGroups,
    });
    setEditingItem(item);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!foodtruck) return;

      const priceInCents = Math.round(parseFloat(formData.price || '0') * 100);

      // Calculate base price for menu_items.price:
      // If there's an absolute group, use the cheapest absolute option price
      // Otherwise, use the entered price
      let basePriceInCents = priceInCents;
      const absoluteGroup = formData.optionGroups.find((g) => g.price_mode === 'absolute');
      if (absoluteGroup && absoluteGroup.options.length > 0) {
        const availableOptions = absoluteGroup.options.filter((o) => o.is_available);
        if (availableOptions.length > 0) {
          const prices = availableOptions.map((o) =>
            Math.round(parseFloat(o.price_modifier || '0') * 100)
          );
          basePriceInCents = Math.min(...prices);
        }
      }

      try {
        let itemId: string;

        if (editingItem) {
          await api.menu.updateItem(editingItem.id, {
            name: formData.name,
            description: formData.description || null,
            price: basePriceInCents,
            category_id: formData.category_id || null,
            allergens: formData.allergens,
            is_daily_special: formData.is_daily_special,
          });
          itemId = editingItem.id;
        } else {
          const newItem = await api.menu.createItem({
            foodtruck_id: foodtruck.id,
            name: formData.name,
            description: formData.description || null,
            price: basePriceInCents,
            category_id: formData.category_id || null,
            allergens: formData.allergens,
            is_daily_special: formData.is_daily_special,
          });
          itemId = newItem.id;
        }

        // Save option groups
        await saveOptionGroups(itemId, formData.optionGroups);

        await refresh();
        resetForm();
      } catch {
        toast.error(editingItem ? 'Erreur lors de la modification' : 'Erreur lors de la création');
      }
    },
    [foodtruck, formData, editingItem, refresh, resetForm]
  );

  const saveOptionGroups = async (itemId: string, groups: EditingGroup[]) => {
    // Delete all existing groups for this item (cascade deletes options)
    await api.menu.deleteMenuItemOptionGroupsByItem(itemId);

    // Create groups and options
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const validOptions = group.options.filter((o) => o.name.trim());

      const newGroup = await api.menu.createMenuItemOptionGroup({
        menu_item_id: itemId,
        name: group.name.trim(),
        price_mode: group.price_mode,
        is_required: group.is_required,
        is_multiple: group.is_multiple,
        display_order: i,
      });

      for (let j = 0; j < validOptions.length; j++) {
        const opt = validOptions[j];
        await api.menu.createMenuItemOption({
          group_id: newGroup.id,
          name: opt.name.trim(),
          price_modifier: Math.round(parseFloat(opt.price_modifier || '0') * 100),
          is_default: opt.is_default,
          is_available: opt.is_available,
          display_order: j,
        });
      }
    }
  };

  const handleApplyTemplate = useCallback((template: OptionTemplate) => {
    const templateGroups = convertTemplateToEditing(template);
    setFormData((prev) => ({
      ...prev,
      optionGroups: [...prev.optionGroups, ...templateGroups],
    }));
  }, []);

  const handleSaveAsTemplate = useCallback(
    async (name: string) => {
      if (!foodtruck) return;

      const groups = formData.optionGroups.map((g, i) => ({
        name: g.name,
        price_mode: g.price_mode,
        is_required: g.is_required,
        is_multiple: g.is_multiple,
        display_order: i,
        options: g.options.map((o, j) => ({
          name: o.name,
          price_modifier: Math.round(parseFloat(o.price_modifier || '0') * 100),
          is_default: o.is_default,
          display_order: j,
        })),
      }));

      try {
        const template = await api.menu.createOptionTemplate({
          foodtruck_id: foodtruck.id,
          name,
          config: JSON.parse(JSON.stringify({ groups })),
        });
        setOptionTemplates((prev) => [...prev, template]);
        toast.success('Template enregistré.');
      } catch {
        toast.error("Le template n'a pas pu être enregistré. Réessaie.");
      }
    },
    [foodtruck, formData.optionGroups]
  );

  const toggleAvailability = useCallback(
    async (item: MenuItem) => {
      try {
        await api.menu.toggleAvailability(item.id, !item.is_available);
        await refresh();
      } catch {
        toast.error('Erreur lors du changement de disponibilité');
      }
    },
    [refresh]
  );

  const deleteItem = useCallback(
    async (item: MenuItem) => {
      if (!confirm(`Supprimer "${item.name}" ?`)) return;

      try {
        await api.menu.deleteItem(item.id);
        await refresh();
        if (foodtruck) {
          const archived = await api.menu.getArchivedItems(foodtruck.id);
          setArchivedItems(archived);
        }
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    },
    [refresh, foodtruck]
  );

  // Archived items state
  const [archivedItems, setArchivedItems] = useState<MenuItem[]>([]);
  const [showArchivedSection, setShowArchivedSection] = useState(false);

  useEffect(() => {
    if (showArchivedSection && foodtruck) {
      api.menu
        .getArchivedItems(foodtruck.id)
        .then(setArchivedItems)
        .catch(() => {});
    }
  }, [showArchivedSection, foodtruck]);

  const restoreItem = useCallback(
    async (item: MenuItem) => {
      if (!confirm(`Restaurer "${item.name}" ?`)) return;

      try {
        await api.menu.restoreItem(item.id);
        await refresh();
        if (foodtruck) {
          const archived = await api.menu.getArchivedItems(foodtruck.id);
          setArchivedItems(archived);
        }
      } catch {
        toast.error('Erreur lors de la restauration');
      }
    },
    [refresh, foodtruck]
  );

  // Category functions
  const createCategory = useCallback(
    async (data: CategoryFormData) => {
      if (!foodtruck) return;

      const maxOrder =
        categories.length > 0 ? Math.max(...categories.map((c) => c.display_order ?? 0)) + 1 : 0;

      try {
        await api.menu.createCategory({
          foodtruck_id: foodtruck.id,
          name: data.name,
          display_order: maxOrder,
        });
        await refresh();
      } catch {
        toast.error('Erreur lors de la création de la catégorie');
      }
    },
    [foodtruck, categories, refresh]
  );

  const updateCategory = useCallback(
    async (id: string, data: CategoryFormData) => {
      try {
        await api.menu.updateCategory(id, {
          name: data.name,
          display_order: data.display_order,
        });
        await refresh();
      } catch {
        toast.error('Erreur lors de la modification de la catégorie');
      }
    },
    [refresh]
  );

  const deleteCategory = useCallback(
    async (category: Category) => {
      const itemsInCategory = menuItems.filter((item) => item.category_id === category.id);

      if (itemsInCategory.length > 0) {
        toast.error(
          `Impossible de supprimer : ${itemsInCategory.length} plat(s) dans cette catégorie`
        );
        return;
      }

      if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return;

      try {
        await api.menu.deleteCategory(category.id);
        await refresh();
      } catch {
        toast.error('Erreur lors de la suppression de la catégorie');
      }
    },
    [menuItems, refresh]
  );

  const reorderCategories = useCallback(
    async (reorderedCategories: Category[]) => {
      updateCategoriesOrder(reorderedCategories);

      try {
        const updates = reorderedCategories.map((cat, index) => ({
          id: cat.id,
          display_order: index,
        }));
        await api.menu.reorderCategories(updates);
      } catch {
        toast.error('Erreur lors du réordonnancement des catégories');
        await refresh();
      }
    },
    [updateCategoriesOrder, refresh]
  );

  const reorderCategoryItems = useCallback(
    async (reorderedItems: MenuItem[]) => {
      updateMenuItemsOrder(reorderedItems);

      try {
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          display_order: index,
        }));
        await api.menu.reorderItems(updates);
      } catch {
        toast.error('Erreur lors du réordonnancement des plats');
        await refresh();
      }
    },
    [updateMenuItemsOrder, refresh]
  );

  // Computed values
  const groupedItems = categories.reduce(
    (acc, category) => {
      acc[category.id] = menuItems
        .filter((item) => item.category_id === category.id)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  const uncategorizedItems = menuItems
    .filter((item) => !item.category_id)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  return {
    // Data
    foodtruck,
    categories,
    menuItems,
    groupedItems,
    uncategorizedItems,

    // Menu item form
    showForm,
    setShowForm,
    editingItem,
    formData,
    setFormData,
    optionTemplates,
    handleEdit,
    handleSubmit,
    resetForm,
    toggleAvailability,
    deleteItem,
    handleApplyTemplate,
    handleSaveAsTemplate,

    // Archived items
    archivedItems,
    showArchivedSection,
    setShowArchivedSection,
    restoreItem,

    // Category manager
    showCategoryManager,
    setShowCategoryManager,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,

    // Item reordering
    reorderCategoryItems,
  };
}

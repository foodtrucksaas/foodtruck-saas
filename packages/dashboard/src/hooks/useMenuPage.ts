import { useState, useEffect, useCallback } from 'react';
import type { MenuItem, Category, CategoryOption, CategoryOptionGroup } from '@foodtruck/shared';
import { api } from '../lib/api';
import { useFoodtruck } from '../contexts/FoodtruckContext';
import type { MenuItemFormData } from '../components/menu/MenuItemForm';
import type { CategoryFormData } from '../components/menu/CategoryManager';
import type { OptionWizardGroup } from '../components/menu/OptionsWizard';
import type { OptionGroupFormData } from '../components/menu/CategoryOptionsModal';

// Type for option group with its options
export interface OptionGroupWithOptions extends CategoryOptionGroup {
  category_options: CategoryOption[];
}

const initialFormData: MenuItemFormData = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  allergens: [],
  is_daily_special: false,
  option_prices: {},
  disabled_options: [],
};

export function useMenuPage() {
  const { foodtruck, categories, menuItems, refresh, updateMenuItemsOrder, updateCategoriesOrder } =
    useFoodtruck();

  // Menu item state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);
  const [selectedCategorySizeOptions, setSelectedCategorySizeOptions] = useState<CategoryOption[]>(
    []
  );
  const [selectedCategorySupplements, setSelectedCategorySupplements] = useState<CategoryOption[]>(
    []
  );
  // New: groups with their options for better price management
  const [requiredOptionGroups, setRequiredOptionGroups] = useState<OptionGroupWithOptions[]>([]);
  const [supplementOptionGroups, setSupplementOptionGroups] = useState<OptionGroupWithOptions[]>(
    []
  );

  // Category manager state
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Options wizard state
  const [showOptionsWizard, setShowOptionsWizard] = useState(false);
  const [optionsWizardCategory, setOptionsWizardCategory] = useState<Category | null>(null);
  const [optionsWizardGroups, setOptionsWizardGroups] = useState<OptionWizardGroup[]>([]);
  const [savingOptionsWizard, setSavingOptionsWizard] = useState(false);

  // Category options modal state
  const [showCategoryOptionsModal, setShowCategoryOptionsModal] = useState(false);
  const [selectedCategoryForOptions, setSelectedCategoryForOptions] = useState<Category | null>(
    null
  );
  const [categoryOptionGroups, setCategoryOptionGroups] = useState<OptionGroupFormData[]>([]);
  const [savingOptions, setSavingOptions] = useState(false);

  // Menu item functions
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setSelectedCategorySizeOptions([]);
    setSelectedCategorySupplements([]);
    setRequiredOptionGroups([]);
    setSupplementOptionGroups([]);
    setEditingItem(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((item: MenuItem) => {
    const optionPricesInEuros: Record<string, string> = {};
    const itemOptionPrices =
      (item as MenuItem & { option_prices?: Record<string, number> }).option_prices || {};
    Object.entries(itemOptionPrices).forEach(([optId, priceInCents]) => {
      optionPricesInEuros[optId] = (priceInCents / 100).toFixed(2);
    });

    const disabledOptions =
      (item as MenuItem & { disabled_options?: string[] }).disabled_options || [];

    setFormData({
      name: item.name,
      description: item.description || '',
      price: (item.price / 100).toFixed(2),
      category_id: item.category_id || '',
      allergens: item.allergens || [],
      is_daily_special: item.is_daily_special ?? false,
      option_prices: optionPricesInEuros,
      disabled_options: disabledOptions,
    });
    setEditingItem(item);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!foodtruck) return;

      const priceInCents = Math.round(parseFloat(formData.price || '0') * 100);

      // Convert all option prices to cents
      // Format: "optionId" for absolute price, "optionId:sizeId" for per-size supplement
      const optionPricesInCents: Record<string, number> = {};

      Object.entries(formData.option_prices).forEach(([key, priceInEuros]) => {
        if (priceInEuros) {
          optionPricesInCents[key] = Math.round(parseFloat(priceInEuros) * 100);
        }
      });

      // Calculate base price:
      // 1. Get min price from first required group (Taille) if exists
      // 2. Add min modifier from each other required group (Base, Cuisson)
      let basePriceInCents = priceInCents;

      if (requiredOptionGroups.length > 0) {
        // First group (Taille): use absolute prices
        const firstGroup = requiredOptionGroups[0];
        const firstGroupPrices = (firstGroup.category_options || [])
          .filter((opt) => !formData.disabled_options.includes(opt.id))
          .map((opt) => optionPricesInCents[opt.id])
          .filter((p) => p !== undefined && p > 0);

        if (firstGroupPrices.length > 0) {
          basePriceInCents = Math.min(...firstGroupPrices);
        }

        // Other required groups: add min modifier
        for (let i = 1; i < requiredOptionGroups.length; i++) {
          const group = requiredOptionGroups[i];
          const modifiers = (group.category_options || [])
            .filter((opt) => !formData.disabled_options.includes(opt.id))
            .map((opt) => {
              // Check if there's an item-specific price, otherwise use category modifier
              const itemPrice = optionPricesInCents[opt.id];
              return itemPrice !== undefined ? itemPrice : opt.price_modifier || 0;
            });

          if (modifiers.length > 0) {
            basePriceInCents += Math.min(...modifiers);
          }
        }
      }

      try {
        if (editingItem) {
          await api.menu.updateItem(editingItem.id, {
            name: formData.name,
            description: formData.description || null,
            price: basePriceInCents,
            category_id: formData.category_id || null,
            allergens: formData.allergens,
            is_daily_special: formData.is_daily_special,
            option_prices: optionPricesInCents,
            disabled_options: formData.disabled_options,
          });
        } else {
          await api.menu.createItem({
            foodtruck_id: foodtruck.id,
            name: formData.name,
            description: formData.description || null,
            price: basePriceInCents,
            category_id: formData.category_id || null,
            allergens: formData.allergens,
            is_daily_special: formData.is_daily_special,
            option_prices: optionPricesInCents,
            disabled_options: formData.disabled_options,
          });
        }
        await refresh();
        resetForm();
      } catch (error) {
        console.error(
          editingItem ? 'Erreur lors de la modification' : 'Erreur lors de la création',
          error
        );
      }
    },
    [foodtruck, formData, editingItem, requiredOptionGroups, refresh, resetForm]
  );

  const toggleAvailability = useCallback(
    async (item: MenuItem) => {
      try {
        await api.menu.toggleAvailability(item.id, !item.is_available);
        await refresh();
      } catch (error) {
        console.error('Erreur lors du changement de disponibilité', error);
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
        // Refresh archived items too
        if (foodtruck) {
          const archived = await api.menu.getArchivedItems(foodtruck.id);
          setArchivedItems(archived);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression', error);
      }
    },
    [refresh, foodtruck]
  );

  // Archived items state
  const [archivedItems, setArchivedItems] = useState<MenuItem[]>([]);
  const [showArchivedSection, setShowArchivedSection] = useState(false);

  // Load archived items when section is expanded
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
        // Refresh archived items
        if (foodtruck) {
          const archived = await api.menu.getArchivedItems(foodtruck.id);
          setArchivedItems(archived);
        }
      } catch (error) {
        console.error('Erreur lors de la restauration', error);
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
      } catch (error) {
        console.error('Erreur lors de la création de la catégorie', error);
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
      } catch (error) {
        console.error('Erreur lors de la modification de la catégorie', error);
      }
    },
    [refresh]
  );

  const deleteCategory = useCallback(
    async (category: Category) => {
      const itemsInCategory = menuItems.filter((item) => item.category_id === category.id);

      if (itemsInCategory.length > 0) {
        console.error(
          `Impossible de supprimer : ${itemsInCategory.length} plat(s) dans cette catégorie`
        );
        return;
      }

      if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return;

      try {
        await api.menu.deleteCategory(category.id);
        await refresh();
      } catch (error) {
        console.error('Erreur lors de la suppression de la catégorie', error);
      }
    },
    [menuItems, refresh]
  );

  const reorderCategories = useCallback(
    async (reorderedCategories: Category[]) => {
      // Update local state immediately (optimistic update)
      updateCategoriesOrder(reorderedCategories);

      // Then persist to database
      try {
        const updates = reorderedCategories.map((cat, index) => ({
          id: cat.id,
          display_order: index,
        }));
        await api.menu.reorderCategories(updates);
      } catch (error) {
        console.error('Erreur lors du réordonnancement des catégories', error);
        // Refresh to rollback on error
        await refresh();
      }
    },
    [updateCategoriesOrder, refresh]
  );

  // Menu item reordering
  const moveItemUp = useCallback(
    async (item: MenuItem, categoryItems: MenuItem[], index: number) => {
      if (index === 0) return;

      const prevItem = categoryItems[index - 1];
      try {
        await api.menu.reorderItems([
          { id: item.id, display_order: index - 1 },
          { id: prevItem.id, display_order: index },
        ]);
        await refresh();
      } catch (error) {
        console.error('Erreur lors du déplacement du plat', error);
      }
    },
    [refresh]
  );

  const moveItemDown = useCallback(
    async (item: MenuItem, categoryItems: MenuItem[], index: number) => {
      if (index === categoryItems.length - 1) return;

      const nextItem = categoryItems[index + 1];
      try {
        await api.menu.reorderItems([
          { id: item.id, display_order: index + 1 },
          { id: nextItem.id, display_order: index },
        ]);
        await refresh();
      } catch (error) {
        console.error('Erreur lors du déplacement du plat', error);
      }
    },
    [refresh]
  );

  const reorderCategoryItems = useCallback(
    async (reorderedItems: MenuItem[]) => {
      // Update local state immediately (optimistic update)
      updateMenuItemsOrder(reorderedItems);

      // Then persist to database
      try {
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          display_order: index,
        }));
        await api.menu.reorderItems(updates);
      } catch (error) {
        console.error('Erreur lors du réordonnancement des plats', error);
        // Refresh to rollback on error
        await refresh();
      }
    },
    [updateMenuItemsOrder, refresh]
  );

  // Options wizard functions
  const openOptionsWizard = useCallback(async (category: Category) => {
    setOptionsWizardCategory(category);

    // Fetch existing option groups with options
    const groups = await api.menu.getCategoryOptionGroups(category.id);

    if (groups && groups.length > 0) {
      const wizardGroups: OptionWizardGroup[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        type: (g.is_multiple ?? false) ? 'supplement' : 'option',
        values: (g.options || []).map((o) => ({
          name: o.name,
          price: ((o.price_modifier ?? 0) / 100).toFixed(2),
          isAvailable: o.is_available ?? true,
        })),
      }));
      setOptionsWizardGroups(wizardGroups);
    } else {
      setOptionsWizardGroups([]);
    }

    setShowOptionsWizard(true);
  }, []);

  const closeOptionsWizard = useCallback(() => {
    setShowOptionsWizard(false);
    setOptionsWizardCategory(null);
    setOptionsWizardGroups([]);
  }, []);

  const saveOptionsWizard = useCallback(async () => {
    if (!optionsWizardCategory) return;

    setSavingOptionsWizard(true);

    try {
      // Delete existing groups and options
      await api.menu.deleteCategoryOptionGroupsByCategory(optionsWizardCategory.id);

      // Create new groups and options
      const validGroups = optionsWizardGroups.filter((g) => g.name.trim() && g.values.length > 0);

      for (let i = 0; i < validGroups.length; i++) {
        const group = validGroups[i];
        const isOption = group.type === 'option';

        const newGroup = await api.menu.createCategoryOptionGroup({
          category_id: optionsWizardCategory.id,
          name: group.name.trim(),
          is_required: isOption,
          is_multiple: !isOption,
          display_order: i,
        });

        for (let j = 0; j < group.values.length; j++) {
          const val = group.values[j];
          const priceInCents = Math.round(parseFloat(val.price || '0') * 100);

          await api.menu.createCategoryOption({
            option_group_id: newGroup.id,
            name: val.name,
            price_modifier: priceInCents,
            is_available: val.isAvailable,
            is_default: isOption && j === 0,
            display_order: j,
          });
        }
      }

      closeOptionsWizard();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des options', error);
    } finally {
      setSavingOptionsWizard(false);
    }
  }, [optionsWizardCategory, optionsWizardGroups, closeOptionsWizard]);

  // Category options modal functions
  const fetchCategoryOptionGroups = useCallback(async (categoryId: string) => {
    const groups = await api.menu.getCategoryOptionGroups(categoryId);

    if (groups && groups.length > 0) {
      const formattedGroups: OptionGroupFormData[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        is_required: g.is_required ?? true,
        is_multiple: g.is_multiple ?? false,
        options: (g.options || []).map((o) => ({
          id: o.id,
          name: o.name,
          price_modifier: ((o.price_modifier ?? 0) / 100).toFixed(2),
          is_available: o.is_available ?? true,
          is_default: o.is_default ?? false,
        })),
      }));
      setCategoryOptionGroups(formattedGroups);
    } else {
      setCategoryOptionGroups([]);
    }
  }, []);

  const openCategoryOptionsModal = useCallback(
    async (category: Category) => {
      setSelectedCategoryForOptions(category);
      await fetchCategoryOptionGroups(category.id);
      setShowCategoryOptionsModal(true);
    },
    [fetchCategoryOptionGroups]
  );

  const closeCategoryOptionsModal = useCallback(() => {
    setShowCategoryOptionsModal(false);
    setSelectedCategoryForOptions(null);
    setCategoryOptionGroups([]);
  }, []);

  const saveCategoryOptionGroups = useCallback(async () => {
    if (!selectedCategoryForOptions) return;

    setSavingOptions(true);
    const categoryId = selectedCategoryForOptions.id;

    try {
      // Get existing option groups to find which ones to delete
      const existingGroups = await api.menu.getCategoryOptionGroups(categoryId);

      if (existingGroups && existingGroups.length > 0) {
        const existingIds = existingGroups.map((g) => g.id);
        const keptIds = categoryOptionGroups.filter((g) => g.id).map((g) => g.id);
        const toDeleteIds = existingIds.filter((id) => !keptIds.includes(id));

        // Delete groups that were removed
        for (const id of toDeleteIds) {
          await api.menu.deleteCategoryOptionsByGroup(id);
          await api.menu.deleteCategoryOptionGroup(id);
        }
      }

      // Update or create groups
      for (let i = 0; i < categoryOptionGroups.length; i++) {
        const group = categoryOptionGroups[i];

        if (group.id) {
          // Update existing group
          await api.menu.updateCategoryOptionGroup(group.id, {
            name: group.name,
            is_required: group.is_required,
            is_multiple: group.is_multiple,
            display_order: i,
          });

          // Delete existing options for this group
          await api.menu.deleteCategoryOptionsByGroup(group.id);

          // Re-create options
          for (let j = 0; j < group.options.length; j++) {
            const opt = group.options[j];
            await api.menu.createCategoryOption({
              option_group_id: group.id,
              name: opt.name,
              price_modifier: Math.round(parseFloat(opt.price_modifier || '0') * 100),
              is_available: opt.is_available,
              is_default: opt.is_default,
              display_order: j,
            });
          }
        } else {
          // Create new group
          const newGroup = await api.menu.createCategoryOptionGroup({
            category_id: categoryId,
            name: group.name,
            is_required: group.is_required,
            is_multiple: group.is_multiple,
            display_order: i,
          });

          for (let j = 0; j < group.options.length; j++) {
            const opt = group.options[j];
            await api.menu.createCategoryOption({
              option_group_id: newGroup.id,
              name: opt.name,
              price_modifier: Math.round(parseFloat(opt.price_modifier || '0') * 100),
              is_available: opt.is_available,
              is_default: opt.is_default,
              display_order: j,
            });
          }
        }
      }

      closeCategoryOptionsModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des options', error);
    } finally {
      setSavingOptions(false);
    }
  }, [selectedCategoryForOptions, categoryOptionGroups, closeCategoryOptionsModal]);

  // Fetch option groups when category changes
  useEffect(() => {
    const fetchCategoryOptions = async () => {
      if (!formData.category_id) {
        setSelectedCategorySizeOptions([]);
        setSelectedCategorySupplements([]);
        setRequiredOptionGroups([]);
        setSupplementOptionGroups([]);
        return;
      }

      try {
        // Fetch all required groups (Taille, Base, Cuisson, etc.)
        const requiredGroups = await api.menu.getCategoryRequiredGroups(formData.category_id);
        setRequiredOptionGroups(requiredGroups as OptionGroupWithOptions[]);

        // First required group options are used for "size" pricing
        const sizeOptions =
          requiredGroups.length > 0 ? requiredGroups[0].category_options || [] : [];
        setSelectedCategorySizeOptions(sizeOptions as CategoryOption[]);

        // Fetch supplement groups
        const suppGroups = await api.menu.getCategorySupplementGroups(formData.category_id);
        setSupplementOptionGroups(suppGroups as OptionGroupWithOptions[]);

        // Flat list of supplements for backwards compatibility
        const allSupplements = suppGroups.flatMap((g) => g.category_options || []);
        setSelectedCategorySupplements(allSupplements as CategoryOption[]);
      } catch (error) {
        console.error('Error fetching category options:', error);
      }
    };

    fetchCategoryOptions();
  }, [formData.category_id]);

  // Computed values - sorted by display_order
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
    selectedCategorySizeOptions,
    selectedCategorySupplements,
    requiredOptionGroups,
    supplementOptionGroups,
    handleEdit,
    handleSubmit,
    resetForm,
    toggleAvailability,
    deleteItem,

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
    moveItemUp,
    moveItemDown,
    reorderCategoryItems,

    // Options wizard
    showOptionsWizard,
    optionsWizardCategory,
    optionsWizardGroups,
    setOptionsWizardGroups,
    savingOptionsWizard,
    openOptionsWizard,
    closeOptionsWizard,
    saveOptionsWizard,

    // Category options modal
    showCategoryOptionsModal,
    selectedCategoryForOptions,
    categoryOptionGroups,
    setCategoryOptionGroups,
    savingOptions,
    openCategoryOptionsModal,
    closeCategoryOptionsModal,
    saveCategoryOptionGroups,
  };
}

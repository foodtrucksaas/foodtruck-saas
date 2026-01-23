import { useState, useCallback } from 'react';
import type { Category, CategoryInsert, CategoryUpdate, MenuItem } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseCategoriesResult {
  saving: boolean;
  createCategory: (category: CategoryInsert) => Promise<Category | null>;
  updateCategory: (id: string, updates: CategoryUpdate) => Promise<boolean>;
  deleteCategory: (category: Category, menuItems: MenuItem[]) => Promise<boolean>;
  moveCategoryUp: (categories: Category[], category: Category, index: number) => Promise<boolean>;
  moveCategoryDown: (categories: Category[], category: Category, index: number) => Promise<boolean>;
}

export function useCategories(onSuccess?: () => void): UseCategoriesResult {
  const [saving, setSaving] = useState(false);

  const createCategory = useCallback(async (category: CategoryInsert): Promise<Category | null> => {
    setSaving(true);
    try {
      const data = await api.menu.createCategory(category);
      onSuccess?.();
      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie', error);
      return null;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const updateCategory = useCallback(async (id: string, updates: CategoryUpdate): Promise<boolean> => {
    setSaving(true);
    try {
      await api.menu.updateCategory(id, updates);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors de la modification de la catégorie', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const deleteCategory = useCallback(async (category: Category, menuItems: MenuItem[]): Promise<boolean> => {
    const itemsInCategory = menuItems.filter(item => item.category_id === category.id);

    if (itemsInCategory.length > 0) {
      console.error(`Impossible de supprimer : ${itemsInCategory.length} plat(s) dans cette catégorie`);
      return false;
    }

    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return false;

    try {
      await api.menu.deleteCategory(category.id);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie', error);
      return false;
    }
  }, [onSuccess]);

  const moveCategoryUp = useCallback(async (
    categories: Category[],
    category: Category,
    index: number
  ): Promise<boolean> => {
    if (index === 0) return false;

    const prevCategory = categories[index - 1];
    try {
      await api.menu.reorderCategories([
        { id: category.id, display_order: index },
        { id: prevCategory.id, display_order: index + 1 },
      ]);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors du déplacement de la catégorie', error);
      return false;
    }
  }, [onSuccess]);

  const moveCategoryDown = useCallback(async (
    categories: Category[],
    category: Category,
    index: number
  ): Promise<boolean> => {
    if (index === categories.length - 1) return false;

    const nextCategory = categories[index + 1];
    try {
      await api.menu.reorderCategories([
        { id: category.id, display_order: index + 2 },
        { id: nextCategory.id, display_order: index + 1 },
      ]);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors du déplacement de la catégorie', error);
      return false;
    }
  }, [onSuccess]);

  return {
    saving,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategoryUp,
    moveCategoryDown,
  };
}

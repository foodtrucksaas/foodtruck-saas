import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
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
      toast.success('Catégorie créée');
      onSuccess?.();
      return data;
    } catch {
      toast.error('Erreur lors de la création');
      return null;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const updateCategory = useCallback(async (id: string, updates: CategoryUpdate): Promise<boolean> => {
    setSaving(true);
    try {
      await api.menu.updateCategory(id, updates);
      toast.success('Catégorie modifiée');
      onSuccess?.();
      return true;
    } catch {
      toast.error('Erreur lors de la modification');
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const deleteCategory = useCallback(async (category: Category, menuItems: MenuItem[]): Promise<boolean> => {
    const itemsInCategory = menuItems.filter(item => item.category_id === category.id);

    if (itemsInCategory.length > 0) {
      toast.error(`Impossible de supprimer : ${itemsInCategory.length} plat(s) dans cette catégorie`);
      return false;
    }

    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return false;

    try {
      await api.menu.deleteCategory(category.id);
      toast.success('Catégorie supprimée');
      onSuccess?.();
      return true;
    } catch {
      toast.error('Erreur lors de la suppression');
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
    } catch {
      toast.error('Erreur lors du déplacement');
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
    } catch {
      toast.error('Erreur lors du déplacement');
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

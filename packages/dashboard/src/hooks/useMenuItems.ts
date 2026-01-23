import { useState, useCallback } from 'react';
import type { MenuItem, MenuItemInsert, MenuItemUpdate } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseMenuItemsResult {
  saving: boolean;
  createItem: (item: MenuItemInsert) => Promise<MenuItem | null>;
  updateItem: (id: string, updates: MenuItemUpdate) => Promise<boolean>;
  deleteItem: (item: MenuItem) => Promise<boolean>;
  toggleAvailability: (item: MenuItem) => Promise<boolean>;
}

export function useMenuItems(onSuccess?: () => void): UseMenuItemsResult {
  const [saving, setSaving] = useState(false);

  const createItem = useCallback(async (item: MenuItemInsert): Promise<MenuItem | null> => {
    setSaving(true);
    try {
      const data = await api.menu.createItem(item);
      onSuccess?.();
      return data;
    } catch (error) {
      console.error('Erreur lors de la création du plat', error);
      return null;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const updateItem = useCallback(async (id: string, updates: MenuItemUpdate): Promise<boolean> => {
    setSaving(true);
    try {
      await api.menu.updateItem(id, updates);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors de la modification du plat', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const deleteItem = useCallback(async (item: MenuItem): Promise<boolean> => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return false;

    try {
      await api.menu.deleteItem(item.id);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du plat', error);
      return false;
    }
  }, [onSuccess]);

  const toggleAvailability = useCallback(async (item: MenuItem): Promise<boolean> => {
    try {
      await api.menu.toggleAvailability(item.id, !item.is_available);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Erreur lors de la modification de disponibilité', error);
      return false;
    }
  }, [onSuccess]);

  return {
    saving,
    createItem,
    updateItem,
    deleteItem,
    toggleAvailability,
  };
}

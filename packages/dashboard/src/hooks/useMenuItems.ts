import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
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
      toast.success('Plat créé avec succès');
      onSuccess?.();
      return data;
    } catch {
      toast.error('Erreur lors de la création');
      return null;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const updateItem = useCallback(async (id: string, updates: MenuItemUpdate): Promise<boolean> => {
    setSaving(true);
    try {
      await api.menu.updateItem(id, updates);
      toast.success('Plat modifié avec succès');
      onSuccess?.();
      return true;
    } catch {
      toast.error('Erreur lors de la modification');
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSuccess]);

  const deleteItem = useCallback(async (item: MenuItem): Promise<boolean> => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return false;

    try {
      await api.menu.deleteItem(item.id);
      toast.success('Plat supprimé');
      onSuccess?.();
      return true;
    } catch {
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [onSuccess]);

  const toggleAvailability = useCallback(async (item: MenuItem): Promise<boolean> => {
    try {
      await api.menu.toggleAvailability(item.id, !item.is_available);
      toast.success(item.is_available ? 'Plat désactivé' : 'Plat réactivé');
      onSuccess?.();
      return true;
    } catch {
      toast.error('Erreur lors de la modification');
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

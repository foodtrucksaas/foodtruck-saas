import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { useAuth } from '../../contexts/AuthContext';
import { useImageUpload } from '../../hooks/useImageUpload';
import { compressLogo, compressCover } from '../../utils/imageCompression';

export type EditingField =
  | 'name'
  | 'cuisine_types'
  | 'is_mobile'
  | 'description'
  | 'contact'
  | 'show_menu_photos'
  | 'auto_accept_orders'
  | 'show_order_popup'
  | 'use_ready_status'
  | 'order_slot_interval'
  | 'max_orders_per_slot'
  | 'allow_advance_orders'
  | 'min_preparation_time'
  | 'send_confirmation_email'
  | 'send_reminder_email'
  | null;

export interface EditFormState {
  name: string;
  description: string;
  cuisine_types: string[];
  phone: string;
  email: string;
  is_mobile: boolean;
  show_menu_photos: boolean;
  auto_accept_orders: boolean;
  max_orders_per_slot: number | null;
  order_slot_interval: number;
  show_order_popup: boolean;
  use_ready_status: boolean;
  allow_advance_orders: boolean;
  min_preparation_time: number;
  send_confirmation_email: boolean;
  send_reminder_email: boolean;
}

export function useSettings() {
  const { foodtruck, updateFoodtruck } = useFoodtruck();
  const { user } = useAuth();
  const [editingField, setEditingField] = useState<EditingField>(null);

  // Image upload hooks with specific compression
  const { uploading: logoUploading, uploadImage: uploadLogoImage, deleteImage: deleteLogoImage } = useImageUpload({
    bucket: 'foodtruck-images',
    folder: user?.id || 'unknown',
    compress: compressLogo, // 512x512 max, WebP
  });

  const { uploading: coverUploading, uploadImage: uploadCoverImage, deleteImage: deleteCoverImage } = useImageUpload({
    bucket: 'foodtruck-images',
    folder: user?.id || 'unknown',
    compress: compressCover, // 1920x640 max, WebP
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    description: '',
    cuisine_types: [],
    phone: '',
    email: '',
    is_mobile: false,
    show_menu_photos: true,
    auto_accept_orders: false,
    max_orders_per_slot: null,
    order_slot_interval: 15,
    show_order_popup: true,
    use_ready_status: false,
    allow_advance_orders: true,
    min_preparation_time: 15,
    send_confirmation_email: true,
    send_reminder_email: false,
  });

  const startEditing = useCallback((field: EditingField) => {
    if (!foodtruck) return;
    setEditForm({
      name: foodtruck.name,
      description: foodtruck.description || '',
      cuisine_types: foodtruck.cuisine_types || [],
      phone: foodtruck.phone || '',
      email: foodtruck.email || '',
      is_mobile: foodtruck.is_mobile || false,
      show_menu_photos: foodtruck.show_menu_photos ?? true,
      auto_accept_orders: foodtruck.auto_accept_orders || false,
      max_orders_per_slot: foodtruck.max_orders_per_slot || null,
      order_slot_interval: foodtruck.order_slot_interval ?? 15,
      show_order_popup: foodtruck.show_order_popup ?? true,
      use_ready_status: foodtruck.use_ready_status || false,
      allow_advance_orders: foodtruck.allow_advance_orders ?? true,
      min_preparation_time: foodtruck.min_preparation_time ?? 15,
      send_confirmation_email: foodtruck.send_confirmation_email ?? true,
      send_reminder_email: foodtruck.send_reminder_email ?? false,
    });
    setEditingField(field);
  }, [foodtruck]);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
  }, []);

  const saveField = useCallback(async (field: EditingField) => {
    if (!field) return;
    setEditLoading(true);
    try {
      let updateData: Record<string, unknown> = {};
      switch (field) {
        case 'name':
          if (!editForm.name.trim()) {
            toast.error('Le nom est obligatoire');
            setEditLoading(false);
            return;
          }
          updateData = { name: editForm.name };
          break;
        case 'cuisine_types':
          if (editForm.cuisine_types.length === 0) {
            toast.error('Sélectionnez au moins un type de cuisine');
            setEditLoading(false);
            return;
          }
          updateData = { cuisine_types: editForm.cuisine_types };
          break;
        case 'is_mobile':
          updateData = { is_mobile: editForm.is_mobile };
          break;
        case 'description':
          updateData = { description: editForm.description || null };
          break;
        case 'contact':
          updateData = { phone: editForm.phone || null, email: editForm.email || null };
          break;
        case 'show_menu_photos':
          updateData = { show_menu_photos: editForm.show_menu_photos };
          break;
        case 'auto_accept_orders':
          updateData = { auto_accept_orders: editForm.auto_accept_orders };
          break;
        case 'show_order_popup':
          updateData = { show_order_popup: editForm.show_order_popup };
          break;
        case 'use_ready_status':
          updateData = { use_ready_status: editForm.use_ready_status };
          break;
        case 'order_slot_interval':
          updateData = { order_slot_interval: editForm.order_slot_interval };
          break;
        case 'max_orders_per_slot':
          updateData = { max_orders_per_slot: editForm.max_orders_per_slot };
          break;
        case 'allow_advance_orders':
          updateData = { allow_advance_orders: editForm.allow_advance_orders };
          break;
        case 'min_preparation_time':
          updateData = { min_preparation_time: editForm.min_preparation_time };
          break;
        case 'send_confirmation_email':
          updateData = { send_confirmation_email: editForm.send_confirmation_email };
          break;
        case 'send_reminder_email':
          updateData = { send_reminder_email: editForm.send_reminder_email };
          break;
      }
      await updateFoodtruck(updateData);
      toast.success('Modification enregistrée');
      setEditingField(null);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
    setEditLoading(false);
  }, [editForm, updateFoodtruck]);

  const toggleCuisineType = useCallback((type: string) => {
    setEditForm((prev) => ({
      ...prev,
      cuisine_types: prev.cuisine_types.includes(type)
        ? prev.cuisine_types.filter((t) => t !== type)
        : [...prev.cuisine_types, type],
    }));
  }, []);

  const updateEditForm = useCallback(<K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const copyClientLink = useCallback(() => {
    if (!foodtruck) return;
    const link = `${import.meta.env.VITE_APP_URL || 'https://votre-app.vercel.app'}/${foodtruck.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié !');
  }, [foodtruck]);

  const clientLink = foodtruck
    ? `${import.meta.env.VITE_APP_URL || 'https://votre-app.vercel.app'}/${foodtruck.id}`
    : '';

  // Image upload handlers
  const uploadLogo = useCallback(async (file: File) => {
    const url = await uploadLogoImage(file);
    if (url) {
      // Delete old logo if exists
      if (foodtruck?.logo_url) {
        await deleteLogoImage(foodtruck.logo_url);
      }
      await updateFoodtruck({ logo_url: url });
      toast.success('Logo mis à jour');
    }
  }, [uploadLogoImage, deleteLogoImage, foodtruck?.logo_url, updateFoodtruck]);

  const removeLogo = useCallback(async () => {
    if (foodtruck?.logo_url) {
      await deleteLogoImage(foodtruck.logo_url);
      await updateFoodtruck({ logo_url: null });
      toast.success('Logo supprimé');
    }
  }, [deleteLogoImage, foodtruck?.logo_url, updateFoodtruck]);

  const uploadCover = useCallback(async (file: File) => {
    const url = await uploadCoverImage(file);
    if (url) {
      // Delete old cover if exists
      if (foodtruck?.cover_image_url) {
        await deleteCoverImage(foodtruck.cover_image_url);
      }
      await updateFoodtruck({ cover_image_url: url });
      toast.success('Image de couverture mise à jour');
    }
  }, [uploadCoverImage, deleteCoverImage, foodtruck?.cover_image_url, updateFoodtruck]);

  const removeCover = useCallback(async () => {
    if (foodtruck?.cover_image_url) {
      await deleteCoverImage(foodtruck.cover_image_url);
      await updateFoodtruck({ cover_image_url: null });
      toast.success('Image de couverture supprimée');
    }
  }, [deleteCoverImage, foodtruck?.cover_image_url, updateFoodtruck]);

  return {
    // Data
    foodtruck,
    clientLink,
    editForm,
    editingField,
    editLoading,

    // Actions
    startEditing,
    cancelEditing,
    saveField,
    toggleCuisineType,
    updateEditForm,
    copyClientLink,

    // Image uploads
    logoUploading,
    coverUploading,
    uploadLogo,
    removeLogo,
    uploadCover,
    removeCover,
  };
}

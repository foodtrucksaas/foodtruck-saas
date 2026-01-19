import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import type { Deal, DealInsert, DealRewardType, Category, MenuItem, CategoryOption } from '@foodtruck/shared';

export interface DealWithOption extends Deal {
  trigger_option_id?: string | null;
  trigger_option?: { name: string } | null;
}

export interface DealFormState {
  name: string;
  description: string;
  triggerCategoryId: string;
  triggerOptionId: string;
  triggerQuantity: string;
  rewardType: DealRewardType;
  rewardItemId: string;
  rewardValue: string;
  stackable: boolean;
}

const initialFormState: DealFormState = {
  name: '',
  description: '',
  triggerCategoryId: '',
  triggerOptionId: '',
  triggerQuantity: '3',
  rewardType: 'free_item',
  rewardItemId: '',
  rewardValue: '',
  stackable: false,
};

export function useDeals() {
  const { foodtruck } = useFoodtruck();
  const [deals, setDeals] = useState<DealWithOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithOption | null>(null);
  const [form, setForm] = useState<DealFormState>(initialFormState);

  const loadData = useCallback(async () => {
    if (!foodtruck) return;

    const [dealsRes, categoriesRes, itemsRes] = await Promise.all([
      supabase.from('deals').select('*, trigger_option:category_options(name)').eq('foodtruck_id', foodtruck.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('foodtruck_id', foodtruck.id).order('display_order'),
      supabase.from('menu_items').select('*').eq('foodtruck_id', foodtruck.id).eq('is_available', true).order('name'),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data as DealWithOption[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
    if (itemsRes.data) setMenuItems(itemsRes.data as MenuItem[]);
    setLoading(false);
  }, [foodtruck]);

  useEffect(() => {
    if (foodtruck) loadData();
  }, [foodtruck, loadData]);

  useEffect(() => {
    if (!form.triggerCategoryId) {
      setCategoryOptions([]);
      return;
    }

    const fetchCategoryOptions = async () => {
      const { data } = await supabase
        .from('category_options')
        .select('*, category_option_groups!inner(category_id)')
        .eq('category_option_groups.category_id', form.triggerCategoryId)
        .eq('is_available', true)
        .order('display_order');
      setCategoryOptions((data as CategoryOption[]) || []);
    };

    fetchCategoryOptions();
  }, [form.triggerCategoryId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodtruck) return;

    if (!form.triggerCategoryId) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    if (form.rewardType === 'free_item' && !form.rewardItemId) {
      toast.error('Veuillez sélectionner un article à offrir');
      return;
    }
    if ((form.rewardType === 'percentage' || form.rewardType === 'fixed') && !form.rewardValue) {
      toast.error('Veuillez entrer une valeur de réduction');
      return;
    }

    const dealData: DealInsert & { trigger_option_id?: string } = {
      foodtruck_id: foodtruck.id,
      name: form.name.trim(),
      description: form.description || undefined,
      trigger_category_id: form.triggerCategoryId,
      trigger_option_id: form.triggerOptionId || undefined,
      trigger_quantity: parseInt(form.triggerQuantity),
      reward_type: form.rewardType,
      reward_item_id: form.rewardType === 'free_item' ? form.rewardItemId : undefined,
      reward_value: (form.rewardType === 'percentage' || form.rewardType === 'fixed')
        ? (form.rewardType === 'percentage' ? parseInt(form.rewardValue) : Math.round(parseFloat(form.rewardValue) * 100))
        : undefined,
      stackable: form.stackable,
    };

    if (editingDeal) {
      const { error } = await supabase.from('deals').update(dealData).eq('id', editingDeal.id);
      if (error) {
        toast.error(error.message || 'Erreur lors de la modification');
      } else {
        toast.success('Formule modifiée');
        await loadData();
        closeModal();
      }
    } else {
      const { error } = await supabase.from('deals').insert(dealData);
      if (error) {
        toast.error(error.message || 'Erreur lors de la création');
      } else {
        toast.success('Formule créée');
        await loadData();
        closeModal();
      }
    }
  }, [foodtruck, form, editingDeal, loadData]);

  const toggleActive = useCallback(async (deal: DealWithOption) => {
    const { error } = await supabase.from('deals').update({ is_active: !deal.is_active }).eq('id', deal.id);
    if (!error) loadData();
  }, [loadData]);

  const deleteDeal = useCallback(async (id: string) => {
    if (!confirm('Supprimer cette formule ?')) return;
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (!error) loadData();
  }, [loadData]);

  const openEditModal = useCallback(async (deal: DealWithOption) => {
    setEditingDeal(deal);
    if (deal.trigger_category_id) {
      const { data } = await supabase
        .from('category_options')
        .select('*, category_option_groups!inner(category_id)')
        .eq('category_option_groups.category_id', deal.trigger_category_id)
        .eq('is_available', true)
        .order('display_order');
      setCategoryOptions((data as CategoryOption[]) || []);
    }
    setForm({
      name: deal.name,
      description: deal.description || '',
      triggerCategoryId: deal.trigger_category_id || '',
      triggerOptionId: deal.trigger_option_id || '',
      triggerQuantity: deal.trigger_quantity.toString(),
      rewardType: deal.reward_type,
      rewardItemId: deal.reward_item_id || '',
      rewardValue: deal.reward_value ? (deal.reward_type === 'percentage' ? deal.reward_value.toString() : (deal.reward_value / 100).toString()) : '',
      stackable: deal.stackable ?? false,
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingDeal(null);
    setCategoryOptions([]);
    setForm(initialFormState);
  }, []);

  const openCreateModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const getCategoryName = useCallback((categoryId: string | null) => {
    if (!categoryId) return 'N/A';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Catégorie supprimée';
  }, [categories]);

  const getRewardItemName = useCallback((itemId: string | null) => {
    if (!itemId) return null;
    const item = menuItems.find(m => m.id === itemId);
    return item?.name || 'Article supprimé';
  }, [menuItems]);

  const formatReward = useCallback((deal: DealWithOption) => {
    switch (deal.reward_type) {
      case 'free_item': return `${getRewardItemName(deal.reward_item_id)} offert`;
      case 'cheapest_in_cart': return `Le moins cher offert`;
      case 'percentage': return `-${deal.reward_value}%`;
      case 'fixed': return `-${((deal.reward_value || 0) / 100).toFixed(2)}€`;
    }
  }, [getRewardItemName]);

  // Stats
  const activeCount = deals.filter(d => d.is_active).length;
  const totalUses = deals.reduce((sum, d) => sum + (d.times_used ?? 0), 0);
  const totalDiscount = deals.reduce((sum, d) => sum + (d.total_discount_given ?? 0), 0);

  return {
    deals, categories, menuItems, categoryOptions, loading, showModal, editingDeal, form, setForm,
    activeCount, totalUses, totalDiscount,
    handleSubmit, toggleActive, deleteDeal, openEditModal, closeModal, openCreateModal, getCategoryName, formatReward,
  };
}

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import type { PromoCode, PromoCodeInsert, DiscountType } from '@foodtruck/shared';

export interface PromoCodeForm {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  validFrom: string;
  validUntil: string;
}

const INITIAL_FORM: PromoCodeForm = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscount: '',
  maxUses: '',
  maxUsesPerCustomer: '1',
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: '',
};

export function usePromoCodes() {
  const { foodtruck, updateFoodtruck } = useFoodtruck();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeForm>(INITIAL_FORM);

  const loadPromoCodes = useCallback(async () => {
    if (!foodtruck) return;

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('foodtruck_id', foodtruck.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPromoCodes(data as unknown as PromoCode[]);
    }
    setLoading(false);
  }, [foodtruck]);

  useEffect(() => {
    if (foodtruck) {
      loadPromoCodes();
    }
  }, [foodtruck, loadPromoCodes]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodtruck) return;

    const promoData: PromoCodeInsert = {
      foodtruck_id: foodtruck.id,
      code: form.code.toUpperCase().trim(),
      description: form.description || undefined,
      discount_type: form.discountType,
      discount_value: form.discountType === 'percentage'
        ? parseInt(form.discountValue)
        : Math.round(parseFloat(form.discountValue) * 100),
      min_order_amount: form.minOrderAmount
        ? Math.round(parseFloat(form.minOrderAmount) * 100)
        : 0,
      max_discount: form.maxDiscount
        ? Math.round(parseFloat(form.maxDiscount) * 100)
        : undefined,
      max_uses: form.maxUses ? parseInt(form.maxUses) : undefined,
      max_uses_per_customer: form.maxUsesPerCustomer
        ? parseInt(form.maxUsesPerCustomer)
        : undefined,
      valid_from: form.validFrom
        ? new Date(form.validFrom).toISOString()
        : undefined,
      valid_until: form.validUntil
        ? new Date(form.validUntil + 'T23:59:59').toISOString()
        : undefined,
    };

    if (editingCode) {
      const { error } = await supabase
        .from('promo_codes')
        .update(promoData)
        .eq('id', editingCode.id);

      if (error) {
        toast.error(error.message || 'Erreur lors de la modification');
      } else {
        toast.success('Code promo modifié');
        await loadPromoCodes();
        closeModal();
      }
    } else {
      const { error } = await supabase
        .from('promo_codes')
        .insert(promoData);

      if (error) {
        toast.error(error.message || 'Erreur lors de la création');
      } else {
        toast.success('Code promo créé');
        await loadPromoCodes();
        closeModal();
      }
    }
  }, [foodtruck, form, editingCode, loadPromoCodes]);

  const toggleActive = useCallback(async (promo: PromoCode) => {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id);

    if (!error) {
      loadPromoCodes();
    }
  }, [loadPromoCodes]);

  const deletePromoCode = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return;

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);

    if (!error) {
      loadPromoCodes();
    }
  }, [loadPromoCodes]);

  const openEditModal = useCallback((promo: PromoCode) => {
    setEditingCode(promo);
    setForm({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discount_type,
      discountValue: promo.discount_type === 'percentage'
        ? promo.discount_value.toString()
        : (promo.discount_value / 100).toString(),
      minOrderAmount: promo.min_order_amount
        ? (promo.min_order_amount / 100).toString()
        : '',
      maxDiscount: promo.max_discount
        ? (promo.max_discount / 100).toString()
        : '',
      maxUses: promo.max_uses?.toString() || '',
      maxUsesPerCustomer: promo.max_uses_per_customer?.toString() || '',
      validFrom: promo.valid_from
        ? new Date(promo.valid_from).toISOString().split('T')[0]
        : '',
      validUntil: promo.valid_until
        ? new Date(promo.valid_until).toISOString().split('T')[0]
        : '',
    });
    setShowModal(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingCode(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingCode(null);
    setForm(INITIAL_FORM);
  }, []);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const togglePromoSection = useCallback(async () => {
    const isCurrentlyEnabled = foodtruck?.show_promo_section !== false;
    const newValue = !isCurrentlyEnabled;
    try {
      await updateFoodtruck({ show_promo_section: newValue });
      toast.success(newValue ? 'Section code promo visible' : 'Section code promo masquée');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }, [foodtruck, updateFoodtruck]);

  // Computed values
  const stats = {
    activeCodes: promoCodes.filter(p => p.is_active && !isExpired(p) && !isMaxedOut(p)).length,
    totalUses: promoCodes.reduce((sum, p) => sum + p.current_uses, 0),
    totalDiscountGiven: promoCodes.reduce((sum, p) => sum + p.total_discount_given, 0),
  };

  return {
    // State
    promoCodes,
    loading,
    showModal,
    editingCode,
    copiedCode,
    form,
    setForm,
    foodtruck,
    stats,

    // Actions
    handleSubmit,
    toggleActive,
    deletePromoCode,
    openEditModal,
    openCreateModal,
    closeModal,
    copyCode,
    togglePromoSection,
  };
}

// Utility functions
export function formatDiscount(promo: PromoCode): string {
  if (promo.discount_type === 'percentage') {
    return `-${promo.discount_value}%`;
  }
  return `-${(promo.discount_value / 100).toFixed(2)}€`;
}

export function isExpired(promo: PromoCode): boolean {
  if (!promo.valid_until) return false;
  return new Date(promo.valid_until) < new Date();
}

export function isMaxedOut(promo: PromoCode): boolean {
  if (!promo.max_uses) return false;
  return promo.current_uses >= promo.max_uses;
}

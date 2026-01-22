import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import type {
  Offer,
  OfferWithItems,
  OfferType,
  OfferConfig,
  OfferInsert,
  OfferItemInsert,
  Category,
  MenuItem,
  CategoryOptionGroup,
  CategoryOption,
  BundleCategoryConfig as SharedBundleCategoryConfig,
  Json,
} from '@foodtruck/shared';
import {
  isBundleConfig,
  isBuyXGetYConfig,
  isPromoCodeConfig,
  isThresholdDiscountConfig,
} from '@foodtruck/shared';

// Type for Supabase offer insert/update operations (with config as Json)
type OfferDbInsert = Omit<OfferInsert, 'config'> & { config: Json };
type OfferDbUpdate = Partial<Omit<OfferInsert, 'config' | 'foodtruck_id'>> & { config?: Json; foodtruck_id?: undefined };

// Category with nested option groups for size detection
export interface CategoryOptionGroupWithOptions extends CategoryOptionGroup {
  category_options: CategoryOption[];
}

export interface CategoryWithOptionGroups extends Category {
  category_option_groups?: CategoryOptionGroupWithOptions[];
}

// Bundle category config for "choose from category" bundles
export interface BundleCategoryConfig {
  categoryIds: string[]; // One or more categories (OR logic - customer picks from any)
  quantity: number;
  label?: string; // Custom label like "Entrée au choix" or "Boisson"
  excludedItems: string[]; // Items NOT eligible for this bundle
  supplements: Record<string, number>; // itemId or itemId:sizeId -> supplement price in cents
  excludedSizes: Record<string, string[]>; // itemId -> list of excluded sizeIds
}

export interface OfferFormState {
  name: string;
  description: string;
  offerType: OfferType;
  isActive: boolean;
  stackable: boolean;
  // Dates
  startDate: string;
  endDate: string;
  // Horaires
  timeStart: string;
  timeEnd: string;
  daysOfWeek: number[];
  // Limites
  maxUses: string;
  maxUsesPerCustomer: string;
  // Config specifique
  // Bundle - two modes: specific items OR category choice
  bundleType: 'specific_items' | 'category_choice';
  bundleFixedPrice: string;
  bundleItems: { menuItemId: string; quantity: number }[]; // For specific_items mode
  bundleCategories: BundleCategoryConfig[]; // For category_choice mode
  bundleFreeOptions: boolean; // If true, all supplements on items are free in this bundle
  // Buy X Get Y
  buyXGetYType: 'specific_items' | 'category_choice';
  triggerQuantity: string;
  triggerItems: string[]; // For specific_items mode
  triggerCategoryIds: string[]; // For category_choice mode (OR logic)
  triggerExcludedItems: string[]; // Items NOT eligible as triggers
  triggerExcludedSizes: Record<string, string[]>; // itemId -> excluded sizeIds
  rewardType: 'free' | 'discount';
  rewardItems: string[]; // For specific_items mode
  rewardCategoryIds: string[]; // For category_choice mode (OR logic)
  rewardExcludedItems: string[]; // Items NOT eligible as rewards
  rewardExcludedSizes: Record<string, string[]>; // itemId -> excluded sizeIds
  rewardQuantity: string;
  rewardValue: string;
  // Promo Code
  promoCode: string;
  promoCodeDiscountType: 'percentage' | 'fixed';
  promoCodeDiscountValue: string;
  promoCodeMinOrderAmount: string;
  promoCodeMaxDiscount: string;
  // Threshold Discount
  thresholdMinAmount: string;
  thresholdDiscountType: 'percentage' | 'fixed';
  thresholdDiscountValue: string;
}

const initialFormState: OfferFormState = {
  name: '',
  description: '',
  offerType: 'promo_code',
  isActive: true,
  stackable: false,
  startDate: '',
  endDate: '',
  timeStart: '',
  timeEnd: '',
  daysOfWeek: [],
  maxUses: '',
  maxUsesPerCustomer: '1',
  bundleType: 'category_choice', // Default to new mode
  bundleFixedPrice: '',
  bundleItems: [],
  bundleCategories: [],
  bundleFreeOptions: false,
  buyXGetYType: 'category_choice', // Default to new mode
  triggerQuantity: '3',
  triggerItems: [],
  triggerCategoryIds: [],
  triggerExcludedItems: [],
  triggerExcludedSizes: {},
  rewardType: 'free',
  rewardItems: [],
  rewardCategoryIds: [],
  rewardExcludedItems: [],
  rewardExcludedSizes: {},
  rewardQuantity: '1',
  rewardValue: '',
  promoCode: '',
  promoCodeDiscountType: 'percentage',
  promoCodeDiscountValue: '10',
  promoCodeMinOrderAmount: '',
  promoCodeMaxDiscount: '',
  thresholdMinAmount: '25',
  thresholdDiscountType: 'percentage',
  thresholdDiscountValue: '10',
};

export function useOffers() {
  const { foodtruck } = useFoodtruck();
  const [offers, setOffers] = useState<OfferWithItems[]>([]);
  const [categories, setCategories] = useState<CategoryWithOptionGroups[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferWithItems | null>(null);
  const [form, setForm] = useState<OfferFormState>(initialFormState);
  const [wizardStep, setWizardStep] = useState(1);

  const loadData = useCallback(async () => {
    if (!foodtruck) return;

    setLoading(true);
    try {
      const [offersRes, categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from('offers')
          .select(`
            *,
            offer_items (
              *,
              menu_item:menu_items (*)
            )
          `)
          .eq('foodtruck_id', foodtruck.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*, category_option_groups(*, category_options(*))')
          .eq('foodtruck_id', foodtruck.id)
          .order('display_order'),
        supabase
          .from('menu_items')
          .select('*')
          .eq('foodtruck_id', foodtruck.id)
          .eq('is_available', true)
          .order('name'),
      ]);

      if (offersRes.data) setOffers(offersRes.data as unknown as OfferWithItems[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as CategoryWithOptionGroups[]);
      if (itemsRes.data) setMenuItems(itemsRes.data as MenuItem[]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  }, [foodtruck]);

  useEffect(() => {
    if (foodtruck) loadData();
  }, [foodtruck, loadData]);

  const buildConfig = useCallback((): OfferConfig => {
    switch (form.offerType) {
      case 'bundle':
        if (form.bundleType === 'category_choice') {
          return {
            type: 'category_choice',
            fixed_price: Math.round(parseFloat(form.bundleFixedPrice || '0') * 100),
            bundle_categories: form.bundleCategories.map(bc => ({
              category_ids: bc.categoryIds,
              quantity: bc.quantity,
              label: bc.label || undefined,
              excluded_items: bc.excludedItems.length > 0 ? bc.excludedItems : undefined,
              supplements: Object.keys(bc.supplements).length > 0 ? bc.supplements : undefined,
              excluded_sizes: Object.keys(bc.excludedSizes).length > 0 ? bc.excludedSizes : undefined,
            })),
            free_options: form.bundleFreeOptions || undefined,
          };
        }
        return {
          type: 'specific_items',
          fixed_price: Math.round(parseFloat(form.bundleFixedPrice || '0') * 100),
        };
      case 'buy_x_get_y':
        if (form.buyXGetYType === 'category_choice') {
          return {
            type: 'category_choice',
            trigger_quantity: parseInt(form.triggerQuantity) || 3,
            reward_quantity: parseInt(form.rewardQuantity) || 1,
            reward_type: form.rewardType,
            reward_value: form.rewardType === 'discount'
              ? Math.round(parseFloat(form.rewardValue || '0') * 100)
              : undefined,
            trigger_category_ids: form.triggerCategoryIds,
            trigger_excluded_items: form.triggerExcludedItems.length > 0 ? form.triggerExcludedItems : undefined,
            trigger_excluded_sizes: Object.keys(form.triggerExcludedSizes).length > 0 ? form.triggerExcludedSizes : undefined,
            reward_category_ids: form.rewardCategoryIds,
            reward_excluded_items: form.rewardExcludedItems.length > 0 ? form.rewardExcludedItems : undefined,
            reward_excluded_sizes: Object.keys(form.rewardExcludedSizes).length > 0 ? form.rewardExcludedSizes : undefined,
          };
        }
        return {
          type: 'specific_items',
          trigger_quantity: parseInt(form.triggerQuantity) || 3,
          reward_quantity: parseInt(form.rewardQuantity) || 1,
          reward_type: form.rewardType,
          reward_value: form.rewardType === 'discount'
            ? Math.round(parseFloat(form.rewardValue || '0') * 100)
            : undefined,
        };
      case 'promo_code':
        return {
          code: form.promoCode.toUpperCase().trim(),
          discount_type: form.promoCodeDiscountType,
          discount_value: form.promoCodeDiscountType === 'percentage'
            ? parseInt(form.promoCodeDiscountValue) || 0
            : Math.round(parseFloat(form.promoCodeDiscountValue || '0') * 100),
          min_order_amount: form.promoCodeMinOrderAmount
            ? Math.round(parseFloat(form.promoCodeMinOrderAmount) * 100)
            : undefined,
          max_discount: form.promoCodeMaxDiscount
            ? Math.round(parseFloat(form.promoCodeMaxDiscount) * 100)
            : undefined,
        };
      case 'threshold_discount':
        return {
          min_amount: Math.round(parseFloat(form.thresholdMinAmount || '0') * 100),
          discount_type: form.thresholdDiscountType,
          discount_value: form.thresholdDiscountType === 'percentage'
            ? parseInt(form.thresholdDiscountValue) || 0
            : Math.round(parseFloat(form.thresholdDiscountValue || '0') * 100),
        };
    }
  }, [form]);

  const validateForm = useCallback((): string | null => {
    if (!form.name.trim()) return 'Le nom est requis';

    switch (form.offerType) {
      case 'bundle':
        if (!form.bundleFixedPrice || parseFloat(form.bundleFixedPrice) <= 0) {
          return 'Le prix fixe est requis';
        }
        if (form.bundleType === 'category_choice') {
          if (form.bundleCategories.length < 2) {
            return 'Une formule doit contenir au moins 2 choix';
          }
          if (form.bundleCategories.some(bc => !bc.categoryIds || bc.categoryIds.length === 0)) {
            return 'Chaque choix doit avoir au moins une catégorie';
          }
        } else {
          if (form.bundleItems.length < 2) {
            return 'Une formule doit contenir au moins 2 articles';
          }
        }
        break;
      case 'buy_x_get_y':
        if (form.buyXGetYType === 'category_choice') {
          if (form.triggerCategoryIds.length === 0) {
            return 'Sélectionnez au moins une catégorie déclencheur';
          }
          if (form.rewardCategoryIds.length === 0) {
            return 'Sélectionnez au moins une catégorie récompense';
          }
        } else {
          if (form.triggerItems.length === 0) {
            return 'Sélectionnez au moins un article déclencheur';
          }
          if (form.rewardItems.length === 0) {
            return 'Sélectionnez au moins un article récompense';
          }
        }
        break;
      case 'promo_code':
        if (!form.promoCode.trim()) {
          return 'Le code promo est requis';
        }
        break;
      case 'threshold_discount':
        if (!form.thresholdMinAmount || parseFloat(form.thresholdMinAmount) <= 0) {
          return 'Le montant minimum est requis';
        }
        break;
    }

    return null;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!foodtruck) return;

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const config = buildConfig();

      const offerData: OfferInsert = {
        foodtruck_id: foodtruck.id,
        name: form.name.trim(),
        description: form.description || undefined,
        offer_type: form.offerType,
        config,
        is_active: form.isActive,
        stackable: form.stackable,
        start_date: form.startDate || undefined,
        end_date: form.endDate || undefined,
        time_start: form.timeStart || undefined,
        time_end: form.timeEnd || undefined,
        days_of_week: form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined,
        max_uses: form.maxUses ? parseInt(form.maxUses) : undefined,
        max_uses_per_customer: form.maxUsesPerCustomer ? parseInt(form.maxUsesPerCustomer) : undefined,
      };

      let offerId: string;

      if (editingOffer) {
        // Update
        const updateData: OfferDbUpdate = {
          name: offerData.name,
          description: offerData.description,
          offer_type: offerData.offer_type,
          config: offerData.config as unknown as Json,
          is_active: offerData.is_active,
          stackable: offerData.stackable,
          start_date: offerData.start_date,
          end_date: offerData.end_date,
          time_start: offerData.time_start,
          time_end: offerData.time_end,
          days_of_week: offerData.days_of_week,
          max_uses: offerData.max_uses,
          max_uses_per_customer: offerData.max_uses_per_customer,
        };
        const { error: updateError } = await supabase
          .from('offers')
          .update(updateData)
          .eq('id', editingOffer.id)
          .select()
          .single();

        if (updateError) throw updateError;
        offerId = editingOffer.id;

        // Delete old items and recreate
        await supabase.from('offer_items').delete().eq('offer_id', offerId);
      } else {
        // Create
        const insertData: OfferDbInsert = {
          ...offerData,
          config: offerData.config as unknown as Json,
        };
        const { data, error: createError } = await supabase
          .from('offers')
          .insert(insertData)
          .select()
          .single();

        if (createError) throw createError;
        offerId = (data as { id: string }).id;
      }

      // Add offer items
      const items: OfferItemInsert[] = [];

      if (form.offerType === 'bundle') {
        form.bundleItems.forEach((item) => {
          items.push({
            offer_id: offerId,
            menu_item_id: item.menuItemId,
            role: 'bundle_item',
            quantity: item.quantity,
          });
        });
      } else if (form.offerType === 'buy_x_get_y' && form.buyXGetYType === 'specific_items') {
        // Only save offer_items for specific_items mode
        form.triggerItems.forEach((menuItemId) => {
          items.push({
            offer_id: offerId,
            menu_item_id: menuItemId,
            role: 'trigger',
            quantity: 1,
          });
        });
        form.rewardItems.forEach((menuItemId) => {
          items.push({
            offer_id: offerId,
            menu_item_id: menuItemId,
            role: 'reward',
            quantity: parseInt(form.rewardQuantity) || 1,
          });
        });
        // For category_choice mode, categories are stored in config.trigger_category_ids and config.reward_category_ids
      }

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('offer_items').insert(items);
        if (itemsError) throw itemsError;
      }

      toast.success(editingOffer ? 'Offre modifiee' : 'Offre creee');
      await loadData();
      closeWizard();
    } catch (error) {
      console.error('Error saving offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [foodtruck, form, editingOffer, buildConfig, validateForm, loadData]);

  const toggleActive = useCallback(async (offer: Offer) => {
    const { error } = await supabase
      .from('offers')
      .update({ is_active: !offer.is_active })
      .eq('id', offer.id);

    if (error) {
      toast.error('Erreur lors de la mise a jour');
    } else {
      await loadData();
    }
  }, [loadData]);

  const deleteOffer = useCallback(async (id: string) => {
    if (!confirm('Supprimer cette offre ?')) return;

    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Offre supprimee');
      await loadData();
    }
  }, [loadData]);

  const openEditWizard = useCallback((offer: OfferWithItems) => {
    setEditingOffer(offer);
    const config = offer.config;

    const newForm: OfferFormState = {
      ...initialFormState,
      name: offer.name,
      description: offer.description || '',
      offerType: offer.offer_type,
      isActive: offer.is_active,
      stackable: offer.stackable,
      startDate: offer.start_date ? offer.start_date.split('T')[0] : '',
      endDate: offer.end_date ? offer.end_date.split('T')[0] : '',
      timeStart: offer.time_start || '',
      timeEnd: offer.time_end || '',
      daysOfWeek: offer.days_of_week || [],
      maxUses: offer.max_uses?.toString() || '',
      maxUsesPerCustomer: offer.max_uses_per_customer?.toString() || '1',
    };

    // Load config based on type using type guards
    if (isBundleConfig(config)) {
      newForm.bundleFixedPrice = ((config.fixed_price || 0) / 100).toString();
      newForm.bundleFreeOptions = config.free_options || false;

      if (config.type === 'category_choice' && config.bundle_categories) {
        newForm.bundleType = 'category_choice';
        newForm.bundleCategories = (config.bundle_categories || []).map((bc: SharedBundleCategoryConfig) => ({
          // Support both old format (category_id) and new format (category_ids)
          categoryIds: bc.category_ids || (bc.category_id ? [bc.category_id] : []),
          quantity: bc.quantity || 1,
          label: bc.label || '',
          excludedItems: bc.excluded_items || [],
          supplements: bc.supplements || {},
          excludedSizes: bc.excluded_sizes || {},
        }));
      } else {
        newForm.bundleType = 'specific_items';
        newForm.bundleItems = (offer.offer_items || [])
          .filter((i) => i.role === 'bundle_item')
          .map((i) => ({ menuItemId: i.menu_item_id, quantity: i.quantity }));
      }
    } else if (isBuyXGetYConfig(config)) {
      newForm.triggerQuantity = (config.trigger_quantity || 3).toString();
      newForm.rewardQuantity = (config.reward_quantity || 1).toString();
      newForm.rewardType = config.reward_type || 'free';
      newForm.rewardValue = config.reward_value ? (config.reward_value / 100).toString() : '';

      if (config.type === 'category_choice' && config.trigger_category_ids) {
        newForm.buyXGetYType = 'category_choice';
        newForm.triggerCategoryIds = config.trigger_category_ids || [];
        newForm.triggerExcludedItems = config.trigger_excluded_items || [];
        newForm.triggerExcludedSizes = config.trigger_excluded_sizes || {};
        newForm.rewardCategoryIds = config.reward_category_ids || [];
        newForm.rewardExcludedItems = config.reward_excluded_items || [];
        newForm.rewardExcludedSizes = config.reward_excluded_sizes || {};
      } else {
        newForm.buyXGetYType = 'specific_items';
        newForm.triggerItems = (offer.offer_items || [])
          .filter((i) => i.role === 'trigger')
          .map((i) => i.menu_item_id);
        newForm.rewardItems = (offer.offer_items || [])
          .filter((i) => i.role === 'reward')
          .map((i) => i.menu_item_id);
      }
    } else if (isPromoCodeConfig(config)) {
      newForm.promoCode = config.code || '';
      newForm.promoCodeDiscountType = config.discount_type || 'percentage';
      newForm.promoCodeDiscountValue = config.discount_type === 'percentage'
        ? (config.discount_value || 0).toString()
        : ((config.discount_value || 0) / 100).toString();
      newForm.promoCodeMinOrderAmount = config.min_order_amount
        ? (config.min_order_amount / 100).toString()
        : '';
      newForm.promoCodeMaxDiscount = config.max_discount
        ? (config.max_discount / 100).toString()
        : '';
    } else if (isThresholdDiscountConfig(config)) {
      newForm.thresholdMinAmount = ((config.min_amount || 0) / 100).toString();
      newForm.thresholdDiscountType = config.discount_type || 'percentage';
      newForm.thresholdDiscountValue = config.discount_type === 'percentage'
        ? (config.discount_value || 0).toString()
        : ((config.discount_value || 0) / 100).toString();
    }

    setForm(newForm);
    setWizardStep(2); // Go directly to config step when editing
    setShowWizard(true);
  }, []);

  const closeWizard = useCallback(() => {
    setShowWizard(false);
    setEditingOffer(null);
    setForm(initialFormState);
    setWizardStep(1);
  }, []);

  const openCreateWizard = useCallback((type?: OfferType) => {
    setForm({ ...initialFormState, offerType: type || 'promo_code' });
    setWizardStep(type ? 2 : 1);
    setShowWizard(true);
  }, []);

  // Stats
  const activeCount = offers.filter((o) => o.is_active).length;
  const totalUses = offers.reduce((sum, o) => sum + (o.current_uses || 0), 0);
  const totalDiscount = offers.reduce((sum, o) => sum + (o.total_discount_given || 0), 0);

  return {
    offers,
    categories,
    menuItems,
    loading,
    saving,
    showWizard,
    editingOffer,
    form,
    setForm,
    wizardStep,
    setWizardStep,
    activeCount,
    totalUses,
    totalDiscount,
    handleSubmit,
    toggleActive,
    deleteOffer,
    openEditWizard,
    closeWizard,
    openCreateWizard,
  };
}

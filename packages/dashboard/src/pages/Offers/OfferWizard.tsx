import { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Package, Gift, Clock, Tag, TrendingUp, Plus, Minus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { OfferType, MenuItem, OfferWithItems, CategoryOption } from '@foodtruck/shared';
import { OFFER_TYPE_LABELS, OFFER_TYPE_DESCRIPTIONS, formatPrice } from '@foodtruck/shared';
import type { OfferFormState, BundleCategoryConfig, CategoryWithOptionGroups } from './useOffers';

interface OfferWizardProps {
  editingOffer: OfferWithItems | null;
  form: OfferFormState;
  categories: CategoryWithOptionGroups[];
  menuItems: MenuItem[];
  step: number;
  saving: boolean;
  onFormChange: (form: OfferFormState) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

// Get size options for a category (first required single-selection group)
function getSizeOptions(category: CategoryWithOptionGroups | undefined): CategoryOption[] | null {
  if (!category?.category_option_groups) return null;

  // Find the first required single-selection group (=size group)
  const sizeGroup = category.category_option_groups
    .filter(g => g.is_required && !g.is_multiple)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];

  if (!sizeGroup?.category_options?.length) return null;

  return sizeGroup.category_options.filter(o => o.is_available !== false);
}

const typeIcons: Record<OfferType, typeof Package> = {
  bundle: Package,
  buy_x_get_y: Gift,
  happy_hour: Clock,
  promo_code: Tag,
  threshold_discount: TrendingUp,
};

const DAYS = [
  { value: 0, label: 'Dim' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
];

export function OfferWizard({
  editingOffer,
  form,
  categories,
  menuItems,
  step,
  saving,
  onFormChange,
  onStepChange,
  onSubmit,
  onClose,
}: OfferWizardProps) {
  const updateForm = (updates: Partial<OfferFormState>) => {
    onFormChange({ ...form, ...updates });
  };

  const selectOfferType = (type: OfferType) => {
    updateForm({ offerType: type });
    onStepChange(2);
  };

  const toggleDay = (day: number) => {
    const newDays = form.daysOfWeek.includes(day)
      ? form.daysOfWeek.filter((d) => d !== day)
      : [...form.daysOfWeek, day];
    updateForm({ daysOfWeek: newDays });
  };

  const addBundleItem = () => {
    if (menuItems.length > 0) {
      updateForm({
        bundleItems: [...form.bundleItems, { menuItemId: menuItems[0].id, quantity: 1 }],
      });
    }
  };

  const updateBundleItem = (index: number, field: 'menuItemId' | 'quantity', value: string | number) => {
    const newItems = [...form.bundleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    updateForm({ bundleItems: newItems });
  };

  const removeBundleItem = (index: number) => {
    updateForm({ bundleItems: form.bundleItems.filter((_, i) => i !== index) });
  };

  const toggleTriggerItem = (itemId: string) => {
    const newItems = form.triggerItems.includes(itemId)
      ? form.triggerItems.filter((id) => id !== itemId)
      : [...form.triggerItems, itemId];
    updateForm({ triggerItems: newItems });
  };

  const toggleRewardItem = (itemId: string) => {
    const newItems = form.rewardItems.includes(itemId)
      ? form.rewardItems.filter((id) => id !== itemId)
      : [...form.rewardItems, itemId];
    updateForm({ rewardItems: newItems });
  };

  // Bundle category functions
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  const addBundleCategory = () => {
    if (categories.length > 0) {
      // Find a category not yet used in any bundle choice
      const usedCategoryIds = form.bundleCategories.flatMap(bc => bc.categoryIds);
      const availableCategory = categories.find(c => !usedCategoryIds.includes(c.id));
      if (availableCategory) {
        updateForm({
          bundleCategories: [
            ...form.bundleCategories,
            {
              categoryIds: [availableCategory.id],
              quantity: 1,
              label: '',
              excludedItems: [],
              supplements: {},
              excludedSizes: {},
            },
          ],
        });
      }
    }
  };

  const toggleCategoryInChoice = (choiceIndex: number, categoryId: string) => {
    const choice = form.bundleCategories[choiceIndex];
    const isSelected = choice.categoryIds.includes(categoryId);

    if (isSelected && choice.categoryIds.length === 1) {
      // Can't remove the last category
      return;
    }

    const newCategoryIds = isSelected
      ? choice.categoryIds.filter(id => id !== categoryId)
      : [...choice.categoryIds, categoryId];

    // When adding a category, keep existing config; when removing, filter out items from removed category
    const removedCategoryItems = isSelected
      ? menuItems.filter(item => item.category_id === categoryId).map(i => i.id)
      : [];

    const newExcludedItems = isSelected
      ? choice.excludedItems.filter(id => !removedCategoryItems.includes(id))
      : choice.excludedItems;

    // Filter supplements to remove items from removed category
    const newSupplements = isSelected
      ? Object.fromEntries(
          Object.entries(choice.supplements).filter(([key]) => {
            const itemId = key.split(':')[0];
            return !removedCategoryItems.includes(itemId);
          })
        )
      : choice.supplements;

    updateBundleCategory(choiceIndex, {
      categoryIds: newCategoryIds,
      excludedItems: newExcludedItems,
      supplements: newSupplements,
    });
  };

  const updateBundleCategory = (index: number, updates: Partial<BundleCategoryConfig>) => {
    const newCategories = [...form.bundleCategories];
    newCategories[index] = { ...newCategories[index], ...updates };
    updateForm({ bundleCategories: newCategories });
  };

  const removeBundleCategory = (index: number) => {
    updateForm({ bundleCategories: form.bundleCategories.filter((_, i) => i !== index) });
  };

  const toggleExcludedItem = (catIndex: number, itemId: string) => {
    const cat = form.bundleCategories[catIndex];
    const newExcluded = cat.excludedItems.includes(itemId)
      ? cat.excludedItems.filter(id => id !== itemId)
      : [...cat.excludedItems, itemId];
    updateBundleCategory(catIndex, { excludedItems: newExcluded });
  };

  const setItemSupplement = (catIndex: number, itemId: string, price: number | null) => {
    const cat = form.bundleCategories[catIndex];
    const newSupplements = { ...cat.supplements };
    if (price === null || price === 0) {
      delete newSupplements[itemId];
    } else {
      newSupplements[itemId] = price;
    }
    updateBundleCategory(catIndex, { supplements: newSupplements });
  };

  const toggleExcludedSize = (catIndex: number, itemId: string, sizeId: string) => {
    const cat = form.bundleCategories[catIndex];
    const currentExcluded = cat.excludedSizes?.[itemId] || [];
    const newExcludedSizes = { ...cat.excludedSizes };

    if (currentExcluded.includes(sizeId)) {
      // Remove from excluded
      newExcludedSizes[itemId] = currentExcluded.filter(id => id !== sizeId);
      if (newExcludedSizes[itemId].length === 0) {
        delete newExcludedSizes[itemId];
      }
    } else {
      // Add to excluded
      newExcludedSizes[itemId] = [...currentExcluded, sizeId];
    }
    updateBundleCategory(catIndex, { excludedSizes: newExcludedSizes });
  };

  const isSizeExcluded = (catIndex: number, itemId: string, sizeId: string): boolean => {
    const cat = form.bundleCategories[catIndex];
    return cat.excludedSizes?.[itemId]?.includes(sizeId) || false;
  };

  const getItemsForCategories = (categoryIds: string[]) => {
    return menuItems.filter(item => item.category_id && categoryIds.includes(item.category_id) && item.is_available);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {step > 1 && !editingOffer && (
              <button
                onClick={() => onStepChange(step - 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Type */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Choisissez le type d'offre a creer</p>
              <div className="grid gap-3">
                {(Object.keys(OFFER_TYPE_LABELS) as OfferType[]).map((type) => {
                  const Icon = typeIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => selectOfferType(type)}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{OFFER_TYPE_LABELS[type]}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{OFFER_TYPE_DESCRIPTIONS[type]}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure Offer */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'offre *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    className="input"
                    placeholder="Ex: Menu Midi, Code Bienvenue..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Description interne..."
                  />
                </div>
              </div>

              {/* Type-specific config */}
              {form.offerType === 'bundle' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Configuration de la formule</h3>

                  {/* Bundle type selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm({ bundleType: 'category_choice' })}
                      className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.bundleType === 'category_choice'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">Choix par catégorie</div>
                      <div className="text-xs text-gray-500 mt-0.5">1 entrée + 1 plat + 1 boisson</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm({ bundleType: 'specific_items' })}
                      className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.bundleType === 'specific_items'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">Articles fixes</div>
                      <div className="text-xs text-gray-500 mt-0.5">Articles spécifiques uniquement</div>
                    </button>
                  </div>

                  {/* Fixed price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix fixe de la formule *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={form.bundleFixedPrice}
                        onChange={(e) => updateForm({ bundleFixedPrice: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input pr-8"
                        placeholder="15.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Category choice mode */}
                  {form.bundleType === 'category_choice' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégories de la formule *
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Le client choisira 1 article par choix. Utilisez "OU" pour regrouper plusieurs catégories en un seul choix.
                      </p>
                      <div className="space-y-3">
                        {form.bundleCategories.map((bundleCat, catIndex) => {
                          const selectedCategories = categories.filter(c => bundleCat.categoryIds.includes(c.id));
                          const items = getItemsForCategories(bundleCat.categoryIds);
                          // Get size options from the first category that has them
                          const categoryWithSizes = selectedCategories.find(c => getSizeOptions(c));
                          const sizeOptions = categoryWithSizes ? getSizeOptions(categoryWithSizes) : null;
                          const isExpanded = expandedCategory === catIndex;
                          const eligibleCount = items.filter(i => !bundleCat.excludedItems.includes(i.id)).length;
                          const supplementCount = Object.keys(bundleCat.supplements).length;
                          const categoryNames = selectedCategories.map(c => c.name).join(' OU ');

                          return (
                            <div key={catIndex} className="border rounded-lg overflow-hidden">
                              {/* Category header with multi-select */}
                              <div className="p-3 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Choix {catIndex + 1}: {categoryNames || 'Sélectionnez une catégorie'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeBundleCategory(catIndex)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {/* Category checkboxes */}
                                <div className="flex flex-wrap gap-2">
                                  {categories.map((cat) => {
                                    const isSelected = bundleCat.categoryIds.includes(cat.id);
                                    const isUsedElsewhere = !isSelected && form.bundleCategories.some(
                                      (bc, idx) => idx !== catIndex && bc.categoryIds.includes(cat.id)
                                    );
                                    return (
                                      <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => !isUsedElsewhere && toggleCategoryInChoice(catIndex, cat.id)}
                                        disabled={isUsedElsewhere}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                          isSelected
                                            ? 'bg-primary-500 text-white border-primary-500'
                                            : isUsedElsewhere
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                                        }`}
                                      >
                                        {cat.name}
                                      </button>
                                    );
                                  })}
                                </div>
                                {bundleCat.categoryIds.length > 1 && (
                                  <p className="text-xs text-amber-600 mt-2">
                                    Le client pourra choisir un article parmi {categoryNames}
                                  </p>
                                )}
                              </div>

                              {/* Clickable section to expand/configure items */}
                              <button
                                type="button"
                                onClick={() => setExpandedCategory(isExpanded ? null : catIndex)}
                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-t"
                              >
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                    {eligibleCount} article{eligibleCount > 1 ? 's' : ''} éligible{eligibleCount > 1 ? 's' : ''}
                                  </span>
                                  {supplementCount > 0 && (
                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                      {supplementCount} avec supplément
                                    </span>
                                  )}
                                  {sizeOptions && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                      {sizeOptions.length} taille{sizeOptions.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                                  {isExpanded ? 'Fermer' : 'Configurer'}
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>

                              {/* Expanded: item configuration */}
                              {isExpanded && items.length > 0 && (
                                <div className="p-3 border-t space-y-2">
                                  {/* Header explanation */}
                                  <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b">
                                    <span>Cochez les articles inclus dans la formule</span>
                                    <span className="text-right">Supplément client</span>
                                  </div>
                                  <p className="text-xs text-gray-400 italic">
                                    {sizeOptions
                                      ? 'Le supplément par taille s\'ajoute au prix fixe si le client choisit cet article'
                                      : 'Le supplément s\'ajoute au prix fixe si le client choisit cet article (ex: +2€ pour un plat premium)'}
                                  </p>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {items.map((item) => {
                                    const isExcluded = bundleCat.excludedItems.includes(item.id);
                                    const supplement = bundleCat.supplements[item.id];

                                    return (
                                      <div
                                        key={item.id}
                                        className={`p-2 rounded-lg ${
                                          isExcluded ? 'bg-gray-100 opacity-60' : 'bg-white border'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          {/* Checkbox: included */}
                                          <button
                                            type="button"
                                            onClick={() => toggleExcludedItem(catIndex, item.id)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                              !isExcluded ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                                            }`}
                                          >
                                            {!isExcluded && <Check className="w-3 h-3" />}
                                          </button>

                                          {/* Item name */}
                                          <div className="flex-1 min-w-0">
                                            <span className={`text-sm ${isExcluded ? 'line-through text-gray-400' : ''}`}>
                                              {item.name}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">
                                              ({formatPrice(item.price)})
                                            </span>
                                          </div>

                                          {/* Single supplement input (no sizes) */}
                                          {!isExcluded && !sizeOptions && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-gray-500">+</span>
                                              <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={supplement ? (supplement / 100).toString() : ''}
                                                onChange={(e) => {
                                                  const val = parseFloat(e.target.value);
                                                  setItemSupplement(catIndex, item.id, isNaN(val) || val === 0 ? null : Math.round(val * 100));
                                                }}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                className="w-16 text-sm px-2 py-1 border rounded text-right"
                                                placeholder="0"
                                              />
                                              <span className="text-xs text-gray-500">€</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Per-size supplement inputs with enable/disable */}
                                        {!isExcluded && sizeOptions && (
                                          <div className="mt-2 ml-8 flex flex-wrap gap-2">
                                            {sizeOptions.map((size) => {
                                              const sizeKey = `${item.id}:${size.id}`;
                                              const sizeSupplement = bundleCat.supplements[sizeKey];
                                              const sizeIsExcluded = isSizeExcluded(catIndex, item.id, size.id);
                                              return (
                                                <div
                                                  key={size.id}
                                                  className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                                                    sizeIsExcluded ? 'bg-gray-100 opacity-60' : 'bg-gray-50'
                                                  }`}
                                                >
                                                  {/* Size enable/disable checkbox */}
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleExcludedSize(catIndex, item.id, size.id)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                                      !sizeIsExcluded ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
                                                    }`}
                                                  >
                                                    {!sizeIsExcluded && <Check className="w-2.5 h-2.5" />}
                                                  </button>
                                                  <span className={`text-xs font-medium ${sizeIsExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                                    {size.name}
                                                  </span>
                                                  {!sizeIsExcluded && (
                                                    <>
                                                      <span className="text-xs text-gray-400">+</span>
                                                      <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={sizeSupplement ? (sizeSupplement / 100).toString() : ''}
                                                        onChange={(e) => {
                                                          const val = parseFloat(e.target.value);
                                                          setItemSupplement(catIndex, sizeKey, isNaN(val) || val === 0 ? null : Math.round(val * 100));
                                                        }}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className="w-14 text-xs px-1.5 py-0.5 border rounded text-right"
                                                        placeholder="0"
                                                      />
                                                      <span className="text-xs text-gray-400">€</span>
                                                    </>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  </div>
                                </div>
                              )}
                              {isExpanded && items.length === 0 && (
                                <div className="p-3 border-t text-sm text-gray-500 text-center">
                                  Aucun article dans {bundleCat.categoryIds.length > 1 ? 'ces catégories' : 'cette catégorie'}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {form.bundleCategories.length < categories.length && (
                          <button
                            type="button"
                            onClick={addBundleCategory}
                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 py-2"
                          >
                            <Plus className="w-4 h-4" />
                            Ajouter une catégorie
                          </button>
                        )}
                      </div>

                      {/* Free options toggle */}
                      <label className="flex items-center gap-2 mt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.bundleFreeOptions}
                          onChange={(e) => updateForm({ bundleFreeOptions: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          Suppléments gratuits sur les articles du menu
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 ml-6">
                        Si coché, les toppings/suppléments ajoutés par le client sont offerts
                      </p>
                    </div>
                  )}

                  {/* Specific items mode (legacy) */}
                  {form.bundleType === 'specific_items' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Articles de la formule *
                      </label>
                      <div className="space-y-2">
                        {form.bundleItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={item.menuItemId}
                              onChange={(e) => updateBundleItem(index, 'menuItemId', e.target.value)}
                              className="input flex-1"
                            >
                              {menuItems.map((mi) => (
                                <option key={mi.id} value={mi.id}>
                                  {mi.name} ({formatPrice(mi.price)})
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateBundleItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateBundleItem(index, 'quantity', item.quantity + 1)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeBundleItem(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addBundleItem}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter un article
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.offerType === 'buy_x_get_y' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Configuration X achetés = Y offert</h3>

                  {/* Mode selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm({ buyXGetYType: 'category_choice' })}
                      className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.buyXGetYType === 'category_choice'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">Par catégorie</div>
                      <div className="text-xs text-gray-500 mt-0.5">2 pizzas = 1 boisson offerte</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm({ buyXGetYType: 'specific_items' })}
                      className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.buyXGetYType === 'specific_items'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">Articles spécifiques</div>
                      <div className="text-xs text-gray-500 mt-0.5">Articles précis uniquement</div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantité requise
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.triggerQuantity}
                        onChange={(e) => updateForm({ triggerQuantity: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantité offerte
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.rewardQuantity}
                        onChange={(e) => updateForm({ rewardQuantity: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Category choice mode */}
                  {form.buyXGetYType === 'category_choice' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Catégories déclencheurs (articles à acheter)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Sélectionnez une ou plusieurs catégories. Le client doit acheter des articles de ces catégories.
                        </p>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50">
                          {categories.map((cat) => {
                            const isSelected = form.triggerCategoryIds.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  const newIds = isSelected
                                    ? form.triggerCategoryIds.filter(id => id !== cat.id)
                                    : [...form.triggerCategoryIds, cat.id];
                                  updateForm({ triggerCategoryIds: newIds });
                                }}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                                  isSelected
                                    ? 'bg-primary-500 text-white border-primary-500'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                                }`}
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                        {form.triggerCategoryIds.length > 1 && (
                          <p className="text-xs text-amber-600 mt-2">
                            Les articles de {categories.filter(c => form.triggerCategoryIds.includes(c.id)).map(c => c.name).join(' OU ')} comptent
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Catégories récompense (articles offerts)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Le client pourra choisir un article parmi ces catégories.
                        </p>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50">
                          {categories.map((cat) => {
                            const isSelected = form.rewardCategoryIds.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  const newIds = isSelected
                                    ? form.rewardCategoryIds.filter(id => id !== cat.id)
                                    : [...form.rewardCategoryIds, cat.id];
                                  updateForm({ rewardCategoryIds: newIds });
                                }}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                                  isSelected
                                    ? 'bg-green-500 text-white border-green-500'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                                }`}
                              >
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                        {form.rewardCategoryIds.length > 1 && (
                          <p className="text-xs text-green-600 mt-2">
                            Le client choisira parmi {categories.filter(c => form.rewardCategoryIds.includes(c.id)).map(c => c.name).join(' OU ')}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Specific items mode */}
                  {form.buyXGetYType === 'specific_items' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Articles déclencheurs (sélectionnez un ou plusieurs)
                        </label>
                        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                          {menuItems.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.triggerItems.includes(item.id)}
                                onChange={() => toggleTriggerItem(item.id)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{item.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Article(s) offert(s)
                        </label>
                        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                          {menuItems.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.rewardItems.includes(item.id)}
                                onChange={() => toggleRewardItem(item.id)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{item.name} ({formatPrice(item.price)})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {form.offerType === 'happy_hour' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Configuration Happy Hour</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heure de debut *
                      </label>
                      <input
                        type="time"
                        value={form.timeStart}
                        onChange={(e) => updateForm({ timeStart: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heure de fin *
                      </label>
                      <input
                        type="time"
                        value={form.timeEnd}
                        onChange={(e) => updateForm({ timeEnd: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jours actifs *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            form.daysOfWeek.includes(day.value)
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de reduction
                      </label>
                      <select
                        value={form.happyHourDiscountType}
                        onChange={(e) => updateForm({ happyHourDiscountType: e.target.value as 'percentage' | 'fixed' })}
                        className="input"
                      >
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (EUR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valeur
                      </label>
                      <input
                        type="number"
                        value={form.happyHourDiscountValue}
                        onChange={(e) => updateForm({ happyHourDiscountValue: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                        placeholder={form.happyHourDiscountType === 'percentage' ? '20' : '5.00'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Appliquer sur
                    </label>
                    <select
                      value={form.happyHourAppliesTo}
                      onChange={(e) => updateForm({ happyHourAppliesTo: e.target.value as 'all' | 'category' })}
                      className="input"
                    >
                      <option value="all">Tout le menu</option>
                      <option value="category">Une categorie specifique</option>
                    </select>
                  </div>
                  {form.happyHourAppliesTo === 'category' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categorie
                      </label>
                      <select
                        value={form.happyHourCategoryId}
                        onChange={(e) => updateForm({ happyHourCategoryId: e.target.value })}
                        className="input"
                      >
                        <option value="">Selectionnez une categorie</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {form.offerType === 'promo_code' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Configuration du code promo</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code promo *
                    </label>
                    <input
                      type="text"
                      value={form.promoCode}
                      onChange={(e) => updateForm({ promoCode: e.target.value.toUpperCase() })}
                      className="input uppercase"
                      placeholder="BIENVENUE"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de reduction
                      </label>
                      <select
                        value={form.promoCodeDiscountType}
                        onChange={(e) => updateForm({ promoCodeDiscountType: e.target.value as 'percentage' | 'fixed' })}
                        className="input"
                      >
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (EUR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valeur
                      </label>
                      <input
                        type="number"
                        value={form.promoCodeDiscountValue}
                        onChange={(e) => updateForm({ promoCodeDiscountValue: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                        placeholder={form.promoCodeDiscountType === 'percentage' ? '10' : '5.00'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commande minimum (optionnel)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.promoCodeMinOrderAmount}
                        onChange={(e) => updateForm({ promoCodeMinOrderAmount: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                        placeholder="15.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reduction max (optionnel)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.promoCodeMaxDiscount}
                        onChange={(e) => updateForm({ promoCodeMaxDiscount: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                        placeholder="10.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.offerType === 'threshold_discount' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Configuration de la remise au palier</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant minimum de commande *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={form.thresholdMinAmount}
                        onChange={(e) => updateForm({ thresholdMinAmount: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input pr-8"
                        placeholder="25.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">EUR</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de reduction
                      </label>
                      <select
                        value={form.thresholdDiscountType}
                        onChange={(e) => updateForm({ thresholdDiscountType: e.target.value as 'percentage' | 'fixed' })}
                        className="input"
                      >
                        <option value="percentage">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (EUR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valeur
                      </label>
                      <input
                        type="number"
                        value={form.thresholdDiscountValue}
                        onChange={(e) => updateForm({ thresholdDiscountValue: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input"
                        placeholder={form.thresholdDiscountType === 'percentage' ? '10' : '5.00'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Options */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Options avancees</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de debut (optionnel)
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateForm({ startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin (optionnel)
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => updateForm({ endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Utilisations max (optionnel)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxUses}
                      onChange={(e) => updateForm({ maxUses: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="input"
                      placeholder="Illimite"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max par client
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxUsesPerCustomer}
                      onChange={(e) => updateForm({ maxUsesPerCustomer: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="input"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.stackable}
                    onChange={(e) => updateForm({ stackable: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Cumulable avec d'autres offres</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          {step === 2 && (
            <button
              onClick={onSubmit}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {editingOffer ? 'Modifier' : 'Creer l\'offre'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

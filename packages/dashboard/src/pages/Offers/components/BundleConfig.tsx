import { useState } from 'react';
import { Plus, Minus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { WizardFormProps } from './wizardTypes';
import { getSizeOptions, getItemsForCategories } from './wizardTypes';
import type { BundleCategoryConfig } from '../useOffers';

export function BundleConfig({ form, categories, menuItems, updateForm }: WizardFormProps) {
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

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

  const addBundleCategory = () => {
    if (categories.length > 0) {
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

    if (isSelected && choice.categoryIds.length === 1) return;

    const newCategoryIds = isSelected
      ? choice.categoryIds.filter(id => id !== categoryId)
      : [...choice.categoryIds, categoryId];

    const removedCategoryItems = isSelected
      ? menuItems.filter(item => item.category_id === categoryId).map(i => i.id)
      : [];

    const newExcludedItems = isSelected
      ? choice.excludedItems.filter(id => !removedCategoryItems.includes(id))
      : choice.excludedItems;

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
      newExcludedSizes[itemId] = currentExcluded.filter(id => id !== sizeId);
      if (newExcludedSizes[itemId].length === 0) {
        delete newExcludedSizes[itemId];
      }
    } else {
      newExcludedSizes[itemId] = [...currentExcluded, sizeId];
    }
    updateBundleCategory(catIndex, { excludedSizes: newExcludedSizes });
  };

  const isSizeExcluded = (catIndex: number, itemId: string, sizeId: string): boolean => {
    const cat = form.bundleCategories[catIndex];
    return cat.excludedSizes?.[itemId]?.includes(sizeId) || false;
  };

  return (
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
          <div className="font-semibold">Choix par categorie</div>
          <div className="text-xs text-gray-500 mt-0.5">1 entree + 1 plat + 1 boisson</div>
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
          <div className="text-xs text-gray-500 mt-0.5">Articles specifiques uniquement</div>
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">EUR</span>
        </div>
      </div>

      {/* Category choice mode */}
      {form.bundleType === 'category_choice' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categories de la formule *
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Le client choisira 1 article par choix. Utilisez "OU" pour regrouper plusieurs categories en un seul choix.
          </p>
          <div className="space-y-3">
            {form.bundleCategories.map((bundleCat, catIndex) => {
              const selectedCategories = categories.filter(c => bundleCat.categoryIds.includes(c.id));
              const items = getItemsForCategories(menuItems, bundleCat.categoryIds);
              const categoryWithSizes = selectedCategories.find(c => getSizeOptions(c));
              const sizeOptions = categoryWithSizes ? getSizeOptions(categoryWithSizes) : null;
              const isExpanded = expandedCategory === catIndex;
              const eligibleCount = items.filter(i => !bundleCat.excludedItems.includes(i.id)).length;
              const supplementCount = Object.keys(bundleCat.supplements).length;
              const categoryNames = selectedCategories.map(c => c.name).join(' OU ');

              return (
                <div key={catIndex} className="border rounded-lg overflow-hidden">
                  {/* Category header */}
                  <div className="p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Choix {catIndex + 1}: {categoryNames || 'Selectionnez une categorie'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBundleCategory(catIndex)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

                  {/* Expand/collapse button */}
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : catIndex)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-t"
                  >
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {eligibleCount} article{eligibleCount > 1 ? 's' : ''} eligible{eligibleCount > 1 ? 's' : ''}
                      </span>
                      {supplementCount > 0 && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                          {supplementCount} avec supplement
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

                  {/* Expanded items */}
                  {isExpanded && items.length > 0 && (
                    <div className="p-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b">
                        <span>Cochez les articles inclus dans la formule</span>
                        <span className="text-right">Supplement client</span>
                      </div>
                      <p className="text-xs text-gray-400 italic">
                        {sizeOptions
                          ? 'Le supplement par taille s\'ajoute au prix fixe si le client choisit cet article'
                          : 'Le supplement s\'ajoute au prix fixe si le client choisit cet article (ex: +2EUR pour un plat premium)'}
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {items.map((item) => {
                          const isExcluded = bundleCat.excludedItems.includes(item.id);
                          const supplement = bundleCat.supplements[item.id];

                          return (
                            <div
                              key={item.id}
                              className={`p-2 rounded-lg ${isExcluded ? 'bg-gray-100 opacity-60' : 'bg-white border'}`}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleExcludedItem(catIndex, item.id)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                    !isExcluded ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                                  }`}
                                >
                                  {!isExcluded && <Check className="w-3 h-3" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${isExcluded ? 'line-through text-gray-400' : ''}`}>
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2">({formatPrice(item.price)})</span>
                                </div>
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
                                    <span className="text-xs text-gray-500">EUR</span>
                                  </div>
                                )}
                              </div>

                              {/* Per-size inputs */}
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
                                            <span className="text-xs text-gray-400">EUR</span>
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
                      Aucun article dans {bundleCat.categoryIds.length > 1 ? 'ces categories' : 'cette categorie'}
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
                Ajouter une categorie
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
            <span className="text-sm text-gray-700">Supplements gratuits sur les articles du menu</span>
          </label>
          <p className="text-xs text-gray-500 ml-6">
            Si coche, les toppings/supplements ajoutes par le client sont offerts
          </p>
        </div>
      )}

      {/* Specific items mode */}
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
  );
}

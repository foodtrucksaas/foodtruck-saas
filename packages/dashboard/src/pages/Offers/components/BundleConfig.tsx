import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check, HelpCircle, Eye } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { WizardFormProps } from './wizardTypes';
import { getSizeOptions, getItemsForCategories } from './wizardTypes';
import type { BundleCategoryConfig } from '../useOffers';

// Simplified Bundle Configuration with guided UX
export function BundleConfig({ form, categories, menuItems, updateForm }: WizardFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedChoice, setExpandedChoice] = useState<number | null>(null);

  // Helper to add a new choice to the bundle
  const addChoice = () => {
    const usedCategoryIds = form.bundleCategories.flatMap((bc) => bc.categoryIds);
    const availableCategory = categories.find((c) => !usedCategoryIds.includes(c.id));
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
  };

  // Helper to remove a choice
  const removeChoice = (index: number) => {
    updateForm({ bundleCategories: form.bundleCategories.filter((_, i) => i !== index) });
  };

  // Helper to update a choice's category
  const updateChoiceCategory = (index: number, categoryId: string) => {
    const newCategories = [...form.bundleCategories];
    newCategories[index] = {
      ...newCategories[index],
      categoryIds: [categoryId],
      excludedItems: [],
      supplements: {},
      excludedSizes: {},
    };
    updateForm({ bundleCategories: newCategories });
  };

  // Helper to update category config
  const updateBundleCategory = (index: number, updates: Partial<BundleCategoryConfig>) => {
    const newCategories = [...form.bundleCategories];
    newCategories[index] = { ...newCategories[index], ...updates };
    updateForm({ bundleCategories: newCategories });
  };

  // Toggle item exclusion
  const toggleExcludedItem = (catIndex: number, itemId: string) => {
    const cat = form.bundleCategories[catIndex];
    const newExcluded = cat.excludedItems.includes(itemId)
      ? cat.excludedItems.filter((id) => id !== itemId)
      : [...cat.excludedItems, itemId];
    updateBundleCategory(catIndex, { excludedItems: newExcluded });
  };

  // Set item supplement price
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

  // Calculate what the bundle would be worth at regular prices
  const calculateRegularTotal = () => {
    let total = 0;
    form.bundleCategories.forEach((choice) => {
      const items = getItemsForCategories(menuItems, choice.categoryIds);
      const eligibleItems = items.filter((i) => !choice.excludedItems.includes(i.id));
      if (eligibleItems.length > 0) {
        // Use average price of eligible items
        const avgPrice = eligibleItems.reduce((sum, i) => sum + i.price, 0) / eligibleItems.length;
        total += avgPrice;
      }
    });
    return total;
  };

  const regularTotal = calculateRegularTotal();
  const bundlePrice = parseFloat(form.bundleFixedPrice || '0') * 100;
  const savings = regularTotal - bundlePrice;

  return (
    <div className="space-y-6">
      {/* Live Preview Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center gap-2 text-blue-700 mb-3">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Apercu de votre formule</span>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-900">{form.name || 'Ma Formule'}</span>
            <span className="text-lg font-bold text-primary-600">
              {form.bundleFixedPrice ? `${form.bundleFixedPrice}€` : '--€'}
            </span>
          </div>
          <div className="space-y-1">
            {form.bundleCategories.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Ajoutez des elements ci-dessous</p>
            ) : (
              form.bundleCategories.map((choice, index) => {
                const cat = categories.find((c) => choice.categoryIds.includes(c.id));
                return (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                      {index + 1}
                    </span>
                    <span>{choice.label || cat?.name || 'Element au choix'}</span>
                  </div>
                );
              })
            )}
          </div>
          {savings > 0 && bundlePrice > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Prix normal: <span className="line-through">{formatPrice(regularTotal)}</span>
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                Economie de {formatPrice(savings)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price Input - Always visible and prominent */}
      <div className="bg-white rounded-xl p-4 border-2 border-primary-200">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Prix de la formule</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[200px]">
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.bundleFixedPrice}
              onChange={(e) => updateForm({ bundleFixedPrice: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input text-xl font-semibold pr-8 h-14"
              placeholder="15.00"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              EUR
            </span>
          </div>
          {regularTotal > 0 && (
            <div className="text-sm text-gray-500">
              <span>Valeur normale: </span>
              <span className="font-medium">{formatPrice(regularTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bundle Choices - Simplified */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Que contient la formule ?</h3>
            <p className="text-sm text-gray-500">Ajoutez les elements inclus</p>
          </div>
          {form.bundleCategories.length < categories.length && (
            <button
              type="button"
              onClick={addChoice}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          )}
        </div>

        {form.bundleCategories.length === 0 ? (
          <button
            type="button"
            onClick={addChoice}
            className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
          >
            <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <span className="text-gray-600 font-medium">Ajouter le premier element</span>
            <p className="text-sm text-gray-400 mt-1">Ex: Entree, Plat, Dessert, Boisson...</p>
          </button>
        ) : (
          <div className="space-y-3">
            {form.bundleCategories.map((choice, index) => {
              const items = getItemsForCategories(menuItems, choice.categoryIds);
              const eligibleCount = items.filter(
                (i) => !choice.excludedItems.includes(i.id)
              ).length;
              const supplementCount = Object.keys(choice.supplements).length;
              const isExpanded = expandedChoice === index;

              return (
                <div key={index} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  {/* Choice Header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Number badge */}
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* Category dropdown */}
                      <div className="flex-1">
                        <select
                          value={choice.categoryIds[0] || ''}
                          onChange={(e) => updateChoiceCategory(index, e.target.value)}
                          className="input font-medium h-12 w-full"
                        >
                          {categories.map((cat) => {
                            const isUsedElsewhere = form.bundleCategories.some(
                              (bc, idx) => idx !== index && bc.categoryIds.includes(cat.id)
                            );
                            return (
                              <option key={cat.id} value={cat.id} disabled={isUsedElsewhere}>
                                {cat.name} {isUsedElsewhere ? '(deja utilise)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeChoice(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quick stats */}
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                        {eligibleCount} article{eligibleCount > 1 ? 's' : ''} disponible
                        {eligibleCount > 1 ? 's' : ''}
                      </span>
                      {supplementCount > 0 && (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                          {supplementCount} avec supplement
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse for advanced options */}
                  {showAdvanced && items.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedChoice(isExpanded ? null : index)}
                        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 border-t text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <span>Personnaliser les articles</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Expanded items list */}
                      {isExpanded && (
                        <div className="p-4 border-t bg-gray-50/50 space-y-2">
                          <p className="text-xs text-gray-500 mb-3">
                            Decochez les articles a exclure, ajoutez des supplements si besoin
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {items.map((item) => {
                              const isExcluded = choice.excludedItems.includes(item.id);
                              const supplement = choice.supplements[item.id];
                              const itemCategory = categories.find(
                                (c) => c.id === item.category_id
                              );
                              const sizeOptions = getSizeOptions(itemCategory);

                              return (
                                <div
                                  key={item.id}
                                  className={`p-3 rounded-lg bg-white border transition-opacity ${
                                    isExcluded ? 'opacity-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleExcludedItem(index, item.id)}
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                        !isExcluded
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'border-gray-300 bg-white'
                                      }`}
                                    >
                                      {!isExcluded && <Check className="w-3 h-3" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <span
                                        className={`text-sm font-medium ${
                                          isExcluded
                                            ? 'line-through text-gray-400'
                                            : 'text-gray-900'
                                        }`}
                                      >
                                        {item.name}
                                      </span>
                                      <span className="text-xs text-gray-400 ml-2">
                                        {formatPrice(item.price)}
                                      </span>
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
                                            setItemSupplement(
                                              index,
                                              item.id,
                                              isNaN(val) || val === 0 ? null : Math.round(val * 100)
                                            );
                                          }}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className="w-16 text-sm px-2 py-1 border rounded text-right"
                                          placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">EUR</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Add more button */}
            {form.bundleCategories.length > 0 &&
              form.bundleCategories.length < categories.length && (
                <button
                  type="button"
                  onClick={addChoice}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-primary-400 hover:bg-primary-50/50 transition-colors text-gray-600 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Ajouter un autre element
                </button>
              )}
          </div>
        )}
      </div>

      {/* Advanced Options Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showAdvanced ? 'Masquer' : 'Afficher'} les options avancees</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500">
              Options avancees pour un controle precis de votre formule
            </p>

            {/* Free options toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.bundleFreeOptions}
                onChange={(e) => updateForm({ bundleFreeOptions: e.target.checked })}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Supplements gratuits</span>
                <p className="text-xs text-gray-500">
                  Les extras/toppings sur les articles sont offerts dans cette formule
                </p>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

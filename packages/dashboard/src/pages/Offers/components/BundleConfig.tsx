import { useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Package,
  Eye,
  ArrowRight,
} from 'lucide-react';
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

  const updateBundleItem = (
    index: number,
    field: 'menuItemId' | 'quantity',
    value: string | number
  ) => {
    const newItems = [...form.bundleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    updateForm({ bundleItems: newItems });
  };

  const removeBundleItem = (index: number) => {
    updateForm({ bundleItems: form.bundleItems.filter((_, i) => i !== index) });
  };

  const addBundleCategory = () => {
    if (categories.length > 0) {
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
    }
  };

  const toggleCategoryInChoice = (choiceIndex: number, categoryId: string) => {
    const choice = form.bundleCategories[choiceIndex];
    const isSelected = choice.categoryIds.includes(categoryId);

    if (isSelected && choice.categoryIds.length === 1) return;

    const newCategoryIds = isSelected
      ? choice.categoryIds.filter((id) => id !== categoryId)
      : [...choice.categoryIds, categoryId];

    const removedCategoryItems = isSelected
      ? menuItems.filter((item) => item.category_id === categoryId).map((i) => i.id)
      : [];

    const newExcludedItems = isSelected
      ? choice.excludedItems.filter((id) => !removedCategoryItems.includes(id))
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
      ? cat.excludedItems.filter((id) => id !== itemId)
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
      newExcludedSizes[itemId] = currentExcluded.filter((id) => id !== sizeId);
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

  // Build live preview text
  const buildPreview = (): { parts: string[]; price: string } | null => {
    const price = form.bundleFixedPrice
      ? `${parseFloat(form.bundleFixedPrice).toFixed(2).replace('.', ',')} EUR`
      : '';

    if (form.bundleType === 'category_choice') {
      if (form.bundleCategories.length === 0) return null;
      const parts = form.bundleCategories.map((bc) => {
        const names = categories.filter((c) => bc.categoryIds.includes(c.id)).map((c) => c.name);
        if (names.length === 0) return '...';
        if (names.length === 1) return `1 ${names[0]}`;
        return `1 ${names.join(' ou ')}`;
      });
      return { parts, price };
    } else {
      if (form.bundleItems.length === 0) return null;
      const parts = form.bundleItems.map((bi) => {
        const item = menuItems.find((m) => m.id === bi.menuItemId);
        return item ? `${bi.quantity}x ${item.name}` : '...';
      });
      return { parts, price };
    }
  };

  const preview = buildPreview();

  return (
    <div className="space-y-5 border-t pt-4">
      {/* Live preview banner */}
      {preview && preview.parts.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary-700 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Apercu de l'offre</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-gray-800">
            {preview.parts.map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-primary-400 font-bold">+</span>}
                <span className="bg-white px-2.5 py-1 rounded-lg border border-primary-200 text-primary-700">
                  {part}
                </span>
              </span>
            ))}
            {preview.price && (
              <>
                <span className="text-primary-400 font-bold mx-1">=</span>
                <span className="bg-primary-600 text-white px-3 py-1 rounded-lg font-bold">
                  {preview.price}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bundle type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comment composer la formule ?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateForm({ bundleType: 'category_choice' })}
            className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
              form.bundleType === 'category_choice'
                ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Le client compose</div>
            <div className="text-xs text-gray-500 mt-0.5">Il choisit 1 article par categorie</div>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ bundleType: 'specific_items' })}
            className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
              form.bundleType === 'specific_items'
                ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Articles predetermines</div>
            <div className="text-xs text-gray-500 mt-0.5">Vous definissez les articles exacts</div>
          </button>
        </div>
      </div>

      {/* Fixed price - prominent position */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prix de la formule *</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="number"
            step="0.01"
            value={form.bundleFixedPrice}
            onChange={(e) => updateForm({ bundleFixedPrice: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input pl-10 pr-14 text-lg font-semibold"
            placeholder="12.90"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
            EUR
          </span>
        </div>
      </div>

      {/* Category choice mode */}
      {form.bundleType === 'category_choice' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contenu de la formule *
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Ajoutez les choix que le client pourra faire. Pour chaque choix, il selectionnera 1
                article.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {form.bundleCategories.map((bundleCat, catIndex) => {
              const selectedCategories = categories.filter((c) =>
                bundleCat.categoryIds.includes(c.id)
              );
              const items = getItemsForCategories(menuItems, bundleCat.categoryIds);
              const categoryWithSizes = selectedCategories.find((c) => getSizeOptions(c));
              const sizeOptions = categoryWithSizes ? getSizeOptions(categoryWithSizes) : null;
              const isExpanded = expandedCategory === catIndex;
              const eligibleCount = items.filter(
                (i) => !bundleCat.excludedItems.includes(i.id)
              ).length;
              const supplementCount = Object.keys(bundleCat.supplements).length;
              const categoryNames = selectedCategories.map((c) => c.name).join(' ou ');

              return (
                <div
                  key={catIndex}
                  className="border rounded-xl overflow-hidden bg-white shadow-sm"
                >
                  {/* Choice header with step number */}
                  <div className="p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold">
                          {catIndex + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          {categoryNames
                            ? `Le client choisit 1 ${categoryNames}`
                            : 'Selectionnez une categorie'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBundleCategory(catIndex)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer ce choix"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Category toggles */}
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const isSelected = bundleCat.categoryIds.includes(cat.id);
                        const isUsedElsewhere =
                          !isSelected &&
                          form.bundleCategories.some(
                            (bc, idx) => idx !== catIndex && bc.categoryIds.includes(cat.id)
                          );
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              !isUsedElsewhere && toggleCategoryInChoice(catIndex, cat.id)
                            }
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
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        Le client pourra choisir un article parmi {categoryNames}
                      </p>
                    )}
                  </div>

                  {/* Expand/collapse for fine-tuning */}
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : catIndex)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-t"
                  >
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {eligibleCount} article{eligibleCount > 1 ? 's' : ''} inclus
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
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      {isExpanded ? 'Replier' : 'Personnaliser les articles'}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && items.length > 0 && (
                    <div className="p-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b">
                        <span>Decochez les articles a exclure de ce choix</span>
                        {!sizeOptions && <span className="text-right">Supplement</span>}
                      </div>
                      <p className="text-xs text-gray-400 italic">
                        {sizeOptions
                          ? "Le supplement par taille s'ajoute au prix de la formule si le client choisit cet article"
                          : "Le supplement s'ajoute au prix de la formule (ex : +2 EUR pour un plat premium)"}
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
                                    !isExcluded
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {!isExcluded && <Check className="w-3 h-3" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`text-sm ${isExcluded ? 'line-through text-gray-400' : ''}`}
                                  >
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2">
                                    ({formatPrice(item.price)})
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
                                          catIndex,
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

                              {/* Per-size inputs */}
                              {!isExcluded && sizeOptions && (
                                <div className="mt-2 ml-8 flex flex-wrap gap-2">
                                  {sizeOptions.map((size) => {
                                    const sizeKey = `${item.id}:${size.id}`;
                                    const sizeSupplement = bundleCat.supplements[sizeKey];
                                    const sizeIsExcluded = isSizeExcluded(
                                      catIndex,
                                      item.id,
                                      size.id
                                    );
                                    return (
                                      <div
                                        key={size.id}
                                        className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                                          sizeIsExcluded ? 'bg-gray-100 opacity-60' : 'bg-gray-50'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleExcludedSize(catIndex, item.id, size.id)
                                          }
                                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                            !sizeIsExcluded
                                              ? 'bg-green-500 border-green-500 text-white'
                                              : 'border-gray-300 bg-white'
                                          }`}
                                        >
                                          {!sizeIsExcluded && <Check className="w-2.5 h-2.5" />}
                                        </button>
                                        <span
                                          className={`text-xs font-medium ${sizeIsExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                                        >
                                          {size.name}
                                        </span>
                                        {!sizeIsExcluded && (
                                          <>
                                            <span className="text-xs text-gray-400">+</span>
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              value={
                                                sizeSupplement
                                                  ? (sizeSupplement / 100).toString()
                                                  : ''
                                              }
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setItemSupplement(
                                                  catIndex,
                                                  sizeKey,
                                                  isNaN(val) || val === 0
                                                    ? null
                                                    : Math.round(val * 100)
                                                );
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
                      Aucun article dans{' '}
                      {bundleCat.categoryIds.length > 1 ? 'ces categories' : 'cette categorie'}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add choice button */}
            {form.bundleCategories.length < categories.length && (
              <button
                type="button"
                onClick={addBundleCategory}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter un choix a la formule
              </button>
            )}

            {form.bundleCategories.length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun choix dans la formule</p>
                <p className="text-xs text-gray-400 mt-1">Commencez par ajouter un premier choix</p>
                <button
                  type="button"
                  onClick={addBundleCategory}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Ajouter le premier choix
                </button>
              </div>
            )}
          </div>

          {/* Free options toggle */}
          <label className="flex items-start gap-3 mt-4 cursor-pointer p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              checked={form.bundleFreeOptions}
              onChange={(e) => updateForm({ bundleFreeOptions: e.target.checked })}
              className="rounded border-gray-300 mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Options/supplements offerts</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Si coche, les toppings et supplements ajoutes par le client sont inclus dans le prix
                de la formule
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Specific items mode */}
      {form.bundleType === 'specific_items' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Articles de la formule *
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Selectionnez les articles exacts inclus dans cette formule.
          </p>
          <div className="space-y-2">
            {form.bundleItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 bg-white border rounded-xl p-2">
                <select
                  value={item.menuItemId}
                  onChange={(e) => updateBundleItem(index, 'menuItemId', e.target.value)}
                  className="input flex-1 border-0 bg-transparent"
                >
                  {menuItems.map((mi) => (
                    <option key={mi.id} value={mi.id}>
                      {mi.name} ({formatPrice(mi.price)})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateBundleItem(index, 'quantity', Math.max(1, item.quantity - 1))
                    }
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateBundleItem(index, 'quantity', item.quantity + 1)}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeBundleItem(index)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addBundleItem}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
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

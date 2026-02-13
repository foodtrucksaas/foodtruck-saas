import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { Category } from '@foodtruck/shared';
import type { WizardFormProps } from './wizardTypes';
import { getSizeOptions, getItemsForCategories } from './wizardTypes';
import type { BundleCategoryConfig } from '../useOffers';

export function BundleConfig({ form, categories, menuItems, updateForm }: WizardFormProps) {
  const [expandedChoice, setExpandedChoice] = useState<number | null>(null);

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

  const removeChoice = (index: number) => {
    updateForm({ bundleCategories: form.bundleCategories.filter((_, i) => i !== index) });
  };

  const toggleChoiceCategory = (index: number, categoryId: string) => {
    const newCategories = [...form.bundleCategories];
    const current = newCategories[index].categoryIds;
    const isSelected = current.includes(categoryId);

    if (isSelected && current.length <= 1) return; // Keep at least one

    const newIds = isSelected
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];

    // Remove excluded items/supplements/sizes that belong to removed categories
    const removedIds = current.filter((id) => !newIds.includes(id));
    let newExcluded = newCategories[index].excludedItems;
    let newSupplements = newCategories[index].supplements;
    let newExcludedSizes = newCategories[index].excludedSizes;

    if (removedIds.length > 0) {
      const removedItemIds = new Set(
        menuItems
          .filter((i) => i.category_id && removedIds.includes(i.category_id))
          .map((i) => i.id)
      );
      newExcluded = newExcluded.filter((id) => !removedItemIds.has(id));
      newSupplements = Object.fromEntries(
        Object.entries(newSupplements).filter(([key]) => !removedItemIds.has(key.split(':')[0]))
      );
      newExcludedSizes = Object.fromEntries(
        Object.entries(newExcludedSizes).filter(([key]) => !removedItemIds.has(key))
      );
    }

    newCategories[index] = {
      ...newCategories[index],
      categoryIds: newIds,
      excludedItems: newExcluded,
      supplements: newSupplements,
      excludedSizes: newExcludedSizes,
    };
    updateForm({ bundleCategories: newCategories });
  };

  const updateBundleCategory = (index: number, updates: Partial<BundleCategoryConfig>) => {
    const newCategories = [...form.bundleCategories];
    newCategories[index] = { ...newCategories[index], ...updates };
    updateForm({ bundleCategories: newCategories });
  };

  const toggleExcludedItem = (catIndex: number, itemId: string) => {
    const cat = form.bundleCategories[catIndex];
    const newExcluded = cat.excludedItems.includes(itemId)
      ? cat.excludedItems.filter((id) => id !== itemId)
      : [...cat.excludedItems, itemId];
    updateBundleCategory(catIndex, { excludedItems: newExcluded });
  };

  const setItemSupplement = (catIndex: number, key: string, price: number | null) => {
    const cat = form.bundleCategories[catIndex];
    const newSupplements = { ...cat.supplements };
    if (price === null || price === 0) {
      delete newSupplements[key];
    } else {
      newSupplements[key] = price;
    }
    updateBundleCategory(catIndex, { supplements: newSupplements });
  };

  const toggleExcludedSize = (catIndex: number, itemId: string, sizeId: string) => {
    const cat = form.bundleCategories[catIndex];
    const current = cat.excludedSizes[itemId] || [];
    const newExcluded = current.includes(sizeId)
      ? current.filter((id) => id !== sizeId)
      : [...current, sizeId];
    const newExcludedSizes = { ...cat.excludedSizes };
    if (newExcluded.length === 0) {
      delete newExcludedSizes[itemId];
    } else {
      newExcludedSizes[itemId] = newExcluded;
    }
    updateBundleCategory(catIndex, { excludedSizes: newExcludedSizes });
  };

  return (
    <div className="space-y-4">
      {/* Prix - simple et direct */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Prix de la formule *
        </label>
        <div className="relative w-32">
          <input
            type="number"
            step="0.5"
            min="0"
            value={form.bundleFixedPrice}
            onChange={(e) => updateForm({ bundleFixedPrice: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input h-12 pr-12 text-lg font-medium"
            placeholder="15"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            EUR
          </span>
        </div>
      </div>

      {/* Mini resume */}
      {form.bundleCategories.length >= 2 && form.bundleFixedPrice && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-sm text-primary-700">
          <span className="font-medium">
            {form.bundleCategories
              .map((bc) => {
                const names = bc.categoryIds
                  .map((id) => categories.find((c) => c.id === id)?.name)
                  .filter(Boolean);
                return names.length > 1 ? `(${names.join(' / ')})` : names[0] || '';
              })
              .filter(Boolean)
              .join(' + ')}
          </span>
          <span>=</span>
          <span className="font-bold">{form.bundleFixedPrice}€</span>
        </div>
      )}

      {/* Elements de la formule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Éléments de la formule *
        </label>

        <div className="space-y-2">
          {form.bundleCategories.map((choice, index) => {
            const items = getItemsForCategories(menuItems, choice.categoryIds);
            const eligibleCount = items.filter((i) => !choice.excludedItems.includes(i.id)).length;
            const isExpanded = expandedChoice === index;

            return (
              <div key={index} className="border rounded-lg bg-white">
                <div className="flex items-center gap-2 p-2">
                  <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <CategoryMultiSelect
                    categories={categories}
                    selectedIds={choice.categoryIds}
                    disabledIds={form.bundleCategories
                      .filter((_, idx) => idx !== index)
                      .flatMap((bc) => bc.categoryIds)}
                    onToggle={(catId) => toggleChoiceCategory(index, catId)}
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedChoice(isExpanded ? null : index)}
                    className="flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                  >
                    <span>{isExpanded ? 'Masquer' : 'Articles'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-95"
                    aria-label="Supprimer cet élément"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details des articles (collapsible) */}
                {isExpanded && items.length > 0 && (
                  <div className="border-t px-3 py-2 bg-gray-50 space-y-1">
                    <p className="text-xs text-gray-500 mb-2">
                      {eligibleCount}/{items.length} articles inclus
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {items.map((item) => {
                        const isExcluded = choice.excludedItems.includes(item.id);
                        const supplement = choice.supplements[item.id];
                        const itemCategory = categories.find((c) => c.id === item.category_id);
                        const sizeOptions = getSizeOptions(itemCategory);
                        const excludedSizesForItem = choice.excludedSizes[item.id] || [];

                        return (
                          <div key={item.id}>
                            <div
                              className={`flex items-center gap-2 p-1.5 rounded ${isExcluded ? 'opacity-50' : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleExcludedItem(index, item.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  !isExcluded
                                    ? 'bg-primary-500 border-primary-500 text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {!isExcluded && <Check className="w-2.5 h-2.5" />}
                              </button>
                              <span
                                className={`text-sm flex-1 ${isExcluded ? 'line-through text-gray-400' : ''}`}
                              >
                                {item.name}
                              </span>
                              {!isExcluded && !sizeOptions && (
                                <div className="flex items-center gap-1">
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
                                    className="w-14 text-xs px-1.5 py-1 border rounded text-right"
                                    placeholder="+0€"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Per-size chips with delta inputs */}
                            {!isExcluded && sizeOptions && (
                              <div className="ml-7 space-y-1 px-1.5 pb-1">
                                {sizeOptions.map((opt) => {
                                  const isOptExcluded = excludedSizesForItem.includes(opt.id);
                                  const sizeKey = `${item.id}:${opt.id}`;
                                  const sizeDelta = choice.supplements[sizeKey] || 0;
                                  return (
                                    <div key={opt.id} className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleExcludedSize(index, item.id, opt.id)}
                                        className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                                          !isOptExcluded
                                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                                            : 'border-gray-200 bg-gray-50 text-gray-400 line-through'
                                        }`}
                                      >
                                        {opt.name}
                                      </button>
                                      {!isOptExcluded && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-gray-400">+</span>
                                          <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={sizeDelta ? (sizeDelta / 100).toString() : ''}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value);
                                              setItemSupplement(
                                                index,
                                                sizeKey,
                                                isNaN(val) || val === 0
                                                  ? null
                                                  : Math.round(val * 100)
                                              );
                                            }}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="w-14 text-xs px-1.5 py-0.5 border rounded text-right"
                                            placeholder="0€"
                                          />
                                        </div>
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
              </div>
            );
          })}

          {/* Bouton ajouter si liste vide ou peu d'elements */}
          {form.bundleCategories.length < categories.length && (
            <button
              type="button"
              onClick={addChoice}
              className={`w-full p-3 border border-dashed rounded-lg text-center text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors ${
                form.bundleCategories.length === 0 ? 'py-6' : ''
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              {form.bundleCategories.length === 0
                ? 'Ajouter un élément (ex: Entrée, Plat, Boisson...)'
                : 'Ajouter'}
            </button>
          )}
        </div>
      </div>

      {/* Supplements gratuits - option simple */}
      <label className="flex items-center gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={form.bundleFreeOptions}
          onChange={(e) => updateForm({ bundleFreeOptions: e.target.checked })}
          className="rounded border-gray-300 text-primary-500"
        />
        <span className="text-sm text-gray-600">Suppléments/extras gratuits dans la formule</span>
      </label>
    </div>
  );
}

// ---------- CategoryMultiSelect ----------

function CategoryMultiSelect({
  categories,
  selectedIds,
  disabledIds,
  onToggle,
}: {
  categories: Category[];
  selectedIds: string[];
  disabledIds: string[];
  onToggle: (catId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedNames = selectedIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input min-h-[44px] w-full text-sm text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selectedNames.length > 1 ? selectedNames.join(' / ') : selectedNames[0] || 'Choisir...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {categories.map((cat) => {
            const isSelected = selectedIds.includes(cat.id);
            const isDisabled = disabledIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                disabled={isDisabled}
                onClick={() => onToggle(cat.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </div>
                {cat.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

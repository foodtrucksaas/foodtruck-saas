import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { WizardFormProps } from './wizardTypes';
import { getSizeOptions, getItemsForCategories } from './wizardTypes';

export function BuyXGetYConfig({ form, categories, menuItems, updateForm }: WizardFormProps) {
  const [expandedTrigger, setExpandedTrigger] = useState(false);
  const [expandedReward, setExpandedReward] = useState(false);

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

  const toggleTriggerExcludedItem = (itemId: string) => {
    const newExcluded = form.triggerExcludedItems.includes(itemId)
      ? form.triggerExcludedItems.filter((id) => id !== itemId)
      : [...form.triggerExcludedItems, itemId];
    updateForm({ triggerExcludedItems: newExcluded });
  };

  const toggleRewardExcludedItem = (itemId: string) => {
    const newExcluded = form.rewardExcludedItems.includes(itemId)
      ? form.rewardExcludedItems.filter((id) => id !== itemId)
      : [...form.rewardExcludedItems, itemId];
    updateForm({ rewardExcludedItems: newExcluded });
  };

  const toggleTriggerExcludedSize = (itemId: string, sizeId: string) => {
    const currentExcluded = form.triggerExcludedSizes[itemId] || [];
    const newExcludedSizes = { ...form.triggerExcludedSizes };
    if (currentExcluded.includes(sizeId)) {
      newExcludedSizes[itemId] = currentExcluded.filter((id) => id !== sizeId);
      if (newExcludedSizes[itemId].length === 0) delete newExcludedSizes[itemId];
    } else {
      newExcludedSizes[itemId] = [...currentExcluded, sizeId];
    }
    updateForm({ triggerExcludedSizes: newExcludedSizes });
  };

  const toggleRewardExcludedSize = (itemId: string, sizeId: string) => {
    const currentExcluded = form.rewardExcludedSizes[itemId] || [];
    const newExcludedSizes = { ...form.rewardExcludedSizes };
    if (currentExcluded.includes(sizeId)) {
      newExcludedSizes[itemId] = currentExcluded.filter((id) => id !== sizeId);
      if (newExcludedSizes[itemId].length === 0) delete newExcludedSizes[itemId];
    } else {
      newExcludedSizes[itemId] = [...currentExcluded, sizeId];
    }
    updateForm({ rewardExcludedSizes: newExcludedSizes });
  };

  const isTriggerSizeExcluded = (itemId: string, sizeId: string): boolean => {
    return form.triggerExcludedSizes[itemId]?.includes(sizeId) || false;
  };

  const isRewardSizeExcluded = (itemId: string, sizeId: string): boolean => {
    return form.rewardExcludedSizes[itemId]?.includes(sizeId) || false;
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-medium">Configuration X achetes = Y offert</h3>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => updateForm({ buyXGetYType: 'category_choice' })}
          className={`p-3 min-h-[60px] rounded-lg border-2 text-sm font-medium transition-all text-left active:scale-[0.98] ${
            form.buyXGetYType === 'category_choice'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-semibold">Par categorie</div>
          <div className="text-xs text-gray-500 mt-0.5">Ex: 2 pizzas = 1 boisson offerte</div>
        </button>
        <button
          type="button"
          onClick={() => updateForm({ buyXGetYType: 'specific_items' })}
          className={`p-3 min-h-[60px] rounded-lg border-2 text-sm font-medium transition-all text-left active:scale-[0.98] ${
            form.buyXGetYType === 'specific_items'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-semibold">Articles specifiques</div>
          <div className="text-xs text-gray-500 mt-0.5">Articles precis uniquement</div>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantite requise</label>
          <input
            type="number"
            min="1"
            value={form.triggerQuantity}
            onChange={(e) => updateForm({ triggerQuantity: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantite offerte</label>
          <input
            type="number"
            min="1"
            value={form.rewardQuantity}
            onChange={(e) => updateForm({ rewardQuantity: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px]"
          />
        </div>
      </div>

      {/* Category choice mode */}
      {form.buyXGetYType === 'category_choice' && (
        <>
          {/* TRIGGER SECTION */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-primary-50">
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Categories declencheurs (articles a acheter)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = form.triggerCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const newIds = isSelected
                          ? form.triggerCategoryIds.filter((id) => id !== cat.id)
                          : [...form.triggerCategoryIds, cat.id];
                        updateForm({ triggerCategoryIds: newIds });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
                  Les articles de{' '}
                  {categories
                    .filter((c) => form.triggerCategoryIds.includes(c.id))
                    .map((c) => c.name)
                    .join(' OU ')}{' '}
                  comptent
                </p>
              )}
            </div>

            {form.triggerCategoryIds.length > 0 &&
              (() => {
                const triggerItems = getItemsForCategories(menuItems, form.triggerCategoryIds);
                const selectedCategories = categories.filter((c) =>
                  form.triggerCategoryIds.includes(c.id)
                );
                const categoryWithSizes = selectedCategories.find((c) => getSizeOptions(c));
                const sizeOptions = categoryWithSizes ? getSizeOptions(categoryWithSizes) : null;
                const eligibleCount = triggerItems.filter(
                  (i) => !form.triggerExcludedItems.includes(i.id)
                ).length;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedTrigger(!expandedTrigger)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-t"
                    >
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          {eligibleCount} article{eligibleCount > 1 ? 's' : ''} eligible
                          {eligibleCount > 1 ? 's' : ''}
                        </span>
                        {sizeOptions && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {sizeOptions.length} taille{sizeOptions.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                        {expandedTrigger ? 'Fermer' : 'Configurer'}
                        {expandedTrigger ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {expandedTrigger && triggerItems.length > 0 && (
                      <div className="p-3 border-t space-y-2">
                        <div className="text-xs text-gray-500 pb-2 border-b">
                          Cochez les articles/tailles qui declenchent l'offre
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {triggerItems.map((item) => {
                            const isExcluded = form.triggerExcludedItems.includes(item.id);
                            const itemCategory = categories.find((c) => c.id === item.category_id);
                            const itemSizeOptions = getSizeOptions(itemCategory);

                            return (
                              <div
                                key={item.id}
                                className={`p-2 rounded-lg ${isExcluded ? 'bg-gray-100 opacity-60' : 'bg-white border'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleTriggerExcludedItem(item.id)}
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
                                </div>
                                {!isExcluded && itemSizeOptions && (
                                  <div className="mt-2 ml-8 flex flex-wrap gap-2">
                                    {itemSizeOptions.map((size) => {
                                      const sizeIsExcluded = isTriggerSizeExcluded(
                                        item.id,
                                        size.id
                                      );
                                      return (
                                        <button
                                          key={size.id}
                                          type="button"
                                          onClick={() =>
                                            toggleTriggerExcludedSize(item.id, size.id)
                                          }
                                          className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                                            sizeIsExcluded ? 'bg-gray-100 opacity-60' : 'bg-gray-50'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                              !sizeIsExcluded
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 bg-white'
                                            }`}
                                          >
                                            {!sizeIsExcluded && <Check className="w-2.5 h-2.5" />}
                                          </span>
                                          <span
                                            className={`text-xs font-medium ${sizeIsExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                                          >
                                            {size.name}
                                          </span>
                                        </button>
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
                    {expandedTrigger && triggerItems.length === 0 && (
                      <div className="p-3 border-t text-sm text-gray-500 text-center">
                        Aucun article dans ces categories
                      </div>
                    )}
                  </>
                );
              })()}
          </div>

          {/* REWARD SECTION */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-green-50">
              <label className="block text-sm font-medium text-green-700 mb-2">
                Categories recompense (articles offerts)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = form.rewardCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const newIds = isSelected
                          ? form.rewardCategoryIds.filter((id) => id !== cat.id)
                          : [...form.rewardCategoryIds, cat.id];
                        updateForm({ rewardCategoryIds: newIds });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
                  Le client choisira parmi{' '}
                  {categories
                    .filter((c) => form.rewardCategoryIds.includes(c.id))
                    .map((c) => c.name)
                    .join(' OU ')}
                </p>
              )}
            </div>

            {form.rewardCategoryIds.length > 0 &&
              (() => {
                const rewardItems = getItemsForCategories(menuItems, form.rewardCategoryIds);
                const selectedCategories = categories.filter((c) =>
                  form.rewardCategoryIds.includes(c.id)
                );
                const categoryWithSizes = selectedCategories.find((c) => getSizeOptions(c));
                const sizeOptions = categoryWithSizes ? getSizeOptions(categoryWithSizes) : null;
                const eligibleCount = rewardItems.filter(
                  (i) => !form.rewardExcludedItems.includes(i.id)
                ).length;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedReward(!expandedReward)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-t"
                    >
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          {eligibleCount} article{eligibleCount > 1 ? 's' : ''} eligible
                          {eligibleCount > 1 ? 's' : ''}
                        </span>
                        {sizeOptions && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {sizeOptions.length} taille{sizeOptions.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        {expandedReward ? 'Fermer' : 'Configurer'}
                        {expandedReward ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {expandedReward && rewardItems.length > 0 && (
                      <div className="p-3 border-t space-y-2">
                        <div className="text-xs text-gray-500 pb-2 border-b">
                          Cochez les articles/tailles que le client peut recevoir gratuitement
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {rewardItems.map((item) => {
                            const isExcluded = form.rewardExcludedItems.includes(item.id);
                            const itemCategory = categories.find((c) => c.id === item.category_id);
                            const itemSizeOptions = getSizeOptions(itemCategory);

                            return (
                              <div
                                key={item.id}
                                className={`p-2 rounded-lg ${isExcluded ? 'bg-gray-100 opacity-60' : 'bg-white border'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleRewardExcludedItem(item.id)}
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
                                </div>
                                {!isExcluded && itemSizeOptions && (
                                  <div className="mt-2 ml-8 flex flex-wrap gap-2">
                                    {itemSizeOptions.map((size) => {
                                      const sizeIsExcluded = isRewardSizeExcluded(item.id, size.id);
                                      return (
                                        <button
                                          key={size.id}
                                          type="button"
                                          onClick={() => toggleRewardExcludedSize(item.id, size.id)}
                                          className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                                            sizeIsExcluded ? 'bg-gray-100 opacity-60' : 'bg-gray-50'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                              !sizeIsExcluded
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 bg-white'
                                            }`}
                                          >
                                            {!sizeIsExcluded && <Check className="w-2.5 h-2.5" />}
                                          </span>
                                          <span
                                            className={`text-xs font-medium ${sizeIsExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                                          >
                                            {size.name}
                                          </span>
                                        </button>
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
                    {expandedReward && rewardItems.length === 0 && (
                      <div className="p-3 border-t text-sm text-gray-500 text-center">
                        Aucun article dans ces categories
                      </div>
                    )}
                  </>
                );
              })()}
          </div>
        </>
      )}

      {/* Specific items mode */}
      {form.buyXGetYType === 'specific_items' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Articles declencheurs (selectionnez un ou plusieurs)
            </label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {menuItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                >
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
                <label
                  key={item.id}
                  className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.rewardItems.includes(item.id)}
                    onChange={() => toggleRewardItem(item.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">
                    {item.name} ({formatPrice(item.price)})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

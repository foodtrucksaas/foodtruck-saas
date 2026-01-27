import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Eye, ShoppingCart, Gift, ArrowDown } from 'lucide-react';
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

  // Build live preview
  const buildPreview = (): string | null => {
    const triggerQty = parseInt(form.triggerQuantity) || 0;
    const rewardQty = parseInt(form.rewardQuantity) || 0;
    if (triggerQty === 0) return null;

    let triggerLabel = 'articles';
    let rewardLabel = 'article';

    if (form.buyXGetYType === 'category_choice') {
      const triggerCats = categories.filter((c) => form.triggerCategoryIds.includes(c.id));
      const rewardCats = categories.filter((c) => form.rewardCategoryIds.includes(c.id));
      if (triggerCats.length > 0) triggerLabel = triggerCats.map((c) => c.name).join(' / ');
      if (rewardCats.length > 0) rewardLabel = rewardCats.map((c) => c.name).join(' / ');
    } else {
      const triggerCount = form.triggerItems.length;
      const rewardCount = form.rewardItems.length;
      if (triggerCount > 0) triggerLabel = `article${triggerCount > 1 ? 's' : ''}`;
      if (rewardCount > 0) rewardLabel = `article${rewardCount > 1 ? 's' : ''}`;
    }

    const rewardText =
      form.rewardType === 'free'
        ? `${rewardQty} ${rewardLabel} offert${rewardQty > 1 ? 's' : ''}`
        : `${form.rewardValue || '...'} EUR de reduction`;

    return `${triggerQty} ${triggerLabel} achete${triggerQty > 1 ? 's' : ''} = ${rewardText}`;
  };

  const preview = buildPreview();

  return (
    <div className="space-y-5 border-t pt-4">
      {/* Live preview banner */}
      {preview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Apercu de l'offre</span>
          </div>
          <p className="text-sm font-semibold text-gray-800">{preview}</p>
        </div>
      )}

      {/* Mode selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mode de selection des articles
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateForm({ buyXGetYType: 'category_choice' })}
            className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
              form.buyXGetYType === 'category_choice'
                ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Par categorie</div>
            <div className="text-xs text-gray-500 mt-0.5">Tous les articles d'une categorie</div>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ buyXGetYType: 'specific_items' })}
            className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
              form.buyXGetYType === 'specific_items'
                ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">Articles precis</div>
            <div className="text-xs text-gray-500 mt-0.5">Vous choisissez les articles exacts</div>
          </button>
        </div>
      </div>

      {/* STEP 1: What the customer buys */}
      <div className="space-y-4">
        {/* Visual step header */}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
            <ShoppingCart className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Le client achete...</h4>
            <p className="text-xs text-gray-500">Quels articles et combien ?</p>
          </div>
        </div>

        <div className="ml-4 pl-7 border-l-2 border-blue-200 space-y-3">
          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre d'articles requis
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={form.triggerQuantity}
                onChange={(e) => updateForm({ triggerQuantity: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="input w-20 text-center text-lg font-semibold"
              />
              <span className="text-sm text-gray-600">
                article{(parseInt(form.triggerQuantity) || 0) > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Category choice: trigger categories */}
          {form.buyXGetYType === 'category_choice' && (
            <div className="border rounded-xl overflow-hidden">
              <div className="p-3 bg-blue-50">
                <label className="block text-xs font-medium text-blue-700 mb-2">
                  Parmi les categories suivantes
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
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                {form.triggerCategoryIds.length > 1 && (
                  <p className="text-xs text-blue-600 mt-2">
                    Tous les articles de ces categories comptent ensemble
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
                            {eligibleCount} article{eligibleCount > 1 ? 's' : ''} inclus
                          </span>
                          {sizeOptions && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {sizeOptions.length} taille{sizeOptions.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                          {expandedTrigger ? 'Replier' : 'Personnaliser'}
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
                            Decochez les articles a exclure de cette offre
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {triggerItems.map((item) => {
                              const isExcluded = form.triggerExcludedItems.includes(item.id);
                              const itemCategory = categories.find(
                                (c) => c.id === item.category_id
                              );
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
                                              sizeIsExcluded
                                                ? 'bg-gray-100 opacity-60'
                                                : 'bg-gray-50'
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
          )}

          {/* Specific items: trigger list */}
          {form.buyXGetYType === 'specific_items' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Parmi ces articles
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                {menuItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer"
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
          )}
        </div>

        {/* Visual connector arrow */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-1 text-amber-500">
            <ArrowDown className="w-5 h-5" />
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              ALORS
            </span>
          </div>
        </div>

        {/* STEP 2: What the customer receives */}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
            <Gift className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Il recoit en cadeau...</h4>
            <p className="text-xs text-gray-500">Quelle recompense et combien ?</p>
          </div>
        </div>

        <div className="ml-4 pl-7 border-l-2 border-green-200 space-y-3">
          {/* Reward type selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Type de recompense
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateForm({ rewardType: 'free' })}
                className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
                  form.rewardType === 'free'
                    ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" />
                  Article offert
                </div>
                <div className="text-xs text-gray-500 mt-0.5">100% gratuit</div>
              </button>
              <button
                type="button"
                onClick={() => updateForm({ rewardType: 'discount' })}
                className={`flex-1 p-3 rounded-xl border-2 text-sm transition-all ${
                  form.rewardType === 'discount'
                    ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Reduction</div>
                <div className="text-xs text-gray-500 mt-0.5">Un montant en euros</div>
              </button>
            </div>
          </div>

          {/* Reward quantity */}
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.rewardType === 'free'
                  ? "Nombre d'articles offerts"
                  : "Nombre d'articles concernes"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={form.rewardQuantity}
                  onChange={(e) => updateForm({ rewardQuantity: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="input w-20 text-center text-lg font-semibold"
                />
                <span className="text-sm text-gray-600">
                  article{(parseInt(form.rewardQuantity) || 0) > 1 ? 's' : ''}{' '}
                  {form.rewardType === 'free' ? 'offert' : ''}
                  {form.rewardType === 'free' && (parseInt(form.rewardQuantity) || 0) > 1
                    ? 's'
                    : ''}
                </span>
              </div>
            </div>
            {form.rewardType === 'discount' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Montant de la reduction
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.rewardValue}
                    onChange={(e) => updateForm({ rewardValue: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="input w-28 pr-12 text-center text-lg font-semibold"
                    placeholder="5.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                    EUR
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Category choice: reward categories */}
          {form.buyXGetYType === 'category_choice' && (
            <div className="border rounded-xl overflow-hidden">
              <div className="p-3 bg-green-50">
                <label className="block text-xs font-medium text-green-700 mb-2">
                  Parmi les categories suivantes
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
                    Le client choisira parmi les articles de ces categories
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
                            {eligibleCount} article{eligibleCount > 1 ? 's' : ''} inclus
                          </span>
                          {sizeOptions && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {sizeOptions.length} taille{sizeOptions.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                          {expandedReward ? 'Replier' : 'Personnaliser'}
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
                            Decochez les articles que le client ne peut pas recevoir
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {rewardItems.map((item) => {
                              const isExcluded = form.rewardExcludedItems.includes(item.id);
                              const itemCategory = categories.find(
                                (c) => c.id === item.category_id
                              );
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
                                        const sizeIsExcluded = isRewardSizeExcluded(
                                          item.id,
                                          size.id
                                        );
                                        return (
                                          <button
                                            key={size.id}
                                            type="button"
                                            onClick={() =>
                                              toggleRewardExcludedSize(item.id, size.id)
                                            }
                                            className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                                              sizeIsExcluded
                                                ? 'bg-gray-100 opacity-60'
                                                : 'bg-gray-50'
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
          )}

          {/* Specific items: reward list */}
          {form.buyXGetYType === 'specific_items' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Parmi ces articles
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                {menuItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer"
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
          )}
        </div>
      </div>
    </div>
  );
}

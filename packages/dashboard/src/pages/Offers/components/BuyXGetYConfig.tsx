import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { WizardFormProps } from './wizardTypes';
import { getItemsForCategories } from './wizardTypes';

export function BuyXGetYConfig({ form, categories, menuItems, updateForm }: WizardFormProps) {
  const [showTriggerDetails, setShowTriggerDetails] = useState(false);
  const [showRewardDetails, setShowRewardDetails] = useState(false);

  const triggerItems = getItemsForCategories(menuItems, form.triggerCategoryIds);
  const rewardItems = getItemsForCategories(menuItems, form.rewardCategoryIds);

  const triggerEligibleCount = triggerItems.filter(
    (i) => !form.triggerExcludedItems.includes(i.id)
  ).length;
  const rewardEligibleCount = rewardItems.filter(
    (i) => !form.rewardExcludedItems.includes(i.id)
  ).length;

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

  return (
    <div className="space-y-5">
      {/* Quantites */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Acheter</label>
          <input
            type="number"
            min="1"
            value={form.triggerQuantity}
            onChange={(e) => updateForm({ triggerQuantity: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input w-20 min-h-[44px] text-center font-medium"
          />
        </div>
        <span className="text-gray-500 mt-6">=</span>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Offert</label>
          <input
            type="number"
            min="1"
            value={form.rewardQuantity}
            onChange={(e) => updateForm({ rewardQuantity: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input w-20 min-h-[44px] text-center font-medium"
          />
        </div>
      </div>

      {/* Categories declencheurs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catégories à acheter *
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
                  updateForm({ triggerCategoryIds: newIds, triggerExcludedItems: [] });
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Details articles declencheurs */}
        {form.triggerCategoryIds.length > 0 && triggerItems.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowTriggerDetails(!showTriggerDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 min-h-[44px] active:scale-95"
            >
              {triggerEligibleCount}/{triggerItems.length} articles
              {showTriggerDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {showTriggerDetails && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg max-h-32 overflow-y-auto space-y-1">
                {triggerItems.map((item) => {
                  const isExcluded = form.triggerExcludedItems.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleTriggerExcludedItem(item.id)}
                      className={`w-full flex items-center gap-2 p-1 rounded text-left text-sm ${
                        isExcluded ? 'opacity-50' : ''
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          !isExcluded
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {!isExcluded && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className={isExcluded ? 'line-through text-gray-400' : ''}>
                        {item.name}
                      </span>
                      <span className="text-gray-400 text-xs ml-auto">
                        {formatPrice(item.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Categories recompense */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catégories offertes *
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
                  updateForm({ rewardCategoryIds: newIds, rewardExcludedItems: [] });
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-success-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Details articles offerts */}
        {form.rewardCategoryIds.length > 0 && rewardItems.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowRewardDetails(!showRewardDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 min-h-[44px] active:scale-95"
            >
              {rewardEligibleCount}/{rewardItems.length} articles
              {showRewardDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {showRewardDetails && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg max-h-32 overflow-y-auto space-y-1">
                {rewardItems.map((item) => {
                  const isExcluded = form.rewardExcludedItems.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleRewardExcludedItem(item.id)}
                      className={`w-full flex items-center gap-2 p-1 rounded text-left text-sm ${
                        isExcluded ? 'opacity-50' : ''
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          !isExcluded
                            ? 'bg-emerald-500 border-success-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {!isExcluded && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className={isExcluded ? 'line-through text-gray-400' : ''}>
                        {item.name}
                      </span>
                      <span className="text-gray-400 text-xs ml-auto">
                        {formatPrice(item.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resume */}
      {form.triggerCategoryIds.length > 0 && form.rewardCategoryIds.length > 0 && (
        <p className="text-sm text-success-600 bg-success-50 rounded-lg p-3">
          {form.triggerQuantity}{' '}
          {categories
            .filter((c) => form.triggerCategoryIds.includes(c.id))
            .map((c) => c.name)
            .join('/')}{' '}
          = {form.rewardQuantity}{' '}
          {categories
            .filter((c) => form.rewardCategoryIds.includes(c.id))
            .map((c) => c.name)
            .join('/')}{' '}
          offert{parseInt(form.rewardQuantity) > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

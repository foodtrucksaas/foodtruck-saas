import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, HelpCircle, Eye, Gift, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { WizardFormProps } from './wizardTypes';
import { getItemsForCategories } from './wizardTypes';

// Simplified Buy X Get Y Configuration
export function BuyXGetYConfig({ form, categories, menuItems, updateForm }: WizardFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get eligible items for trigger/reward categories
  const triggerItems = getItemsForCategories(menuItems, form.triggerCategoryIds);
  const rewardItems = getItemsForCategories(menuItems, form.rewardCategoryIds);

  const triggerEligibleCount = triggerItems.filter(
    (i) => !form.triggerExcludedItems.includes(i.id)
  ).length;
  const rewardEligibleCount = rewardItems.filter(
    (i) => !form.rewardExcludedItems.includes(i.id)
  ).length;

  // Toggle item exclusion for trigger
  const toggleTriggerExcludedItem = (itemId: string) => {
    const newExcluded = form.triggerExcludedItems.includes(itemId)
      ? form.triggerExcludedItems.filter((id) => id !== itemId)
      : [...form.triggerExcludedItems, itemId];
    updateForm({ triggerExcludedItems: newExcluded });
  };

  // Toggle item exclusion for reward
  const toggleRewardExcludedItem = (itemId: string) => {
    const newExcluded = form.rewardExcludedItems.includes(itemId)
      ? form.rewardExcludedItems.filter((id) => id !== itemId)
      : [...form.rewardExcludedItems, itemId];
    updateForm({ rewardExcludedItems: newExcluded });
  };

  // Get category names for display
  const getTriggerCategoryNames = () =>
    categories
      .filter((c) => form.triggerCategoryIds.includes(c.id))
      .map((c) => c.name)
      .join(', ') || 'aucune';

  const getRewardCategoryNames = () =>
    categories
      .filter((c) => form.rewardCategoryIds.includes(c.id))
      .map((c) => c.name)
      .join(', ') || 'aucune';

  return (
    <div className="space-y-6">
      {/* Live Preview Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-700 mb-3">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Apercu de votre offre</span>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Gift className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{form.name || 'Mon offre'}</h4>
              <p className="text-sm text-emerald-600 font-medium">
                {form.triggerQuantity || '3'} {getTriggerCategoryNames()} achete
                {parseInt(form.triggerQuantity || '3') > 1 ? 's' : ''} ={' '}
                {form.rewardQuantity || '1'} {getRewardCategoryNames()} offert
                {parseInt(form.rewardQuantity || '1') > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Visual representation */}
          <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-lg">
            {/* Trigger items */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(parseInt(form.triggerQuantity || '3'), 4) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"
                  >
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  </div>
                )
              )}
              {parseInt(form.triggerQuantity || '3') > 4 && (
                <span className="text-xs text-gray-500">+{parseInt(form.triggerQuantity) - 4}</span>
              )}
            </div>

            <span className="text-lg font-bold text-gray-400">=</span>

            {/* Reward items */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(parseInt(form.rewardQuantity || '1'), 4) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center"
                  >
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                )
              )}
              {parseInt(form.rewardQuantity || '1') > 4 && (
                <span className="text-xs text-gray-500">+{parseInt(form.rewardQuantity) - 4}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration - Simple Questions */}
      <div className="space-y-6">
        {/* Question 1: How many to buy */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Combien d'articles le client doit acheter ?
              </label>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-24">
                  <input
                    type="number"
                    min="1"
                    value={form.triggerQuantity}
                    onChange={(e) => updateForm({ triggerQuantity: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="input text-center text-xl font-semibold h-14"
                  />
                </div>
                <span className="text-gray-600 font-medium">article(s)</span>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                De quelle(s) categorie(s) ?
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
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {form.triggerCategoryIds.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {triggerEligibleCount} article{triggerEligibleCount > 1 ? 's' : ''} eligibles
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Question 2: What they get free */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Combien d'articles sont offerts ?
              </label>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-24">
                  <input
                    type="number"
                    min="1"
                    value={form.rewardQuantity}
                    onChange={(e) => updateForm({ rewardQuantity: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="input text-center text-xl font-semibold h-14"
                  />
                </div>
                <span className="text-gray-600 font-medium">article(s) offert(s)</span>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                De quelle(s) categorie(s) ?
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
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {form.rewardCategoryIds.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {rewardEligibleCount} article{rewardEligibleCount > 1 ? 's' : ''} peuvent etre
                  offert{rewardEligibleCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
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
          <div className="mt-4 space-y-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500">Affinez les articles eligibles pour cette offre</p>

            {/* Trigger items exclusion */}
            {form.triggerCategoryIds.length > 0 && triggerItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Articles declencheurs
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Decochez les articles qui ne doivent PAS compter
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto bg-white rounded-lg border p-2">
                  {triggerItems.map((item) => {
                    const isExcluded = form.triggerExcludedItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleTriggerExcludedItem(item.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                          isExcluded ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            !isExcluded
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {!isExcluded && <Check className="w-3 h-3" />}
                        </span>
                        <span
                          className={`text-sm ${isExcluded ? 'line-through text-gray-400' : 'text-gray-700'}`}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {formatPrice(item.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reward items exclusion */}
            {form.rewardCategoryIds.length > 0 && rewardItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Articles offerts
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Decochez les articles qui ne peuvent PAS etre offerts
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto bg-white rounded-lg border p-2">
                  {rewardItems.map((item) => {
                    const isExcluded = form.rewardExcludedItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleRewardExcludedItem(item.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                          isExcluded ? 'bg-gray-50 opacity-60' : 'hover:bg-emerald-50'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            !isExcluded
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {!isExcluded && <Check className="w-3 h-3" />}
                        </span>
                        <span
                          className={`text-sm ${isExcluded ? 'line-through text-gray-400' : 'text-gray-700'}`}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {formatPrice(item.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

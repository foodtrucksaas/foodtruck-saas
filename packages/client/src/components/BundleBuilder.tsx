import { useState, useMemo } from 'react';
import { X, Check, ChevronRight, Package, Plus, Minus } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type {
  Offer,
  MenuItem,
  Category,
  BundleConfig,
  BundleCategoryConfig,
  BundleCartInfo,
  BundleCartSelection,
  SelectedOption,
  CategoryOptionGroup,
  CategoryOption,
} from '@foodtruck/shared';

// Bundle offer with typed config
interface BundleOffer extends Offer {
  config: BundleConfig;
}

interface CategoryWithOptions extends Category {
  category_option_groups?: (CategoryOptionGroup & { category_options?: CategoryOption[] })[];
}

interface BundleBuilderProps {
  bundle: BundleOffer;
  menuItems: MenuItem[];
  categories: CategoryWithOptions[];
  onAddToCart: (bundleInfo: BundleCartInfo, quantity: number) => void;
  onClose: () => void;
}

interface Selection {
  categoryIndex: number;
  menuItem: MenuItem;
  selectedOptions: SelectedOption[];
  supplement: number;
}

export default function BundleBuilder({
  bundle,
  menuItems,
  categories,
  onAddToCart,
  onClose,
}: BundleBuilderProps) {
  const config = bundle.config as BundleConfig;
  const bundleCategories = config.bundle_categories || [];

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<(Selection | null)[]>(
    bundleCategories.map(() => null)
  );
  const [quantity, setQuantity] = useState(1);

  // Get items for a bundle category
  const getItemsForCategory = (bundleCat: BundleCategoryConfig) => {
    const categoryIds =
      bundleCat.category_ids || (bundleCat.category_id ? [bundleCat.category_id] : []);
    return menuItems.filter((item) => {
      if (!item.category_id || !categoryIds.includes(item.category_id)) return false;
      if (!item.is_available) return false;
      if (bundleCat.excluded_items?.includes(item.id)) return false;
      return true;
    });
  };

  // Get supplement for an item
  const getSupplement = (bundleCat: BundleCategoryConfig, itemId: string, sizeId?: string) => {
    if (!bundleCat.supplements) return 0;
    // Check item:size first, then item only
    if (sizeId && bundleCat.supplements[`${itemId}:${sizeId}`]) {
      return bundleCat.supplements[`${itemId}:${sizeId}`];
    }
    return bundleCat.supplements[itemId] || 0;
  };

  // Check if a size is excluded
  const isSizeExcluded = (bundleCat: BundleCategoryConfig, itemId: string, sizeId: string) => {
    return bundleCat.excluded_sizes?.[itemId]?.includes(sizeId) || false;
  };

  // Get category name
  const getCategoryName = (bundleCat: BundleCategoryConfig, index: number) => {
    if (bundleCat.label) return bundleCat.label;
    const categoryIds =
      bundleCat.category_ids || (bundleCat.category_id ? [bundleCat.category_id] : []);
    const names = categoryIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean);
    return names.join(' / ') || `Choix ${index + 1}`;
  };

  // Get all required single-choice option groups for a category (size, base, etc.)
  const getRequiredOptionGroups = (categoryId: string | null) => {
    if (!categoryId) return [];
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.category_option_groups) return [];

    return category.category_option_groups
      .filter((g) => g.is_required && !g.is_multiple && g.category_options?.length)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((group) => ({
        group,
        options: (group.category_options || []).filter((o) => o.is_available !== false),
      }));
  };

  // Current bundle category
  const currentBundleCat = bundleCategories[currentStep];
  const availableItems = currentBundleCat ? getItemsForCategory(currentBundleCat) : [];

  // Track which item is being configured (partial selection within a step)
  const [pendingItem, setPendingItem] = useState<{
    item: MenuItem;
    optionSelections: Record<string, { group: CategoryOptionGroup; option: CategoryOption }>;
  } | null>(null);

  // Reset pending item when step changes
  const [prevStep, setPrevStep] = useState(currentStep);
  if (prevStep !== currentStep) {
    setPrevStep(currentStep);
    setPendingItem(null);
  }

  // Calculate total
  const supplementsTotal = useMemo(() => {
    return selections.reduce((sum, sel) => sum + (sel?.supplement || 0), 0);
  }, [selections]);

  const totalPrice = config.fixed_price + supplementsTotal;
  const allSelected = selections.every((s) => s !== null);

  // Finalize item selection with all options chosen
  const finalizeSelection = (
    item: MenuItem,
    optionSelections: Record<string, { group: CategoryOptionGroup; option: CategoryOption }>
  ) => {
    const bundleCat = bundleCategories[currentStep];
    const entries = Object.values(optionSelections);
    const sizeEntry = entries.find((e) => e.group.display_order === 0) || entries[0];
    const supplement = getSupplement(bundleCat, item.id, sizeEntry?.option.id);

    const selectedOptions: SelectedOption[] = entries.map((e, idx) => ({
      optionId: e.option.id,
      optionGroupId: e.group.id,
      name: e.option.name,
      groupName: e.group.name,
      priceModifier: e.option.price_modifier ?? 0,
      isSizeOption: idx === 0, // First group is considered the size option
    }));

    const newSelections = [...selections];
    newSelections[currentStep] = {
      categoryIndex: currentStep,
      menuItem: item,
      selectedOptions,
      supplement,
    };
    setSelections(newSelections);
    setPendingItem(null);

    // Auto-advance to next step
    if (currentStep < bundleCategories.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  // Handle option selection for an item
  const handleSelectOption = (
    item: MenuItem,
    group: CategoryOptionGroup,
    option: CategoryOption,
    requiredGroups: { group: CategoryOptionGroup; options: CategoryOption[] }[]
  ) => {
    const current = pendingItem?.item.id === item.id ? pendingItem.optionSelections : {};
    const updated = { ...current, [group.id]: { group, option } };

    // Check if all required groups are now selected
    if (Object.keys(updated).length >= requiredGroups.length) {
      finalizeSelection(item, updated);
    } else {
      setPendingItem({ item, optionSelections: updated });
    }
  };

  // Handle simple item selection (no option groups)
  const handleSelectItem = (item: MenuItem) => {
    const bundleCat = bundleCategories[currentStep];
    const supplement = getSupplement(bundleCat, item.id);

    const newSelections = [...selections];
    newSelections[currentStep] = {
      categoryIndex: currentStep,
      menuItem: item,
      selectedOptions: [],
      supplement,
    };
    setSelections(newSelections);
    setPendingItem(null);

    // Auto-advance to next step
    if (currentStep < bundleCategories.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!allSelected) return;

    const bundleSelections: BundleCartSelection[] = selections
      .filter((s): s is Selection => s !== null)
      .map((sel) => {
        const bundleCat = bundleCategories[sel.categoryIndex];
        const categoryIds =
          bundleCat.category_ids || (bundleCat.category_id ? [bundleCat.category_id] : []);
        const category = categories.find((c) => categoryIds.includes(c.id));

        return {
          categoryId: category?.id || '',
          categoryName: getCategoryName(bundleCat, sel.categoryIndex),
          menuItem: sel.menuItem,
          selectedOptions: sel.selectedOptions,
          supplement: sel.supplement,
        };
      });

    const bundleInfo: BundleCartInfo = {
      bundleId: bundle.id,
      bundleName: bundle.name,
      fixedPrice: config.fixed_price,
      freeOptions: config.free_options || false,
      selections: bundleSelections,
    };

    onAddToCart(bundleInfo, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-h-[90vh] sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{bundle.name}</h2>
              <p className="text-sm text-primary-600 font-medium">
                {formatPrice(config.fixed_price)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex gap-2">
            {bundleCategories.map((cat, index) => {
              const isComplete = selections[index] !== null;
              const isCurrent = index === currentStep;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`flex-1 py-3 px-3 min-h-[44px] rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-primary-500 text-white'
                      : isComplete
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {isComplete && !isCurrent && <Check className="w-3 h-3" />}
                    {getCategoryName(cat, index)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current selection */}
        {selections[currentStep] && (
          <div className="px-4 py-2 bg-emerald-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">
                {selections[currentStep]?.menuItem.name}
                {selections[currentStep]?.supplement > 0 && (
                  <span className="ml-1 text-emerald-600 font-medium">
                    (+{formatPrice(selections[currentStep]!.supplement)})
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={() => {
                const newSelections = [...selections];
                newSelections[currentStep] = null;
                setSelections(newSelections);
              }}
              className="px-3 py-2 min-h-[44px] text-xs text-gray-500 hover:text-gray-700 active:scale-95"
            >
              Changer
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Choisissez votre {getCategoryName(currentBundleCat, currentStep).toLowerCase()}
          </h3>
          <div className="space-y-2">
            {availableItems.map((item) => {
              const supplement = getSupplement(currentBundleCat, item.id);
              const requiredGroups = getRequiredOptionGroups(item.category_id);
              const isSelected = selections[currentStep]?.menuItem.id === item.id;
              const isPending = pendingItem?.item.id === item.id;

              // If item has required option groups, show them
              if (requiredGroups.length > 0) {
                return (
                  <div key={item.id} className="border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 font-medium text-gray-900">
                      {item.name}
                    </div>
                    {requiredGroups.map(({ group, options: groupOptions }) => {
                      const pendingSelection =
                        pendingItem?.item.id === item.id
                          ? pendingItem.optionSelections[group.id]
                          : undefined;
                      const finalSelection = isSelected
                        ? selections[currentStep]?.selectedOptions?.find(
                            (o) => o.optionGroupId === group.id
                          )
                        : undefined;

                      return (
                        <div key={group.id}>
                          {requiredGroups.length > 1 && (
                            <div className="px-4 py-1.5 bg-gray-50 border-t">
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                                {group.name}
                              </span>
                            </div>
                          )}
                          <div className="divide-y">
                            {groupOptions.map((opt) => {
                              if (isSizeExcluded(currentBundleCat, item.id, opt.id)) {
                                return (
                                  <div
                                    key={opt.id}
                                    className="px-4 py-3 flex items-center justify-between opacity-50"
                                  >
                                    <span className="text-gray-400 line-through">{opt.name}</span>
                                    <span className="text-xs text-gray-400">Non disponible</span>
                                  </div>
                                );
                              }

                              const optSupplement = getSupplement(
                                currentBundleCat,
                                item.id,
                                opt.id
                              );
                              const isOptSelected =
                                pendingSelection?.option.id === opt.id ||
                                finalSelection?.optionId === opt.id;

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() =>
                                    handleSelectOption(item, group, opt, requiredGroups)
                                  }
                                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                    isOptSelected ? 'bg-primary-50' : ''
                                  }`}
                                >
                                  <span
                                    className={isOptSelected ? 'text-primary-700 font-medium' : ''}
                                  >
                                    {opt.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {optSupplement > 0 && (
                                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                                        +{formatPrice(optSupplement)}
                                      </span>
                                    )}
                                    {isOptSelected && (
                                      <Check className="w-5 h-5 text-primary-600" />
                                    )}
                                    {!isOptSelected && !isPending && !isSelected && (
                                      <ChevronRight className="w-5 h-5 text-gray-300" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Simple item without option groups
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    isSelected ? 'border-primary-500 bg-primary-50' : ''
                  }`}
                >
                  <span className={isSelected ? 'text-primary-700 font-medium' : 'text-gray-900'}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {supplement > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                        +{formatPrice(supplement)}
                      </span>
                    )}
                    {isSelected ? (
                      <Check className="w-5 h-5 text-primary-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                </button>
              );
            })}

            {availableItems.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Aucun article disponible pour cette catégorie
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 py-3 safe-area-bottom">
          {/* Summary */}
          {selections.some((s) => s !== null) && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex flex-wrap gap-2 mb-2">
                {selections.map((sel, idx) =>
                  sel ? (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-white rounded-full border text-gray-700"
                    >
                      {sel.menuItem.name}
                      {sel.supplement > 0 && (
                        <span className="text-amber-600 ml-1">+{formatPrice(sel.supplement)}</span>
                      )}
                    </span>
                  ) : null
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {formatPrice(config.fixed_price)}
                  {supplementsTotal > 0 && ` + ${formatPrice(supplementsTotal)}`}
                </span>
                <span className="font-bold text-gray-900">= {formatPrice(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* Quantity and Add button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors"
                disabled={quantity <= 1}
                aria-label="Réduire la quantité"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!allSelected}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                allSelected
                  ? 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {allSelected
                ? `Ajouter • ${formatPrice(totalPrice * quantity)}`
                : `Sélectionnez ${bundleCategories.length - selections.filter((s) => s).length} élément(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

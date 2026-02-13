import { useState, useMemo } from 'react';
import { X, Check, ChevronRight, ChevronLeft, Package, Plus, Minus } from 'lucide-react';
import { formatPrice, calculateBundlePrice } from '@foodtruck/shared';
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

  // Sub-step within a bundle category: item → required groups one by one → supplements
  const [pendingItem, setPendingItem] = useState<{
    item: MenuItem;
    optionSelections: Record<string, { group: CategoryOptionGroup; option: CategoryOption }>;
    currentGroupIndex: number; // index into required groups; >= length means supplement phase
    supplementSelections: Record<string, string[]>;
  } | null>(null);

  // Reset pending item when step changes
  const [prevStep, setPrevStep] = useState(currentStep);
  if (prevStep !== currentStep) {
    setPrevStep(currentStep);
    setPendingItem(null);
  }

  // ─── Helpers ───

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

  const getSupplement = (bundleCat: BundleCategoryConfig, itemId: string, sizeId?: string) => {
    if (!bundleCat.supplements) return 0;
    if (sizeId && bundleCat.supplements[`${itemId}:${sizeId}`]) {
      return bundleCat.supplements[`${itemId}:${sizeId}`];
    }
    return bundleCat.supplements[itemId] || 0;
  };

  const isSizeExcluded = (bundleCat: BundleCategoryConfig, itemId: string, sizeId: string) => {
    return bundleCat.excluded_sizes?.[itemId]?.includes(sizeId) || false;
  };

  const getCategoryName = (bundleCat: BundleCategoryConfig, index: number) => {
    if (bundleCat.label) return bundleCat.label;
    const categoryIds =
      bundleCat.category_ids || (bundleCat.category_id ? [bundleCat.category_id] : []);
    const names = categoryIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean);
    return names.join(' / ') || `Choix ${index + 1}`;
  };

  const getRequiredOptionGroups = (categoryId: string | null) => {
    if (!categoryId) return [];
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.category_option_groups) return [];
    return category.category_option_groups
      .filter((g) => !g.is_multiple && g.category_options?.length)
      .sort((a, b) => {
        // Required groups first, then by display_order
        if (a.is_required !== b.is_required) return a.is_required ? -1 : 1;
        return (a.display_order ?? 0) - (b.display_order ?? 0);
      })
      .map((group) => ({
        group,
        options: (group.category_options || [])
          .filter((o) => o.is_available !== false)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
      }));
  };

  const getSupplementGroups = (categoryId: string | null) => {
    if (!categoryId) return [];
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.category_option_groups) return [];
    return category.category_option_groups
      .filter((g) => g.is_multiple && g.category_options?.length)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((group) => ({
        group,
        options: (group.category_options || [])
          .filter((o) => o.is_available !== false)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
      }));
  };

  // ─── Derived state ───

  const currentBundleCat = bundleCategories[currentStep];
  const availableItems = currentBundleCat ? getItemsForCategory(currentBundleCat) : [];

  const {
    unitPrice: totalPrice,
    supplementsTotal,
    optionsTotal,
  } = useMemo(
    () =>
      calculateBundlePrice({
        fixedPrice: config.fixed_price,
        freeOptions: config.free_options || false,
        selections: selections
          .filter((s): s is Selection => s !== null)
          .map((s) => ({
            supplement: s.supplement,
            selectedOptions: s.selectedOptions,
          })),
      }),
    [selections, config.fixed_price, config.free_options]
  );
  const allSelected = selections.every((s) => s !== null);

  // Current sub-step phase
  const requiredGroups = pendingItem ? getRequiredOptionGroups(pendingItem.item.category_id) : [];
  const supplementGroups = pendingItem ? getSupplementGroups(pendingItem.item.category_id) : [];
  const isItemPhase = !pendingItem;
  const isSupplementPhase =
    pendingItem !== null && pendingItem.currentGroupIndex >= requiredGroups.length;
  const currentOptionGroup =
    !isSupplementPhase && pendingItem ? requiredGroups[pendingItem.currentGroupIndex] : null;

  // ─── Handlers ───

  const finalizeSelection = (
    item: MenuItem,
    optionSelections: Record<string, { group: CategoryOptionGroup; option: CategoryOption }>,
    supplementSelections: Record<string, string[]>
  ) => {
    const bundleCat = bundleCategories[currentStep];
    const entries = Object.values(optionSelections);
    // Accumulate supplements: sum per-option supplements, fallback to item base
    let supplement = 0;
    if (entries.length > 0 && bundleCat.supplements) {
      const hasPerOptionSupplements = entries.some(
        (e) => bundleCat.supplements?.[`${item.id}:${e.option.id}`] !== undefined
      );
      if (hasPerOptionSupplements) {
        for (const entry of entries) {
          supplement += getSupplement(bundleCat, item.id, entry.option.id);
        }
      } else {
        supplement = getSupplement(bundleCat, item.id);
      }
    } else {
      supplement = getSupplement(bundleCat, item.id);
    }

    const selectedOptions: SelectedOption[] = entries.map((e) => ({
      optionId: e.option.id,
      optionGroupId: e.group.id,
      name: e.option.name,
      groupName: e.group.name,
      priceModifier: e.option.price_modifier ?? 0,
      isSizeOption: false,
    }));

    // Add supplement selections
    const suppGroups = getSupplementGroups(item.category_id);
    Object.entries(supplementSelections).forEach(([groupId, optionIds]) => {
      const groupData = suppGroups.find((sg) => sg.group.id === groupId);
      if (!groupData) return;
      optionIds.forEach((optionId) => {
        const option = groupData.options.find((o) => o.id === optionId);
        if (option) {
          selectedOptions.push({
            optionId: option.id,
            optionGroupId: groupData.group.id,
            name: option.name,
            groupName: groupData.group.name,
            priceModifier: option.price_modifier ?? 0,
            isSizeOption: false,
          });
        }
      });
    });

    const newSelections = [...selections];
    newSelections[currentStep] = {
      categoryIndex: currentStep,
      menuItem: item,
      selectedOptions,
      supplement,
    };
    setSelections(newSelections);
    setPendingItem(null);

    if (currentStep < bundleCategories.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  // Step 1: select an item
  const handleSelectItem = (item: MenuItem) => {
    const rGroups = getRequiredOptionGroups(item.category_id);
    const sGroups = getSupplementGroups(item.category_id);

    if (rGroups.length === 0 && sGroups.length === 0) {
      // No options → finalize immediately
      finalizeSelection(item, {}, {});
      return;
    }

    setPendingItem({
      item,
      optionSelections: {},
      currentGroupIndex: 0,
      supplementSelections: {},
    });
  };

  // Step 2+: select a required option (one group at a time)
  const handleSelectOption = (group: CategoryOptionGroup, option: CategoryOption) => {
    if (!pendingItem) return;
    const rGroups = getRequiredOptionGroups(pendingItem.item.category_id);
    const sGroups = getSupplementGroups(pendingItem.item.category_id);

    const updated = { ...pendingItem.optionSelections, [group.id]: { group, option } };
    const nextIndex = pendingItem.currentGroupIndex + 1;

    if (nextIndex >= rGroups.length && sGroups.length === 0) {
      // All required done, no supplements → finalize
      finalizeSelection(pendingItem.item, updated, {});
    } else {
      // Move to next group (or supplements phase if nextIndex >= rGroups.length)
      setPendingItem({
        ...pendingItem,
        optionSelections: updated,
        currentGroupIndex: nextIndex,
        supplementSelections: {},
      });
    }
  };

  // Supplement toggle (multi-select)
  const handleSupplementToggle = (groupId: string, optionId: string) => {
    if (!pendingItem) return;
    const current = pendingItem.supplementSelections[groupId] || [];
    const updated = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    setPendingItem({
      ...pendingItem,
      supplementSelections: { ...pendingItem.supplementSelections, [groupId]: updated },
    });
  };

  // Confirm supplements and finalize
  const handleConfirmSupplements = () => {
    if (!pendingItem) return;
    finalizeSelection(
      pendingItem.item,
      pendingItem.optionSelections,
      pendingItem.supplementSelections
    );
  };

  // Back button: go to previous sub-step
  const handleBack = () => {
    if (!pendingItem) return;
    if (pendingItem.currentGroupIndex === 0) {
      // Back to item selection
      setPendingItem(null);
    } else {
      // Back to previous group
      const rGroups = getRequiredOptionGroups(pendingItem.item.category_id);
      const prevIndex = Math.min(pendingItem.currentGroupIndex - 1, rGroups.length - 1);
      const prevGroup = rGroups[prevIndex];
      const newSelections = { ...pendingItem.optionSelections };
      if (prevGroup) delete newSelections[prevGroup.group.id];
      setPendingItem({
        ...pendingItem,
        optionSelections: newSelections,
        currentGroupIndex: prevIndex,
        supplementSelections: {},
      });
    }
  };

  // Add to cart
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
      timeStart: bundle.time_start,
      timeEnd: bundle.time_end,
      daysOfWeek: bundle.days_of_week,
    };

    onAddToCart(bundleInfo, quantity);
    onClose();
  };

  // ─── Sub-step title ───

  const getSubStepTitle = () => {
    if (isItemPhase) {
      const name = getCategoryName(currentBundleCat, currentStep).toLowerCase();
      // Strip trailing 's' for singular form (plats→plat, desserts→dessert)
      const singular = name.endsWith('s') ? name.slice(0, -1) : name;
      return `Choisissez un ${singular}`;
    }
    if (currentOptionGroup) {
      return currentOptionGroup.group.name;
    }
    if (isSupplementPhase) {
      return 'Suppléments';
    }
    return '';
  };

  // ─── Render ───

  return (
    <div className="fixed inset-0 bg-anthracite/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-backdrop-in">
      <div className="bg-white w-full max-h-[90vh] sm:max-w-lg sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col animate-sheet-in sm:animate-modal-in shadow-xl">
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
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

        {/* Progress tabs */}
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

        {/* Current completed selection */}
        {selections[currentStep] && !pendingItem && (
          <div className="px-4 py-2 bg-emerald-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">
                {selections[currentStep]?.menuItem.name}
                {selections[currentStep]?.selectedOptions?.map((o) => o.name).join(', ') && (
                  <span className="text-emerald-500 ml-1">
                    ({selections[currentStep]?.selectedOptions?.map((o) => o.name).join(', ')})
                  </span>
                )}
                {(selections[currentStep]?.supplement ?? 0) > 0 && (
                  <span className="ml-1 text-emerald-600 font-medium">
                    +{formatPrice(selections[currentStep]!.supplement)}
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
              className="px-3 py-2 min-h-[44px] text-xs text-primary-500 font-medium hover:text-primary-700 active:scale-95"
            >
              Changer
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Sub-step header with back button */}
          {pendingItem && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleBack}
                className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
                aria-label="Retour"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {pendingItem.item.name}
                </p>
                {Object.keys(pendingItem.optionSelections).length > 0 && (
                  <p className="text-xs text-gray-400 truncate">
                    {Object.values(pendingItem.optionSelections)
                      .map((s) => s.option.name)
                      .join(' · ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <h3 className="text-sm font-medium text-gray-500 mb-3">{getSubStepTitle()}</h3>

          <div className="space-y-2">
            {/* ── Phase 1: Item selection ── */}
            {isItemPhase &&
              !selections[currentStep] &&
              availableItems.map((item) => {
                const supplement = getSupplement(currentBundleCat, item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full px-4 py-3 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors active:scale-[0.99]"
                  >
                    <span className="text-gray-900 font-medium">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {supplement > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                          +{formatPrice(supplement)}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </button>
                );
              })}

            {/* ── Phase 2: Required option group (one at a time) ── */}
            {currentOptionGroup &&
              currentOptionGroup.options.map((opt) => {
                if (isSizeExcluded(currentBundleCat, pendingItem!.item.id, opt.id)) {
                  return (
                    <div
                      key={opt.id}
                      className="px-4 py-3 rounded-xl border flex items-center justify-between opacity-50"
                    >
                      <span className="text-gray-400 line-through">{opt.name}</span>
                      <span className="text-xs text-gray-400">Non disponible</span>
                    </div>
                  );
                }

                const optSupplement = getSupplement(currentBundleCat, pendingItem!.item.id, opt.id);

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentOptionGroup.group, opt)}
                    className="w-full px-4 py-3 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors active:scale-[0.99]"
                  >
                    <span className="text-gray-900">{opt.name}</span>
                    <div className="flex items-center gap-2">
                      {optSupplement > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                          +{formatPrice(optSupplement)}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </button>
                );
              })}

            {/* ── Phase 3: Supplements (optional, multi-select) ── */}
            {isSupplementPhase &&
              supplementGroups.map(({ group, options: groupOptions }) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1 pt-2">
                    {supplementGroups.length > 1 && (
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {group.name}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded-full font-medium ml-auto">
                      Optionnel
                    </span>
                  </div>
                  {groupOptions.map((opt) => {
                    const isOptSelected = (
                      pendingItem?.supplementSelections[group.id] || []
                    ).includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSupplementToggle(group.id, opt.id)}
                        className={`w-full px-4 py-3 rounded-xl border-2 flex items-center justify-between transition-all active:scale-[0.99] ${
                          isOptSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={
                            isOptSelected ? 'text-primary-700 font-medium' : 'text-gray-900'
                          }
                        >
                          {opt.name}
                        </span>
                        <span
                          className={`text-xs font-medium ${isOptSelected ? 'text-primary-500' : 'text-gray-400'}`}
                        >
                          {(opt.price_modifier ?? 0) > 0
                            ? `+${formatPrice(opt.price_modifier ?? 0)}`
                            : 'Gratuit'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

            {availableItems.length === 0 && isItemPhase && (
              <p className="text-center text-gray-500 py-8">
                Aucun article disponible pour cette catégorie
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
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
                  {supplementsTotal + optionsTotal > 0 &&
                    ` + ${formatPrice(supplementsTotal + optionsTotal)}`}
                </span>
                <span className="font-bold text-gray-900">= {formatPrice(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* Quantity and Add button */}
          <div className="flex items-center gap-3">
            {allSelected && (
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
            )}

            {isSupplementPhase ? (
              <button
                onClick={handleConfirmSupplements}
                className="flex-1 py-3 rounded-xl font-semibold bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98] transition-all"
              >
                Continuer
              </button>
            ) : (
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
                  : 'Ajouter au panier'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

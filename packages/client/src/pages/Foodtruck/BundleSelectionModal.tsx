import { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Package, Plus } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem, SelectedOption, BundleCategoryConfig, CategoryOption } from '@foodtruck/shared';
import type { BundleOffer, CategoryWithOptions, BundleSelection, CategoryOptionGroupWithOptions } from './useFoodtruck';

interface BundleSelectionModalProps {
  bundle: BundleOffer;
  categories: CategoryWithOptions[];
  menuItems: MenuItem[];
  onClose: () => void;
  onConfirm: (selections: BundleSelection[]) => void;
}

interface CategorySelectionState {
  menuItem: MenuItem | null;
  selectedOptions: SelectedOption[];
  selectedSizeId: string | null; // For size-based supplements
  expanded: boolean;
  showOptions: boolean; // Show options section
}

// Get size group for a category (first required single-selection group)
function getSizeGroup(category: CategoryWithOptions | undefined): CategoryOptionGroupWithOptions | null {
  if (!category?.category_option_groups) return null;

  const sizeGroup = category.category_option_groups
    .filter((g: CategoryOptionGroupWithOptions) => g.is_required && !g.is_multiple)
    .sort((a: CategoryOptionGroupWithOptions, b: CategoryOptionGroupWithOptions) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];

  return sizeGroup || null;
}

// Get size options for a category
function getSizeOptions(category: CategoryWithOptions | undefined): CategoryOption[] | null {
  const sizeGroup = getSizeGroup(category);
  if (!sizeGroup?.category_options?.length) return null;
  return sizeGroup.category_options.filter((o: CategoryOption) => o.is_available !== false);
}

// Get supplement/option groups (non-size groups with available options)
function getSupplementGroups(category: CategoryWithOptions | undefined, menuItem: MenuItem | null): CategoryOptionGroupWithOptions[] {
  if (!category?.category_option_groups || !menuItem) return [];

  const sizeGroup = getSizeGroup(category);
  const disabledOptions = (menuItem.disabled_options || []) as string[];

  return category.category_option_groups
    .filter((g: CategoryOptionGroupWithOptions) => {
      // Exclude the size group
      if (sizeGroup && g.id === sizeGroup.id) return false;
      // Must have available options
      const availableOptions = (g.category_options || []).filter(
        (o: CategoryOption) => o.is_available !== false && !disabledOptions.includes(o.id)
      );
      return availableOptions.length > 0;
    })
    .sort((a: CategoryOptionGroupWithOptions, b: CategoryOptionGroupWithOptions) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export default function BundleSelectionModal({
  bundle,
  categories,
  menuItems,
  onClose,
  onConfirm,
}: BundleSelectionModalProps) {
  const bundleCategories = bundle.config.bundle_categories || [];

  // State for each category selection (keyed by index since same category can appear in multiple choices)
  const [selections, setSelections] = useState<Record<number, CategorySelectionState>>(() => {
    const initial: Record<number, CategorySelectionState> = {};
    bundleCategories.forEach((_, index) => {
      initial[index] = {
        menuItem: null,
        selectedOptions: [],
        selectedSizeId: null,
        expanded: false,
        showOptions: false,
      };
    });
    return initial;
  });

  // Get eligible items for a bundle category (supports multiple categories with OR logic)
  const getEligibleItems = (bundleCat: BundleCategoryConfig) => {
    // Support both old format (category_id) and new format (category_ids)
    const categoryIds = bundleCat.category_ids || (bundleCat.category_id ? [bundleCat.category_id] : []);

    const categoryItems = menuItems.filter(
      item => item.category_id && categoryIds.includes(item.category_id) && item.is_available
    );
    // Filter out excluded items
    if (bundleCat.excluded_items?.length) {
      return categoryItems.filter(item => !bundleCat.excluded_items?.includes(item.id));
    }
    return categoryItems;
  };

  // Get combined category label for display (e.g., "Sodas OU Bières")
  const getCategoryLabel = (bundleCat: BundleCategoryConfig): string => {
    if (bundleCat.label) return bundleCat.label;

    const categoryIds = bundleCat.category_ids || (bundleCat.category_id ? [bundleCat.category_id] : []);
    const categoryNames = categoryIds
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean);

    if (categoryNames.length === 0) return 'Catégorie';
    if (categoryNames.length === 1) return categoryNames[0]!;
    return categoryNames.join(' OU ');
  };

  // Get category info for an item (find which category it belongs to)
  const getCategoryForItem = (itemCategoryId: string | null): CategoryWithOptions | undefined => {
    if (!itemCategoryId) return undefined;
    return categories.find(c => c.id === itemCategoryId);
  };

  // Get supplement price for an item (optionally with size)
  const getItemSupplement = (bundleCat: BundleCategoryConfig, itemId: string, sizeId?: string | null): number => {
    if (!bundleCat.supplements) return 0;

    // If size is specified, try per-size supplement first
    if (sizeId) {
      const perSizeKey = `${itemId}:${sizeId}`;
      if (bundleCat.supplements[perSizeKey] !== undefined) {
        return bundleCat.supplements[perSizeKey];
      }
    }

    // Fallback to item-level supplement
    return bundleCat.supplements[itemId] || 0;
  };

  // Check if category has per-size supplements configured
  const hasSizeSupplements = (bundleCat: BundleCategoryConfig, itemId: string): boolean => {
    if (!bundleCat.supplements) return false;
    const prefix = `${itemId}:`;
    return Object.keys(bundleCat.supplements).some(key => key.startsWith(prefix));
  };

  // Get available sizes for an item (excluding disabled ones)
  const getAvailableSizes = (bundleCat: BundleCategoryConfig, itemId: string, allSizes: CategoryOption[] | null): CategoryOption[] | null => {
    if (!allSizes) return null;
    const excludedSizes = bundleCat.excluded_sizes?.[itemId] || [];
    const available = allSizes.filter(size => !excludedSizes.includes(size.id));
    return available.length > 0 ? available : null;
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    let price = bundle.config.fixed_price;

    // Add supplements
    bundleCategories.forEach((bc, index) => {
      const selection = selections[index];
      if (selection?.menuItem) {
        // Get supplement with size if selected
        price += getItemSupplement(bc, selection.menuItem.id, selection.selectedSizeId);

        // Add options price (unless free_options)
        if (!bundle.config.free_options) {
          const optionsPrice = selection.selectedOptions
            .filter(opt => !opt.isSizeOption)
            .reduce((sum, opt) => sum + opt.priceModifier, 0);
          price += optionsPrice;
        }
      }
    });

    return price;
  }, [bundle.config, bundleCategories, selections]);

  // Check if all required categories have a selection
  const isValid = useMemo(() => {
    return bundleCategories.every((_, index) => selections[index]?.menuItem !== null);
  }, [bundleCategories, selections]);

  // Handle item selection
  const handleSelectItem = (choiceIndex: number, item: MenuItem, sizeOptions: CategoryOption[] | null) => {
    // Auto-select the default size or first available size
    let defaultSizeId: string | null = null;
    const hasSizes = sizeOptions && sizeOptions.length > 0;
    if (hasSizes) {
      const defaultSize = sizeOptions.find(s => s.is_default) || sizeOptions[0];
      defaultSizeId = defaultSize.id;
    }

    // Check if item has supplement options - use the item's actual category
    const category = getCategoryForItem(item.category_id);
    const supplementGroups = getSupplementGroups(category, item);
    const hasSupplements = supplementGroups.length > 0;

    setSelections(prev => ({
      ...prev,
      [choiceIndex]: {
        ...prev[choiceIndex],
        menuItem: item,
        selectedOptions: [],
        selectedSizeId: defaultSizeId,
        // Keep expanded if item has sizes or supplements
        expanded: hasSizes || hasSupplements,
        showOptions: false,
      },
    }));
  };

  // Handle size selection for an item
  const handleSelectSize = (choiceIndex: number, sizeId: string) => {
    setSelections(prev => ({
      ...prev,
      [choiceIndex]: {
        ...prev[choiceIndex],
        selectedSizeId: sizeId,
      },
    }));
  };

  // Toggle options panel visibility
  const toggleShowOptions = (choiceIndex: number) => {
    setSelections(prev => ({
      ...prev,
      [choiceIndex]: {
        ...prev[choiceIndex],
        showOptions: !prev[choiceIndex]?.showOptions,
      },
    }));
  };

  // Handle option toggle (for multiple selection groups)
  const toggleOption = (choiceIndex: number, group: CategoryOptionGroupWithOptions, option: CategoryOption, menuItem: MenuItem) => {
    const selection = selections[choiceIndex];
    if (!selection) return;

    const optionPrices = (menuItem.option_prices || {}) as Record<string, number>;
    const sizeId = selection.selectedSizeId;

    // Calculate option price
    let optionPrice = option.price_modifier || 0;
    if (sizeId) {
      const perSizeKey = `${option.id}:${sizeId}`;
      if (optionPrices[perSizeKey] !== undefined) {
        optionPrice = optionPrices[perSizeKey];
      } else if (optionPrices[option.id] !== undefined) {
        optionPrice = optionPrices[option.id];
      }
    } else if (optionPrices[option.id] !== undefined) {
      optionPrice = optionPrices[option.id];
    }

    const newOption: SelectedOption = {
      optionId: option.id,
      optionGroupId: group.id,
      name: option.name,
      groupName: group.name,
      priceModifier: optionPrice,
      isSizeOption: false,
    };

    setSelections(prev => {
      const current = prev[choiceIndex];
      let newOptions: SelectedOption[];

      if (group.is_multiple) {
        // Multiple selection: toggle
        const exists = current.selectedOptions.some(o => o.optionId === option.id);
        if (exists) {
          newOptions = current.selectedOptions.filter(o => o.optionId !== option.id);
        } else {
          newOptions = [...current.selectedOptions, newOption];
        }
      } else {
        // Single selection: replace
        newOptions = [
          ...current.selectedOptions.filter(o => o.optionGroupId !== group.id),
          newOption,
        ];
      }

      return {
        ...prev,
        [choiceIndex]: {
          ...current,
          selectedOptions: newOptions,
        },
      };
    });
  };

  // Check if an option is selected
  const isOptionSelected = (choiceIndex: number, optionId: string): boolean => {
    const selection = selections[choiceIndex];
    return selection?.selectedOptions.some(o => o.optionId === optionId) || false;
  };

  // Toggle category expansion
  const toggleExpand = (choiceIndex: number) => {
    setSelections(prev => ({
      ...prev,
      [choiceIndex]: {
        ...prev[choiceIndex],
        expanded: !prev[choiceIndex]?.expanded,
      },
    }));
  };

  // Handle confirm
  const handleConfirm = () => {
    if (!isValid) return;

    const bundleSelections: BundleSelection[] = bundleCategories
      .map((bc, index) => {
        const selection = selections[index];
        if (!selection?.menuItem) return null;

        // Use the item's actual category_id for the selection
        return {
          categoryId: selection.menuItem.category_id || '',
          menuItem: selection.menuItem,
          selectedOptions: selection.selectedOptions,
          supplement: getItemSupplement(bc, selection.menuItem.id, selection.selectedSizeId),
        };
      })
      .filter((s): s is BundleSelection => s !== null);

    onConfirm(bundleSelections);
  };

  return (
    <div className="fixed inset-0 bg-anthracite/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-anthracite">{bundle.name}</h2>
              <p className="text-sm text-primary-500 font-semibold">{formatPrice(bundle.config.fixed_price)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {bundle.description && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{bundle.description}</p>
          )}

          {/* Category selections */}
          {bundleCategories.map((bundleCat, index) => {
            const eligibleItems = getEligibleItems(bundleCat);
            const selection = selections[index];
            const isExpanded = selection?.expanded;
            const selectedItem = selection?.menuItem;
            const selectedSizeId = selection?.selectedSizeId;

            // Get current supplement (with size if applicable)
            const currentSupplement = selectedItem
              ? getItemSupplement(bundleCat, selectedItem.id, selectedSizeId)
              : 0;

            // Get selected size name for display - use the item's actual category
            const itemCategory = selectedItem ? getCategoryForItem(selectedItem.category_id) : undefined;
            const itemSizeOptions = getSizeOptions(itemCategory);
            const selectedSizeName = selectedSizeId && itemSizeOptions
              ? itemSizeOptions.find(s => s.id === selectedSizeId)?.name
              : null;

            return (
              <div key={index} className="border rounded-xl overflow-hidden">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <span className="font-semibold text-anthracite">
                        {getCategoryLabel(bundleCat)}
                      </span>
                      {selectedItem ? (
                        <p className="text-sm text-primary-500 font-medium flex items-center gap-1 flex-wrap">
                          <Check className="w-3.5 h-3.5" />
                          {selectedItem.name}
                          {selectedSizeName && (
                            <span className="text-gray-500">({selectedSizeName})</span>
                          )}
                          {currentSupplement > 0 && (
                            <span className="text-amber-600">
                              (+{formatPrice(currentSupplement)})
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Choisir un article</p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Items list */}
                {isExpanded && (
                  <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                    {eligibleItems.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Aucun article disponible
                      </p>
                    ) : (
                      eligibleItems.map(item => {
                        const isSelected = selectedItem?.id === item.id;
                        // Get available sizes for this specific item's category
                        const thisItemCategory = getCategoryForItem(item.category_id);
                        const thisItemSizeOptions = getSizeOptions(thisItemCategory);
                        const availableSizes = getAvailableSizes(bundleCat, item.id, thisItemSizeOptions);
                        const itemHasSizes = availableSizes && availableSizes.length > 0 && hasSizeSupplements(bundleCat, item.id);
                        // Show lowest supplement for items with per-size pricing
                        const displaySupplement = itemHasSizes && availableSizes
                          ? Math.min(...availableSizes.map(s => getItemSupplement(bundleCat, item.id, s.id)))
                          : getItemSupplement(bundleCat, item.id);

                        return (
                          <div key={item.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectItem(index, item, itemHasSizes ? availableSizes : null)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                isSelected
                                  ? 'bg-primary-50 border-2 border-primary-500'
                                  : 'bg-white border border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              {/* Checkbox */}
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                  ? 'bg-primary-500 border-primary-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Item info */}
                            <div className="flex-1 text-left min-w-0">
                              <p className={`font-medium truncate ${isSelected ? 'text-primary-700' : 'text-anthracite'}`}>
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-xs text-gray-500 truncate">{item.description}</p>
                              )}
                            </div>

                            {/* Supplement price */}
                            {displaySupplement > 0 ? (
                              <span className="text-sm font-semibold text-amber-600 flex-shrink-0">
                                {itemHasSizes ? 'dès ' : ''}+{formatPrice(displaySupplement)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 flex-shrink-0">Inclus</span>
                            )}
                          </button>

                            {/* Size selector for selected item with per-size supplements */}
                            {isSelected && itemHasSizes && availableSizes && (
                              <div className="ml-8 mt-2 flex flex-wrap gap-2">
                                {availableSizes.map(size => {
                                  const sizeIsSelected = selectedSizeId === size.id;
                                  const sizeSupplement = getItemSupplement(bundleCat, item.id, size.id);
                                  return (
                                    <button
                                      key={size.id}
                                      type="button"
                                      onClick={() => handleSelectSize(index, size.id)}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        sizeIsSelected
                                          ? 'bg-primary-500 text-white'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {size.name}
                                      {sizeSupplement > 0 && (
                                        <span className={sizeIsSelected ? 'text-primary-100 ml-1' : 'text-amber-600 ml-1'}>
                                          +{formatPrice(sizeSupplement)}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Options/Supplements section for selected item */}
                            {isSelected && (() => {
                              // Use the item's actual category for supplement groups
                              const itemCategoryForOptions = getCategoryForItem(item.category_id);
                              const itemSupplementGroups = getSupplementGroups(itemCategoryForOptions, item);
                              if (itemSupplementGroups.length === 0) return null;

                              const selectedCount = selection?.selectedOptions.length || 0;
                              const showingOptions = selection?.showOptions;
                              const disabledOpts = (item.disabled_options || []) as string[];
                              const optionPrices = (item.option_prices || {}) as Record<string, number>;

                              return (
                                <div className="ml-8 mt-2">
                                  {/* Toggle button */}
                                  <button
                                    type="button"
                                    onClick={() => toggleShowOptions(index)}
                                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                  >
                                    <Plus className={`w-4 h-4 transition-transform ${showingOptions ? 'rotate-45' : ''}`} />
                                    {showingOptions ? 'Masquer les suppléments' : 'Ajouter des suppléments'}
                                    {selectedCount > 0 && !showingOptions && (
                                      <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                                        {selectedCount}
                                      </span>
                                    )}
                                  </button>

                                  {/* Options list */}
                                  {showingOptions && (
                                    <div className="mt-2 space-y-3">
                                      {itemSupplementGroups.map(group => {
                                        const availableOptions = (group.category_options || []).filter(
                                          (o: CategoryOption) => o.is_available !== false && !disabledOpts.includes(o.id)
                                        );

                                        return (
                                          <div key={group.id} className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs font-medium text-gray-600 mb-1.5">
                                              {group.name}
                                              {group.is_required && <span className="text-red-500 ml-1">*</span>}
                                              {group.is_multiple && <span className="text-gray-400 ml-1">(plusieurs choix)</span>}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {availableOptions.map((opt: CategoryOption) => {
                                                const isOptSelected = isOptionSelected(index, opt.id);
                                                // Get option price (with size-specific pricing if applicable)
                                                let optPrice = opt.price_modifier || 0;
                                                if (selectedSizeId) {
                                                  const perSizeKey = `${opt.id}:${selectedSizeId}`;
                                                  if (optionPrices[perSizeKey] !== undefined) {
                                                    optPrice = optionPrices[perSizeKey];
                                                  } else if (optionPrices[opt.id] !== undefined) {
                                                    optPrice = optionPrices[opt.id];
                                                  }
                                                } else if (optionPrices[opt.id] !== undefined) {
                                                  optPrice = optionPrices[opt.id];
                                                }

                                                return (
                                                  <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => toggleOption(index, group, opt, item)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                      isOptSelected
                                                        ? 'bg-primary-500 text-white'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                                                    }`}
                                                  >
                                                    {opt.name}
                                                    {optPrice > 0 && !bundle.config.free_options && (
                                                      <span className={isOptSelected ? 'text-primary-100 ml-1' : 'text-amber-600 ml-1'}>
                                                        +{formatPrice(optPrice)}
                                                      </span>
                                                    )}
                                                    {bundle.config.free_options && optPrice > 0 && (
                                                      <span className="text-green-600 ml-1">Offert</span>
                                                    )}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Free options notice */}
          {bundle.config.free_options && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Les suppléments sur les articles sont <strong>offerts</strong> dans cette formule !
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center justify-between px-5 transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <span>Ajouter au panier</span>
            <span className="font-bold text-lg">{formatPrice(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

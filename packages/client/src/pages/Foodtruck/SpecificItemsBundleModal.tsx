import { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Package, Plus } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem, SelectedOption, CategoryOption } from '@foodtruck/shared';
import type { SpecificItemsBundleOffer, CategoryWithOptions, BundleSelection, CategoryOptionGroupWithOptions } from './useFoodtruck';

interface SpecificItemsBundleModalProps {
  bundle: SpecificItemsBundleOffer;
  categories: CategoryWithOptions[];
  menuItems: MenuItem[];
  onClose: () => void;
  onConfirm: (selections: BundleSelection[]) => void;
}

interface ItemSelectionState {
  menuItem: MenuItem;
  selectedOptions: SelectedOption[];
  selectedSizeId: string | null;
  expanded: boolean;
  showOptions: boolean;
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

export default function SpecificItemsBundleModal({
  bundle,
  categories,
  menuItems,
  onClose,
  onConfirm,
}: SpecificItemsBundleModalProps) {
  // Get the menu items for this bundle
  const bundleMenuItems = useMemo(() => {
    return bundle.offer_items
      .map(oi => {
        const item = menuItems.find(mi => mi.id === oi.menu_item_id);
        return item ? { ...item, bundleQuantity: oi.quantity } : null;
      })
      .filter((item): item is MenuItem & { bundleQuantity: number } => item !== null);
  }, [bundle.offer_items, menuItems]);

  // Initialize state for each item
  const [selections, setSelections] = useState<Record<string, ItemSelectionState>>(() => {
    const initial: Record<string, ItemSelectionState> = {};
    bundleMenuItems.forEach(item => {
      const category = categories.find(c => c.id === item.category_id);
      const sizeOptions = getSizeOptions(category);
      const defaultSizeId = sizeOptions?.find(s => s.is_default)?.id || sizeOptions?.[0]?.id || null;

      initial[item.id] = {
        menuItem: item,
        selectedOptions: [],
        selectedSizeId: defaultSizeId,
        expanded: true, // Start expanded
        showOptions: false,
      };
    });
    return initial;
  });

  // Get category info
  const getCategoryInfo = (categoryId: string | null): CategoryWithOptions | undefined => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId);
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    let price = bundle.config.fixed_price;

    // Add options price (unless free_options)
    if (!bundle.config.free_options) {
      Object.values(selections).forEach(sel => {
        const optionsPrice = sel.selectedOptions
          .filter(opt => !opt.isSizeOption)
          .reduce((sum, opt) => sum + opt.priceModifier, 0);
        price += optionsPrice;
      });
    }

    return price;
  }, [bundle.config, selections]);

  // Handle size selection for an item
  const handleSelectSize = (itemId: string, sizeId: string) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selectedSizeId: sizeId,
      },
    }));
  };

  // Toggle options panel visibility
  const toggleShowOptions = (itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        showOptions: !prev[itemId]?.showOptions,
      },
    }));
  };

  // Handle option toggle (for multiple selection groups)
  const toggleOption = (itemId: string, group: CategoryOptionGroupWithOptions, option: CategoryOption, menuItem: MenuItem) => {
    const selection = selections[itemId];
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
      const current = prev[itemId];
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
        [itemId]: {
          ...current,
          selectedOptions: newOptions,
        },
      };
    });
  };

  // Check if an option is selected
  const isOptionSelected = (itemId: string, optionId: string): boolean => {
    const selection = selections[itemId];
    return selection?.selectedOptions.some(o => o.optionId === optionId) || false;
  };

  // Toggle item expansion
  const toggleExpand = (itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        expanded: !prev[itemId]?.expanded,
      },
    }));
  };

  // Handle confirm
  const handleConfirm = () => {
    const bundleSelections: BundleSelection[] = Object.values(selections).map(sel => ({
      categoryId: sel.menuItem.category_id || '',
      menuItem: sel.menuItem,
      selectedOptions: sel.selectedOptions,
      supplement: 0, // No supplements for specific items bundles
    }));

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

          {/* Items list */}
          {bundleMenuItems.map((item, index) => {
            const category = getCategoryInfo(item.category_id);
            const sizeOptions = getSizeOptions(category);
            const selection = selections[item.id];
            const isExpanded = selection?.expanded;
            const selectedSizeId = selection?.selectedSizeId;

            // Get selected size name for display
            const selectedSizeName = selectedSizeId && sizeOptions
              ? sizeOptions.find(s => s.id === selectedSizeId)?.name
              : null;

            // Get supplement groups
            const supplementGroups = getSupplementGroups(category, item);
            const hasSupplements = supplementGroups.length > 0;
            const hasSizes = sizeOptions && sizeOptions.length > 1;

            return (
              <div key={item.id} className="border rounded-xl overflow-hidden">
                {/* Item header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <span className="font-semibold text-anthracite">
                        {item.name}
                        {(item as MenuItem & { bundleQuantity: number }).bundleQuantity > 1 && (
                          <span className="text-gray-500 ml-1">
                            x{(item as MenuItem & { bundleQuantity: number }).bundleQuantity}
                          </span>
                        )}
                      </span>
                      {selectedSizeName && (
                        <p className="text-sm text-primary-500 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {selectedSizeName}
                        </p>
                      )}
                    </div>
                  </div>
                  {(hasSizes || hasSupplements) && (
                    isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )
                  )}
                </button>

                {/* Item options */}
                {isExpanded && (hasSizes || hasSupplements) && (
                  <div className="p-4 space-y-4">
                    {/* Size selector */}
                    {hasSizes && sizeOptions && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Taille</p>
                        <div className="flex flex-wrap gap-2">
                          {sizeOptions.map(size => {
                            const sizeIsSelected = selectedSizeId === size.id;
                            return (
                              <button
                                key={size.id}
                                type="button"
                                onClick={() => handleSelectSize(item.id, size.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                  sizeIsSelected
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {size.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Options/Supplements */}
                    {hasSupplements && (() => {
                      const selectedCount = selection?.selectedOptions.length || 0;
                      const showingOptions = selection?.showOptions;
                      const disabledOpts = (item.disabled_options || []) as string[];
                      const optionPrices = (item.option_prices || {}) as Record<string, number>;

                      return (
                        <div>
                          {/* Toggle button */}
                          <button
                            type="button"
                            onClick={() => toggleShowOptions(item.id)}
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
                            <div className="mt-3 space-y-3">
                              {supplementGroups.map(group => {
                                const availableOptions = (group.category_options || []).filter(
                                  (o: CategoryOption) => o.is_available !== false && !disabledOpts.includes(o.id)
                                );

                                return (
                                  <div key={group.id} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gray-600 mb-2">
                                      {group.name}
                                      {group.is_required && <span className="text-red-500 ml-1">*</span>}
                                      {group.is_multiple && <span className="text-gray-400 ml-1">(plusieurs choix)</span>}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {availableOptions.map((opt: CategoryOption) => {
                                        const isOptSelected = isOptionSelected(item.id, opt.id);
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
                                            onClick={() => toggleOption(item.id, group, opt, item)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
            className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center justify-between px-5 transition-all shadow-card active:scale-[0.98]"
          >
            <span>Ajouter au panier</span>
            <span className="font-bold text-lg">{formatPrice(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

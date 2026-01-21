import { useState, useMemo } from 'react';
import { X, Check, ChevronDown, ChevronUp, Gift, Plus, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem, SelectedOption, BuyXGetYConfig, CategoryOption, Offer } from '@foodtruck/shared';
import type { CategoryWithOptions, CategoryOptionGroupWithOptions } from './useFoodtruck';

// Buy X Get Y offer with typed config
export interface BuyXGetYOffer extends Offer {
  config: BuyXGetYConfig;
}

interface BuyXGetYSelectionModalProps {
  offer: BuyXGetYOffer;
  categories: CategoryWithOptions[];
  menuItems: MenuItem[];
  onClose: () => void;
  onConfirm: (items: { menuItem: MenuItem; selectedOptions: SelectedOption[]; isFree: boolean }[]) => void;
}

interface ItemSelectionState {
  menuItem: MenuItem | null;
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
      if (sizeGroup && g.id === sizeGroup.id) return false;
      const availableOptions = (g.category_options || []).filter(
        (o: CategoryOption) => o.is_available !== false && !disabledOptions.includes(o.id)
      );
      return availableOptions.length > 0;
    })
    .sort((a: CategoryOptionGroupWithOptions, b: CategoryOptionGroupWithOptions) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

// Calculate item price (with size option)
function getItemPrice(menuItem: MenuItem, selectedOptions: SelectedOption[], selectedSizeId: string | null, category: CategoryWithOptions | undefined): number {
  const sizeOptions = getSizeOptions(category);
  let basePrice = menuItem.price;

  // If there's a size option selected, use its price as base
  if (selectedSizeId && sizeOptions) {
    const sizeOption = sizeOptions.find(s => s.id === selectedSizeId);
    if (sizeOption) {
      basePrice = sizeOption.price_modifier || menuItem.price;
    }
  }

  // Add non-size options
  const optionsPrice = selectedOptions
    .filter(opt => !opt.isSizeOption)
    .reduce((sum, opt) => sum + opt.priceModifier, 0);

  return basePrice + optionsPrice;
}

export default function BuyXGetYSelectionModal({
  offer,
  categories,
  menuItems,
  onClose,
  onConfirm,
}: BuyXGetYSelectionModalProps) {
  const config = offer.config;
  const triggerQty = config.trigger_quantity || 2;
  const rewardQty = config.reward_quantity || 1;
  const rewardType = config.reward_type || 'free';
  const rewardValue = config.reward_value || 0;

  // State for trigger item selections
  const [triggerSelections, setTriggerSelections] = useState<Record<number, ItemSelectionState>>(() => {
    const initial: Record<number, ItemSelectionState> = {};
    for (let i = 0; i < triggerQty; i++) {
      initial[i] = {
        menuItem: null,
        selectedOptions: [],
        selectedSizeId: null,
        expanded: i === 0, // First one expanded by default
        showOptions: false,
      };
    }
    return initial;
  });

  // State for reward item selections
  const [rewardSelections, setRewardSelections] = useState<Record<number, ItemSelectionState>>(() => {
    const initial: Record<number, ItemSelectionState> = {};
    for (let i = 0; i < rewardQty; i++) {
      initial[i] = {
        menuItem: null,
        selectedOptions: [],
        selectedSizeId: null,
        expanded: false,
        showOptions: false,
      };
    }
    return initial;
  });

  // Get eligible trigger items
  const triggerItems = useMemo(() => {
    const categoryIds = config.trigger_category_ids || [];
    if (categoryIds.length === 0) return [];

    return menuItems.filter(item => {
      if (!item.category_id || !categoryIds.includes(item.category_id)) return false;
      if (!item.is_available) return false;
      if (config.trigger_excluded_items?.includes(item.id)) return false;
      return true;
    });
  }, [menuItems, config]);

  // Get eligible reward items
  const rewardItems = useMemo(() => {
    const categoryIds = config.reward_category_ids || [];
    if (categoryIds.length === 0) return [];

    return menuItems.filter(item => {
      if (!item.category_id || !categoryIds.includes(item.category_id)) return false;
      if (!item.is_available) return false;
      if (config.reward_excluded_items?.includes(item.id)) return false;
      return true;
    });
  }, [menuItems, config]);

  // Get category names for display
  const triggerCategoryNames = useMemo(() => {
    const categoryIds = config.trigger_category_ids || [];
    return categoryIds
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(' ou ');
  }, [categories, config.trigger_category_ids]);

  const rewardCategoryNames = useMemo(() => {
    const categoryIds = config.reward_category_ids || [];
    return categoryIds
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(' ou ');
  }, [categories, config.reward_category_ids]);

  // Get category for item
  const getCategoryForItem = (item: MenuItem | null): CategoryWithOptions | undefined => {
    if (!item?.category_id) return undefined;
    return categories.find(c => c.id === item.category_id);
  };

  // Check if size is excluded for a reward item
  const isSizeExcluded = (itemId: string, sizeId: string, isReward: boolean): boolean => {
    const excludedSizes = isReward ? config.reward_excluded_sizes : config.trigger_excluded_sizes;
    if (!excludedSizes) return false;
    return excludedSizes[itemId]?.includes(sizeId) || false;
  };

  // Get available sizes for an item (respecting exclusions)
  const getAvailableSizes = (item: MenuItem, isReward: boolean): CategoryOption[] | null => {
    const category = getCategoryForItem(item);
    const sizes = getSizeOptions(category);
    if (!sizes) return null;

    const available = sizes.filter(size => !isSizeExcluded(item.id, size.id, isReward));
    return available.length > 0 ? available : null;
  };

  // Handle trigger item selection
  const handleSelectTriggerItem = (index: number, item: MenuItem) => {
    const category = getCategoryForItem(item);
    const availableSizes = getAvailableSizes(item, false);
    const supplementGroups = getSupplementGroups(category, item);

    let defaultSizeId: string | null = null;
    if (availableSizes && availableSizes.length > 0) {
      const defaultSize = availableSizes.find(s => s.is_default) || availableSizes[0];
      defaultSizeId = defaultSize.id;
    }

    setTriggerSelections(prev => ({
      ...prev,
      [index]: {
        menuItem: item,
        selectedOptions: [],
        selectedSizeId: defaultSizeId,
        expanded: availableSizes !== null || supplementGroups.length > 0,
        showOptions: false,
      },
    }));
  };

  // Handle reward item selection
  const handleSelectRewardItem = (index: number, item: MenuItem) => {
    const category = getCategoryForItem(item);
    const availableSizes = getAvailableSizes(item, true);
    const supplementGroups = getSupplementGroups(category, item);

    let defaultSizeId: string | null = null;
    if (availableSizes && availableSizes.length > 0) {
      const defaultSize = availableSizes.find(s => s.is_default) || availableSizes[0];
      defaultSizeId = defaultSize.id;
    }

    setRewardSelections(prev => ({
      ...prev,
      [index]: {
        menuItem: item,
        selectedOptions: [],
        selectedSizeId: defaultSizeId,
        expanded: availableSizes !== null || supplementGroups.length > 0,
        showOptions: false,
      },
    }));
  };

  // Handle size selection
  const handleSelectSize = (isTrigger: boolean, index: number, sizeId: string) => {
    const setter = isTrigger ? setTriggerSelections : setRewardSelections;
    setter(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        selectedSizeId: sizeId,
      },
    }));
  };

  // Toggle options panel
  const toggleShowOptions = (isTrigger: boolean, index: number) => {
    const setter = isTrigger ? setTriggerSelections : setRewardSelections;
    setter(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        showOptions: !prev[index]?.showOptions,
      },
    }));
  };

  // Toggle expansion
  const toggleExpand = (isTrigger: boolean, index: number) => {
    const setter = isTrigger ? setTriggerSelections : setRewardSelections;
    setter(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        expanded: !prev[index]?.expanded,
      },
    }));
  };

  // Toggle option selection
  const toggleOption = (isTrigger: boolean, index: number, group: CategoryOptionGroupWithOptions, option: CategoryOption, menuItem: MenuItem) => {
    const setter = isTrigger ? setTriggerSelections : setRewardSelections;
    const selections = isTrigger ? triggerSelections : rewardSelections;
    const selection = selections[index];
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

    setter(prev => {
      const current = prev[index];
      let newOptions: SelectedOption[];

      if (group.is_multiple) {
        const exists = current.selectedOptions.some(o => o.optionId === option.id);
        if (exists) {
          newOptions = current.selectedOptions.filter(o => o.optionId !== option.id);
        } else {
          newOptions = [...current.selectedOptions, newOption];
        }
      } else {
        newOptions = [
          ...current.selectedOptions.filter(o => o.optionGroupId !== group.id),
          newOption,
        ];
      }

      return {
        ...prev,
        [index]: {
          ...current,
          selectedOptions: newOptions,
        },
      };
    });
  };

  // Check if option is selected
  const isOptionSelected = (isTrigger: boolean, index: number, optionId: string): boolean => {
    const selections = isTrigger ? triggerSelections : rewardSelections;
    return selections[index]?.selectedOptions.some(o => o.optionId === optionId) || false;
  };

  // Calculate totals
  const { triggerTotal, rewardTotal, savings, finalTotal } = useMemo(() => {
    let triggerSum = 0;
    let rewardSum = 0;

    // Sum trigger items
    Object.values(triggerSelections).forEach(sel => {
      if (sel.menuItem) {
        const category = getCategoryForItem(sel.menuItem);
        triggerSum += getItemPrice(sel.menuItem, sel.selectedOptions, sel.selectedSizeId, category);
      }
    });

    // Sum reward items (at full price)
    Object.values(rewardSelections).forEach(sel => {
      if (sel.menuItem) {
        const category = getCategoryForItem(sel.menuItem);
        rewardSum += getItemPrice(sel.menuItem, sel.selectedOptions, sel.selectedSizeId, category);
      }
    });

    // Calculate savings based on reward type
    let discount = 0;
    if (rewardType === 'free') {
      discount = rewardSum;
    } else {
      // Discount type - apply discount value to each reward
      discount = Math.min(rewardValue * rewardQty, rewardSum);
    }

    return {
      triggerTotal: triggerSum,
      rewardTotal: rewardSum,
      savings: discount,
      finalTotal: triggerSum + rewardSum - discount,
    };
  }, [triggerSelections, rewardSelections, rewardType, rewardValue, rewardQty]);

  // Check if all required selections are made
  const isValid = useMemo(() => {
    const allTriggersSelected = Object.values(triggerSelections).every(sel => sel.menuItem !== null);
    const allRewardsSelected = Object.values(rewardSelections).every(sel => sel.menuItem !== null);
    return allTriggersSelected && allRewardsSelected;
  }, [triggerSelections, rewardSelections]);

  // Handle confirm
  const handleConfirm = () => {
    if (!isValid) return;

    const items: { menuItem: MenuItem; selectedOptions: SelectedOption[]; isFree: boolean }[] = [];

    // Add trigger items (not free)
    Object.values(triggerSelections).forEach(sel => {
      if (sel.menuItem) {
        const category = getCategoryForItem(sel.menuItem);
        const sizeOptions = getSizeOptions(category);
        const allOptions = [...sel.selectedOptions];

        // Add size option if selected
        // IMPORTANT: priceModifier for size options must be the FULL price (base + modifier)
        // because CartContext uses it directly as the base price
        if (sel.selectedSizeId && sizeOptions) {
          const sizeOption = sizeOptions.find(s => s.id === sel.selectedSizeId);
          if (sizeOption) {
            const sizeGroup = getSizeGroup(category);
            // Full price = menuItem base price + size modifier
            const fullSizePrice = sel.menuItem.price + (sizeOption.price_modifier || 0);
            allOptions.push({
              optionId: sizeOption.id,
              optionGroupId: sizeGroup?.id || '',
              name: sizeOption.name,
              groupName: sizeGroup?.name || 'Taille',
              priceModifier: fullSizePrice,
              isSizeOption: true,
            });
          }
        }

        items.push({
          menuItem: sel.menuItem,
          selectedOptions: allOptions,
          isFree: false,
        });
      }
    });

    // Add reward items (marked as part of offer - discount handled at checkout)
    Object.values(rewardSelections).forEach(sel => {
      if (sel.menuItem) {
        const category = getCategoryForItem(sel.menuItem);
        const sizeOptions = getSizeOptions(category);
        const allOptions = [...sel.selectedOptions];

        // Add size option if selected
        // IMPORTANT: priceModifier for size options must be the FULL price (base + modifier)
        if (sel.selectedSizeId && sizeOptions) {
          const sizeOption = sizeOptions.find(s => s.id === sel.selectedSizeId);
          if (sizeOption) {
            const sizeGroup = getSizeGroup(category);
            // Full price = menuItem base price + size modifier
            const fullSizePrice = sel.menuItem.price + (sizeOption.price_modifier || 0);
            allOptions.push({
              optionId: sizeOption.id,
              optionGroupId: sizeGroup?.id || '',
              name: sizeOption.name,
              groupName: sizeGroup?.name || 'Taille',
              priceModifier: fullSizePrice,
              isSizeOption: true,
            });
          }
        }

        items.push({
          menuItem: sel.menuItem,
          selectedOptions: allOptions,
          isFree: rewardType === 'free',
        });
      }
    });

    onConfirm(items);
  };

  // Render item list section
  const renderItemSection = (
    title: string,
    subtitle: string,
    items: MenuItem[],
    selections: Record<number, ItemSelectionState>,
    isTrigger: boolean,
    bgColor: string
  ) => {
    const count = Object.keys(selections).length;

    return (
      <div className="space-y-3">
        <div className={`${bgColor} rounded-xl p-3`}>
          <h3 className="font-bold text-anthracite">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>

        {Array.from({ length: count }).map((_, index) => {
          const selection = selections[index];
          const selectedItem = selection?.menuItem;
          const isExpanded = selection?.expanded;

          const availableSizes = selectedItem ? getAvailableSizes(selectedItem, !isTrigger) : null;
          const selectedSizeName = selection?.selectedSizeId && availableSizes
            ? availableSizes.find(s => s.id === selection.selectedSizeId)?.name
            : null;

          return (
            <div key={index} className="border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(isTrigger, index)}
                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full ${isTrigger ? 'bg-primary-500' : 'bg-green-500'} text-white text-sm font-bold flex items-center justify-center`}>
                    {index + 1}
                  </span>
                  <div className="text-left">
                    <span className="font-semibold text-anthracite">
                      {isTrigger ? `Article ${index + 1}` : `Récompense ${index + 1}`}
                    </span>
                    {selectedItem ? (
                      <p className={`text-sm ${isTrigger ? 'text-primary-500' : 'text-green-600'} font-medium flex items-center gap-1`}>
                        <Check className="w-3.5 h-3.5" />
                        {selectedItem.name}
                        {selectedSizeName && <span className="text-gray-500">({selectedSizeName})</span>}
                        {!isTrigger && rewardType === 'free' && (
                          <span className="text-green-600 ml-1">OFFERT</span>
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

              {isExpanded && (
                <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Aucun article disponible</p>
                  ) : (
                    items.map(item => {
                      const isSelected = selectedItem?.id === item.id;
                      const itemCat = getCategoryForItem(item);
                      const itemSizes = getAvailableSizes(item, !isTrigger);
                      const supplementGroups = getSupplementGroups(itemCat, item);

                      return (
                        <div key={item.id}>
                          <button
                            type="button"
                            onClick={() => isTrigger
                              ? handleSelectTriggerItem(index, item)
                              : handleSelectRewardItem(index, item)
                            }
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              isSelected
                                ? isTrigger
                                  ? 'bg-primary-50 border-2 border-primary-500'
                                  : 'bg-green-50 border-2 border-green-500'
                                : 'bg-white border border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? isTrigger
                                    ? 'bg-primary-500 border-primary-500'
                                    : 'bg-green-500 border-green-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className={`font-medium truncate ${isSelected ? (isTrigger ? 'text-primary-700' : 'text-green-700') : 'text-anthracite'}`}>
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-xs text-gray-500 truncate">{item.description}</p>
                              )}
                            </div>
                            {!isTrigger && rewardType === 'free' ? (
                              <span className="text-sm font-semibold text-green-600 flex-shrink-0">
                                Offert
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500 flex-shrink-0">
                                {formatPrice(item.price)}
                              </span>
                            )}
                          </button>

                          {/* Size selector */}
                          {isSelected && itemSizes && itemSizes.length > 1 && (
                            <div className="ml-8 mt-2 flex flex-wrap gap-2">
                              {itemSizes.map(size => {
                                const sizeIsSelected = selection?.selectedSizeId === size.id;
                                return (
                                  <button
                                    key={size.id}
                                    type="button"
                                    onClick={() => handleSelectSize(isTrigger, index, size.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      sizeIsSelected
                                        ? isTrigger
                                          ? 'bg-primary-500 text-white'
                                          : 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {size.name}
                                    {(size.price_modifier || 0) > item.price && (
                                      <span className={sizeIsSelected ? 'opacity-70 ml-1' : 'text-gray-500 ml-1'}>
                                        {formatPrice(size.price_modifier || 0)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Options/Supplements */}
                          {isSelected && supplementGroups.length > 0 && (
                            <div className="ml-8 mt-2">
                              <button
                                type="button"
                                onClick={() => toggleShowOptions(isTrigger, index)}
                                className={`flex items-center gap-2 text-sm ${isTrigger ? 'text-primary-600 hover:text-primary-700' : 'text-green-600 hover:text-green-700'} font-medium`}
                              >
                                <Plus className={`w-4 h-4 transition-transform ${selection?.showOptions ? 'rotate-45' : ''}`} />
                                {selection?.showOptions ? 'Masquer les suppléments' : 'Ajouter des suppléments'}
                                {(selection?.selectedOptions.length || 0) > 0 && !selection?.showOptions && (
                                  <span className={`px-1.5 py-0.5 ${isTrigger ? 'bg-primary-100 text-primary-700' : 'bg-green-100 text-green-700'} rounded-full text-xs`}>
                                    {selection.selectedOptions.length}
                                  </span>
                                )}
                              </button>

                              {selection?.showOptions && (
                                <div className="mt-2 space-y-3">
                                  {supplementGroups.map(group => {
                                    const disabledOpts = (item.disabled_options || []) as string[];
                                    const optionPrices = (item.option_prices || {}) as Record<string, number>;
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
                                            const isOptSelected = isOptionSelected(isTrigger, index, opt.id);
                                            let optPrice = opt.price_modifier || 0;
                                            if (selection?.selectedSizeId) {
                                              const perSizeKey = `${opt.id}:${selection.selectedSizeId}`;
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
                                                onClick={() => toggleOption(isTrigger, index, group, opt, item)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                  isOptSelected
                                                    ? isTrigger
                                                      ? 'bg-primary-500 text-white'
                                                      : 'bg-green-500 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                                                }`}
                                              >
                                                {opt.name}
                                                {optPrice > 0 && (
                                                  <span className={isOptSelected ? 'opacity-70 ml-1' : 'text-amber-600 ml-1'}>
                                                    +{formatPrice(optPrice)}
                                                  </span>
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
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-anthracite/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-anthracite">{offer.name}</h2>
              <p className="text-sm text-green-600 font-semibold">
                {rewardType === 'free'
                  ? `${rewardQty} article${rewardQty > 1 ? 's' : ''} offert${rewardQty > 1 ? 's' : ''}`
                  : `-${formatPrice(rewardValue * rewardQty)}`
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {offer.description && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{offer.description}</p>
          )}

          {/* Trigger items section */}
          {renderItemSection(
            `Choisissez ${triggerQty} article${triggerQty > 1 ? 's' : ''}`,
            triggerCategoryNames || 'Articles éligibles',
            triggerItems,
            triggerSelections,
            true,
            'bg-primary-50'
          )}

          {/* Reward items section */}
          {renderItemSection(
            `${rewardQty} article${rewardQty > 1 ? 's' : ''} ${rewardType === 'free' ? 'offert' : 'en réduction'}${rewardQty > 1 ? 's' : ''}`,
            rewardCategoryNames || 'Articles éligibles',
            rewardItems,
            rewardSelections,
            false,
            'bg-green-50'
          )}

          {/* Savings summary */}
          {savings > 0 && isValid && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Économie réalisée</span>
              </div>
              <span className="font-bold text-green-600 text-lg">-{formatPrice(savings)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold flex items-center justify-between px-5 transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Ajouter au panier</span>
            </div>
            <div className="text-right">
              {savings > 0 ? (
                <>
                  <span className="text-xs line-through opacity-70 mr-2">{formatPrice(triggerTotal + rewardTotal)}</span>
                  <span className="font-bold text-lg">{formatPrice(finalTotal)}</span>
                </>
              ) : (
                <span className="font-bold text-lg">{formatPrice(finalTotal)}</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

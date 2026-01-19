import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem, SelectedOption } from '@foodtruck/shared';
import type { CategoryWithOptions, CategoryOptionGroupWithOptions } from './useFoodtruck';

interface OptionsModalProps {
  menuItem: MenuItem;
  category: CategoryWithOptions;
  onClose: () => void;
  onConfirm: (selectedOptions: SelectedOption[], quantity: number, notes?: string) => void;
}

export default function OptionsModal({
  menuItem,
  category,
  onClose,
  onConfirm,
}: OptionsModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const optionGroups = category.category_option_groups || [];

  // Type-safe access to option_prices JSONB
  const optionPrices = (menuItem.option_prices || {}) as Record<string, number>;

  // Type-safe access to disabled_options JSONB
  const disabledOptions = (menuItem.disabled_options || []) as string[];

  // Get the first required single-selection group (typically "Taille") - sorted by display_order
  const sortedRequiredGroups = optionGroups
    .filter((g) => g.is_required && !g.is_multiple)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const sizeGroup = sortedRequiredGroups.length > 0 ? sortedRequiredGroups[0] : null;

  // Check if a group is THE size group (first required, single selection)
  // Only the first required group uses absolute pricing, others use modifiers
  const isTheSizeGroup = (group: CategoryOptionGroupWithOptions) =>
    sizeGroup !== null && group.id === sizeGroup.id;

  // Get currently selected size option ID
  const getSelectedSizeId = (): string | null => {
    if (!sizeGroup) return null;
    const sizeSelections = selections[sizeGroup.id] || [];
    return sizeSelections.length > 0 ? sizeSelections[0] : null;
  };

  // Get the price for an option, considering item-specific prices
  // - Size group (first required): absolute price
  // - Other required groups (Base, Cuisson) and supplements: modifier with optional per-size pricing
  const getOptionPrice = (group: CategoryOptionGroupWithOptions, optionId: string, sizeId?: string | null): number => {
    if (isTheSizeGroup(group)) {
      // For size options: use item-specific price if available
      const itemPrice = optionPrices[optionId];
      if (itemPrice !== undefined) {
        return itemPrice;
      }
      // Fallback: base price + modifier (modifier is a delta, e.g., +0€, +3€, +6€)
      const option = group.category_options?.find((o) => o.id === optionId);
      return menuItem.price + (option?.price_modifier || 0);
    }

    // For other groups (Base, Cuisson, Supplements): check for per-size pricing first
    const effectiveSizeId = sizeId ?? getSelectedSizeId();
    if (effectiveSizeId) {
      const perSizeKey = `${optionId}:${effectiveSizeId}`;
      const perSizePrice = optionPrices[perSizeKey];
      if (perSizePrice !== undefined) {
        return perSizePrice;
      }
    }

    // Then check for item-specific flat price
    const flatPrice = optionPrices[optionId];
    if (flatPrice !== undefined) {
      return flatPrice;
    }

    // Fallback: use category modifier
    const option = group.category_options?.find((o) => o.id === optionId);
    return option?.price_modifier || 0;
  };

  // Initialize with default options
  useEffect(() => {
    const defaults: Record<string, string[]> = {};
    optionGroups.forEach((group) => {
      const defaultOpts = (group.category_options || [])
        .filter((opt) => opt.is_default && opt.is_available && !disabledOptions.includes(opt.id))
        .map((opt) => opt.id);
      if (defaultOpts.length > 0) {
        defaults[group.id] = defaultOpts;
      }
    });
    setSelections(defaults);
  }, [optionGroups, disabledOptions]);

  const handleOptionToggle = (groupId: string, optionId: string, isMultiple: boolean) => {
    setSelections((prev) => {
      if (isMultiple) {
        const current = prev[groupId] || [];
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        }
        return { ...prev, [groupId]: [...current, optionId] };
      } else {
        return { ...prev, [groupId]: [optionId] };
      }
    });
  };

  const calculateTotal = () => {
    let basePrice = menuItem.price;
    let supplements = 0;
    const selectedSizeId = getSelectedSizeId();

    Object.entries(selections).forEach(([groupId, optionIds]) => {
      const group = optionGroups.find((g) => g.id === groupId);
      if (!group) return;

      optionIds.forEach((optionId) => {
        if (isTheSizeGroup(group)) {
          // Size option: use as base price
          basePrice = getOptionPrice(group, optionId);
        } else {
          // Other required groups + supplements: add modifier (using size-specific price if available)
          supplements += getOptionPrice(group, optionId, selectedSizeId);
        }
      });
    });

    return (basePrice + supplements) * quantity;
  };

  const handleConfirm = () => {
    const selectedOptions: SelectedOption[] = [];
    const selectedSizeId = getSelectedSizeId();

    Object.entries(selections).forEach(([groupId, optionIds]) => {
      const group = optionGroups.find((g) => g.id === groupId);
      optionIds.forEach((optionId) => {
        const option = group?.category_options?.find((o) => o.id === optionId);
        if (option && group) {
          const isSize = isTheSizeGroup(group);
          // For size options, store the full price; for others, store the modifier (may vary by size)
          const priceValue = isSize
            ? getOptionPrice(group, optionId)
            : getOptionPrice(group, optionId, selectedSizeId);
          selectedOptions.push({
            optionId: option.id,
            optionGroupId: group.id,
            name: option.name,
            groupName: group.name,
            priceModifier: priceValue,
            isSizeOption: isSize,
          });
        }
      });
    });
    onConfirm(selectedOptions, quantity, notes.trim() || undefined);
  };

  const isValid = () => {
    return optionGroups.every((group) => {
      if (!group.is_required) return true;
      const selected = selections[group.id] || [];
      return selected.length >= 1;
    });
  };

  return (
    <div className="fixed inset-0 bg-anthracite/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-anthracite">{menuItem.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Option Groups */}
        <div className="p-4 space-y-6">
          {optionGroups
            .filter((g) => g.category_options?.some((o) => o.is_available && !disabledOptions.includes(o.id)))
            .sort((a, b) => {
              // Obligatoires (is_required) en premier
              if (a.is_required !== b.is_required) {
                return a.is_required ? -1 : 1;
              }
              // Puis par display_order
              return (a.display_order ?? 0) - (b.display_order ?? 0);
            })
            .map((group) => (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-anthracite">{group.name}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    group.is_multiple
                      ? 'bg-success-50 text-success-600'
                      : 'bg-primary-50 text-primary-600'
                  }`}>
                    {group.is_multiple ? 'Optionnel' : 'Obligatoire'}
                  </span>
                </div>
                <div className="space-y-2">
                  {(group.category_options || [])
                    .filter((opt) => opt.is_available && !disabledOptions.includes(opt.id))
                    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                    .map((option) => {
                      const isSelected = (selections[group.id] || []).includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleOptionToggle(group.id, option.id, group.is_multiple ?? false)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 shadow-sm'
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <span className={`font-medium ${isSelected ? 'text-primary-600' : 'text-anthracite'}`}>
                            {option.name}
                          </span>
                          <span className={`text-sm font-semibold ${isSelected ? 'text-primary-500' : 'text-gray-500'}`}>
                            {isTheSizeGroup(group) ? (
                              formatPrice(getOptionPrice(group, option.id))
                            ) : (() => {
                              const modifierPrice = getOptionPrice(group, option.id, getSelectedSizeId());
                              return modifierPrice > 0 ? `+${formatPrice(modifierPrice)}` : 'Gratuit';
                            })()}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

          {/* Quantity */}
          <div className="flex items-center justify-between py-4 border-t border-gray-100">
            <span className="font-semibold text-anthracite">Quantité</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Minus className="w-4 h-4 text-anthracite" />
              </button>
              <span className="w-8 text-center font-bold text-anthracite text-lg">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes / Comment */}
          <div className="py-4 border-t border-gray-100">
            <label className="block font-semibold text-anthracite mb-2">
              Commentaire <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sans oignon, bien cuit..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            onClick={handleConfirm}
            disabled={!isValid()}
            className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold flex items-center justify-between px-5 transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <span>Ajouter au panier</span>
            <span className="font-bold text-lg">{formatPrice(calculateTotal())}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

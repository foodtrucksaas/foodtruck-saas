import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { formatPrice, computeMenuItemPrice, type PricingOptionGroup } from '@foodtruck/shared';
import type {
  MenuItem,
  SelectedOption,
  MenuItemOptionGroupWithOptions,
  PriceMode,
} from '@foodtruck/shared';

interface OptionsModalProps {
  menuItem: MenuItem;
  optionGroups: MenuItemOptionGroupWithOptions[];
  onClose: () => void;
  onConfirm: (selectedOptions: SelectedOption[], quantity: number, notes?: string) => void;
}

/** Convert DB option groups to the pricing engine format. */
function toPricingGroups(groups: MenuItemOptionGroupWithOptions[]): PricingOptionGroup[] {
  return groups.map((g) => ({
    id: g.id,
    price_mode: g.price_mode as PriceMode,
    display_order: g.display_order ?? 0,
    options: (g.menu_item_options || []).map((o) => ({
      id: o.id,
      price_modifier: o.price_modifier,
      is_available: o.is_available,
    })),
  }));
}

export default function OptionsModal({
  menuItem,
  optionGroups,
  onClose,
  onConfirm,
}: OptionsModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const defaults: Record<string, string[]> = {};
    optionGroups.forEach((group) => {
      const defaultOpts = (group.menu_item_options || [])
        .filter((opt) => opt.is_default && opt.is_available)
        .map((opt) => opt.id);
      if (defaultOpts.length > 0) {
        defaults[group.id] = defaultOpts;
      }
    });
    return defaults;
  });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    const handle = requestIdleCallback(() => setContentReady(true), { timeout: 400 });
    return () => cancelIdleCallback(handle);
  }, []);

  const pricingGroups = toPricingGroups(optionGroups);

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

  // All selected option IDs (flat list)
  const selectedOptionIds = Object.values(selections).flat();

  const calculateTotal = () => {
    const { unitPrice } = computeMenuItemPrice(menuItem.price, pricingGroups, selectedOptionIds);
    return unitPrice * quantity;
  };

  const handleConfirm = () => {
    const selectedOptions: SelectedOption[] = [];

    Object.entries(selections).forEach(([groupId, optionIds]) => {
      const group = optionGroups.find((g) => g.id === groupId);
      if (!group) return;
      const priceMode = group.price_mode as PriceMode;

      optionIds.forEach((optionId) => {
        const option = group.menu_item_options?.find((o) => o.id === optionId);
        if (option) {
          selectedOptions.push({
            optionId: option.id,
            optionGroupId: group.id,
            name: option.name,
            groupName: group.name,
            priceModifier: option.price_modifier,
            priceMode,
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

  /** Display price for an option based on its group's price_mode. */
  const formatOptionPrice = (group: MenuItemOptionGroupWithOptions, optionId: string): string => {
    const option = group.menu_item_options?.find((o) => o.id === optionId);
    if (!option) return '';

    if ((group.price_mode as PriceMode) === 'absolute') {
      return formatPrice(option.price_modifier);
    }
    // Modifier: show +X€ or Gratuit
    return option.price_modifier > 0 ? `+${formatPrice(option.price_modifier)}` : 'Gratuit';
  };

  return (
    <div className="fixed inset-0 bg-anthracite/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-backdrop-in">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] shadow-xl animate-sheet-in sm:animate-modal-in [animation-delay:50ms] [animation-fill-mode:backwards] flex flex-col overflow-hidden">
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-anthracite">{menuItem.name}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Option Groups */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 space-y-6">
          {!contentReady ? (
            <div className="space-y-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-gray-200/60 rounded" />
                    <div className="h-5 w-16 bg-gray-200/60 rounded-full" />
                  </div>
                  <div className="h-12 bg-gray-100/60 rounded-xl" />
                  <div className="h-12 bg-gray-100/60 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {optionGroups
                .filter((g) => g.menu_item_options?.some((o) => o.is_available))
                .sort((a, b) => {
                  if (a.is_required !== b.is_required) {
                    return a.is_required ? -1 : 1;
                  }
                  return (a.display_order ?? 0) - (b.display_order ?? 0);
                })
                .map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-anthracite">{group.name}</span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          group.is_multiple
                            ? 'bg-success-50 text-success-600'
                            : 'bg-primary-50 text-primary-600'
                        }`}
                      >
                        {group.is_multiple ? 'Optionnel' : 'Obligatoire'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(group.menu_item_options || [])
                        .filter((opt) => opt.is_available)
                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map((option) => {
                          const isSelected = (selections[group.id] || []).includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                handleOptionToggle(group.id, option.id, group.is_multiple ?? false)
                              }
                              className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 bg-white'
                              }`}
                            >
                              <span
                                className={`font-medium ${isSelected ? 'text-primary-600' : 'text-anthracite'}`}
                              >
                                {option.name}
                              </span>
                              <span
                                className={`text-sm font-semibold min-w-[70px] text-right ${isSelected ? 'text-primary-500' : 'text-gray-500'}`}
                              >
                                {formatOptionPrice(group, option.id)}
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
                    className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Minus className="w-4 h-4 text-anthracite" />
                  </button>
                  <span className="w-8 text-center font-bold text-anthracite text-lg">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-11 h-11 rounded-full bg-primary-500 hover:bg-primary-600 text-on-accent flex items-center justify-center transition-colors shadow-sm active:scale-95"
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
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  rows={2}
                  maxLength={200}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_12px_rgba(45,45,45,0.05)]">
          <button
            onClick={handleConfirm}
            disabled={!isValid()}
            className="w-full py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-on-accent font-semibold flex items-center justify-between px-5 transition-all shadow-card disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <span>Ajouter au panier</span>
            <span className="font-bold text-lg">{formatPrice(calculateTotal())}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

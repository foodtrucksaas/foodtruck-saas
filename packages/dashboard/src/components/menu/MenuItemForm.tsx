import { useState } from 'react';
import { ALLERGENS } from '@foodtruck/shared';
import type { Category, CategoryOption, MenuItem } from '@foodtruck/shared';
import { Modal, Button, Input, Textarea, Select } from '@foodtruck/shared/components';
import type { OptionGroupWithOptions } from '../../hooks/useMenuPage';

export interface MenuItemFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  allergens: string[];
  is_daily_special: boolean;
  option_prices: Record<string, string>; // "optionId" or "optionId:sizeId" for per-size
  disabled_options: string[];
}

interface MenuItemFormProps {
  isOpen: boolean;
  editingItem: MenuItem | null;
  formData: MenuItemFormData;
  categories: Category[];
  sizeOptions: CategoryOption[]; // First required group options (for backwards compat)
  supplements: CategoryOption[]; // Flat list of supplements
  requiredOptionGroups: OptionGroupWithOptions[];
  supplementOptionGroups: OptionGroupWithOptions[];
  onFormDataChange: (data: MenuItemFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function MenuItemForm({
  isOpen,
  editingItem,
  formData,
  categories,
  sizeOptions,
  requiredOptionGroups,
  supplementOptionGroups,
  onFormDataChange,
  onSubmit,
  onClose,
}: MenuItemFormProps) {
  // Track which supplements have variable pricing enabled
  const [variablePricingEnabled, setVariablePricingEnabled] = useState<Record<string, boolean>>({});

  const categoryOptions = [
    { value: '', label: 'Sans catégorie' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  // Get first required group (typically "Taille") for size-based pricing
  const sizeGroup = requiredOptionGroups.length > 0 ? requiredOptionGroups[0] : null;
  const otherRequiredGroups = requiredOptionGroups.slice(1);

  const footerButtons = (
    <div className="flex gap-3">
      <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
        Annuler
      </Button>
      <Button type="submit" form="menu-item-form" variant="primary" className="flex-1">
        Sauvegarder
      </Button>
    </div>
  );

  const toggleOptionDisabled = (optionId: string) => {
    const isDisabled = formData.disabled_options.includes(optionId);
    if (isDisabled) {
      onFormDataChange({
        ...formData,
        disabled_options: formData.disabled_options.filter((id) => id !== optionId),
      });
    } else {
      // Remove prices when disabling
      const newPrices = { ...formData.option_prices };
      // Remove both direct price and per-size prices
      delete newPrices[optionId];
      Object.keys(newPrices).forEach((key) => {
        if (key.startsWith(`${optionId}:`)) {
          delete newPrices[key];
        }
      });
      onFormDataChange({
        ...formData,
        disabled_options: [...formData.disabled_options, optionId],
        option_prices: newPrices,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Modifier le plat' : 'Nouveau plat'}
      size="lg"
      footer={footerButtons}
    >
      <form id="menu-item-form" onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <Input
          label="Nom *"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          required
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
          rows={3}
        />

        {/* Show category select only when editing (to allow moving item) */}
        {editingItem && (
          <Select
            label="Catégorie"
            value={formData.category_id}
            onChange={(e) =>
              onFormDataChange({ ...formData, category_id: e.target.value, option_prices: {} })
            }
            options={categoryOptions}
          />
        )}

        {/* First required group (Taille) - with absolute prices */}
        {sizeGroup &&
          sizeGroup.category_options &&
          sizeGroup.category_options.length > 0 &&
          (() => {
            const enabledOptions = sizeGroup.category_options.filter(
              (opt) => !formData.disabled_options.includes(opt.id)
            );
            const allDisabled = enabledOptions.length === 0;

            if (!allDisabled) {
              return (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {sizeGroup.name} et prix *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Cliquez sur une option pour la désactiver pour ce plat
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sizeGroup.category_options.map((opt) => {
                      const isDisabled = formData.disabled_options.includes(opt.id);
                      return (
                        <div key={opt.id} className={isDisabled ? 'opacity-50' : ''}>
                          <button
                            type="button"
                            onClick={() => toggleOptionDisabled(opt.id)}
                            className={`text-xs mb-1 block w-full text-left px-2 py-2 rounded transition-colors min-h-[44px] active:scale-95 ${
                              isDisabled
                                ? 'bg-gray-100 text-gray-400 line-through'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {opt.name} {isDisabled ? '✗' : '✓'}
                          </button>
                          {!isDisabled && (
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.option_prices[opt.id] || ''}
                                onChange={(e) =>
                                  onFormDataChange({
                                    ...formData,
                                    option_prices: {
                                      ...formData.option_prices,
                                      [opt.id]: e.target.value,
                                    },
                                  })
                                }
                                placeholder="0.00"
                                required
                                className="pr-6 min-h-[44px]"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                €
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // All options disabled - show simple price input
            return (
              <div>
                <Input
                  label="Prix (*)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => onFormDataChange({ ...formData, price: e.target.value })}
                  required
                  className="min-h-[44px]"
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">
                    {sizeGroup.name} désactivées (cliquez pour réactiver) :
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sizeGroup.category_options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOptionDisabled(opt.id)}
                        className="text-xs px-2 py-2 bg-gray-100 text-gray-400 line-through rounded hover:bg-gray-200 min-h-[44px] active:scale-95"
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

        {/* No size group - show simple price input */}
        {!sizeGroup && (
          <Input
            label="Prix (*)"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => onFormDataChange({ ...formData, price: e.target.value })}
            required
            className="min-h-[44px]"
          />
        )}

        {/* Other required groups (Base, Cuisson, etc.) - with modifiers and optional per-size pricing */}
        {otherRequiredGroups.map((group) => (
          <div key={group.id}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {group.name}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Cliquez sur le prix pour personnaliser selon la taille
            </p>
            <div className="space-y-2 max-h-[200px] sm:max-h-[250px] overflow-y-auto">
              {(group.category_options || []).map((opt) => {
                const isDisabled = formData.disabled_options.includes(opt.id);
                const defaultPrice = (opt.price_modifier || 0) / 100;
                const hasVariablePricing =
                  variablePricingEnabled[opt.id] ||
                  Object.keys(formData.option_prices).some((k) => k.startsWith(`${opt.id}:`));

                // Calculate display price range
                const getDisplayPrice = () => {
                  if (hasVariablePricing && sizeOptions.length > 0) {
                    const enabledSizes = sizeOptions.filter(
                      (s) => !formData.disabled_options.includes(s.id)
                    );
                    const prices = enabledSizes.map((size) => {
                      const key = `${opt.id}:${size.id}`;
                      return parseFloat(formData.option_prices[key] ?? defaultPrice.toFixed(2));
                    });
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    if (minPrice === maxPrice) {
                      return `+${minPrice.toFixed(2)}€`;
                    }
                    return `+${minPrice.toFixed(2)}€ → +${maxPrice.toFixed(2)}€`;
                  }
                  const price = parseFloat(
                    formData.option_prices[opt.id] ?? defaultPrice.toFixed(2)
                  );
                  return `+${price.toFixed(2)}€`;
                };

                return (
                  <div
                    key={opt.id}
                    className={`rounded-lg border ${isDisabled ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                  >
                    {/* Compact row */}
                    <div className="flex items-center justify-between p-2 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleOptionDisabled(opt.id)}
                        className={`text-xs sm:text-sm font-medium min-h-[44px] text-left ${isDisabled ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                      >
                        {opt.name} {isDisabled ? '✗' : '✓'}
                      </button>

                      {!isDisabled && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span
                            className={`text-xs sm:text-sm ${hasVariablePricing ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                          >
                            {getDisplayPrice()}
                          </span>
                          <span
                            className={`text-xs px-2 py-1.5 rounded cursor-pointer min-h-[44px] flex items-center active:scale-95 ${
                              hasVariablePricing
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            onClick={() => {
                              if (!hasVariablePricing) {
                                setVariablePricingEnabled((prev) => ({ ...prev, [opt.id]: true }));
                              }
                            }}
                            title={
                              hasVariablePricing
                                ? 'Prix variable par taille'
                                : 'Cliquez pour prix variable'
                            }
                          >
                            {hasVariablePricing ? '≠' : '='}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expanded pricing section */}
                    {!isDisabled && hasVariablePricing && sizeOptions.length > 0 && (
                      <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <span className="text-xs text-gray-500">Prix par taille :</span>
                          <button
                            type="button"
                            onClick={() => {
                              setVariablePricingEnabled((prev) => ({ ...prev, [opt.id]: false }));
                              // Remove per-size prices
                              const newPrices = { ...formData.option_prices };
                              Object.keys(newPrices).forEach((k) => {
                                if (k.startsWith(`${opt.id}:`)) delete newPrices[k];
                              });
                              onFormDataChange({ ...formData, option_prices: newPrices });
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 min-h-[44px] px-2 active:opacity-70"
                          >
                            Revenir au prix unique
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {sizeOptions
                            .filter((s) => !formData.disabled_options.includes(s.id))
                            .map((size) => {
                              const key = `${opt.id}:${size.id}`;
                              return (
                                <div key={size.id} className="text-center">
                                  <span className="text-xs text-gray-500 block mb-0.5">
                                    {size.name}
                                  </span>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={formData.option_prices[key] ?? defaultPrice.toFixed(2)}
                                      onChange={(e) =>
                                        onFormDataChange({
                                          ...formData,
                                          option_prices: {
                                            ...formData.option_prices,
                                            [key]: e.target.value,
                                          },
                                        })
                                      }
                                      className="text-xs pr-5 min-h-[44px]"
                                    />
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                      €
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Simple price input when not variable */}
                    {!isDisabled && !hasVariablePricing && (
                      <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">Prix :</span>
                          <div className="relative w-20">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.option_prices[opt.id] ?? defaultPrice.toFixed(2)}
                              onChange={(e) =>
                                onFormDataChange({
                                  ...formData,
                                  option_prices: {
                                    ...formData.option_prices,
                                    [opt.id]: e.target.value,
                                  },
                                })
                              }
                              className="text-xs pr-5 min-h-[44px]"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              €
                            </span>
                          </div>
                          {sizeOptions.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setVariablePricingEnabled((prev) => ({ ...prev, [opt.id]: true }))
                              }
                              className="text-xs text-blue-600 hover:text-blue-700 ml-auto min-h-[44px] px-2 active:scale-95"
                            >
                              Prix par taille
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Supplements - with optional per-size pricing */}
        {supplementOptionGroups.map((group) => (
          <div key={group.id}>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {group.name}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Cliquez sur le prix pour personnaliser selon la taille
            </p>
            <div className="space-y-2 max-h-[200px] sm:max-h-[250px] overflow-y-auto">
              {(group.category_options || []).map((supp) => {
                const isDisabled = formData.disabled_options.includes(supp.id);
                const hasVariablePricing =
                  variablePricingEnabled[supp.id] ||
                  Object.keys(formData.option_prices).some((k) => k.startsWith(`${supp.id}:`));
                const defaultPrice = (supp.price_modifier || 0) / 100;

                // Calculate display price range
                const getDisplayPrice = () => {
                  if (hasVariablePricing && sizeOptions.length > 0) {
                    const enabledSizes = sizeOptions.filter(
                      (s) => !formData.disabled_options.includes(s.id)
                    );
                    const prices = enabledSizes.map((size) => {
                      const key = `${supp.id}:${size.id}`;
                      return parseFloat(formData.option_prices[key] ?? defaultPrice.toFixed(2));
                    });
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    if (minPrice === maxPrice) {
                      return minPrice === 0 ? 'Gratuit' : `+${minPrice.toFixed(2)}€`;
                    }
                    return `+${minPrice.toFixed(2)}€ → +${maxPrice.toFixed(2)}€`;
                  }
                  const price = parseFloat(
                    formData.option_prices[supp.id] ?? defaultPrice.toFixed(2)
                  );
                  return price === 0 ? 'Gratuit' : `+${price.toFixed(2)}€`;
                };

                return (
                  <div
                    key={supp.id}
                    className={`rounded-lg border ${isDisabled ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                  >
                    {/* Compact row */}
                    <div className="flex items-center justify-between p-2 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleOptionDisabled(supp.id)}
                        className={`text-xs sm:text-sm font-medium min-h-[44px] text-left ${isDisabled ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                      >
                        {supp.name} {isDisabled ? '✗' : '✓'}
                      </button>

                      {!isDisabled && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span
                            className={`text-xs sm:text-sm ${hasVariablePricing ? 'text-green-600 font-medium' : 'text-gray-600'}`}
                          >
                            {getDisplayPrice()}
                          </span>
                          {sizeOptions.length > 0 && (
                            <span
                              className={`text-xs px-1.5 py-1 sm:py-0.5 rounded cursor-pointer min-h-[28px] flex items-center ${
                                hasVariablePricing
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                              onClick={() => {
                                if (!hasVariablePricing) {
                                  setVariablePricingEnabled((prev) => ({
                                    ...prev,
                                    [supp.id]: true,
                                  }));
                                }
                              }}
                              title={
                                hasVariablePricing
                                  ? 'Prix variable par taille'
                                  : 'Cliquez pour prix variable'
                              }
                            >
                              {hasVariablePricing ? '≠' : '='}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded pricing section */}
                    {!isDisabled && hasVariablePricing && sizeOptions.length > 0 && (
                      <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <span className="text-xs text-gray-500">Prix par taille :</span>
                          <button
                            type="button"
                            onClick={() => {
                              setVariablePricingEnabled((prev) => ({ ...prev, [supp.id]: false }));
                              const newPrices = { ...formData.option_prices };
                              Object.keys(newPrices).forEach((k) => {
                                if (k.startsWith(`${supp.id}:`)) delete newPrices[k];
                              });
                              onFormDataChange({ ...formData, option_prices: newPrices });
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 min-h-[44px] px-2 active:opacity-70"
                          >
                            Revenir au prix unique
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {sizeOptions
                            .filter((s) => !formData.disabled_options.includes(s.id))
                            .map((size) => {
                              const key = `${supp.id}:${size.id}`;
                              return (
                                <div key={size.id} className="text-center">
                                  <span className="text-xs text-gray-500 block mb-0.5">
                                    {size.name}
                                  </span>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={formData.option_prices[key] ?? defaultPrice.toFixed(2)}
                                      onChange={(e) =>
                                        onFormDataChange({
                                          ...formData,
                                          option_prices: {
                                            ...formData.option_prices,
                                            [key]: e.target.value,
                                          },
                                        })
                                      }
                                      className="text-xs pr-5 min-h-[44px]"
                                    />
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                      €
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Simple price input when not variable */}
                    {!isDisabled && !hasVariablePricing && (
                      <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">Prix :</span>
                          <div className="relative w-20">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.option_prices[supp.id] ?? defaultPrice.toFixed(2)}
                              onChange={(e) =>
                                onFormDataChange({
                                  ...formData,
                                  option_prices: {
                                    ...formData.option_prices,
                                    [supp.id]: e.target.value,
                                  },
                                })
                              }
                              className="text-xs pr-5 min-h-[44px]"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                              €
                            </span>
                          </div>
                          {sizeOptions.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setVariablePricingEnabled((prev) => ({ ...prev, [supp.id]: true }))
                              }
                              className="text-xs text-green-600 hover:text-green-700 ml-auto min-h-[44px] px-2 active:scale-95"
                            >
                              Prix par taille
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Allergens */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Allergènes
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-[150px] overflow-y-auto">
            {ALLERGENS.map((allergen) => (
              <label
                key={allergen}
                className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm cursor-pointer transition-colors min-h-[44px] flex items-center ${
                  formData.allergens.includes(allergen)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={formData.allergens.includes(allergen)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onFormDataChange({
                        ...formData,
                        allergens: [...formData.allergens, allergen],
                      });
                    } else {
                      onFormDataChange({
                        ...formData,
                        allergens: formData.allergens.filter((a) => a !== allergen),
                      });
                    }
                  }}
                />
                {allergen}
              </label>
            ))}
          </div>
        </div>

        {/* Daily special */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={formData.is_daily_special}
              onChange={(e) =>
                onFormDataChange({ ...formData, is_daily_special: e.target.checked })
              }
              className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-700">Menu du jour</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}

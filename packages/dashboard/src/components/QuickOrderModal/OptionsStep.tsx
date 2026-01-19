import { Plus, Check } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItemWithOptions } from './useQuickOrder';

interface OptionsStepProps {
  item: MenuItemWithOptions;
  pendingOptions: Record<string, string[]>;
  onToggleOption: (groupId: string, optionId: string, isMultiple: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OptionsStep({
  item,
  pendingOptions,
  onToggleOption,
  onConfirm,
  onCancel,
}: OptionsStepProps) {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-lg mx-auto">
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          ← Retour aux produits
        </button>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
          <p className="text-2xl font-bold text-primary-600 mb-6">
            {formatPrice(item.price)}
          </p>

          <div className="space-y-6">
            {item.option_groups
              .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
              .map((group) => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-gray-900">{group.name}</h4>
                    {group.is_required && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        Obligatoire
                      </span>
                    )}
                    {group.is_multiple && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        Multi-sélection
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {group.options
                      .filter((o) => o.is_available)
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                      .map((option) => {
                        const isSelected = pendingOptions[group.id]?.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() =>
                              onToggleOption(group.id, option.id, group.is_multiple ?? false)
                            }
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{option.name}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-primary-600" />
                              )}
                            </div>
                            {(option.price_modifier ?? 0) !== 0 && (
                              <span className="text-sm text-gray-500">
                                {(option.price_modifier ?? 0) > 0 ? '+' : ''}
                                {formatPrice(option.price_modifier ?? 0)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>

          <button
            onClick={onConfirm}
            className="w-full mt-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}

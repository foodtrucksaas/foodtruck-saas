import { X, ArrowLeft, ArrowRight, Package, Gift, Tag, TrendingUp } from 'lucide-react';
import type { OfferType, MenuItem, OfferWithItems } from '@foodtruck/shared';
import { OFFER_TYPE_LABELS } from '@foodtruck/shared';
import type { OfferFormState, CategoryWithOptionGroups } from './useOffers';
import {
  OfferTypeSelector,
  BundleConfig,
  BuyXGetYConfig,
  PromoCodeConfig,
  ThresholdDiscountConfig,
  AdvancedOptions,
} from './components';

interface OfferWizardProps {
  editingOffer: OfferWithItems | null;
  form: OfferFormState;
  categories: CategoryWithOptionGroups[];
  menuItems: MenuItem[];
  step: number;
  saving: boolean;
  onFormChange: (form: OfferFormState) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const typeIcons: Record<OfferType, typeof Package> = {
  bundle: Package,
  buy_x_get_y: Gift,
  promo_code: Tag,
  threshold_discount: TrendingUp,
};

const typeBadgeColors: Record<OfferType, string> = {
  bundle: 'bg-primary-100 text-primary-700',
  buy_x_get_y: 'bg-amber-100 text-amber-700',
  promo_code: 'bg-blue-100 text-blue-700',
  threshold_discount: 'bg-emerald-100 text-emerald-700',
};

export function OfferWizard({
  editingOffer,
  form,
  categories,
  menuItems,
  step,
  saving,
  onFormChange,
  onStepChange,
  onSubmit,
  onClose,
}: OfferWizardProps) {
  const updateForm = (updates: Partial<OfferFormState>) => {
    onFormChange({ ...form, ...updates });
  };

  const selectOfferType = (type: OfferType) => {
    updateForm({ offerType: type });
    onStepChange(2);
  };

  const formProps = { form, categories, menuItems, updateForm };

  const TypeIcon = step === 2 ? typeIcons[form.offerType] : null;
  const typeBadgeColor = step === 2 ? typeBadgeColors[form.offerType] : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white sm:rounded-xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {step > 1 && !editingOffer && (
              <button
                onClick={() => onStepChange(step - 1)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {editingOffer ? "Modifier l'offre" : 'Nouvelle offre'}
            </h2>
            {step === 2 && TypeIcon && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${typeBadgeColor}`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                {OFFER_TYPE_LABELS[form.offerType]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Type */}
          {step === 1 && <OfferTypeSelector onSelect={selectOfferType} />}

          {/* Step 2: Configure Offer */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'offre *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    className="input"
                    placeholder={
                      form.offerType === 'bundle'
                        ? 'Ex : Menu Midi, Formule Complet...'
                        : form.offerType === 'buy_x_get_y'
                          ? 'Ex : 3 pizzas = 1 boisson offerte...'
                          : form.offerType === 'promo_code'
                            ? 'Ex : Code Bienvenue, Promo Ete...'
                            : 'Ex : -5 EUR des 25 EUR...'
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Note interne pour vous reperer..."
                  />
                </div>
              </div>

              {/* Type-specific config */}
              {form.offerType === 'bundle' && <BundleConfig {...formProps} />}
              {form.offerType === 'buy_x_get_y' && <BuyXGetYConfig {...formProps} />}
              {form.offerType === 'promo_code' && (
                <PromoCodeConfig form={form} updateForm={updateForm} />
              )}
              {form.offerType === 'threshold_discount' && (
                <ThresholdDiscountConfig form={form} updateForm={updateForm} />
              )}

              {/* Advanced Options */}
              <AdvancedOptions form={form} updateForm={updateForm} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          {step === 2 && (
            <button
              onClick={onSubmit}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {editingOffer ? 'Modifier' : "Creer l'offre"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

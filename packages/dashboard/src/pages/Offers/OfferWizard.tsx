import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import type { OfferType, MenuItem, OfferWithItems } from '@foodtruck/shared';
import type { OfferFormState, CategoryWithOptionGroups } from './useOffers';
import {
  OfferTypeSelector,
  BundleConfig,
  BuyXGetYConfig,
  HappyHourConfig,
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {step > 1 && !editingOffer && (
              <button
                onClick={() => onStepChange(step - 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Type */}
          {step === 1 && (
            <OfferTypeSelector onSelect={selectOfferType} />
          )}

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
                    placeholder="Ex: Menu Midi, Code Bienvenue..."
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
                    placeholder="Description interne..."
                  />
                </div>
              </div>

              {/* Type-specific config */}
              {form.offerType === 'bundle' && <BundleConfig {...formProps} />}
              {form.offerType === 'buy_x_get_y' && <BuyXGetYConfig {...formProps} />}
              {form.offerType === 'happy_hour' && <HappyHourConfig {...formProps} />}
              {form.offerType === 'promo_code' && <PromoCodeConfig form={form} updateForm={updateForm} />}
              {form.offerType === 'threshold_discount' && <ThresholdDiscountConfig form={form} updateForm={updateForm} />}

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
                  {editingOffer ? 'Modifier' : 'Creer l\'offre'}
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

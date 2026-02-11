import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
  OfferRecap,
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

const WIZARD_STEPS = [
  { number: 1, label: 'Type', shortLabel: 'Type' },
  { number: 2, label: 'Configuration', shortLabel: 'Config' },
];

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

  // Pour le mode edition, on saute l'etape 1
  const totalSteps = editingOffer ? 1 : 2;
  // effectiveStep utilise pour la logique d'affichage
  const _effectiveStep = editingOffer ? 2 : step;
  void _effectiveStep; // Mark as intentionally unused for now

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full h-[95vh] sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-hidden flex flex-col safe-area-bottom">
        {/* Header avec progress indicator */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          {/* Top bar avec back/close */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              {step > 1 && !editingOffer && (
                <button
                  onClick={() => onStepChange(step - 1)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingOffer ? "Modifier l'offre" : 'Nouvelle offre'}
                </h2>
                {form.offerType && (
                  <p className="text-xs text-gray-500">{OFFER_TYPE_LABELS[form.offerType]}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator - visible uniquement en creation */}
          {!editingOffer && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                {WIZARD_STEPS.map((s, index) => (
                  <div key={s.number} className="flex items-center flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all ${
                          step > s.number
                            ? 'bg-success-500 text-white'
                            : step === s.number
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step > s.number ? <Check className="w-4 h-4" /> : s.number}
                      </div>
                      <span
                        className={`text-xs font-medium hidden xs:block ${
                          step >= s.number ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {s.label}
                      </span>
                      <span
                        className={`text-xs font-medium xs:hidden ${
                          step >= s.number ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {s.shortLabel}
                      </span>
                    </div>
                    {index < WIZARD_STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 rounded ${
                          step > s.number ? 'bg-success-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* Progress bar mobile */}
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content - scroll fluide */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 pb-24 sm:pb-6">
            {/* Step 1: Select Type */}
            {step === 1 && <OfferTypeSelector onSelect={selectOfferType} />}

            {/* Step 2: Configure Offer */}
            {step === 2 && (
              <div className="space-y-5 sm:space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom de l'offre *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      className="input min-h-[48px] text-base"
                      placeholder="Ex: Menu Midi, Code Bienvenue..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description (optionnel)
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateForm({ description: e.target.value })}
                      className="input min-h-[80px] text-base"
                      rows={2}
                      placeholder="Description interne..."
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

                {/* Recap */}
                <OfferRecap form={form} categories={categories} />

                {/* Advanced Options */}
                <AdvancedOptions form={form} updateForm={updateForm} />
              </div>
            )}
          </div>
        </div>

        {/* Footer - sticky bottom sur mobile */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 safe-area-bottom">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-4 py-3 min-h-[48px] text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors active:scale-[0.98]"
            >
              Annuler
            </button>
            {step === 2 && (
              <button
                onClick={onSubmit}
                disabled={saving || !form.name.trim()}
                className="px-6 py-3 min-h-[48px] bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    {editingOffer ? 'Sauvegarder' : "Créer l'offre"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

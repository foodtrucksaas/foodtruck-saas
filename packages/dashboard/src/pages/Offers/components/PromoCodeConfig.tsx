import { useState } from 'react';
import { Tag, Eye, ChevronDown, ChevronUp, HelpCircle, Percent, Euro } from 'lucide-react';
import type { WizardFormProps } from './wizardTypes';

type PromoCodeConfigProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function PromoCodeConfig({ form, updateForm }: PromoCodeConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const discountDisplay =
    form.promoCodeDiscountType === 'percentage'
      ? `-${form.promoCodeDiscountValue || '10'}%`
      : `-${form.promoCodeDiscountValue || '5'}€`;

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-center gap-2 text-purple-700 mb-3">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Apercu de votre code promo</span>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{form.name || 'Mon code promo'}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 font-mono font-bold rounded-lg text-sm">
                  {form.promoCode || 'CODE'}
                </span>
                <span className="text-sm text-emerald-600 font-medium">{discountDisplay}</span>
              </div>
            </div>
          </div>
          {form.promoCodeMinOrderAmount && (
            <p className="mt-3 text-xs text-gray-500 border-t pt-2">
              A partir de {form.promoCodeMinOrderAmount}€ d'achat
            </p>
          )}
        </div>
      </div>

      {/* Code Input - Big and prominent */}
      <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Votre code promo</label>
        <input
          type="text"
          value={form.promoCode}
          onChange={(e) => updateForm({ promoCode: e.target.value.toUpperCase() })}
          className="input text-2xl font-mono font-bold uppercase tracking-wider h-14 w-full text-center"
          placeholder="WELCOME10"
        />
        <p className="text-xs text-gray-500 mt-2 text-center">
          Le code que vos clients devront saisir
        </p>
      </div>

      {/* Discount Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          Quelle reduction appliquer ?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateForm({ promoCodeDiscountType: 'percentage' })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              form.promoCodeDiscountType === 'percentage'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Pourcentage</span>
            </div>
            <p className="text-xs text-gray-500">Ex: -10% sur le total</p>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ promoCodeDiscountType: 'fixed' })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              form.promoCodeDiscountType === 'fixed'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Montant fixe</span>
            </div>
            <p className="text-xs text-gray-500">Ex: -5€ sur le total</p>
          </button>
        </div>
      </div>

      {/* Discount Value */}
      <div className="bg-white rounded-xl p-4 border shadow-sm">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          {form.promoCodeDiscountType === 'percentage'
            ? 'Pourcentage de reduction'
            : 'Montant de la reduction'}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <input
              type="number"
              min="1"
              max={form.promoCodeDiscountType === 'percentage' ? 100 : undefined}
              value={form.promoCodeDiscountValue}
              onChange={(e) => updateForm({ promoCodeDiscountValue: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input text-xl font-semibold text-center h-14"
              placeholder={form.promoCodeDiscountType === 'percentage' ? '10' : '5'}
            />
          </div>
          <span className="text-xl text-gray-400 font-semibold">
            {form.promoCodeDiscountType === 'percentage' ? '%' : '€'}
          </span>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showAdvanced ? 'Masquer' : 'Afficher'} les options avancees</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commande minimum
              </label>
              <p className="text-xs text-gray-500 mb-2">Montant minimum pour utiliser le code</p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.promoCodeMinOrderAmount}
                  onChange={(e) => updateForm({ promoCodeMinOrderAmount: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="input h-12 pr-10"
                  placeholder="15"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reduction max</label>
              <p className="text-xs text-gray-500 mb-2">
                Plafond de la reduction{' '}
                {form.promoCodeDiscountType === 'percentage' ? '(utile pour les %)' : ''}
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.promoCodeMaxDiscount}
                  onChange={(e) => updateForm({ promoCodeMaxDiscount: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="input h-12 pr-10"
                  placeholder="10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

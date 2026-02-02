import { TrendingUp, Eye, Percent, Euro } from 'lucide-react';
import type { WizardFormProps } from './wizardTypes';

type ThresholdDiscountConfigProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function ThresholdDiscountConfig({ form, updateForm }: ThresholdDiscountConfigProps) {
  const discountDisplay =
    form.thresholdDiscountType === 'percentage'
      ? `-${form.thresholdDiscountValue || '10'}%`
      : `-${form.thresholdDiscountValue || '5'}€`;

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
        <div className="flex items-center gap-2 text-amber-700 mb-3">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Apercu de votre offre</span>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{form.name || 'Mon offre'}</h4>
              <p className="text-sm text-amber-600 font-medium">
                Des {form.thresholdMinAmount || '25'}€ d'achat = {discountDisplay}
              </p>
            </div>
          </div>

          {/* Visual progress bar */}
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>0€</span>
              <span className="font-medium text-amber-600">{form.thresholdMinAmount || '25'}€</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                style={{ width: '75%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Plus que quelques euros pour debloquer la reduction !
            </p>
          </div>
        </div>
      </div>

      {/* Minimum Amount */}
      <div className="bg-white rounded-xl p-4 border-2 border-amber-200">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          A partir de quel montant ?
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Le client doit atteindre ce montant pour beneficier de la reduction
        </p>
        <div className="flex items-center gap-3">
          <span className="text-lg text-gray-400 font-medium">Des</span>
          <div className="relative w-32">
            <input
              type="number"
              step="0.5"
              min="1"
              value={form.thresholdMinAmount}
              onChange={(e) => updateForm({ thresholdMinAmount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input text-xl font-semibold text-center h-14"
              placeholder="25"
            />
          </div>
          <span className="text-lg text-gray-400 font-medium">€</span>
        </div>
      </div>

      {/* Discount Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          Quelle reduction appliquer ?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateForm({ thresholdDiscountType: 'percentage' })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              form.thresholdDiscountType === 'percentage'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-gray-900">Pourcentage</span>
            </div>
            <p className="text-xs text-gray-500">Ex: -10% sur le total</p>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ thresholdDiscountType: 'fixed' })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              form.thresholdDiscountType === 'fixed'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-gray-900">Montant fixe</span>
            </div>
            <p className="text-xs text-gray-500">Ex: -5€ sur le total</p>
          </button>
        </div>
      </div>

      {/* Discount Value */}
      <div className="bg-white rounded-xl p-4 border shadow-sm">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          {form.thresholdDiscountType === 'percentage'
            ? 'Pourcentage de reduction'
            : 'Montant de la reduction'}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <input
              type="number"
              min="1"
              max={form.thresholdDiscountType === 'percentage' ? 100 : undefined}
              value={form.thresholdDiscountValue}
              onChange={(e) => updateForm({ thresholdDiscountValue: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input text-xl font-semibold text-center h-14"
              placeholder={form.thresholdDiscountType === 'percentage' ? '10' : '5'}
            />
          </div>
          <span className="text-xl text-gray-400 font-semibold">
            {form.thresholdDiscountType === 'percentage' ? '%' : '€'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
        <p className="text-sm text-emerald-700">
          <span className="font-semibold">Resume :</span> Vos clients recevront automatiquement{' '}
          <span className="font-bold">{discountDisplay}</span> de reduction des que leur panier
          atteint <span className="font-bold">{form.thresholdMinAmount || '25'}€</span>
        </p>
      </div>
    </div>
  );
}

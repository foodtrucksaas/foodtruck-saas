import type { WizardFormProps } from './wizardTypes';

type ThresholdDiscountConfigProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function ThresholdDiscountConfig({ form, updateForm }: ThresholdDiscountConfigProps) {
  return (
    <div className="space-y-4">
      {/* Montant minimum */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          À partir de combien ? *
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Dès</span>
          <div className="relative w-28">
            <input
              type="number"
              step="0.5"
              min="1"
              value={form.thresholdMinAmount}
              onChange={(e) => updateForm({ thresholdMinAmount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input h-12 pr-8 text-lg font-medium text-center"
              placeholder="25"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
          </div>
          <span className="text-gray-500">d'achat</span>
        </div>
      </div>

      {/* Type + Valeur de reduction */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Réduction</label>
          <div className="flex">
            <button
              type="button"
              onClick={() => updateForm({ thresholdDiscountType: 'percentage' })}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-l-lg border active:scale-95 ${
                form.thresholdDiscountType === 'percentage'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => updateForm({ thresholdDiscountType: 'fixed' })}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-r-lg border-t border-r border-b active:scale-95 ${
                form.thresholdDiscountType === 'fixed'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              EUR
            </button>
          </div>
        </div>
        <div>
          <input
            type="number"
            min="1"
            value={form.thresholdDiscountValue}
            onChange={(e) => updateForm({ thresholdDiscountValue: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input w-24 min-h-[44px] text-center font-medium"
            placeholder={form.thresholdDiscountType === 'percentage' ? '10' : '5'}
          />
        </div>
        <span className="text-gray-500 pb-2">
          {form.thresholdDiscountType === 'percentage' ? '%' : '€'} offerts
        </span>
      </div>

      {/* Resume */}
      {form.thresholdMinAmount && form.thresholdDiscountValue && (
        <div className="bg-success-50 rounded-lg p-3 text-sm text-success-600">
          Dès <span className="font-bold">{form.thresholdMinAmount}€</span> d'achat ={' '}
          <span className="font-bold">
            -{form.thresholdDiscountValue}
            {form.thresholdDiscountType === 'percentage' ? '%' : '€'}
          </span>{' '}
          automatiquement
        </div>
      )}
    </div>
  );
}

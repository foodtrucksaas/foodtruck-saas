import type { WizardFormProps } from './wizardTypes';

type PromoCodeConfigProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function PromoCodeConfig({ form, updateForm }: PromoCodeConfigProps) {
  return (
    <div className="space-y-4">
      {/* Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Code promo *</label>
        <input
          type="text"
          value={form.promoCode}
          onChange={(e) => updateForm({ promoCode: e.target.value.toUpperCase() })}
          className="input h-12 uppercase font-mono font-bold tracking-wider w-full max-w-xs"
          placeholder="BIENVENUE10"
        />
      </div>

      {/* Type + Valeur */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reduction</label>
          <div className="flex">
            <button
              type="button"
              onClick={() => updateForm({ promoCodeDiscountType: 'percentage' })}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-l-lg border active:scale-95 ${
                form.promoCodeDiscountType === 'percentage'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => updateForm({ promoCodeDiscountType: 'fixed' })}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-r-lg border-t border-r border-b active:scale-95 ${
                form.promoCodeDiscountType === 'fixed'
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
            value={form.promoCodeDiscountValue}
            onChange={(e) => updateForm({ promoCodeDiscountValue: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input w-24 min-h-[44px] text-center font-medium"
            placeholder={form.promoCodeDiscountType === 'percentage' ? '10' : '5'}
          />
        </div>
        <span className="text-gray-500 pb-2">
          {form.promoCodeDiscountType === 'percentage' ? '%' : '€'} de reduction
        </span>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Minimum commande</label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.promoCodeMinOrderAmount}
              onChange={(e) => updateForm({ promoCodeMinOrderAmount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input min-h-[44px] pr-8 w-full"
              placeholder="Aucun"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              €
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Reduction max</label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.promoCodeMaxDiscount}
              onChange={(e) => updateForm({ promoCodeMaxDiscount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="input min-h-[44px] pr-8 w-full"
              placeholder="Aucune"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              €
            </span>
          </div>
        </div>
      </div>

      {/* Apercu */}
      {form.promoCode && (
        <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-700">
          Code <span className="font-mono font-bold">{form.promoCode}</span> ={' '}
          <span className="font-medium">
            -{form.promoCodeDiscountValue || '0'}
            {form.promoCodeDiscountType === 'percentage' ? '%' : '€'}
          </span>
          {form.promoCodeMinOrderAmount && ` (min. ${form.promoCodeMinOrderAmount}€)`}
        </div>
      )}
    </div>
  );
}

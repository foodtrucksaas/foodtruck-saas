import type { WizardFormProps } from './wizardTypes';

type PromoCodeConfigProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function PromoCodeConfig({ form, updateForm }: PromoCodeConfigProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-medium">Configuration du code promo</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Code promo *</label>
        <input
          type="text"
          value={form.promoCode}
          onChange={(e) => updateForm({ promoCode: e.target.value.toUpperCase() })}
          className="input min-h-[44px] uppercase w-full sm:w-48"
          placeholder="BIENVENUE"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de reduction</label>
          <select
            value={form.promoCodeDiscountType}
            onChange={(e) =>
              updateForm({ promoCodeDiscountType: e.target.value as 'percentage' | 'fixed' })
            }
            className="input min-h-[44px]"
          >
            <option value="percentage">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (EUR)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valeur</label>
          <input
            type="number"
            value={form.promoCodeDiscountValue}
            onChange={(e) => updateForm({ promoCodeDiscountValue: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px]"
            placeholder={form.promoCodeDiscountType === 'percentage' ? '10' : '5.00'}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commande minimum (optionnel)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.promoCodeMinOrderAmount}
            onChange={(e) => updateForm({ promoCodeMinOrderAmount: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px]"
            placeholder="15.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reduction max (optionnel)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.promoCodeMaxDiscount}
            onChange={(e) => updateForm({ promoCodeMaxDiscount: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px]"
            placeholder="10.00"
          />
        </div>
      </div>
    </div>
  );
}

import type { WizardFormProps } from './wizardTypes';

type ThresholdDiscountConfigProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function ThresholdDiscountConfig({ form, updateForm }: ThresholdDiscountConfigProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-medium">Configuration de la remise au palier</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Montant minimum de commande *
        </label>
        <div className="relative w-full sm:w-48">
          <input
            type="number"
            step="0.01"
            value={form.thresholdMinAmount}
            onChange={(e) => updateForm({ thresholdMinAmount: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px] pr-12 w-full"
            placeholder="25.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">EUR</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de reduction</label>
          <select
            value={form.thresholdDiscountType}
            onChange={(e) =>
              updateForm({ thresholdDiscountType: e.target.value as 'percentage' | 'fixed' })
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
            value={form.thresholdDiscountValue}
            onChange={(e) => updateForm({ thresholdDiscountValue: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input min-h-[44px]"
            placeholder={form.thresholdDiscountType === 'percentage' ? '10' : '5.00'}
          />
        </div>
      </div>
    </div>
  );
}

import type { WizardFormProps } from './wizardTypes';

type AdvancedOptionsProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function AdvancedOptions({ form, updateForm }: AdvancedOptionsProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-medium">Options avancees</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de debut (optionnel)
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => updateForm({ startDate: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de fin (optionnel)
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => updateForm({ endDate: e.target.value })}
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Utilisations max (optionnel)
          </label>
          <input
            type="number"
            min="1"
            value={form.maxUses}
            onChange={(e) => updateForm({ maxUses: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input"
            placeholder="Illimite"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max par client
          </label>
          <input
            type="number"
            min="1"
            value={form.maxUsesPerCustomer}
            onChange={(e) => updateForm({ maxUsesPerCustomer: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.stackable}
          onChange={(e) => updateForm({ stackable: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">Cumulable avec d'autres offres</span>
      </label>
    </div>
  );
}

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
      {/* Note: Le flag "stackable" n'est plus utilisé.
          Avec la nouvelle logique, les offres s'appliquent automatiquement
          sur des articles différents (ex: 4 pizzas + 1 boisson = 2 offres distinctes).
          Les offres qui ciblent les mêmes articles sont comparées et la meilleure est choisie. */}
    </div>
  );
}

import type { WizardFormProps } from './wizardTypes';
import { DAYS } from './wizardTypes';

export function HappyHourConfig({ form, categories, updateForm }: WizardFormProps) {
  const toggleDay = (day: number) => {
    const newDays = form.daysOfWeek.includes(day)
      ? form.daysOfWeek.filter((d) => d !== day)
      : [...form.daysOfWeek, day];
    updateForm({ daysOfWeek: newDays });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-medium">Configuration Happy Hour</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure de debut *
          </label>
          <input
            type="time"
            value={form.timeStart}
            onChange={(e) => updateForm({ timeStart: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure de fin *
          </label>
          <input
            type="time"
            value={form.timeEnd}
            onChange={(e) => updateForm({ timeEnd: e.target.value })}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Jours actifs *
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                form.daysOfWeek.includes(day.value)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de reduction
          </label>
          <select
            value={form.happyHourDiscountType}
            onChange={(e) => updateForm({ happyHourDiscountType: e.target.value as 'percentage' | 'fixed' })}
            className="input"
          >
            <option value="percentage">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (EUR)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valeur
          </label>
          <input
            type="number"
            value={form.happyHourDiscountValue}
            onChange={(e) => updateForm({ happyHourDiscountValue: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="input"
            placeholder={form.happyHourDiscountType === 'percentage' ? '20' : '5.00'}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Appliquer sur
        </label>
        <select
          value={form.happyHourAppliesTo}
          onChange={(e) => updateForm({ happyHourAppliesTo: e.target.value as 'all' | 'category' })}
          className="input"
        >
          <option value="all">Tout le menu</option>
          <option value="category">Une categorie specifique</option>
        </select>
      </div>
      {form.happyHourAppliesTo === 'category' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categorie
          </label>
          <select
            value={form.happyHourCategoryId}
            onChange={(e) => updateForm({ happyHourCategoryId: e.target.value })}
            className="input"
          >
            <option value="">Selectionnez une categorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

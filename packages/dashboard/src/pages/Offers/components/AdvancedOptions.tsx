import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2, Clock, Calendar } from 'lucide-react';
import type { WizardFormProps } from './wizardTypes';

type AdvancedOptionsProps = Pick<WizardFormProps, 'form' | 'updateForm'>;

export function AdvancedOptions({ form, updateForm }: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Montrer un indicateur si des options sont configurées
  const hasConfig =
    form.startDate ||
    form.endDate ||
    form.timeStart ||
    form.timeEnd ||
    form.maxUses ||
    form.maxUsesPerCustomer;
  const hasTimeSlot = form.timeStart && form.timeEnd;
  const hasDateRange = form.startDate || form.endDate;

  // Format time for display (remove seconds if present)
  const formatTime = (time: string) => time?.slice(0, 5) || '';

  return (
    <div className="border-t pt-3">
      {/* Preview badges - toujours visibles */}
      {(hasTimeSlot || hasDateRange) && !isOpen && (
        <div className="flex flex-wrap gap-2 mb-2">
          {hasTimeSlot && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-info-50 text-info-600 rounded-full text-xs font-medium">
              <Clock className="w-3 h-3" />
              {formatTime(form.timeStart)} - {formatTime(form.timeEnd)}
            </span>
          )}
          {hasDateRange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warning-50 text-warning-600 rounded-full text-xs font-medium">
              <Calendar className="w-3 h-3" />
              {form.startDate &&
                new Date(form.startDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              {form.startDate && form.endDate && ' → '}
              {form.endDate &&
                new Date(form.endDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Options avancées
          {hasConfig && !isOpen && <span className="w-2 h-2 rounded-full bg-primary-500" />}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="space-y-4 pt-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de debut (optionnel)
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateForm({ startDate: e.target.value })}
                className="input min-h-[44px]"
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
                className="input min-h-[44px]"
              />
            </div>
          </div>

          {/* Créneaux horaires */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Créneaux horaires (optionnel)
            </label>
            <p className="text-xs text-gray-500 mb-2">Ex: Menu midi disponible de 12h à 15h</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={form.timeStart}
                onChange={(e) => updateForm({ timeStart: e.target.value })}
                className="input h-10 w-28"
                placeholder="12:00"
              />
              <span className="text-gray-400">à</span>
              <input
                type="time"
                value={form.timeEnd}
                onChange={(e) => updateForm({ timeEnd: e.target.value })}
                className="input h-10 w-28"
                placeholder="15:00"
              />
              {(form.timeStart || form.timeEnd) && (
                <button
                  type="button"
                  onClick={() => updateForm({ timeStart: '', timeEnd: '' })}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="input min-h-[44px]"
                placeholder="Illimite"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max par client</label>
              <input
                type="number"
                min="1"
                value={form.maxUsesPerCustomer}
                onChange={(e) => updateForm({ maxUsesPerCustomer: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="input min-h-[44px]"
              />
            </div>
          </div>
          {/* Note: Le flag "stackable" n'est plus utilisé.
            Avec la nouvelle logique, les offres s'appliquent automatiquement
            sur des articles différents (ex: 4 pizzas + 1 boisson = 2 offres distinctes).
            Les offres qui ciblent les mêmes articles sont comparées et la meilleure est choisie. */}
        </div>
      )}
    </div>
  );
}

import { X, Calendar, Pencil, XCircle } from 'lucide-react';
import type { Location } from '@foodtruck/shared';
import type { CalendarDay, DayModalFormState } from './useSchedule';

interface DayModalProps {
  selectedDay: CalendarDay;
  locations: Location[];
  form: DayModalFormState;
  onFormChange: (form: DayModalFormState) => void;
  onClose: () => void;
  onSave: () => void;
}

export function DayModal({
  selectedDay,
  locations,
  form,
  onFormChange,
  onClose,
  onSave,
}: DayModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[80vh] sm:rounded-2xl sm:max-w-md shadow-xl flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl animate-slide-up sm:animate-fade-in">
        {/* iOS-style drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between p-4 pt-2 sm:pt-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">
              {selectedDay.date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            {selectedDay.schedules.length > 0 && form.mode === 'normal' && (
              <p className="text-sm text-gray-500">
                Habituellement : {selectedDay.schedules.map((s) => s.location.name).join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto scroll-touch">
          {/* Mode Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onFormChange({ ...form, mode: 'normal' })}
              className={`p-3 min-h-[72px] rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
                form.mode === 'normal'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Calendar
                className={`w-5 h-5 mx-auto mb-1 ${form.mode === 'normal' ? 'text-primary-500' : 'text-gray-400'}`}
              />
              <p
                className={`text-xs font-medium ${form.mode === 'normal' ? 'text-primary-700' : 'text-gray-600'}`}
              >
                Normal
              </p>
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...form, mode: 'override' })}
              className={`p-3 min-h-[72px] rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
                form.mode === 'override'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Pencil
                className={`w-5 h-5 mx-auto mb-1 ${form.mode === 'override' ? 'text-blue-500' : 'text-gray-400'}`}
              />
              <p
                className={`text-xs font-medium ${form.mode === 'override' ? 'text-blue-700' : 'text-gray-600'}`}
              >
                Modifier
              </p>
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...form, mode: 'closed' })}
              className={`p-3 min-h-[72px] rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
                form.mode === 'closed'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <XCircle
                className={`w-5 h-5 mx-auto mb-1 ${form.mode === 'closed' ? 'text-red-500' : 'text-gray-400'}`}
              />
              <p
                className={`text-xs font-medium ${form.mode === 'closed' ? 'text-red-700' : 'text-gray-600'}`}
              >
                Fermé
              </p>
            </button>
          </div>

          {/* Override Form */}
          {form.mode === 'override' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="label">Emplacement</label>
                <select
                  value={form.location_id}
                  onChange={(e) => onFormChange({ ...form, location_id: e.target.value })}
                  className="input"
                >
                  <option value="">Sélectionner</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ouverture</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => onFormChange({ ...form, start_time: e.target.value })}
                    className="input min-h-[48px] text-base"
                  />
                </div>
                <div>
                  <label className="label">Fermeture</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => onFormChange({ ...form, end_time: e.target.value })}
                    className="input min-h-[48px] text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reason field for closed */}
          {form.mode === 'closed' && (
            <div className="pt-2">
              <label className="label">Raison (optionnel)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => onFormChange({ ...form, reason: e.target.value })}
                className="input"
                placeholder="Vacances, Jour férié..."
              />
            </div>
          )}

          {/* Info text */}
          {form.mode === 'normal' && selectedDay.exception && (
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              Cette action supprimera l'exception et reviendra au planning récurrent.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 border-t border-gray-100 flex-shrink-0 bg-white safe-area-bottom">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary min-h-[48px] sm:min-h-[44px] active:scale-[0.98]"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="flex-1 btn-primary min-h-[48px] sm:min-h-[44px] active:scale-[0.98]"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

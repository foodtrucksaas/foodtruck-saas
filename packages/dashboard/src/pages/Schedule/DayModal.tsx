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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">
              {selectedDay.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {selectedDay.schedules.length > 0 && form.mode === 'normal' && (
              <p className="text-sm text-gray-500">
                Habituellement : {selectedDay.schedules.map(s => s.location.name).join(', ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onFormChange({ ...form, mode: 'normal' })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                form.mode === 'normal'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Calendar className={`w-5 h-5 mx-auto mb-1 ${form.mode === 'normal' ? 'text-primary-500' : 'text-gray-400'}`} />
              <p className={`text-xs font-medium ${form.mode === 'normal' ? 'text-primary-700' : 'text-gray-600'}`}>
                Normal
              </p>
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...form, mode: 'override' })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                form.mode === 'override'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Pencil className={`w-5 h-5 mx-auto mb-1 ${form.mode === 'override' ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className={`text-xs font-medium ${form.mode === 'override' ? 'text-blue-700' : 'text-gray-600'}`}>
                Modifier
              </p>
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...form, mode: 'closed' })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                form.mode === 'closed'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <XCircle className={`w-5 h-5 mx-auto mb-1 ${form.mode === 'closed' ? 'text-red-500' : 'text-gray-400'}`} />
              <p className={`text-xs font-medium ${form.mode === 'closed' ? 'text-red-700' : 'text-gray-600'}`}>
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
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
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
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Fermeture</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => onFormChange({ ...form, end_time: e.target.value })}
                    className="input"
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

        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 btn-secondary">
            Annuler
          </button>
          <button onClick={onSave} className="flex-1 btn-primary">
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

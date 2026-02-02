import { Plus, Trash2, MapPin, Clock, Pencil, X } from 'lucide-react';
import { DAY_NAMES, formatTime } from '@foodtruck/shared';
import type { Location } from '@foodtruck/shared';
import type { ScheduleWithLocation, ScheduleFormState } from './useSchedule';

interface RecurringScheduleTabProps {
  schedules: ScheduleWithLocation[];
  locations: Location[];
  showForm: boolean;
  editingId: string | null;
  form: ScheduleFormState;
  onFormChange: (form: ScheduleFormState) => void;
  onShowForm: () => void;
  onResetForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onEdit: (schedule: ScheduleWithLocation) => void;
  onDelete: (id: string) => void;
}

export function RecurringScheduleTab({
  schedules,
  locations,
  showForm,
  editingId,
  form,
  onFormChange,
  onShowForm,
  onResetForm,
  onSubmit,
  onEdit,
  onDelete,
}: RecurringScheduleTabProps) {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Horaires recurrents</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Ces horaires se repetent chaque semaine
          </p>
        </div>
        <button
          onClick={onShowForm}
          className="btn-secondary text-xs sm:text-sm min-h-[44px] active:scale-[0.98] w-full sm:w-auto"
          disabled={locations.length === 0}
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </button>
      </div>

      {locations.length === 0 && (
        <div className="card p-3 sm:p-4 bg-warning-50 border-warning-200 text-warning-700 text-xs sm:text-sm">
          Creez d'abord un emplacement dans l'onglet "Emplacements" avant d'ajouter des horaires.
        </div>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="card p-3 sm:p-4 mb-3 sm:mb-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
              {editingId ? "Modifier l'horaire" : 'Nouvel horaire'}
            </h3>
            <button
              type="button"
              onClick={onResetForm}
              className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label text-xs sm:text-sm">Jour *</label>
              {/* Mobile: segmented control style */}
              <div className="sm:hidden grid grid-cols-7 gap-1 p-1 bg-gray-100 rounded-xl">
                {DAY_NAMES.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onFormChange({ ...form, day_of_week: i })}
                    className={`py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                      form.day_of_week === i ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              {/* Desktop: select dropdown */}
              <select
                value={form.day_of_week}
                onChange={(e) => onFormChange({ ...form, day_of_week: parseInt(e.target.value) })}
                className="input min-h-[44px] hidden sm:block"
              >
                {DAY_NAMES.map((day, i) => (
                  <option key={i} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs sm:text-sm">Emplacement *</label>
              <select
                value={form.location_id}
                onChange={(e) => onFormChange({ ...form, location_id: e.target.value })}
                className="input min-h-[44px]"
                required
              >
                <option value="">Selectionner</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="label text-xs sm:text-sm">Heure d'arrivee *</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => onFormChange({ ...form, start_time: e.target.value })}
                className="input min-h-[48px] text-base"
                required
              />
            </div>
            <div>
              <label className="label text-xs sm:text-sm">Heure de depart *</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => onFormChange({ ...form, end_time: e.target.value })}
                className="input min-h-[48px] text-base"
                required
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onResetForm}
              className="btn-secondary min-h-[44px] active:scale-[0.98] flex-1"
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary min-h-[44px] active:scale-[0.98] flex-1">
              Sauvegarder
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-2 sm:gap-3">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="w-full sm:w-24">
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  {DAY_NAMES[schedule.day_of_week]}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{schedule.location.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 self-end sm:self-auto flex-shrink-0">
              <button
                onClick={() => onEdit(schedule)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                aria-label="Modifier"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => onDelete(schedule.id)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-gray-500 text-xs sm:text-sm">Aucun horaire configure</p>
        )}
      </div>
    </section>
  );
}

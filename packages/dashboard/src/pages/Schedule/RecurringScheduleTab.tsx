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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Horaires récurrents</h2>
          <p className="text-sm text-gray-500">Ces horaires se répètent chaque semaine</p>
        </div>
        <button
          onClick={onShowForm}
          className="btn-secondary text-sm"
          disabled={locations.length === 0}
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </button>
      </div>

      {locations.length === 0 && (
        <div className="card p-4 bg-warning-50 border-warning-200 text-warning-700 text-sm">
          Créez d'abord un emplacement dans l'onglet "Emplacements" avant d'ajouter des horaires.
        </div>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="card p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {editingId ? 'Modifier l\'horaire' : 'Nouvel horaire'}
            </h3>
            <button type="button" onClick={onResetForm} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Jour *</label>
              <select
                value={form.day_of_week}
                onChange={(e) => onFormChange({ ...form, day_of_week: parseInt(e.target.value) })}
                className="input"
              >
                {DAY_NAMES.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Emplacement *</label>
              <select
                value={form.location_id}
                onChange={(e) => onFormChange({ ...form, location_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Sélectionner</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Heure d'arrivée *</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => onFormChange({ ...form, start_time: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Heure de départ *</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => onFormChange({ ...form, end_time: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onResetForm} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              Sauvegarder
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-24">
                <p className="font-medium text-gray-900">{DAY_NAMES[schedule.day_of_week]}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {schedule.location.name}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(schedule)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => onDelete(schedule.id)} className="p-2 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-gray-500 text-sm">Aucun horaire configuré</p>
        )}
      </div>
    </section>
  );
}

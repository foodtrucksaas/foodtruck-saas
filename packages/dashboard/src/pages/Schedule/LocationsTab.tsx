import { Plus, Trash2, MapPin, Pencil, X } from 'lucide-react';
import type { Location } from '@foodtruck/shared';
import type { LocationFormState } from './useSchedule';

interface LocationsTabProps {
  locations: Location[];
  showForm: boolean;
  editingId: string | null;
  form: LocationFormState;
  onFormChange: (form: LocationFormState) => void;
  onShowForm: () => void;
  onResetForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
}

export function LocationsTab({
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
}: LocationsTabProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Emplacements</h2>
          <p className="text-sm text-gray-500">Vos différents points de vente</p>
        </div>
        <button onClick={onShowForm} className="btn-secondary text-sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {editingId ? 'Modifier l\'emplacement' : 'Nouvel emplacement'}
            </h3>
            <button type="button" onClick={onResetForm} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div>
            <label className="label">Nom du lieu *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              className="input"
              placeholder="Marché de Belleville, Place du Village..."
              required
            />
          </div>
          <div>
            <label className="label">Adresse complète (optionnel)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => onFormChange({ ...form, address: e.target.value })}
              className="input"
              placeholder="1 Place du Marché, 75001 Paris"
            />
          </div>
          <div>
            <label className="label">Coordonnées GPS (optionnel)</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => onFormChange({ ...form, latitude: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="input"
                placeholder="Latitude (48.8566)"
              />
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => onFormChange({ ...form, longitude: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                className="input"
                placeholder="Longitude (2.3522)"
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
        {locations.map((location) => (
          <div key={location.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary-500" />
              <div>
                <p className="font-medium text-gray-900">{location.name}</p>
                {location.address && (
                  <p className="text-sm text-gray-500">{location.address}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(location)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => onDelete(location.id)} className="p-2 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <p className="text-gray-500 text-sm">Aucun emplacement configuré</p>
        )}
      </div>
    </section>
  );
}

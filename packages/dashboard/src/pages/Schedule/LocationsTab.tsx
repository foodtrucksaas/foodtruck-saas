import { useState } from 'react';
import { Plus, Trash2, MapPin, Pencil, X, Navigation, CheckCircle } from 'lucide-react';
import type { Location } from '@foodtruck/shared';
import type { LocationFormState } from './useSchedule';
import {
  GooglePlacesAutocomplete,
  type PlaceResult,
} from '../../components/GooglePlacesAutocomplete';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handlePlaceSelect = (place: PlaceResult) => {
    onFormChange({
      ...form,
      address: place.address,
      latitude: place.latitude.toString(),
      longitude: place.longitude.toString(),
      google_place_id: place.placeId,
    });
  };

  const handleClearAddress = () => {
    onFormChange({
      ...form,
      address: '',
      latitude: '',
      longitude: '',
      google_place_id: '',
    });
  };

  const hasValidCoordinates = form.latitude && form.longitude;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Emplacements</h2>
          <p className="text-xs sm:text-sm text-gray-500">Vos differents points de vente</p>
        </div>
        <button
          onClick={onShowForm}
          className="btn-secondary text-xs sm:text-sm min-h-[44px] active:scale-[0.98] w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card p-3 sm:p-4 mb-3 sm:mb-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
              {editingId ? "Modifier l'emplacement" : 'Nouvel emplacement'}
            </h3>
            <button
              type="button"
              onClick={onResetForm}
              className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
              aria-label="Fermer le formulaire"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Nom simplifié */}
          <div>
            <label className="label text-xs sm:text-sm">Nom pour les clients *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              className="input min-h-[44px]"
              placeholder="Ex: Marche des Halles, Place du Village..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Ce nom sera affiche aux clients (simple et reconnaissable)
            </p>
          </div>

          {/* Adresse avec Google Places */}
          <div>
            <label className="label text-xs sm:text-sm">Adresse complete (pour l'itineraire)</label>
            <GooglePlacesAutocomplete
              value={form.address}
              onChange={(value) => onFormChange({ ...form, address: value })}
              onPlaceSelect={handlePlaceSelect}
              onClear={handleClearAddress}
              placeholder="Rechercher une adresse..."
            />
            {hasValidCoordinates ? (
              <div className="flex items-center gap-2 mt-2 text-xs text-success-600">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Position detectee - itineraire disponible</span>
              </div>
            ) : (
              form.address && (
                <p className="text-xs text-gray-500 mt-1">
                  Selectionnez une suggestion pour activer l'itineraire
                </p>
              )
            )}
          </div>

          {/* Actions */}
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
        {locations.map((location) => {
          const isExpanded = expandedId === location.id;
          const hasCoords = location.latitude && location.longitude;

          return (
            <div key={location.id} className="card p-3 sm:p-4">
              {/* Desktop layout */}
              <div className="hidden sm:flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-base">{location.name}</p>
                    {location.address && (
                      <p className="text-sm text-gray-500 truncate" title={location.address}>
                        {location.address}
                      </p>
                    )}
                    {hasCoords && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Navigation className="w-3 h-3 text-success-500" />
                        <span className="text-xs text-success-600">Itineraire disponible</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEdit(location)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
                    aria-label="Modifier"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => onDelete(location.id)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm">{location.name}</p>
                    {location.address && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : location.id)}
                        className="text-left w-full"
                      >
                        <p className={`text-xs text-gray-500 ${isExpanded ? '' : 'line-clamp-1'}`}>
                          {location.address}
                        </p>
                      </button>
                    )}
                    {hasCoords && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Navigation className="w-3 h-3 text-success-500" />
                        <span className="text-xs text-success-600">Itineraire disponible</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-2 -mr-1">
                  <button
                    onClick={() => onEdit(location)}
                    className="h-9 px-3 flex items-center gap-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors active:scale-95 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => onDelete(location.id)}
                    className="h-9 px-3 flex items-center gap-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {locations.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucun emplacement configure</p>
            <p className="text-gray-400 text-xs mt-1">
              Ajoutez vos points de vente pour creer votre planning
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

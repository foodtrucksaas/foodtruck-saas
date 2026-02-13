import { useState, useEffect } from 'react';
import { MapPin, Plus, Check, Trash2, Loader2 } from 'lucide-react';
import {
  GooglePlacesAutocomplete,
  PlaceResult,
} from '../../../components/GooglePlacesAutocomplete';
import { supabase } from '../../../lib/supabase';
import { useToast, Toast } from '../../../components/Alert';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { StepContainer } from '../components';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
}

interface Step1LocationsProps {
  foodtruckId: string;
  onNext: () => void;
}

export function Step1Locations({ foodtruckId, onNext }: Step1LocationsProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { toast, hideToast, showSuccess, showError } = useToast();
  const confirmDialog = useConfirmDialog();

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);

  // Load locations from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .order('created_at');

      if (data) {
        setLocations(
          data.map((loc) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            google_place_id: loc.google_place_id,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [foodtruckId]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setLatitude(null);
    setLongitude(null);
    setGooglePlaceId(null);
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    setAddress(place.address);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setGooglePlaceId(place.placeId);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          foodtruck_id: foodtruckId,
          name: name.trim(),
          address: address.trim(),
          latitude,
          longitude,
          google_place_id: googlePlaceId,
        })
        .select('id')
        .single();

      if (error) throw error;

      setLocations((prev) => [
        ...prev,
        {
          id: data.id,
          name: name.trim(),
          address: address.trim(),
          latitude,
          longitude,
          google_place_id: googlePlaceId,
        },
      ]);
      resetForm();
      setIsAddingNew(false);
      showSuccess('Emplacement enregistre !');
    } catch (err) {
      console.error('Error saving location:', err);
      showError("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Supprimer cet emplacement ?',
      message: 'Les creneaux associes seront aussi supprimes.',
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await supabase.from('locations').delete().eq('id', locationId);
      setLocations((prev) => prev.filter((l) => l.id !== locationId));
      confirmDialog.closeDialog();
      showSuccess('Emplacement supprime');
    } catch (err) {
      console.error('Error deleting location:', err);
      showError('Erreur lors de la suppression');
      confirmDialog.closeDialog();
    }
  };

  const handleContinue = () => {
    if (locations.length === 0) return;
    onNext();
  };

  const isFormValid = name.trim() && address.trim();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // Show locations list when we have locations and aren't adding new
  if (locations.length > 0 && !isAddingNew) {
    return (
      <StepContainer onNext={handleContinue} nextLabel="Continuer" showBack={false}>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Vos emplacements</h2>
            <p className="text-sm text-gray-500 mt-1">
              {locations.length} emplacement{locations.length > 1 ? 's' : ''} configure
              {locations.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            {locations.map((loc) => (
              <div key={loc.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{loc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{loc.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(loc.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label={`Supprimer ${loc.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddingNew(true);
            }}
            className="w-full p-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajouter un emplacement
          </button>
        </div>
        <Toast {...toast} onDismiss={hideToast} />
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={confirmDialog.handleClose}
          onConfirm={confirmDialog.handleConfirm}
          loading={confirmDialog.loading}
          {...confirmDialog.options}
        />
      </StepContainer>
    );
  }

  // Add/edit location form
  return (
    <StepContainer
      onNext={handleSave}
      nextLabel="Enregistrer"
      nextDisabled={!isFormValid}
      nextLoading={saving}
      showBack={locations.length > 0}
      onBack={() => {
        resetForm();
        setIsAddingNew(false);
      }}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {locations.length === 0 ? 'Ou etes-vous installe ?' : 'Nouvel emplacement'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {locations.length === 0
              ? 'Ajoutez votre premier emplacement.'
              : 'Ajoutez un emplacement supplementaire.'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Nom de l'emplacement</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input min-h-[48px] text-base"
              placeholder="Ex: Marche des Halles"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Adresse</label>
            <GooglePlacesAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Rechercher une adresse..."
            />
            {latitude && (
              <p className="flex items-center gap-1 text-xs text-success-600 mt-1.5">
                <Check className="w-3 h-3" />
                Position detectee
              </p>
            )}
          </div>
        </div>

        {/* Quick name suggestions */}
        {locations.length === 0 && !name && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {['Marche', 'Centre-ville', 'Zone commerciale', 'Parking'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <Toast {...toast} onDismiss={hideToast} />
    </StepContainer>
  );
}

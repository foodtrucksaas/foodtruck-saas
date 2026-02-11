import { useState } from 'react';
import { MapPin, Plus, Check, ArrowRight } from 'lucide-react';
import {
  GooglePlacesAutocomplete,
  PlaceResult,
} from '../../../components/GooglePlacesAutocomplete';
import { useOnboarding } from '../OnboardingContext';
import { AssistantBubble, StepContainer, ActionButton } from '../components';
import { supabase } from '../../../lib/supabase';
import { useFoodtruck } from '../../../contexts/FoodtruckContext';

export function Step1Locations() {
  const { state, dispatch, nextStep } = useOnboarding();
  const { foodtruck } = useFoodtruck();
  const [saving, setSaving] = useState(false);
  // Track whether the user explicitly clicked "add another"
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handlePlaceSelect = (place: PlaceResult) => {
    dispatch({
      type: 'UPDATE_CURRENT_LOCATION',
      location: {
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        google_place_id: place.placeId,
      },
    });
  };

  const handleSaveLocation = async () => {
    if (!state.currentLocation.name.trim() || !foodtruck) return;

    setSaving(true);
    try {
      // Save to database immediately so it persists if user navigates away
      const { data, error } = await supabase
        .from('locations')
        .insert({
          foodtruck_id: foodtruck.id,
          name: state.currentLocation.name,
          address: state.currentLocation.address,
          latitude: state.currentLocation.latitude,
          longitude: state.currentLocation.longitude,
          google_place_id: state.currentLocation.google_place_id,
        })
        .select('id')
        .single();

      if (error) throw error;

      dispatch({
        type: 'ADD_LOCATION',
        location: { ...state.currentLocation, id: data.id },
      });
      setIsAddingNew(false);
    } catch (err) {
      console.error('Error saving location:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    dispatch({ type: 'RESET_CURRENT_LOCATION' });
    setIsAddingNew(true);
  };

  const handleContinue = () => {
    if (state.locations.length === 0) return;
    nextStep();
  };

  const isLocationValid = state.currentLocation.name.trim() && state.currentLocation.address.trim();

  // Show the locations summary when locations exist and we're not adding a new one
  if (state.locations.length > 0 && !isAddingNew) {
    return (
      <StepContainer hideActions>
        <div className="space-y-6">
          <AssistantBubble
            message={`${state.locations.length} emplacement${state.locations.length > 1 ? 's' : ''} enregistré${state.locations.length > 1 ? 's' : ''}`}
            emoji="✅"
            variant="success"
          />

          {/* Display all locations */}
          <div className="space-y-2">
            {state.locations.map((loc, index) => (
              <div key={loc.id || index} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{loc.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{loc.address}</p>
                  </div>
                  <Check className="w-5 h-5 text-success-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <AssistantBubble message="Avez-vous un autre emplacement ?" />

          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              onClick={handleAddAnother}
              variant="secondary"
              icon={<Plus className="w-5 h-5" />}
            >
              Oui, ajouter
            </ActionButton>
            <ActionButton onClick={handleContinue} icon={<ArrowRight className="w-5 h-5" />}>
              Non, continuer
            </ActionButton>
          </div>
        </div>
      </StepContainer>
    );
  }

  // Main location input form
  return (
    <StepContainer
      onNext={handleSaveLocation}
      nextLabel="Enregistrer"
      nextDisabled={!isLocationValid}
      nextLoading={saving}
      showBack={state.locations.length > 0}
      onBack={() => setIsAddingNew(false)}
    >
      <div className="space-y-6">
        <AssistantBubble
          message={
            state.locations.length === 0
              ? 'Où êtes-vous installé ? Commencez par ajouter votre premier emplacement.'
              : 'Ajoutez un nouvel emplacement.'
          }
          emoji="📍"
        />

        <div className="space-y-4">
          {/* Location name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom de l'emplacement
            </label>
            <input
              type="text"
              value={state.currentLocation.name}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_CURRENT_LOCATION',
                  location: { name: e.target.value },
                })
              }
              className="input min-h-[48px] text-base"
              placeholder="Ex: Marché des Halles"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Un nom simple pour que vos clients le reconnaissent
            </p>
          </div>

          {/* Address with Google Places */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse complète
            </label>
            <GooglePlacesAutocomplete
              value={state.currentLocation.address}
              onChange={(value) =>
                dispatch({
                  type: 'UPDATE_CURRENT_LOCATION',
                  location: { address: value },
                })
              }
              onPlaceSelect={handlePlaceSelect}
              placeholder="Rechercher une adresse..."
            />
            {state.currentLocation.latitude && (
              <p className="flex items-center gap-1 text-xs text-success-600 mt-1">
                <Check className="w-3 h-3" />
                Position détectée
              </p>
            )}
          </div>
        </div>

        {/* Quick suggestions for common location names */}
        {state.locations.length === 0 && !state.currentLocation.name && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Suggestions rapides :</p>
            <div className="flex flex-wrap gap-2">
              {['Marché', 'Centre-ville', 'Zone commerciale', 'Parking'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_CURRENT_LOCATION',
                      location: { name: suggestion },
                    })
                  }
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

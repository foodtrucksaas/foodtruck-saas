import { useState } from 'react';
import { MapPin, Plus, Check, ArrowRight } from 'lucide-react';
import {
  GooglePlacesAutocomplete,
  PlaceResult,
} from '../../../components/GooglePlacesAutocomplete';
import { useOnboarding } from '../OnboardingContext';
import { AssistantBubble, StepContainer, ActionButton } from '../components';

export function Step1Locations() {
  const { state, dispatch, nextStep } = useOnboarding();
  const [saving, setSaving] = useState(false);

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

  const handleSaveLocation = () => {
    if (!state.currentLocation.name.trim()) return;

    setSaving(true);
    // Simulate brief save animation
    setTimeout(() => {
      // Generate a temporary ID for the location
      const locationWithId = {
        ...state.currentLocation,
        id: crypto.randomUUID(),
      };
      dispatch({ type: 'ADD_LOCATION', location: locationWithId });
      setSaving(false);
    }, 300);
  };

  const handleAddAnother = () => {
    dispatch({ type: 'SET_SHOW_ADD_ANOTHER', show: false });
  };

  const handleContinue = () => {
    if (state.locations.length === 0) return;
    nextStep();
  };

  const isLocationValid = state.currentLocation.name.trim() && state.currentLocation.address.trim();

  // Show the "add another" confirmation screen
  if (state.showAddAnother && state.locations.length > 0) {
    const lastLocation = state.locations[state.locations.length - 1];

    return (
      <StepContainer hideActions>
        <div className="space-y-6">
          <AssistantBubble message="Emplacement ajoute !" emoji="✅" variant="success" />

          {/* Display added location */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{lastLocation.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{lastLocation.address}</p>
              </div>
              <Check className="w-5 h-5 text-success-500 flex-shrink-0" />
            </div>
          </div>

          {/* Show all locations if more than one */}
          {state.locations.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Tous vos emplacements ({state.locations.length})
              </p>
              <div className="space-y-2">
                {state.locations.slice(0, -1).map((loc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{loc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
      onBack={() => dispatch({ type: 'SET_SHOW_ADD_ANOTHER', show: true })}
    >
      <div className="space-y-6">
        <AssistantBubble
          message={
            state.locations.length === 0
              ? 'Ou etes-vous installe ? Commencez par ajouter votre premier emplacement.'
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
              placeholder="Ex: Marche des Halles"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Un nom simple pour que vos clients le reconnaissent
            </p>
          </div>

          {/* Address with Google Places */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse complete
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
                Position detectee
              </p>
            )}
          </div>
        </div>

        {/* Quick suggestions for common location names */}
        {state.locations.length === 0 && !state.currentLocation.name && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Suggestions rapides :</p>
            <div className="flex flex-wrap gap-2">
              {['Marche', 'Centre-ville', 'Zone commerciale', 'Parking'].map((suggestion) => (
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

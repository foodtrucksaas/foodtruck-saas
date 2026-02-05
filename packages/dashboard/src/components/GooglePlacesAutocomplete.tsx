import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface PlaceResult {
  placeId: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Generate a unique session token for billing optimization
function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onClear,
  placeholder = 'Rechercher une adresse...',
  className = '',
  disabled = false,
}: GooglePlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions via Edge Function
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-places', {
        body: {
          action: 'autocomplete',
          input,
          sessionToken: sessionTokenRef.current,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPredictions(data?.predictions || []);
      setIsOpen(true);
    } catch (err) {
      console.error('Autocomplete error:', err);
      setError('Erreur de recherche');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length >= 3) {
      debounceRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    } else {
      setPredictions([]);
      setIsOpen(false);
    }
  };

  // Handle place selection
  const handleSelectPlace = async (prediction: Prediction) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-places', {
        body: {
          action: 'details',
          placeId: prediction.place_id,
          sessionToken: sessionTokenRef.current,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result: PlaceResult = {
        placeId: data.placeId,
        address: data.address || prediction.description,
        latitude: data.latitude,
        longitude: data.longitude,
      };

      onChange(result.address);
      onPlaceSelect(result);

      // Generate new session token for next search
      sessionTokenRef.current = generateSessionToken();
    } catch (err) {
      console.error('Place details error:', err);
      // Fallback: use prediction description without coordinates
      onChange(prediction.description);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setPredictions([]);
    }
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    setPredictions([]);
    setIsOpen(false);
    setError(null);
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`input min-h-[44px] pl-10 pr-10 ${className}`}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {!isLoading && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Effacer"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-amber-600 mt-1">{error}</p>}

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPlace(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
            >
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

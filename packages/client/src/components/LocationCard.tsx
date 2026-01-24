import { useState, Suspense, lazy } from 'react';
import { MapPin, Navigation, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { formatAddress, formatTime } from '@foodtruck/shared';

// Lazy load the Map component - it includes heavy leaflet library
const MapComponent = lazy(() => import('./Map'));

interface LocationData {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  start_time?: string;
  end_time?: string;
}

interface LocationCardProps {
  location: LocationData;
  showMap?: boolean;
  showHours?: boolean;
  className?: string;
}

export default function LocationCard({
  location,
  showMap = true,
  showHours = false,
  className = '',
}: LocationCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { short: cityName, full: fullAddress } = formatAddress(location.address);
  const hasCoordinates = location.latitude && location.longitude;

  const copyAddress = async () => {
    if (!fullAddress) return;
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullAddress;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openNavigation = () => {
    if (!hasCoordinates) return;

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // Apple Maps
      window.open(
        `maps://maps.apple.com/?daddr=${location.latitude},${location.longitude}`,
        '_blank'
      );
    } else {
      // Google Maps
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`,
        '_blank'
      );
    }
  };

  const openInMaps = () => {
    if (!hasCoordinates) return;

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
      '_blank'
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden ${className}`}>
      {/* Header with location name and city */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">{location.name}</h3>
            {cityName && (
              <p className="text-sm text-gray-500">{cityName}</p>
            )}
            {showHours && location.start_time && location.end_time && (
              <p className="text-sm text-primary-600 font-medium mt-0.5">
                {formatTime(location.start_time)} - {formatTime(location.end_time)}
              </p>
            )}
          </div>
        </div>

        {/* Full address (expandable) */}
        {fullAddress && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Masquer l'adresse
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Voir l'adresse complète
                </>
              )}
            </button>

            {expanded && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">{fullAddress}</p>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier l'adresse
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      {showMap && hasCoordinates && (
        <div className="h-48 relative group">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center bg-gray-100">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            }
          >
            <MapComponent
              latitude={location.latitude!}
              longitude={location.longitude!}
              name={location.name}
            />
          </Suspense>
          {/* Overlay button to open in maps */}
          <button
            onClick={openInMaps}
            className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Navigation button */}
      {hasCoordinates && (
        <div className="p-4 bg-gray-50/50">
          <button
            onClick={openNavigation}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
          >
            <Navigation className="w-5 h-5" />
            Itinéraire
          </button>
        </div>
      )}
    </div>
  );
}

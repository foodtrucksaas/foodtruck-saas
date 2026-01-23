import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, MapPin, Clock, Utensils } from 'lucide-react';

interface CachedFoodtruck {
  id: string;
  name: string;
  cuisine_types?: string[];
  description?: string;
  logo_url?: string;
}

export default function Offline() {
  const [cachedFoodtruck, setCachedFoodtruck] = useState<CachedFoodtruck | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Try to get cached foodtruck info from localStorage
    try {
      const lastVisitedFoodtruck = localStorage.getItem('lastVisitedFoodtruck');
      if (lastVisitedFoodtruck) {
        setCachedFoodtruck(JSON.parse(lastVisitedFoodtruck));
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // Check if we're back online
    if (navigator.onLine) {
      window.location.reload();
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Mode hors ligne</h1>
          <p className="text-primary-100">
            Vous semblez etre deconnecte d'Internet
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* Connection Status Card */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <WifiOff className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 mb-1">Pas de connexion</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Verifiez votre connexion Wi-Fi ou donnees mobiles, puis reessayez.
              </p>
            </div>
          </div>

          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Verification...' : 'Reessayer'}
          </button>
        </div>

        {/* Cached Foodtruck Info */}
        {cachedFoodtruck && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Dernier food truck visite
            </h3>
            <div className="flex items-start gap-4">
              {cachedFoodtruck.logo_url ? (
                <img
                  src={cachedFoodtruck.logo_url}
                  alt={cachedFoodtruck.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Utensils className="w-7 h-7 text-primary-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900">{cachedFoodtruck.name}</h4>
                {cachedFoodtruck.cuisine_types && cachedFoodtruck.cuisine_types.length > 0 && (
                  <p className="text-sm text-primary-600 font-medium">
                    {cachedFoodtruck.cuisine_types.join(' - ')}
                  </p>
                )}
                {cachedFoodtruck.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {cachedFoodtruck.description}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Ces informations sont issues du cache et peuvent ne pas etre a jour
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">En attendant...</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <MapPin className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Verifiez votre emplacement</p>
                <p className="text-xs text-gray-500">Assurez-vous d'etre dans une zone avec reseau</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <Clock className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Patientez quelques instants</p>
                <p className="text-xs text-gray-500">La connexion peut revenir automatiquement</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-gray-400">
          L'application fonctionnera des que la connexion sera retablie
        </p>
      </div>
    </div>
  );
}

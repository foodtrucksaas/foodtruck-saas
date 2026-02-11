import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, History, AlertCircle, RefreshCw } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { OptimizedImage } from '../components/OptimizedImage';

export default function Home() {
  const [foodtrucks, setFoodtrucks] = useState<Foodtruck[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFoodtrucks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) {
        console.error('Error fetching foodtrucks:', fetchError);
        setError('Impossible de charger les food trucks. Veuillez réessayer.');
      } else {
        setFoodtrucks(data || []);
      }
    } catch (err) {
      console.error('Error fetching foodtrucks:', err);
      setError('Impossible de charger les food trucks. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoodtrucks();
  }, []);

  const filteredFoodtrucks = foodtrucks.filter(
    (ft) =>
      ft.name.toLowerCase().includes(search.toLowerCase()) ||
      ft.cuisine_types?.some((type) => type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">FoodTruck</h1>
          <p className="text-primary-100 mb-6">
            Trouvez et commandez auprès des meilleurs food trucks
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un food truck..."
              aria-label="Rechercher un food truck"
              className="w-full pl-12 pr-4 py-3 min-h-[48px] rounded-xl bg-white text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Food Trucks</h2>
          <Link
            to="/orders"
            className="flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm text-primary-600 font-medium hover:bg-primary-50 rounded-lg transition-colors active:scale-95"
          >
            <History className="w-4 h-4" />
            Mes commandes
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {/* Skeleton loading cards for better perceived performance */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={fetchFoodtrucks}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        ) : filteredFoodtrucks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun food truck trouvé</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredFoodtrucks.map((foodtruck) => (
              <Link
                key={foodtruck.id}
                to={`/${foodtruck.id}`}
                className="card p-4 flex gap-4 active:scale-[0.98] transition-transform"
              >
                {foodtruck.logo_url ? (
                  <OptimizedImage
                    src={foodtruck.logo_url}
                    alt={foodtruck.name}
                    width={80}
                    height={80}
                    className="rounded-xl"
                    sizes="80px"
                    placeholderColor="#ffe8e4"
                    fallback={
                      <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center">
                        <span className="text-3xl">🚚</span>
                      </div>
                    }
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center">
                    <span className="text-3xl">🚚</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{foodtruck.name}</h3>
                  <p className="text-sm text-primary-600 font-medium">
                    {foodtruck.cuisine_types?.join(' • ') || 'Non spécifié'}
                  </p>
                  {foodtruck.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {foodtruck.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

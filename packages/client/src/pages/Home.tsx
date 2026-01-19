import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, History } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [foodtrucks, setFoodtrucks] = useState<Foodtruck[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFoodtrucks() {
      const { data } = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setFoodtrucks(data || []);
      setLoading(false);
    }

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
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
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
            className="flex items-center gap-1 text-sm text-primary-600 font-medium"
          >
            <History className="w-4 h-4" />
            Mes commandes
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
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
                  <img
                    src={foodtruck.logo_url}
                    alt={foodtruck.name}
                    className="w-20 h-20 rounded-xl object-cover"
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

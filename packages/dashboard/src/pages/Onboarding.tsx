import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { CUISINE_TYPES, DEFAULT_CATEGORIES } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useFoodtruck();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCuisineType = (type: string) => {
    setCuisineTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setLoading(true);

    const { data: foodtruck, error: foodtruckError } = await supabase
      .from('foodtrucks')
      .insert({
        user_id: user.id,
        name,
        description,
        cuisine_types: cuisineTypes,
        email: user.email,
      })
      .select()
      .single();

    if (foodtruckError) {
      toast.error('Erreur lors de la création du food truck');
      setLoading(false);
      return;
    }

    // Create default categories
    const { error: categoriesError } = await supabase.from('categories').insert(
      DEFAULT_CATEGORIES.map((cat) => ({
        foodtruck_id: foodtruck.id,
        name: cat.name,
        display_order: cat.display_order,
      }))
    );

    if (categoriesError) {
      console.error('Error creating categories:', categoriesError);
    }

    await refresh();
    toast.success('Food truck créé avec succès !');
    navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenue sur FoodTruck SaaS
          </h1>
          <p className="text-gray-600 mt-2">
            Configurons votre food truck en quelques étapes
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="label">
                Nom de votre food truck *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Le Gourmet Roulant"
                required
              />
            </div>

            <div>
              <label className="label">Types de cuisine * (sélectionnez un ou plusieurs)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {CUISINE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleCuisineType(type)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      cuisineTypes.includes(type)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {cuisineTypes.includes(type) && <Check className="w-4 h-4" />}
                    {type}
                  </button>
                ))}
              </div>
              {cuisineTypes.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Sélectionnez au moins un type de cuisine
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[100px] resize-none"
                placeholder="Décrivez votre food truck, votre cuisine, votre histoire..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name || cuisineTypes.length === 0}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Créer mon food truck'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

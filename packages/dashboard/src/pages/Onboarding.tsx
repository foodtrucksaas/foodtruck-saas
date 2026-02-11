import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Loader2, ArrowRight, Truck } from 'lucide-react';
import { generateSlug } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useFoodtruck();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (!name.trim()) {
      setError('Le nom est obligatoire');
      return;
    }

    setLoading(true);

    try {
      // Generate slug and check uniqueness
      const baseSlug = generateSlug(name.trim());

      const { data: existingSlug } = await supabase
        .from('foodtrucks')
        .select('id')
        .eq('slug', baseSlug)
        .maybeSingle();

      const finalSlug = existingSlug
        ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        : baseSlug;

      // Create the foodtruck
      const { error: foodtruckError } = await supabase
        .from('foodtrucks')
        .insert({
          user_id: user.id,
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || null,
          email: user.email,
        })
        .select()
        .single();

      if (foodtruckError) {
        throw new Error('Erreur lors de la création du food truck');
      }

      // Don't create default categories - the onboarding assistant will handle menu creation
      await refresh();
      // Redirect to onboarding assistant for guided setup
      navigate('/onboarding-assistant');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">MonTruck</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Icon & Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Créez votre food truck</h1>
            <p className="text-gray-600">Un assistant va vous guider pour tout configurer</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-error-50 border border-error-200 rounded-xl text-error-700 text-sm">
                {error}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div>
                <label htmlFor="name" className="label text-base">
                  Nom de votre food truck
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-lg"
                  placeholder="Ex: Le Gourmet Roulant"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="label text-base">
                  Description <span className="text-gray-400 font-normal">(optionnelle)</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input min-h-[100px] resize-none"
                  placeholder="Décrivez votre cuisine, ce qui vous rend unique..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full btn-primary justify-center text-lg py-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  Commencer la configuration
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            L'assistant vous guidera pour configurer emplacements, horaires et menu
          </p>
        </div>
      </div>
    </div>
  );
}

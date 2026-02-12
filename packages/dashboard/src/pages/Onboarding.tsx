import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { generateSlug } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useFoodtruck();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = name.trim() ? generateSlug(name.trim()) : '';

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
      const baseSlug = generateSlug(name.trim());

      const { data: existingSlug } = await supabase
        .from('foodtrucks')
        .select('id')
        .eq('slug', baseSlug)
        .maybeSingle();

      const finalSlug = existingSlug
        ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        : baseSlug;

      const { error: foodtruckError } = await supabase
        .from('foodtrucks')
        .insert({
          user_id: user.id,
          name: name.trim(),
          slug: finalSlug,
          email: user.email,
        })
        .select()
        .single();

      if (foodtruckError) {
        throw new Error('Erreur lors de la création du food truck');
      }

      await refresh();
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
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">OnMange</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Welcome */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🚚</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Comment s'appelle votre food truck ?
            </h1>
            <p className="text-gray-500 text-sm">C'est le nom que vos clients verront</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-error-50 border border-error-200 rounded-xl text-error-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input text-center text-xl font-medium py-4 w-full"
                placeholder="Le Gourmet Roulant"
                autoFocus
                required
              />
            </div>

            {/* Slug preview */}
            {slug && (
              <p className="text-center text-sm text-gray-400">
                <span className="font-mono">{slug}.onmange.app</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-4 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  C'est parti
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>L'assistant vous guide ensuite pas à pas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

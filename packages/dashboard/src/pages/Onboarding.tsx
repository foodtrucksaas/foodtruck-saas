import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Loader2,
  Check,
  ArrowRight,
  Truck,
  Copy,
  ExternalLink,
  Menu,
  MapPin,
  Calendar,
  Settings,
  Sparkles,
} from 'lucide-react';
import { generateSlug } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';

const NEXT_STEPS = [
  {
    icon: Menu,
    title: 'Ajouter vos plats',
    description: 'Créez votre carte avec photos et prix',
    path: '/menu',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: MapPin,
    title: 'Configurer vos emplacements',
    description: 'Indiquez où vous trouver',
    path: '/schedule',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Calendar,
    title: 'Définir vos horaires',
    description: 'Planifiez votre semaine type',
    path: '/schedule',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Settings,
    title: 'Personnaliser votre page',
    description: 'Logo, couleurs, description...',
    path: '/settings',
    color: 'bg-purple-100 text-purple-600',
  },
];

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
  const [isComplete, setIsComplete] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        .single();

      const finalSlug = existingSlug
        ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        : baseSlug;

      // Create the foodtruck
      const { data: foodtruck, error: foodtruckError } = await supabase
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

      // Create default categories
      const defaultCategories = [
        { name: 'Entrées', display_order: 0 },
        { name: 'Plats', display_order: 1 },
        { name: 'Desserts', display_order: 2 },
        { name: 'Boissons', display_order: 3 },
      ];

      await supabase.from('categories').insert(
        defaultCategories.map((cat) => ({
          foodtruck_id: foodtruck.id,
          name: cat.name,
          display_order: cat.display_order,
        }))
      );

      setCreatedSlug(foodtruck.slug);
      setIsComplete(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdSlug) return;
    const url = `https://${createdSlug}.onmange.app`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const foodtruckUrl = createdSlug ? `https://${createdSlug}.onmange.app` : '';

  // Success screen
  if (isComplete) {
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
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Success message */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-success-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{name} est prêt !</h1>
              <p className="text-gray-600">
                Votre page de commande est en ligne. Partagez-la avec vos clients.
              </p>
            </div>

            {/* Share link */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <p className="font-semibold text-gray-900 mb-3">Votre lien de commande</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={foodtruckUrl}
                  readOnly
                  className="input flex-1 bg-gray-50 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-primary flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <a
                href={foodtruckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-3"
              >
                <ExternalLink className="w-4 h-4" />
                Voir ma page
              </a>
            </div>

            {/* Next steps */}
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Prochaines étapes</h2>
              <div className="space-y-3">
                {NEXT_STEPS.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(step.path)}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all text-left group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.color}`}
                    >
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 group-hover:text-primary-700">
                        {step.title}
                      </p>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Go to dashboard */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full btn-secondary justify-center"
            >
              Accéder au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form screen
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
            <p className="text-gray-600">En 30 secondes, votre page de commande est en ligne</p>
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
                  Créer mon food truck
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Vous pourrez ajouter vos plats et horaires ensuite
          </p>
        </div>
      </div>
    </div>
  );
}

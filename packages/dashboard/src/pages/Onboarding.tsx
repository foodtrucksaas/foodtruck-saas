import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_CATEGORIES } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';

const STEPS = [
  { id: 1, title: 'Votre Food Truck', icon: Truck },
  { id: 2, title: 'Finition', icon: Sparkles },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useFoodtruck();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = () => {
    if (step === 1) return name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!user) return;

    setLoading(true);

    const { data: foodtruck, error: foodtruckError } = await supabase
      .from('foodtrucks')
      .insert({
        user_id: user.id,
        name: name.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        email: user.email,
      })
      .select()
      .single();

    if (foodtruckError) {
      setError('Erreur lors de la création du food truck');
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
    navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">MonTruck</span>
            </div>
            <span className="text-sm text-gray-500">Étape {step} sur 2</span>
          </div>
          {/* Progress Bar */}
          <div className="flex gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s.id <= step ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl text-error-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Name & Tagline */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Comment s'appelle votre food truck ?
                </h1>
                <p className="text-gray-600">
                  Un bon nom aide vos clients à vous retrouver facilement
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                  <label htmlFor="name" className="label text-base">
                    Nom du food truck *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input text-lg"
                    placeholder="Ex: Le Gourmet Roulant"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="tagline" className="label text-base">
                    Slogan <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    id="tagline"
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="input"
                    placeholder="Ex: La vraie cuisine de rue !"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Apparaîtra sous votre nom sur la page client
                  </p>
                </div>
              </div>

              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mt-6">
                <p className="text-warning-800 text-sm">
                  <strong>💡 Conseil :</strong> Choisissez un nom mémorable et facile à prononcer.
                  Vous pourrez le modifier plus tard dans les paramètres.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Description (Optional) */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Presque terminé !</h1>
                <p className="text-gray-600">
                  Ajoutez une description pour donner envie à vos clients
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                  <label htmlFor="description" className="label text-base">
                    Description <span className="text-gray-400 font-normal">(optionnelle)</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input min-h-[120px] resize-none"
                    placeholder="Décrivez votre food truck, votre histoire, ce qui vous rend unique..."
                  />
                </div>

                {/* Preview Card */}
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Aperçu</p>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-8 h-8 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {name || 'Votre Food Truck'}
                      </h3>
                      {tagline && <p className="text-sm text-gray-600 truncate">{tagline}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-success-50 border border-success-200 rounded-xl p-4 mt-6">
                <p className="text-success-800 text-sm">
                  <strong>✨ Bonne nouvelle :</strong> Vous pourrez personnaliser votre profil
                  (logo, horaires, réseaux sociaux...) depuis les paramètres après la création.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons - Fixed at bottom */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-6 px-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue()}
              className="btn-primary flex items-center gap-2"
            >
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canContinue()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  Créer mon food truck
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

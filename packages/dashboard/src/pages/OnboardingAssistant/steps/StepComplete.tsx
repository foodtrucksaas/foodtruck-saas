import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Calendar,
  UtensilsCrossed,
  Gift,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  LayoutDashboard,
} from 'lucide-react';
import { useOnboarding } from '../OnboardingContext';
import { ConfettiCelebration, ActionButton } from '../components';

export function StepComplete() {
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);

  const foodtruckUrl = state.foodtruck?.slug ? `https://${state.foodtruck.slug}.onmange.app` : '';

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyLink = async () => {
    if (!foodtruckUrl) return;
    await navigator.clipboard.writeText(foodtruckUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  // Calculate stats
  const totalItems = state.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const workingDays = state.selectedDays.length;

  return (
    <div className="flex flex-col min-h-full">
      {showConfetti && <ConfettiCelebration />}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Success header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
            <Sparkles className="w-10 h-10 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Felicitations !</h1>
          <p className="text-gray-600">{state.foodtruck?.name || 'Votre foodtruck'} est pret !</p>
        </div>

        {/* Stats summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Recapitulatif</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{state.locations.length}</p>
                <p className="text-xs text-gray-500">
                  emplacement{state.locations.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{workingDays}</p>
                <p className="text-xs text-gray-500">jour{workingDays > 1 ? 's' : ''} / semaine</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
                <p className="text-xs text-gray-500">
                  produit{totalItems > 1 ? 's' : ''} ({state.categories.length} cat.)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{state.offers.length}</p>
                <p className="text-xs text-gray-500">
                  offre{state.offers.length > 1 ? 's' : ''} active
                  {state.offers.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share link */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Partagez votre lien</h3>
            <p className="text-sm text-gray-500 mt-1">Vos clients peuvent commander via ce lien.</p>
          </div>

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
              className="px-4 py-3 min-h-[48px] bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Copie !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copier</span>
                </>
              )}
            </button>
          </div>

          <a
            href={foodtruckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <ExternalLink className="w-4 h-4" />
            Voir ma page
          </a>
        </div>

        {/* QR Code button */}
        <ActionButton
          onClick={() => navigate('/settings')}
          variant="secondary"
          icon={<QrCode className="w-5 h-5" />}
        >
          Generer mon QR Code
        </ActionButton>
      </div>

      {/* Fixed footer */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 safe-area-bottom">
        <ActionButton onClick={handleGoToDashboard} icon={<LayoutDashboard className="w-5 h-5" />}>
          Acceder au tableau de bord
        </ActionButton>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

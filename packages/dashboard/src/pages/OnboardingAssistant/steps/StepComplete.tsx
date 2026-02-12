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
  Download,
  FileText,
  Heart,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useOnboarding, clearOnboardingSession } from '../OnboardingContext';
import { useFoodtruck } from '../../../contexts/FoodtruckContext';
import { ConfettiCelebration, ActionButton } from '../components';

const DAYS_OF_WEEK: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  0: 'Dimanche',
};

export function StepComplete() {
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const { refresh } = useFoodtruck();
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const foodtruckUrl = state.foodtruck?.slug ? `https://${state.foodtruck.slug}.onmange.app` : '';
  const qrCodeUrl = foodtruckUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(foodtruckUrl)}&format=png&margin=10`
    : '';

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

  const handleGoToDashboard = async () => {
    setLeaving(true);
    try {
      await refresh();
      clearOnboardingSession();
    } catch {
      // Continue anyway
    }
    navigate('/');
  };

  const handleDownloadQR = async () => {
    if (!qrCodeUrl || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${state.foodtruck?.name?.replace(/\s+/g, '-').toLowerCase() || 'foodtruck'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silent fail
    } finally {
      setDownloading(false);
    }
  };

  // Calculate stats
  const totalItems = state.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const sortedDays = [...state.selectedDays].sort((a, b) => {
    const oa = a === 0 ? 7 : a;
    const ob = b === 0 ? 7 : b;
    return oa - ob;
  });

  return (
    <div className="flex flex-col min-h-full">
      {showConfetti && <ConfettiCelebration />}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Success header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
            <Sparkles className="w-10 h-10 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Félicitations !</h1>
          <p className="text-gray-600">{state.foodtruck?.name || 'Votre foodtruck'} est prêt !</p>
        </div>

        {/* Detailed summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-card">
          <h3 className="font-semibold text-gray-900">Récapitulatif</h3>

          {/* Locations */}
          {state.locations.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4 text-blue-500" />
                {state.locations.length} emplacement{state.locations.length > 1 ? 's' : ''}
              </div>
              <div className="ml-6 space-y-1">
                {state.locations.map((loc, i) => (
                  <p key={i} className="text-sm text-gray-500">
                    {loc.name} — {loc.address}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Schedule */}
          {sortedDays.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-green-500" />
                {sortedDays.length} jour{sortedDays.length > 1 ? 's' : ''} / semaine
              </div>
              <div className="ml-6 space-y-1">
                {sortedDays.map((day) => {
                  const schedule = state.schedules.find((s) => s.day_of_week === day);
                  const loc = schedule
                    ? state.locations.find((l) => l.id === schedule.location_id)
                    : null;
                  return (
                    <p key={day} className="text-sm text-gray-500">
                      {DAYS_OF_WEEK[day]}
                      {schedule ? ` ${schedule.start_time}–${schedule.end_time}` : ''}
                      {loc ? ` (${loc.name})` : ''}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu */}
          {state.categories.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                {totalItems} produit{totalItems > 1 ? 's' : ''} dans {state.categories.length}{' '}
                catégorie{state.categories.length > 1 ? 's' : ''}
              </div>
              <div className="ml-6 space-y-1">
                {state.categories.map((cat) => (
                  <p key={cat.id} className="text-sm text-gray-500">
                    {cat.name} — {cat.items.map((i) => i.name).join(', ')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Offers */}
          {state.offers.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Gift className="w-4 h-4 text-purple-500" />
                {state.offers.length} offre{state.offers.length > 1 ? 's' : ''}
              </div>
              <div className="ml-6 space-y-1">
                {state.offers.map((offer, i) => (
                  <p key={i} className="text-sm text-gray-500">
                    {offer.name}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Share link */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-card">
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
                  <span className="hidden sm:inline">Copié !</span>
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

        {/* QR Code inline */}
        {qrCodeUrl && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-card">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">Votre QR Code</h3>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative bg-white p-3 rounded-lg border border-gray-200"
                style={{ minWidth: 182, minHeight: 182 }}
              >
                {qrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                  </div>
                )}
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  style={{ width: 150, height: 150 }}
                  className={`block transition-opacity ${qrLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setQrLoading(false)}
                  onError={() => setQrLoading(false)}
                />
              </div>
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-sm font-medium transition-colors active:scale-95"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Téléchargement...' : 'Télécharger'}
              </button>
            </div>
          </div>
        )}

        {/* Next steps checklist */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-card">
          <h3 className="font-semibold text-gray-900">Prochaines étapes</h3>
          <p className="text-sm text-gray-500">
            Complétez votre profil pour attirer plus de clients.
          </p>
          <div className="space-y-2">
            {[
              {
                icon: FileText,
                label: 'Ajoutez une description à votre foodtruck',
                to: '/settings',
              },
              {
                icon: UtensilsCrossed,
                label: 'Ajoutez des descriptions à vos articles',
                to: '/menu',
              },
              { icon: Heart, label: 'Configurez votre programme de fidélité', to: '/settings' },
              { icon: QrCode, label: 'Téléchargez votre QR code', to: '/settings' },
            ].map(({ icon: Icon, label, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(to)}
                className="flex items-center gap-3 w-full p-3 bg-gray-50 hover:bg-primary-50 rounded-xl text-left transition-colors group"
              >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 group-hover:border-primary-200 flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary-500" />
                </div>
                <span className="text-sm text-gray-700 group-hover:text-primary-700 flex-1">
                  {label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 sm:px-6 py-3 safe-area-bottom">
        <ActionButton
          onClick={handleGoToDashboard}
          disabled={leaving}
          icon={
            leaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LayoutDashboard className="w-5 h-5" />
            )
          }
        >
          {leaving ? 'Chargement...' : 'Accéder au tableau de bord'}
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

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
import { useOnboarding } from '../OnboardingContext';
import { ConfettiCelebration, ActionButton } from '../components';

export function StepComplete() {
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  const handleGoToDashboard = () => {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Félicitations !</h1>
          <p className="text-gray-600">{state.foodtruck?.name || 'Votre foodtruck'} est prêt !</p>
        </div>

        {/* Stats summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-card">
          <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
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
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{workingDays}</p>
                <p className="text-xs text-gray-500">jour{workingDays > 1 ? 's' : ''} / semaine</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
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
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
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
        <ActionButton onClick={handleGoToDashboard} icon={<LayoutDashboard className="w-5 h-5" />}>
          Accéder au tableau de bord
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

import { Link } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import type { SubscriptionStatus } from '@foodtruck/shared/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getMessage(status: SubscriptionStatus, canceledAt: string | null): string {
  switch (status) {
    case 'canceled':
      return `Tu as annulé ton abonnement${canceledAt ? ` le ${formatDate(canceledAt)}` : ''}. Réactive pour continuer à recevoir des commandes.`;
    case 'unpaid':
      return 'Ton abonnement a été suspendu suite à un échec de paiement. Mets à jour ta carte pour réactiver.';
    case 'expired_trial':
      return "Ta période d'essai gratuit est terminée. Active ton abonnement pour reprendre l'activité.";
    case 'incomplete':
      return "Ton inscription n'a pas été finalisée.";
    case 'paused':
      return 'Ton compte est en pause.';
    default:
      return "Ton abonnement n'est plus actif.";
  }
}

export default function DegradedModeBanner() {
  const { subscription, accessState } = useSubscription();

  if (accessState !== 'degraded' || !subscription) return null;

  const message = getMessage(subscription.status, subscription.canceled_at);

  return (
    <div
      className="border-b px-4 py-3 bg-red-50 border-red-200"
      role="alert"
      data-testid="degraded-banner"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-red-800 flex-1">{message}</p>
        <Link
          to="/billing"
          className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          data-testid="degraded-banner-cta"
        >
          Réactiver mon abonnement &rarr;
        </Link>
      </div>
    </div>
  );
}

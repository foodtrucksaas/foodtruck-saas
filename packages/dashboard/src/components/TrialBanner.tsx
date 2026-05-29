import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function TrialBanner() {
  const { subscription, daysRemainingInTrial } = useSubscription();
  const [dismissed, setDismissed] = useState(() => {
    if (!subscription) return false;
    return sessionStorage.getItem(`trial_banner_dismissed_${subscription.id}`) === 'true';
  });

  if (!subscription || subscription.status !== 'trialing' || daysRemainingInTrial === null) {
    return null;
  }

  // Not dismissible if 1 day or less remaining
  const canDismiss = daysRemainingInTrial > 1;

  if (dismissed && canDismiss) return null;

  const days = daysRemainingInTrial;
  const hasCard = !!subscription.stripe_subscription_id;
  const endDate = formatDate(subscription.trial_ends_at);

  // Determine urgency level
  let bgClass: string;
  let textClass: string;
  let message: string;

  if (days <= 0) {
    bgClass = 'bg-red-50 border-red-200';
    textClass = 'text-red-800';
    message = "Ton essai se termine aujourd'hui";
  } else if (days === 1) {
    bgClass = 'bg-red-50 border-red-200';
    textClass = 'text-red-800';
    message = 'Ton essai se termine demain';
  } else if (days <= 3) {
    bgClass = 'bg-orange-50 border-orange-200';
    textClass = 'text-orange-800';
    message = `Essai gratuit : encore ${days} jours (le ${endDate})`;
  } else {
    bgClass = 'bg-blue-50 border-blue-200';
    textClass = 'text-blue-800';
    message = `Essai gratuit : encore ${days} jours (le ${endDate})`;
  }

  const handleDismiss = () => {
    if (!canDismiss) return;
    sessionStorage.setItem(`trial_banner_dismissed_${subscription.id}`, 'true');
    setDismissed(true);
  };

  return (
    <div className={`border-b px-4 py-2.5 ${bgClass}`} role="status" data-testid="trial-banner">
      <div className="flex items-center justify-between gap-3">
        <div className={`text-sm font-medium ${textClass} flex-1`}>
          <span>{message}</span>
          {hasCard ? (
            <span className="ml-2 font-normal opacity-75">
              Ta carte est enregistrée, tu seras débité à la fin de l'essai sans action de ta part.
            </span>
          ) : (
            <Link
              to="/billing"
              className={`ml-3 inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity ${textClass}`}
            >
              Ajouter ma carte bancaire &rarr;
            </Link>
          )}
        </div>
        {canDismiss && (
          <button
            onClick={handleDismiss}
            className={`p-1 rounded hover:bg-black/5 transition-colors ${textClass}`}
            aria-label="Fermer le bandeau"
            data-testid="trial-banner-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

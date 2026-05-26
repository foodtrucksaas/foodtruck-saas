import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { useFoodtruck } from '../contexts/FoodtruckContext';
import { api } from '../lib/api';
import { Alert } from '../components/Alert';
import { Toast, useToast } from '../components/Alert';
import Loading from '../components/Loading';
import type { Subscription, SubscriptionStatus } from '@foodtruck/shared/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const degradedStatuses: SubscriptionStatus[] = [
  'canceled',
  'unpaid',
  'expired_trial',
  'incomplete',
  'paused',
];

const degradedMessages: Partial<Record<SubscriptionStatus, string>> = {
  canceled: 'Vous avez annulé votre abonnement.',
  unpaid: 'Votre abonnement a été suspendu suite à un échec de paiement.',
  expired_trial: "Votre période d'essai est terminée.",
  incomplete: "Votre inscription n'a pas été finalisée.",
  paused: 'Votre compte est en pause.',
};

export default function Billing() {
  const { foodtruck } = useFoodtruck();
  const location = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, showSuccess, showInfo, showWarning, hideToast } = useToast();

  const foodtruckId = foodtruck?.id;

  const fetchSubscription = useCallback(async () => {
    if (!foodtruckId) return;
    try {
      const data = await api.billing.getSubscription(foodtruckId);
      setSubscription(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    }
  }, [foodtruckId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchSubscription().finally(() => setLoading(false));
  }, [fetchSubscription]);

  // Handle ?success=1 / ?canceled=1 post-checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (!success && !canceled) return;

    // Clear URL params without triggering React Router re-render
    window.history.replaceState({}, '', location.pathname);

    if (success === '1') {
      showSuccess('Votre abonnement est actif !');

      // Re-fetch after delay (webhook may take 1-5s)
      const t1 = setTimeout(async () => {
        await fetchSubscription();
        const data = await api.billing.getSubscription(foodtruckId!);
        if (data && data.status === 'trialing') {
          setTimeout(async () => {
            const retry = await api.billing.getSubscription(foodtruckId!);
            if (retry && retry.status === 'trialing') {
              showWarning(
                "Votre abonnement est en cours d'activation, rechargez la page dans quelques secondes."
              );
            } else {
              setSubscription(retry);
            }
          }, 3000);
        } else {
          setSubscription(data);
        }
      }, 2000);

      return () => clearTimeout(t1);
    }

    if (canceled === '1') {
      showInfo('Aucun changement effectué.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = async () => {
    setActionLoading(true);
    try {
      const { url } = await api.billing.createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la redirection vers le paiement'
      );
      setActionLoading(false);
    }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    try {
      const { url } = await api.billing.createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ouverture du portail");
      setActionLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4 sm:space-y-8 max-w-2xl">
      <section className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900">Facturation</h2>
        </div>

        {error && (
          <Alert variant="error" className="mb-4" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!subscription ? (
          <p className="text-gray-500">Aucun abonnement trouvé.</p>
        ) : subscription.status === 'trialing' ? (
          <TrialingState
            subscription={subscription}
            onCheckout={handleCheckout}
            onPortal={handlePortal}
            loading={actionLoading}
          />
        ) : subscription.status === 'active' ? (
          <ActiveState
            subscription={subscription}
            onPortal={handlePortal}
            loading={actionLoading}
          />
        ) : subscription.status === 'past_due' ? (
          <PastDueState onPortal={handlePortal} loading={actionLoading} />
        ) : degradedStatuses.includes(subscription.status) ? (
          <DegradedState
            status={subscription.status}
            onCheckout={handleCheckout}
            loading={actionLoading}
          />
        ) : null}
      </section>

      <Toast {...toast} onDismiss={hideToast} />
    </div>
  );
}

function TrialingState({
  subscription,
  onCheckout,
  onPortal,
  loading,
}: {
  subscription: Subscription;
  onCheckout: () => void;
  onPortal: () => void;
  loading: boolean;
}) {
  const days = daysUntil(subscription.trial_ends_at);
  const endDate = formatDate(subscription.trial_ends_at);
  const hasCB = !!subscription.stripe_subscription_id;

  return (
    <div className="space-y-4">
      <Alert variant="info">
        Votre essai gratuit se termine dans{' '}
        <strong>
          {days} jour{days > 1 ? 's' : ''}
        </strong>{' '}
        (le {endDate}).
      </Alert>

      {hasCB ? (
        <>
          <p className="text-sm text-gray-600">
            Votre carte bancaire est enregistrée. Vous serez automatiquement débité de 29&nbsp;€ HT
            à la fin de votre période d&apos;essai, sans action de votre part.
          </p>

          <div>
            <button
              onClick={onPortal}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Gérer mon abonnement
            </button>
            <p className="text-xs text-gray-400 mt-2">Mise à jour CB, factures, annulation</p>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Ajoutez votre moyen de paiement maintenant pour continuer sans interruption à la fin de
            votre essai. Aucun débit avant la fin de la période d&apos;essai.
          </p>

          <button
            onClick={onCheckout}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Ajouter ma carte bancaire
          </button>
        </>
      )}
    </div>
  );
}

function ActiveState({
  subscription,
  onPortal,
  loading,
}: {
  subscription: Subscription;
  onPortal: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="success">Votre abonnement est actif.</Alert>

      {subscription.current_period_end && (
        <p className="text-sm text-gray-600">
          Prochaine échéance : <strong>{formatDate(subscription.current_period_end)}</strong>
        </p>
      )}

      <div>
        <button
          onClick={onPortal}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Gérer mon abonnement
        </button>
        <p className="text-xs text-gray-400 mt-2">Mise à jour CB, factures, annulation</p>
      </div>
    </div>
  );
}

function PastDueState({ onPortal, loading }: { onPortal: () => void; loading: boolean }) {
  return (
    <div className="space-y-4">
      <Alert variant="warning">Paiement en cours de relance.</Alert>

      <p className="text-sm text-gray-600">
        Votre dernier paiement a échoué. Stripe va automatiquement réessayer pendant les prochains
        jours. Vérifiez votre moyen de paiement pour éviter une interruption.
      </p>

      <button onClick={onPortal} disabled={loading} className="btn-primary flex items-center gap-2">
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        Mettre à jour ma carte
      </button>
    </div>
  );
}

function DegradedState({
  status,
  onCheckout,
  loading,
}: {
  status: SubscriptionStatus;
  onCheckout: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="error">Abonnement inactif.</Alert>

      <p className="text-sm text-gray-600">
        {degradedMessages[status] || "Votre abonnement n'est plus actif."}
      </p>

      <button
        onClick={onCheckout}
        disabled={loading}
        className="btn-primary flex items-center gap-2"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        Réactiver mon abonnement
      </button>
    </div>
  );
}

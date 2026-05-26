import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import type { Subscription, AccessState } from '@foodtruck/shared';
import { api } from '../lib/api';
import { useFoodtruck } from './FoodtruckContext';

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  accessState: AccessState;
  daysRemainingInTrial: number | null;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function getAccessState(status: string | undefined): AccessState {
  // Mirrors the SQL function get_access_state(p_status TEXT)
  if (status === 'trialing' || status === 'active' || status === 'past_due') {
    return 'full';
  }
  return 'degraded';
}

function getDaysRemaining(subscription: Subscription | null): number | null {
  if (!subscription || subscription.status !== 'trialing') return null;
  const now = Date.now();
  const trialEnd = new Date(subscription.trial_ends_at).getTime();
  const diff = trialEnd - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { foodtruck } = useFoodtruck();
  // Depend on foodtruckId (string), NOT the foodtruck object, to avoid re-render loops
  const foodtruckId = foodtruck?.id ?? null;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!foodtruckId) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.billing.getSubscription(foodtruckId);
      setSubscription(data);
    } catch {
      // Keep previous state on error
    } finally {
      setIsLoading(false);
    }
  }, [foodtruckId]);

  // Initial fetch + polling + visibility/focus listeners
  useEffect(() => {
    if (!foodtruckId) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchSubscription();

    // Polling every 60s
    intervalRef.current = setInterval(fetchSubscription, 60_000);

    // Re-fetch on tab visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscription();
      }
    };

    // Re-fetch on window focus
    const handleFocus = () => {
      fetchSubscription();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [foodtruckId, fetchSubscription]);

  const accessState = getAccessState(subscription?.status);
  const daysRemainingInTrial = getDaysRemaining(subscription);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        accessState,
        daysRemainingInTrial,
        refetch: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

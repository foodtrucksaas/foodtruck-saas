import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * Returns true if the current foodtruck has full access (can create/modify/delete).
 * Returns false in degraded mode (expired_trial, canceled, unpaid, etc.).
 */
export function useCanWrite(): boolean {
  const { accessState } = useSubscription();
  return accessState === 'full';
}

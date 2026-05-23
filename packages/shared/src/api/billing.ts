import type { TypedSupabaseClient } from './client';
import type { Subscription } from '../types/billing';

export function createBillingApi(supabase: TypedSupabaseClient) {
  // Extract the Supabase URL from the client's REST URL
  // supabase.rest.url is "https://<host>/rest/v1" — we strip "/rest/v1"
  const supabaseUrl = (supabase as unknown as { rest: { url: string } }).rest.url.replace(
    /\/rest\/v1$/,
    ''
  );

  async function getAccessToken(): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Non authentifié');
    return session.access_token;
  }

  async function callEdgeFunction(name: string): Promise<{ url: string }> {
    const token = await getAccessToken();

    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || 'Erreur lors de la création de la session');
    }

    return response.json();
  }

  return {
    async getSubscription(foodtruckId: string): Promise<Subscription | null> {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },

    async createCheckoutSession(): Promise<{ url: string }> {
      return callEdgeFunction('create-checkout-session');
    },

    async createPortalSession(): Promise<{ url: string }> {
      return callEdgeFunction('create-portal-session');
    },
  };
}

export type BillingApi = ReturnType<typeof createBillingApi>;

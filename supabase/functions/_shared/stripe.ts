import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

export function createStripeClient(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// Modèle économique : abonnement mensuel, pas de commission par transaction

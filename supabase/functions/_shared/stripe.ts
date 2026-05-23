import Stripe from 'npm:stripe@^14';
import { createSupabaseAdmin } from './supabase.ts';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { apiVersion: '2024-04-10' });
  }
  return _stripe;
}

/**
 * Find an existing Stripe Customer by foodtruck_id metadata, or create one.
 */
export async function getOrCreateCustomer(
  email: string,
  foodtruckId: string
): Promise<Stripe.Customer> {
  const stripe = getStripe();

  // Search by metadata
  const existing = await stripe.customers.list({
    limit: 1,
    email,
  });

  // Check if any match has the right foodtruck_id metadata
  for (const customer of existing.data) {
    if (customer.metadata?.foodtruck_id === foodtruckId) {
      return customer;
    }
  }

  // Create new customer
  return stripe.customers.create({
    email,
    metadata: { foodtruck_id: foodtruckId },
  });
}

/**
 * Verify a Stripe webhook signature. Throws on invalid signature.
 */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event {
  const stripe = getStripe();
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Record a webhook event for idempotence. Returns true if this is a new event.
 */
export async function recordWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: eventId, event_type: eventType });

  if (error) {
    // Unique constraint violation = already processed
    if (error.code === '23505') return false;
    throw error;
  }
  return true;
}

/**
 * Unit tests for Stripe webhook and billing edge function logic.
 * Tests the business logic patterns used in the Edge Functions,
 * without actually running Deno or hitting Stripe.
 */
import { describe, it, expect } from 'vitest';

// Helper: maps Stripe subscription status to our status
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'paused',
  };
  return statusMap[stripeStatus] || 'incomplete';
}

// Helper: determines if trial_end should be set in checkout session
function shouldSetTrialEnd(
  status: string,
  trialEndsAt: string | null
): { trialEnd: number } | null {
  if (status !== 'trialing' || !trialEndsAt) return null;

  const trialEnd = Math.floor(new Date(trialEndsAt).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);

  // Stripe requires trial_end to be at least 48h in the future
  if (trialEnd > now + 48 * 3600) {
    return { trialEnd };
  }
  return null;
}

// Helper: builds subscription update payload from Stripe event
function buildSubscriptionUpdate(sub: {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
}) {
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    status: mapStripeStatus(sub.status),
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  };
}

describe('Stripe status mapping', () => {
  it('should map known Stripe statuses', () => {
    expect(mapStripeStatus('trialing')).toBe('trialing');
    expect(mapStripeStatus('active')).toBe('active');
    expect(mapStripeStatus('past_due')).toBe('past_due');
    expect(mapStripeStatus('canceled')).toBe('canceled');
    expect(mapStripeStatus('unpaid')).toBe('unpaid');
    expect(mapStripeStatus('incomplete')).toBe('incomplete');
    expect(mapStripeStatus('paused')).toBe('paused');
  });

  it('should map incomplete_expired to canceled', () => {
    expect(mapStripeStatus('incomplete_expired')).toBe('canceled');
  });

  it('should default unknown statuses to incomplete', () => {
    expect(mapStripeStatus('unknown_status')).toBe('incomplete');
    expect(mapStripeStatus('')).toBe('incomplete');
  });
});

describe('Trial end calculation', () => {
  it('should return null for non-trialing status', () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    expect(shouldSetTrialEnd('active', future)).toBeNull();
    expect(shouldSetTrialEnd('canceled', future)).toBeNull();
  });

  it('should return null if trialEndsAt is null', () => {
    expect(shouldSetTrialEnd('trialing', null)).toBeNull();
  });

  it('should return null if trial ends within 48h', () => {
    const soon = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24h from now
    expect(shouldSetTrialEnd('trialing', soon)).toBeNull();
  });

  it('should return trial_end epoch for trial ending > 48h', () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days
    const result = shouldSetTrialEnd('trialing', future.toISOString());
    expect(result).not.toBeNull();
    expect(result!.trialEnd).toBeCloseTo(Math.floor(future.getTime() / 1000), -1);
  });
});

describe('Subscription update payload', () => {
  it('should build correct update payload from Stripe event', () => {
    const sub = {
      id: 'sub_123',
      customer: 'cus_456',
      status: 'active',
      current_period_start: 1700000000,
      current_period_end: 1702678400,
      cancel_at_period_end: false,
      canceled_at: null,
    };

    const result = buildSubscriptionUpdate(sub);

    expect(result.stripe_subscription_id).toBe('sub_123');
    expect(result.stripe_customer_id).toBe('cus_456');
    expect(result.status).toBe('active');
    expect(result.cancel_at_period_end).toBe(false);
    expect(result.canceled_at).toBeNull();
    expect(result.current_period_start).toContain('2023-11');
    expect(result.current_period_end).toContain('2023-12');
  });

  it('should convert canceled_at timestamp to ISO string', () => {
    const sub = {
      id: 'sub_123',
      customer: 'cus_456',
      status: 'canceled',
      current_period_start: 1700000000,
      current_period_end: 1702678400,
      cancel_at_period_end: true,
      canceled_at: 1701500000,
    };

    const result = buildSubscriptionUpdate(sub);
    expect(result.canceled_at).not.toBeNull();
    expect(result.cancel_at_period_end).toBe(true);
    expect(result.status).toBe('canceled');
  });

  it('should handle past_due status', () => {
    const sub = {
      id: 'sub_123',
      customer: 'cus_456',
      status: 'past_due',
      current_period_start: 1700000000,
      current_period_end: 1702678400,
      cancel_at_period_end: false,
      canceled_at: null,
    };

    const result = buildSubscriptionUpdate(sub);
    expect(result.status).toBe('past_due');
  });
});

describe('Webhook idempotence', () => {
  it('should detect duplicate events via unique constraint error code', () => {
    // The 23505 error code means unique_violation in PostgreSQL
    const isDuplicate = (errorCode: string) => errorCode === '23505';

    expect(isDuplicate('23505')).toBe(true);
    expect(isDuplicate('42501')).toBe(false);
    expect(isDuplicate('')).toBe(false);
  });
});

describe('Access state derivation', () => {
  function getAccessState(status: string): 'full' | 'degraded' {
    return ['trialing', 'active', 'past_due'].includes(status) ? 'full' : 'degraded';
  }

  it('should return full for trialing, active, past_due', () => {
    expect(getAccessState('trialing')).toBe('full');
    expect(getAccessState('active')).toBe('full');
    expect(getAccessState('past_due')).toBe('full');
  });

  it('should return degraded for all other statuses', () => {
    expect(getAccessState('canceled')).toBe('degraded');
    expect(getAccessState('unpaid')).toBe('degraded');
    expect(getAccessState('incomplete')).toBe('degraded');
    expect(getAccessState('paused')).toBe('degraded');
    expect(getAccessState('expired_trial')).toBe('degraded');
  });
});

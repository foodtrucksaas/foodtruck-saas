import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DegradedModeBanner from './DegradedModeBanner';

const mockSubscription = vi.hoisted(() => ({
  subscription: null as Record<string, unknown> | null,
  accessState: 'full' as string,
}));

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: () => mockSubscription,
}));

function renderBanner() {
  return render(
    <MemoryRouter>
      <DegradedModeBanner />
    </MemoryRouter>
  );
}

describe('DegradedModeBanner', () => {
  it('renders nothing when accessState is full', () => {
    mockSubscription.accessState = 'full';
    mockSubscription.subscription = { status: 'active', canceled_at: null };
    const { container } = renderBanner();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no subscription', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = null;
    const { container } = renderBanner();
    expect(container.innerHTML).toBe('');
  });

  it('shows canceled message with date', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'canceled', canceled_at: '2026-05-15T00:00:00Z' };
    renderBanner();
    expect(screen.getByText(/annulé ton abonnement/)).toBeDefined();
    expect(screen.getByText(/15\/05\/2026/)).toBeDefined();
  });

  it('shows unpaid message', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'unpaid', canceled_at: null };
    renderBanner();
    expect(screen.getByText(/échec de paiement/)).toBeDefined();
  });

  it('shows expired_trial message', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'expired_trial', canceled_at: null };
    renderBanner();
    expect(screen.getByText(/essai gratuit est terminée/)).toBeDefined();
  });

  it('shows incomplete message', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'incomplete', canceled_at: null };
    renderBanner();
    expect(screen.getByText(/pas été finalisée/)).toBeDefined();
  });

  it('shows paused message', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'paused', canceled_at: null };
    renderBanner();
    expect(screen.getByText(/en pause/)).toBeDefined();
  });

  it('always shows reactivation CTA link', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'expired_trial', canceled_at: null };
    renderBanner();
    const link = screen.getByTestId('degraded-banner-cta');
    expect(link.getAttribute('href')).toBe('/billing');
  });

  it('is not dismissible (no dismiss button)', () => {
    mockSubscription.accessState = 'degraded';
    mockSubscription.subscription = { status: 'expired_trial', canceled_at: null };
    renderBanner();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

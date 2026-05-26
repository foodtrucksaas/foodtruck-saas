import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrialBanner from './TrialBanner';

// Mock subscription context
const mockSubscription = vi.hoisted(() => ({
  subscription: null as Record<string, unknown> | null,
  daysRemainingInTrial: null as number | null,
}));

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: () => mockSubscription,
}));

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockSessionStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockSessionStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockSessionStorage[key];
  },
  clear: () => {
    Object.keys(mockSessionStorage).forEach((k) => delete mockSessionStorage[k]);
  },
});

function renderBanner() {
  return render(
    <MemoryRouter>
      <TrialBanner />
    </MemoryRouter>
  );
}

describe('TrialBanner', () => {
  beforeEach(() => {
    Object.keys(mockSessionStorage).forEach((k) => delete mockSessionStorage[k]);
    mockSubscription.subscription = null;
    mockSubscription.daysRemainingInTrial = null;
  });

  it('renders nothing when no subscription', () => {
    const { container } = renderBanner();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when subscription is active', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'active',
      trial_ends_at: '2026-06-01T00:00:00Z',
      stripe_subscription_id: 'sub_123',
    };
    mockSubscription.daysRemainingInTrial = null;
    const { container } = renderBanner();
    expect(container.innerHTML).toBe('');
  });

  it('renders blue banner for 7+ days remaining', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-06-05T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 10;
    renderBanner();

    const banner = screen.getByTestId('trial-banner');
    expect(banner).toBeDefined();
    expect(banner.className).toContain('bg-blue-50');
    expect(screen.getByText(/encore 10 jours/)).toBeDefined();
  });

  it('renders orange banner for 3 days remaining', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-05-29T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 3;
    renderBanner();

    const banner = screen.getByTestId('trial-banner');
    expect(banner.className).toContain('bg-orange-50');
  });

  it('renders red banner for 1 day remaining', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-05-27T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 1;
    renderBanner();

    const banner = screen.getByTestId('trial-banner');
    expect(banner.className).toContain('bg-red-50');
    expect(screen.getByText('Votre essai se termine demain')).toBeDefined();
  });

  it('renders red banner for 0 days (today)', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-05-26T23:59:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 0;
    renderBanner();

    expect(screen.getByText("Votre essai se termine aujourd'hui")).toBeDefined();
  });

  it('shows "Ajouter ma carte bancaire" link when no stripe subscription', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-06-05T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 10;
    renderBanner();

    expect(screen.getByText(/Ajouter ma carte bancaire/)).toBeDefined();
  });

  it('shows card-registered message when stripe subscription exists', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-06-05T00:00:00Z',
      stripe_subscription_id: 'sub_123',
    };
    mockSubscription.daysRemainingInTrial = 10;
    renderBanner();

    expect(screen.getByText(/carte est enregistrée/)).toBeDefined();
  });

  it('can be dismissed when more than 1 day remaining', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-06-05T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 5;
    renderBanner();

    const dismissBtn = screen.getByTestId('trial-banner-dismiss');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('trial-banner')).toBeNull();
    expect(mockSessionStorage['trial_banner_dismissed_sub-1']).toBe('true');
  });

  it('cannot be dismissed when 1 day remaining', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-05-27T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 1;
    renderBanner();

    expect(screen.queryByTestId('trial-banner-dismiss')).toBeNull();
  });

  it('cannot be dismissed when 0 days remaining', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-05-26T12:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 0;
    renderBanner();

    expect(screen.queryByTestId('trial-banner-dismiss')).toBeNull();
  });

  it('stays dismissed across re-renders within session', () => {
    mockSubscription.subscription = {
      id: 'sub-1',
      status: 'trialing',
      trial_ends_at: '2026-06-05T00:00:00Z',
      stripe_subscription_id: null,
    };
    mockSubscription.daysRemainingInTrial = 5;

    // Simulate previous dismissal
    mockSessionStorage['trial_banner_dismissed_sub-1'] = 'true';

    const { container } = renderBanner();
    expect(container.innerHTML).toBe('');
  });
});

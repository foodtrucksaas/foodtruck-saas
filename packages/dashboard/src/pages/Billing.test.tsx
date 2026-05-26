import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from './Billing';

// Mock dependencies
const mockGetSubscription = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockCreatePortalSession = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    billing: {
      getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
      createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
      createPortalSession: (...args: unknown[]) => mockCreatePortalSession(...args),
    },
  },
}));

vi.mock('../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: { id: 'ft-1', name: 'Test Truck' },
    loading: false,
  }),
}));

vi.mock('../components/Loading', () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

function renderBilling(initialEntries = ['/billing']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Billing />
    </MemoryRouter>
  );
}

const baseSubscription = {
  id: 'sub-1',
  foodtruck_id: 'ft-1',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  status: 'trialing' as const,
  trial_started_at: '2026-05-01T00:00:00Z',
  trial_ends_at: '2026-06-15T00:00:00Z',
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  canceled_at: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

describe('Billing page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  describe('trialing state', () => {
    it('should show trial info with days remaining and checkout button', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'trialing',
      });

      renderBilling();

      expect(await screen.findByText(/essai gratuit/)).toBeInTheDocument();
      expect(screen.getByText(/Ajouter ma carte bancaire/)).toBeInTheDocument();
      expect(screen.getByText(/Aucun débit avant/)).toBeInTheDocument();
    });

    it('should call createCheckoutSession on button click', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'trialing',
      });
      mockCreateCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/test',
      });

      renderBilling();

      const btn = await screen.findByText(/Ajouter ma carte bancaire/);
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
        expect(window.location.href).toBe('https://checkout.stripe.com/test');
      });
    });
  });

  describe('trialing with CB', () => {
    it('should show manage button when trialing with stripe_subscription_id', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'trialing',
        stripe_subscription_id: 'sub_test_123',
      });

      renderBilling();

      expect(await screen.findByText(/essai gratuit/)).toBeInTheDocument();
      expect(screen.getByText(/carte bancaire est enregistrée/)).toBeInTheDocument();
      expect(screen.getByText(/29.*€ HT/)).toBeInTheDocument();
      expect(screen.getByText(/Gérer mon abonnement/)).toBeInTheDocument();
      expect(screen.queryByText(/Ajouter ma carte bancaire/)).not.toBeInTheDocument();
    });

    it('should call createPortalSession on manage button click', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'trialing',
        stripe_subscription_id: 'sub_test_123',
      });
      mockCreatePortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      renderBilling();

      const btn = await screen.findByText(/Gérer mon abonnement/);
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockCreatePortalSession).toHaveBeenCalledTimes(1);
        expect(window.location.href).toBe('https://billing.stripe.com/portal');
      });
    });
  });

  describe('active state', () => {
    it('should show active banner and manage button', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'active',
        current_period_end: '2026-07-01T00:00:00Z',
      });

      renderBilling();

      expect(await screen.findByText(/abonnement est actif/)).toBeInTheDocument();
      expect(screen.getByText(/Prochaine échéance/)).toBeInTheDocument();
      expect(screen.getByText(/Gérer mon abonnement/)).toBeInTheDocument();
      expect(screen.getByText(/Mise à jour CB, factures, annulation/)).toBeInTheDocument();
    });

    it('should call createPortalSession on manage button click', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'active',
        current_period_end: '2026-07-01T00:00:00Z',
      });
      mockCreatePortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      renderBilling();

      const btn = await screen.findByText(/Gérer mon abonnement/);
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockCreatePortalSession).toHaveBeenCalledTimes(1);
        expect(window.location.href).toBe('https://billing.stripe.com/portal');
      });
    });
  });

  describe('past_due state', () => {
    it('should show warning banner and update card button', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'past_due',
      });

      renderBilling();

      expect(await screen.findByText(/Paiement en cours de relance/)).toBeInTheDocument();
      expect(screen.getByText(/dernier paiement a échoué/)).toBeInTheDocument();
      expect(screen.getByText(/Mettre à jour ma carte/)).toBeInTheDocument();
    });
  });

  describe('degraded states', () => {
    it.each([
      ['canceled', 'annulé votre abonnement'],
      ['unpaid', 'suspendu suite à un échec'],
      ['expired_trial', "période d'essai est terminée"],
      ['incomplete', "inscription n'a pas été finalisée"],
      ['paused', 'compte est en pause'],
    ] as const)('should show degraded UI for status "%s"', async (status, expectedText) => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status,
      });

      renderBilling();

      expect(await screen.findByText(/Abonnement inactif/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument();
      expect(screen.getByText(/Réactiver mon abonnement/)).toBeInTheDocument();
    });

    it('should call createCheckoutSession on reactivate button', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'canceled',
      });
      mockCreateCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/reactivate',
      });

      renderBilling();

      const btn = await screen.findByText(/Réactiver mon abonnement/);
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('post-checkout handling', () => {
    it('should show success toast on ?success=1', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'active',
      });

      renderBilling(['/billing?success=1']);

      // Toast uses "!" — the Alert banner doesn't
      expect(await screen.findByText(/abonnement est actif !/)).toBeInTheDocument();
    });

    it('should show info toast on ?canceled=1', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'trialing',
      });

      renderBilling(['/billing?canceled=1']);

      expect(await screen.findByText(/Aucun changement effectué/)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show error when subscription fetch fails', async () => {
      mockGetSubscription.mockRejectedValue(new Error('Network error'));

      renderBilling();

      expect(await screen.findByText(/Network error/)).toBeInTheDocument();
    });

    it('should show error when checkout fails', async () => {
      mockGetSubscription.mockResolvedValue({
        ...baseSubscription,
        status: 'trialing',
      });
      mockCreateCheckoutSession.mockRejectedValue(new Error('Stripe error'));

      renderBilling();

      const btn = await screen.findByText(/Ajouter ma carte bancaire/);
      fireEvent.click(btn);

      expect(await screen.findByText(/Stripe error/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator initially', () => {
      mockGetSubscription.mockReturnValue(new Promise(() => {}));

      renderBilling();

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });
});

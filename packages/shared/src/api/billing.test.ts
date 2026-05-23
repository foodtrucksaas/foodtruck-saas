import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBillingApi } from './billing';

const mockFrom = vi.fn();
const mockAuth = {
  getSession: vi.fn(),
};

const mockSupabase = {
  from: mockFrom,
  auth: mockAuth,
  rest: { url: 'http://localhost:54321/rest/v1' },
} as unknown as Parameters<typeof createBillingApi>[0];

describe('billing API', () => {
  let api: ReturnType<typeof createBillingApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    api = createBillingApi(mockSupabase);
  });

  describe('getSubscription', () => {
    it('should return subscription for foodtruck', async () => {
      const mockSubscription = {
        id: 'sub-1',
        foodtruck_id: 'ft-1',
        status: 'trialing',
        trial_started_at: '2026-01-01',
        trial_ends_at: '2026-01-15',
      };

      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockSubscription, error: null }),
          }),
        }),
      });

      const result = await api.getSubscription('ft-1');
      expect(result).toEqual(mockSubscription);
      expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    });

    it('should return null when no subscription exists', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      });

      const result = await api.getSubscription('ft-1');
      expect(result).toBeNull();
    });

    it('should throw on error', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: 'DB error', code: '500' } }),
          }),
        }),
      });

      await expect(api.getSubscription('ft-1')).rejects.toThrow();
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw when not authenticated', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });

      await expect(api.createCheckoutSession()).rejects.toThrow('Non authentifié');
    });

    it('should call the edge function with auth token', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session-1' }),
      });
      globalThis.fetch = mockFetch;

      const result = await api.createCheckoutSession();
      expect(result.url).toBe('https://checkout.stripe.com/session-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:54321/functions/v1/create-checkout-session',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should throw on error response', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'STRIPE_PRICE_ID non configuré' }),
      });

      await expect(api.createCheckoutSession()).rejects.toThrow('STRIPE_PRICE_ID non configuré');
    });
  });

  describe('createPortalSession', () => {
    it('should throw when not authenticated', async () => {
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });

      await expect(api.createPortalSession()).rejects.toThrow('Non authentifié');
    });

    it('should call the edge function with auth token', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://billing.stripe.com/portal-1' }),
      });
      globalThis.fetch = mockFetch;

      const result = await api.createPortalSession();
      expect(result.url).toBe('https://billing.stripe.com/portal-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:54321/functions/v1/create-portal-session',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLoyaltyApi } from './loyalty';

describe('Loyalty API', () => {
  let mockSupabase: any;
  let loyaltyApi: ReturnType<typeof createLoyaltyApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      rpc: vi.fn(),
    };
    loyaltyApi = createLoyaltyApi(mockSupabase);
  });

  describe('getCustomerLoyalty', () => {
    it('should fetch customer loyalty info via RPC', async () => {
      const mockLoyaltyInfo = {
        customer_id: 'cust-1',
        email: 'test@example.com',
        points_balance: 45,
        lifetime_points: 120,
        total_orders: 8,
        total_spent: 15000,
        first_order_at: '2026-01-01T10:00:00Z',
        last_order_at: '2026-02-01T12:00:00Z',
      };
      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockLoyaltyInfo], error: null });

      const result = await loyaltyApi.getCustomerLoyalty('ft-1', 'test@example.com');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_customer_loyalty', {
        p_foodtruck_id: 'ft-1',
        p_email: 'test@example.com',
      });
      expect(result).toEqual(mockLoyaltyInfo);
    });

    it('should return null when customer not found', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await loyaltyApi.getCustomerLoyalty('ft-1', 'unknown@example.com');

      expect(result).toBeNull();
    });

    it('should return null when data is null', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await loyaltyApi.getCustomerLoyalty('ft-1', 'test@example.com');

      expect(result).toBeNull();
    });

    it('should throw error on RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function not found' },
      });

      await expect(loyaltyApi.getCustomerLoyalty('ft-1', 'test@example.com')).rejects.toThrow(
        'RPC function not found'
      );
    });

    it('should handle customer with zero points', async () => {
      const mockLoyaltyInfo = {
        customer_id: 'cust-2',
        email: 'new@example.com',
        points_balance: 0,
        lifetime_points: 0,
        total_orders: 1,
        total_spent: 1500,
      };
      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockLoyaltyInfo], error: null });

      const result = await loyaltyApi.getCustomerLoyalty('ft-1', 'new@example.com');

      expect(result).toEqual(mockLoyaltyInfo);
      expect(result?.points_balance).toBe(0);
    });

    it('should handle customer who has redeemed points', async () => {
      const mockLoyaltyInfo = {
        customer_id: 'cust-3',
        email: 'redeemer@example.com',
        points_balance: 10,
        lifetime_points: 60,
        total_orders: 5,
        total_spent: 8000,
        last_redemption_at: '2026-01-15T14:00:00Z',
      };
      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockLoyaltyInfo], error: null });

      const result = await loyaltyApi.getCustomerLoyalty('ft-1', 'redeemer@example.com');

      expect(result).toEqual(mockLoyaltyInfo);
      expect(result?.lifetime_points).toBeGreaterThan(result?.points_balance ?? 0);
    });

    it('should use correct RPC parameters format', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      await loyaltyApi.getCustomerLoyalty('foodtruck-uuid-123', 'Customer@Email.COM');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_customer_loyalty', {
        p_foodtruck_id: 'foodtruck-uuid-123',
        p_email: 'Customer@Email.COM',
      });
    });
  });
});

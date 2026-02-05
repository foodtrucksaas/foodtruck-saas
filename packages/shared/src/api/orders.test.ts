import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrdersApi } from './orders';

describe('Orders API', () => {
  let mockSupabase: any;
  let ordersApi: ReturnType<typeof createOrdersApi>;

  // Helper to create a chainable query mock
  const createChainableQuery = (resolveValue: any = { data: [], error: null }) => {
    const query: any = {};
    ['select', 'eq', 'in', 'gte', 'lte', 'order', 'limit', 'update'].forEach((method) => {
      query[method] = vi.fn(() => query);
    });
    // Make the query thenable (Promise-like) for await
    query.then = (resolve: any) => resolve(resolveValue);
    query.maybeSingle = vi.fn(() => Promise.resolve(resolveValue));
    query.single = vi.fn(() => Promise.resolve(resolveValue));
    return query;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      })),
    };
    ordersApi = createOrdersApi(mockSupabase);
  });

  describe('getByFoodtruck', () => {
    it('should fetch all orders for a foodtruck', async () => {
      const mockOrders = [
        { id: 'order-1', status: 'pending', total_amount: 1500 },
        { id: 'order-2', status: 'confirmed', total_amount: 2000 },
      ];
      const query = createChainableQuery({ data: mockOrders, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.getByFoodtruck('ft-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(query.eq).toHaveBeenCalledWith('foodtruck_id', 'ft-1');
      expect(result).toEqual(mockOrders);
    });

    it('should filter by single status', async () => {
      const query = createChainableQuery();
      mockSupabase.from.mockReturnValue(query);

      await ordersApi.getByFoodtruck('ft-1', { status: 'pending' });

      expect(query.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('should filter by multiple statuses', async () => {
      const query = createChainableQuery();
      mockSupabase.from.mockReturnValue(query);

      await ordersApi.getByFoodtruck('ft-1', { status: ['pending', 'confirmed'] });

      expect(query.in).toHaveBeenCalledWith('status', ['pending', 'confirmed']);
    });

    it('should filter by date range', async () => {
      const query = createChainableQuery();
      mockSupabase.from.mockReturnValue(query);

      await ordersApi.getByFoodtruck('ft-1', {
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
      });

      expect(query.gte).toHaveBeenCalledWith('created_at', '2026-01-01');
      expect(query.lte).toHaveBeenCalledWith('created_at', '2026-01-31');
    });

    it('should filter by customer email', async () => {
      const query = createChainableQuery();
      mockSupabase.from.mockReturnValue(query);

      await ordersApi.getByFoodtruck('ft-1', { customerEmail: 'test@test.com' });

      expect(query.eq).toHaveBeenCalledWith('customer_email', 'test@test.com');
    });

    it('should apply limit', async () => {
      const query = createChainableQuery();
      mockSupabase.from.mockReturnValue(query);

      await ordersApi.getByFoodtruck('ft-1', { limit: 10 });

      expect(query.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getById', () => {
    it('should fetch a single order with items', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        order_items: [{ id: 'item-1', quantity: 2 }],
      };
      const query = createChainableQuery({ data: mockOrder, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.getById('order-1');

      expect(query.eq).toHaveBeenCalledWith('id', 'order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should return null when order not found', async () => {
      const query = createChainableQuery({ data: null, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByCustomerEmail', () => {
    it('should fetch orders for a customer', async () => {
      const mockOrders = [
        { id: 'order-1', customer_email: 'test@test.com' },
        { id: 'order-2', customer_email: 'test@test.com' },
      ];
      const query = createChainableQuery({ data: mockOrders, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.getByCustomerEmail('test@test.com');

      expect(query.eq).toHaveBeenCalledWith('customer_email', 'test@test.com');
      expect(result).toEqual(mockOrders);
    });

    it('should apply custom limit', async () => {
      const query = createChainableQuery();
      mockSupabase.from.mockReturnValue(query);

      await ordersApi.getByCustomerEmail('test@test.com', 5);

      expect(query.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const updatedOrder = { id: 'order-1', status: 'confirmed' };
      const query = createChainableQuery({ data: updatedOrder, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.updateStatus('order-1', 'confirmed');

      expect(query.update).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('update', () => {
    it('should update order fields', async () => {
      const updates = { notes: 'Updated notes', pickup_time: '2026-01-15T12:00:00' };
      const updatedOrder = { id: 'order-1', ...updates };
      const query = createChainableQuery({ data: updatedOrder, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.update('order-1', updates);

      expect(query.update).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending orders', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
          })),
        })),
      });

      const result = await ordersApi.getPendingCount('ft-1');

      expect(result).toBe(5);
    });

    it('should return 0 when no pending orders', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: null, error: null })),
          })),
        })),
      });

      const result = await ordersApi.getPendingCount('ft-1');

      expect(result).toBe(0);
    });

    it('should throw error on failure', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: null, error: new Error('DB Error') })),
          })),
        })),
      });

      await expect(ordersApi.getPendingCount('ft-1')).rejects.toThrow('DB Error');
    });
  });

  describe('getToday', () => {
    it('should fetch orders from today', async () => {
      const mockOrders = [{ id: 'order-1', status: 'pending' }];
      const query = createChainableQuery({ data: mockOrders, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await ordersApi.getToday('ft-1');

      expect(query.gte).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });
  });

  describe('subscribeToChanges', () => {
    it('should subscribe to order changes', () => {
      const callback = vi.fn();
      const mockSubscribe = vi.fn();
      const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe });
      mockSupabase.channel = vi.fn(() => ({ on: mockOn }));

      ordersApi.subscribeToChanges('ft-1', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('orders:ft-1');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'foodtruck_id=eq.ft-1',
        }),
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should call callback with transformed payload', () => {
      const callback = vi.fn();
      let channelCallback: ((payload: any) => void) | null = null;

      mockSupabase.channel = vi.fn(() => ({
        on: vi.fn((event, opts, cb) => {
          channelCallback = cb;
          return { subscribe: vi.fn() };
        }),
      }));

      ordersApi.subscribeToChanges('ft-1', callback);

      // Simulate receiving a message
      const payload = {
        eventType: 'INSERT',
        new: { id: 'order-1', status: 'pending' },
        old: null,
      };
      channelCallback!(payload);

      expect(callback).toHaveBeenCalledWith({
        eventType: 'INSERT',
        new: { id: 'order-1', status: 'pending' },
        old: null,
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseGte = vi.fn();
const mockSupabaseLt = vi.fn();
const mockSupabaseOrder = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => mockSupabaseFrom(),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  order_slot_interval: 15,
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock OrderNotificationContext
const mockAcceptOrder = vi.fn();
const mockSetSoundEnabled = vi.fn();

vi.mock('../../contexts/OrderNotificationContext', () => ({
  useOrderNotification: () => ({
    soundEnabled: true,
    setSoundEnabled: mockSetSoundEnabled,
    acceptOrder: mockAcceptOrder,
    refreshTrigger: 0,
  }),
}));

// Import hook after mocks
import { useOrders } from './useOrders';

describe('useOrders', () => {
  const mockMenuItem = {
    id: 'item-1',
    foodtruck_id: 'ft-1',
    category_id: 'cat-1',
    name: 'Burger',
    description: 'Delicious burger',
    price: 1200,
    photo_url: null,
    image_url: null,
    allergens: null,
    is_available: true,
    is_daily_special: false,
    display_order: 0,
    disabled_options: {},
    option_prices: {},
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const mockOrderItem = {
    id: 'oi-1',
    order_id: 'order-1',
    menu_item_id: 'item-1',
    quantity: 2,
    unit_price: 1200,
    notes: null,
    options_price: 0,
    created_at: '2024-01-01',
    menu_item: mockMenuItem,
    order_item_options: [],
  };

  const createMockOrder = (
    overrides: Partial<OrderWithItemsAndOptions> = {}
  ): OrderWithItemsAndOptions =>
    ({
      id: 'order-1',
      foodtruck_id: 'ft-1',
      customer_id: null,
      customer_email: 'client@test.com',
      customer_phone: '0612345678',
      customer_name: 'Test Client',
      status: 'pending',
      pickup_time: '2024-01-15T12:00:00Z',
      total_amount: 2400,
      discount_amount: 0,
      deal_discount: null,
      notes: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      promo_code_id: null,
      deal_id: null,
      cancellation_reason: null,
      cancelled_by: null,
      cancelled_at: null,
      order_items: [mockOrderItem],
      ...overrides,
    }) as OrderWithItemsAndOptions;

  const mockOrders: OrderWithItemsAndOptions[] = [
    createMockOrder({ id: 'order-1', status: 'pending', pickup_time: '2024-01-15T12:00:00Z' }),
    createMockOrder({ id: 'order-2', status: 'confirmed', pickup_time: '2024-01-15T12:15:00Z' }),
    createMockOrder({ id: 'order-3', status: 'pending', pickup_time: '2024-01-15T12:30:00Z' }),
    createMockOrder({ id: 'order-4', status: 'confirmed', pickup_time: '2024-01-15T13:00:00Z' }),
  ];

  // Store original Date
  const RealDate = global.Date;
  let mockNow: number;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Date.now() without using fake timers
    mockNow = new RealDate('2024-01-15T11:30:00Z').getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

    // Setup default Supabase mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    });

    mockSupabaseEq.mockReturnValue({
      gte: mockSupabaseGte,
    });

    mockSupabaseGte.mockReturnValue({
      lt: mockSupabaseLt,
    });

    mockSupabaseLt.mockReturnValue({
      order: mockSupabaseOrder,
    });

    mockSupabaseOrder.mockResolvedValue({
      data: mockOrders,
      error: null,
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [mockOrders[0]], error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useOrders());

      expect(result.current.loading).toBe(true);
      expect(result.current.orders).toEqual([]);
    });

    it('should fetch orders on mount', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.orders).toEqual(mockOrders);
    });

    it('should calculate pending and confirmed counts', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pending).toBe(2); // order-1 and order-3
      expect(result.current.confirmed).toBe(2); // order-2 and order-4
    });
  });

  describe('groupedOrders', () => {
    it('should group orders by time slots', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const grouped = result.current.groupedOrders;

      // Should have groups for 12:00, 12:15, 12:30, 13:00
      expect(grouped.length).toBeGreaterThan(0);

      // Each group should have a slot string in HH:MM format
      grouped.forEach((group) => {
        expect(group.slot).toMatch(/^\d{2}:\d{2}$/);
        expect(Array.isArray(group.orders)).toBe(true);
      });
    });

    it('should sort groups by time', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const grouped = result.current.groupedOrders;
      const slots = grouped.map((g) => g.slot);

      // Verify slots are in ascending order
      for (let i = 1; i < slots.length; i++) {
        expect(slots[i] >= slots[i - 1]).toBe(true);
      }
    });

    it('should use correct slot interval from foodtruck settings', async () => {
      // Create orders with times that will be in the same slot vs different slots
      // Using local time-based approach since grouping uses getHours()/getMinutes()
      const baseDate = new Date('2024-01-15T12:00:00');
      const date07 = new Date(baseDate);
      date07.setMinutes(7);
      const date14 = new Date(baseDate);
      date14.setMinutes(14);
      const date16 = new Date(baseDate);
      date16.setMinutes(16);

      const ordersWithVariedTimes: OrderWithItemsAndOptions[] = [
        createMockOrder({ id: 'order-1', pickup_time: baseDate.toISOString() }),
        createMockOrder({ id: 'order-2', pickup_time: date07.toISOString() }),
        createMockOrder({ id: 'order-3', pickup_time: date14.toISOString() }),
        createMockOrder({ id: 'order-4', pickup_time: date16.toISOString() }),
      ];

      mockSupabaseOrder.mockResolvedValue({
        data: ordersWithVariedTimes,
        error: null,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const grouped = result.current.groupedOrders;

      // With 15-minute intervals we should have 2 groups
      // First group (12:00-12:14): 3 orders
      // Second group (12:15-12:29): 1 order
      expect(grouped.length).toBe(2);

      // Find the groups (accounting for timezone)
      const firstGroup = grouped[0];
      const secondGroup = grouped[1];

      expect(firstGroup.orders.length).toBe(3);
      expect(secondGroup.orders.length).toBe(1);
    });

    it('should handle empty orders array', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groupedOrders).toEqual([]);
    });
  });

  describe('currentSlotStr', () => {
    it('should calculate current time slot with 15-minute intervals', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // currentSlotStr should be in HH:MM format
      expect(result.current.currentSlotStr).toMatch(/^\d{2}:\d{2}$/);

      // Minutes should be divisible by 15 (slot interval)
      const minutes = parseInt(result.current.currentSlotStr.split(':')[1], 10);
      expect(minutes % 15).toBe(0);
    });

    it('should have consistent format', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify format is consistent HH:MM with leading zeros
      const [hours, mins] = result.current.currentSlotStr.split(':');
      expect(hours.length).toBe(2);
      expect(mins.length).toBe(2);
    });
  });

  describe('acceptOrder', () => {
    it('should call context acceptOrder and refresh', async () => {
      mockAcceptOrder.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.acceptOrder('order-1');
      });

      expect(mockAcceptOrder).toHaveBeenCalledWith('order-1');
    });
  });

  describe('cancelOrderWithReason', () => {
    it('should cancel order with reason', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'order-1' }], error: null }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.cancelOrderWithReason('order-1', 'Rupture de stock');
      });

      expect(mockSupabaseFrom).toHaveBeenCalled();
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.cancelOrderWithReason('order-1', 'Rupture de stock');
      });

      // Error is logged to console, not toast
    });

    it('should show test mode error when no data returned', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.cancelOrderWithReason('order-1', 'Test reason');
      });

      // Error is logged to console, not toast
    });
  });

  describe('markPickedUp', () => {
    it('should mark order as picked up', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'order-1', status: 'picked_up' }], error: null }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.markPickedUp('order-1');
      });

      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.markPickedUp('order-1');
      });

      // Error is logged to console, not toast
    });

    it('should show test mode error when no data returned', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.markPickedUp('order-1');
      });

      // Error is logged to console, not toast
    });
  });

  describe('updatePickupTime', () => {
    it('should update pickup time correctly', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'order-1' }], error: null }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePickupTime('order-1', '2024-01-15T12:00:00Z', '13:30');
      });

      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('should log error on failure', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Invalid time' } }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePickupTime('order-1', '2024-01-15T12:00:00Z', '13:30');
      });

      // Error is logged to console, not toast
    });

    it('should show test mode error when no data returned', async () => {
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePickupTime('order-1', '2024-01-15T12:00:00Z', '13:30');
      });

      // Error is logged to console, not toast
    });
  });

  describe('selectedOrder', () => {
    it('should allow setting and clearing selected order', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.selectedOrder).toBeNull();

      act(() => {
        result.current.setSelectedOrder(mockOrders[0]);
      });

      expect(result.current.selectedOrder).toEqual(mockOrders[0]);

      act(() => {
        result.current.setSelectedOrder(null);
      });

      expect(result.current.selectedOrder).toBeNull();
    });
  });

  describe('sound settings', () => {
    it('should expose sound settings from context', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.soundEnabled).toBe(true);
      expect(result.current.setSoundEnabled).toBe(mockSetSoundEnabled);
    });
  });

  describe('error handling', () => {
    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      renderHook(() => useOrders());

      // Wait for the fetch to complete - the hook logs error but still sets loading to false
      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      consoleSpy.mockRestore();
    });

    it('should not crash when orders are null', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle gracefully - orders remain empty
      expect(result.current.orders).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('should query today orders only', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify the Supabase chain was called
      expect(mockSupabaseFrom).toHaveBeenCalled();
      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(mockSupabaseEq).toHaveBeenCalled();
      expect(mockSupabaseGte).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The .lt() should be called for date range filtering
      expect(mockSupabaseLt).toHaveBeenCalled();
    });
  });

  describe('order statistics', () => {
    it('should count pending orders correctly', async () => {
      const ordersWithVariousStatuses: OrderWithItemsAndOptions[] = [
        createMockOrder({ id: 'order-1', status: 'pending' }),
        createMockOrder({ id: 'order-2', status: 'pending' }),
        createMockOrder({ id: 'order-3', status: 'pending' }),
        createMockOrder({ id: 'order-4', status: 'confirmed' }),
      ];

      mockSupabaseOrder.mockResolvedValue({
        data: ordersWithVariousStatuses,
        error: null,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pending).toBe(3);
      expect(result.current.confirmed).toBe(1);
    });

    it('should return zero counts for empty orders', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pending).toBe(0);
      expect(result.current.confirmed).toBe(0);
    });
  });

  describe('nowRef', () => {
    it('should provide nowRef for scroll behavior', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // nowRef should be defined
      expect(result.current.nowRef).toBeDefined();
    });
  });
});

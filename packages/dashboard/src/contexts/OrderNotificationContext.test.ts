import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import {
  OrderNotificationProvider,
  useOrderNotification,
  unlockAudio,
} from './OrderNotificationContext';

// Mock formatLocalDate
vi.mock('@foodtruck/shared', async () => {
  const actual = await vi.importActual('@foodtruck/shared');
  return {
    ...actual,
    formatLocalDate: () => '2026-02-05',
  };
});

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  slug: 'test-foodtruck',
  show_order_popup: true,
  send_confirmation_email: true,
  auto_accept_orders: false,
  min_preparation_time: 15,
};

let mockFoodtruckValue: typeof mockFoodtruck | null = mockFoodtruck;

vi.mock('./FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruckValue,
  }),
}));

// Mock functions
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockChannel = vi.fn();
const mockSubscribe = vi.fn();

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        const chainable: any = {
          eq: () => chainable,
          neq: () => chainable,
          gte: () => chainable,
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        };
        return chainable;
      },
      update: (data: unknown) => {
        mockUpdate(data);
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      },
    })),
    channel: (name: string) => {
      mockChannel(name);
      return {
        on: vi.fn(() => ({
          on: vi.fn(() => ({
            subscribe: () => {
              mockSubscribe();
              return {};
            },
          })),
        })),
      };
    },
    removeChannel: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch;

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    frequency: { value: 0 },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  })),
  destination: {},
  currentTime: 0,
};

(global as any).AudioContext = vi.fn(() => mockAudioContext);
(global as any).webkitAudioContext = vi.fn(() => mockAudioContext);

// Create wrapper
const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(OrderNotificationProvider, null, children);

describe('OrderNotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFoodtruckValue = mockFoodtruck;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have empty pending popup orders initially', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.pendingPopupOrders).toEqual([]);
    });

    it('should have pending count of 0 initially', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should have sound enabled by default', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.soundEnabled).toBe(true);
    });

    it('should provide auto accept from foodtruck', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.isAutoAccept).toBe(false);
      expect(result.current.minPrepTime).toBe(15);
    });
  });

  describe('Sound Control', () => {
    it('should toggle sound enabled', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      act(() => {
        result.current.setSoundEnabled(false);
      });

      expect(result.current.soundEnabled).toBe(false);

      act(() => {
        result.current.setSoundEnabled(true);
      });

      expect(result.current.soundEnabled).toBe(true);
    });
  });

  describe('unlockAudio', () => {
    it('should initialize AudioContext', () => {
      unlockAudio();

      expect(global.AudioContext).toHaveBeenCalled();
    });
  });

  describe('acceptOrder', () => {
    it('should update order status to confirmed', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await result.current.acceptOrder('order-1');
      });

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' });
    });

    it('should update order with pickup time if provided', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await result.current.acceptOrder('order-1', '2026-02-05T12:30:00');
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'confirmed',
        pickup_time: '2026-02-05T12:30:00',
      });
    });

    it('should send confirmation email when enabled', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await result.current.acceptOrder('order-1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('send-order-confirmation'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ order_id: 'order-1' }),
        })
      );
    });
  });

  describe('cancelOrder', () => {
    it('should update order status to cancelled', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await result.current.cancelOrder('order-1');
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'cancelled',
        cancellation_reason: 'Refusée par le commerçant',
      });
    });

    it('should include custom cancellation reason', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await result.current.cancelOrder('order-1', 'Out of ingredients');
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'cancelled',
        cancellation_reason: 'Out of ingredients',
      });
    });
  });

  describe('dismissPopup', () => {
    it('should not throw when dismissing', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      act(() => {
        result.current.dismissPopup('order-1');
      });

      expect(result.current.pendingPopupOrders).toEqual([]);
    });
  });

  describe('refreshOrders', () => {
    it('should increment refresh trigger', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      const initialTrigger = result.current.refreshTrigger;

      act(() => {
        result.current.refreshOrders();
      });

      expect(result.current.refreshTrigger).toBe(initialTrigger + 1);
    });
  });

  describe('Realtime Subscription', () => {
    it('should subscribe to order changes', async () => {
      renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockChannel).toHaveBeenCalledWith('orders-ft-1');
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should not subscribe when no foodtruck', async () => {
      mockFoodtruckValue = null;

      renderHook(() => useOrderNotification(), { wrapper });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockChannel).not.toHaveBeenCalled();
    });
  });

  describe('useOrderNotification hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useOrderNotification());
      }).toThrow('useOrderNotification must be used within OrderNotificationProvider');
    });

    it('should provide all context methods', async () => {
      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(typeof result.current.acceptOrder).toBe('function');
      expect(typeof result.current.cancelOrder).toBe('function');
      expect(typeof result.current.dismissPopup).toBe('function');
      expect(typeof result.current.refreshOrders).toBe('function');
      expect(typeof result.current.showAllPendingOrders).toBe('function');
      expect(typeof result.current.showOrderById).toBe('function');
      expect(typeof result.current.setSoundEnabled).toBe('function');
    });
  });

  describe('Auto Accept', () => {
    it('should reflect auto_accept_orders from foodtruck', async () => {
      mockFoodtruckValue = { ...mockFoodtruck, auto_accept_orders: true };

      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.isAutoAccept).toBe(true);
    });

    it('should default to false when foodtruck is null', async () => {
      mockFoodtruckValue = null;

      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.isAutoAccept).toBe(false);
    });
  });

  describe('Min Prep Time', () => {
    it('should reflect min_preparation_time from foodtruck', async () => {
      mockFoodtruckValue = { ...mockFoodtruck, min_preparation_time: 20 };

      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.minPrepTime).toBe(20);
    });

    it('should default to 15 when foodtruck is null', async () => {
      mockFoodtruckValue = null;

      const { result } = renderHook(() => useOrderNotification(), { wrapper });

      expect(result.current.minPrepTime).toBe(15);
    });
  });
});

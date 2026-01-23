import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { AnalyticsData } from '@foodtruck/shared';

// Mock Supabase
const mockRpc = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Import hook after mocks
import { useAnalytics, DATE_PRESETS, formatDateForInput } from './useAnalytics';

describe('useAnalytics', () => {
  const mockAnalyticsData: AnalyticsData = {
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    dayCount: 7,
    orderAmount: 150000, // 1500€
    orderCount: 50,
    averageOrderValue: 3000, // 30€
    uniqueCustomers: 35,
    returningCustomers: 10,
    previousOrderAmount: 120000,
    previousOrderCount: 40,
    previousAverageOrderValue: 3000,
    amountByDay: [
      { date: '2024-01-01', amount: 20000, order_count: 8 },
      { date: '2024-01-02', amount: 25000, order_count: 10 },
      { date: '2024-01-03', amount: 22000, order_count: 9 },
    ],
    ordersByHour: [
      { hour: 12, order_count: 15, amount: 45000 },
      { hour: 13, order_count: 12, amount: 36000 },
      { hour: 19, order_count: 18, amount: 54000 },
    ],
    ordersByDayOfWeek: [
      { day_of_week: 0, order_count: 5, amount: 15000 },
      { day_of_week: 1, order_count: 8, amount: 24000 },
      { day_of_week: 5, order_count: 12, amount: 36000 },
      { day_of_week: 6, order_count: 15, amount: 45000 },
    ],
    topItems: [
      { menuItemId: 'item-1', menuItemName: 'Burger Classic', quantity: 25, amount: 30000, orderCount: 20 },
      { menuItemId: 'item-2', menuItemName: 'Frites', quantity: 40, amount: 20000, orderCount: 30 },
      { menuItemId: 'item-3', menuItemName: 'Coca-Cola', quantity: 35, amount: 10500, orderCount: 25 },
    ],
    amountByLocation: [
      { locationId: 'loc-1', locationName: 'Marché Central', amount: 80000, orderCount: 30 },
      { locationId: 'loc-2', locationName: 'Place de la Gare', amount: 70000, orderCount: 20 },
    ],
    categoryStats: [
      { categoryId: 'cat-1', categoryName: 'Plats', quantity: 50, amount: 100000, itemCount: 5 },
      { categoryId: 'cat-2', categoryName: 'Boissons', quantity: 70, amount: 35000, itemCount: 3 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: mockAnalyticsData, error: null });
  });

  describe('DATE_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(DATE_PRESETS).toHaveLength(7);
      expect(DATE_PRESETS.map(p => p.key)).toEqual([
        'today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'custom'
      ]);
    });

    it('should have French labels', () => {
      expect(DATE_PRESETS.find(p => p.key === 'today')?.label).toBe("Aujourd'hui");
      expect(DATE_PRESETS.find(p => p.key === 'last7days')?.label).toBe('7 derniers jours');
    });
  });

  describe('formatDateForInput', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDateForInput(date);
      expect(formatted).toBe('2024-01-15');
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useAnalytics());

      expect(result.current.loading).toBe(true);
      expect(result.current.preset).toBe('last7days');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch analytics on mount', async () => {
      renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_analytics', expect.objectContaining({
          p_foodtruck_id: 'ft-1',
        }));
      });
    });

    it('should set analytics data after fetch', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.analytics).toEqual(mockAnalyticsData);
      });
    });
  });

  describe('preset changes', () => {
    it('should refetch data when preset changes', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockRpc.mockClear();

      act(() => {
        result.current.setPreset('last30days');
      });

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalled();
      });
    });

    it('should use custom dates when preset is custom', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockRpc.mockClear();

      act(() => {
        result.current.setCustomStartDate('2024-01-01');
        result.current.setCustomEndDate('2024-01-15');
        result.current.setPreset('custom');
      });

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_analytics', expect.objectContaining({
          p_start_date: '2024-01-01',
          p_end_date: '2024-01-15',
        }));
      });
    });
  });

  describe('percentage change calculations', () => {
    it('should calculate revenue change correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // (150000 - 120000) / 120000 * 100 = 25%
      expect(result.current.revenueChange).toBe(25);
    });

    it('should calculate order change correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // (50 - 40) / 40 * 100 = 25%
      expect(result.current.orderChange).toBe(25);
    });

    it('should calculate average change correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Same value = 0% change
      expect(result.current.avgChange).toBe(0);
    });

    it('should return 0 when previous is 0', async () => {
      mockRpc.mockResolvedValue({
        data: { ...mockAnalyticsData, previousOrderAmount: 0, orderAmount: 10000 },
        error: null,
      });

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Previous is 0, current > 0, should return 100
      expect(result.current.revenueChange).toBe(100);
    });

    it('should handle null analytics gracefully', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.revenueChange).toBe(0);
      expect(result.current.orderChange).toBe(0);
      expect(result.current.avgChange).toBe(0);
    });
  });

  describe('data transformations', () => {
    it('should transform revenue data correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.revenueData).toHaveLength(3);
      expect(result.current.revenueData[0]).toEqual({
        date: expect.any(String),
        fullDate: '2024-01-01',
        revenue: 200, // 20000 / 100
        orders: 8,
      });
    });

    it('should transform hourly data correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should filter hours 10-22 only
      expect(result.current.hourlyData.length).toBe(13); // 10h to 22h

      const hour12 = result.current.hourlyData.find(h => h.hour === 12);
      expect(hour12).toEqual({
        hour: 12,
        label: '12h',
        orders: 15,
        revenue: 450, // 45000 / 100
      });
    });

    it('should transform day of week data correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dayOfWeekData).toHaveLength(7);

      // Sunday (day 0)
      expect(result.current.dayOfWeekData[0].orders).toBe(5);

      // Saturday (day 6)
      expect(result.current.dayOfWeekData[6].orders).toBe(15);
    });

    it('should return empty arrays when no analytics', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.revenueData).toEqual([]);
    });
  });

  describe('maxItemRevenue', () => {
    it('should calculate max item revenue correctly', async () => {
      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.maxItemRevenue).toBe(30000); // Burger Classic
    });

    it('should return 0 when no top items', async () => {
      mockRpc.mockResolvedValue({
        data: { ...mockAnalyticsData, topItems: [] },
        error: null,
      });

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.maxItemRevenue).toBe(0);
    });

    it('should handle undefined topItems', async () => {
      mockRpc.mockResolvedValue({
        data: { ...mockAnalyticsData, topItems: undefined },
        error: null,
      });

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.maxItemRevenue).toBe(0);
    });
  });

  describe('dropdown state', () => {
    it('should manage preset dropdown visibility', async () => {
      const { result } = renderHook(() => useAnalytics());

      expect(result.current.showPresetDropdown).toBe(false);

      act(() => {
        result.current.setShowPresetDropdown(true);
      });

      expect(result.current.showPresetDropdown).toBe(true);
    });
  });

  describe('exportCSV', () => {
    it('should not throw when analytics is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(() => {
        result.current.exportCSV();
      }).not.toThrow();
    });

    it('should create CSV content with correct data', async () => {
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
      global.URL.createObjectURL = mockCreateObjectURL;

      const { result } = renderHook(() => useAnalytics());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.exportCSV();
      });

      // Verify Blob was created (URL.createObjectURL was called)
      expect(mockCreateObjectURL).toHaveBeenCalled();
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
    });
  });
});

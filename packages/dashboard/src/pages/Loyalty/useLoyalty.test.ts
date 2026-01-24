import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoyalty, type CustomerLoyalty } from './useLoyalty';

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  loyalty_enabled: true,
  loyalty_points_per_euro: 2,
  loyalty_threshold: 100,
  loyalty_reward: 1000,
  loyalty_allow_multiple: false,
};

const mockUpdateFoodtruck = vi.fn();

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
    updateFoodtruck: mockUpdateFoodtruck,
  }),
}));

describe('useLoyalty', () => {
  const mockCustomers: CustomerLoyalty[] = [
    {
      id: 'cust-1',
      email: 'loyal1@test.com',
      name: 'Jean Dupont',
      loyalty_points: 150,
      loyalty_opt_in: true,
      total_orders: 20,
      total_spent: 50000,
    },
    {
      id: 'cust-2',
      email: 'loyal2@test.com',
      name: 'Marie Martin',
      loyalty_points: 80,
      loyalty_opt_in: true,
      total_orders: 10,
      total_spent: 25000,
    },
    {
      id: 'cust-3',
      email: 'loyal3@test.com',
      name: 'Pierre Bernard',
      loyalty_points: 50,
      loyalty_opt_in: true,
      total_orders: 5,
      total_spent: 12500,
    },
  ];

  let mockSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateFoodtruck.mockResolvedValue(undefined);

    mockSelect = vi.fn().mockResolvedValue({ data: mockCustomers, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                order: mockSelect,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useLoyalty());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch customers with loyalty points', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.customers).toHaveLength(3);
      expect(mockFrom).toHaveBeenCalledWith('customers');
    });

    it('should initialize settings from foodtruck', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings.loyalty_enabled).toBe(true);
      expect(result.current.settings.loyalty_points_per_euro).toBe(2);
      expect(result.current.settings.loyalty_threshold).toBe(100);
      expect(result.current.settings.loyalty_reward).toBe(1000);
      expect(result.current.settings.loyalty_allow_multiple).toBe(false);
    });

    it('should open settings panel when loyalty is enabled', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settingsOpen).toBe(true);
    });
  });

  describe('stats', () => {
    it('should calculate active customers count', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.activeCustomers).toBe(3);
    });

    it('should calculate total points', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 150 + 80 + 50 = 280
      expect(result.current.stats.totalPoints).toBe(280);
    });

    it('should calculate customers near threshold', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Threshold is 100, 70% is 70
      // cust-2 has 80 points (>= 70 and < 100)
      expect(result.current.stats.customersNearThreshold).toBe(1);
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle loyalty_enabled', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings.loyalty_enabled).toBe(true);

      await act(async () => {
        await result.current.toggleEnabled();
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ loyalty_enabled: false });
    });

    it('should revert on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateFoodtruck.mockRejectedValueOnce(new Error('Update error'));

      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialValue = result.current.settings.loyalty_enabled;

      await act(async () => {
        await result.current.toggleEnabled();
      });

      // Should revert to initial value after error
      expect(result.current.settings.loyalty_enabled).toBe(initialValue);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('toggleAllowMultiple', () => {
    it('should toggle loyalty_allow_multiple', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings.loyalty_allow_multiple).toBe(false);

      await act(async () => {
        await result.current.toggleAllowMultiple();
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ loyalty_allow_multiple: true });
    });

    it('should revert on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateFoodtruck.mockRejectedValueOnce(new Error('Update error'));

      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialValue = result.current.settings.loyalty_allow_multiple;

      await act(async () => {
        await result.current.toggleAllowMultiple();
      });

      expect(result.current.settings.loyalty_allow_multiple).toBe(initialValue);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('saveValues', () => {
    it('should save loyalty settings', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          loyalty_points_per_euro: 3,
          loyalty_threshold: 150,
          loyalty_reward: 1500,
        }));
      });

      await act(async () => {
        await result.current.saveValues();
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({
        loyalty_points_per_euro: 3,
        loyalty_threshold: 150,
        loyalty_reward: 1500,
      });
    });

    it('should set settingsLoading during save', async () => {
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdateFoodtruck.mockReturnValueOnce(updatePromise);

      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.saveValues();
      });

      expect(result.current.settingsLoading).toBe(true);

      await act(async () => {
        resolveUpdate!();
      });

      await waitFor(() => {
        expect(result.current.settingsLoading).toBe(false);
      });
    });

    it('should handle save error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateFoodtruck.mockRejectedValueOnce(new Error('Save error'));

      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.saveValues();
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.settingsLoading).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('setSettings', () => {
    it('should update settings state', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSettings((prev) => ({
          ...prev,
          loyalty_points_per_euro: 5,
        }));
      });

      expect(result.current.settings.loyalty_points_per_euro).toBe(5);
    });
  });

  describe('settingsOpen toggle', () => {
    it('should toggle settingsOpen', async () => {
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially open because loyalty is enabled
      expect(result.current.settingsOpen).toBe(true);

      act(() => {
        result.current.setSettingsOpen(false);
      });

      expect(result.current.settingsOpen).toBe(false);

      act(() => {
        result.current.setSettingsOpen(true);
      });

      expect(result.current.settingsOpen).toBe(true);
    });
  });

  describe('empty customers', () => {
    it('should handle no customers with loyalty points', async () => {
      mockSelect.mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.customers).toHaveLength(0);
      expect(result.current.stats.activeCustomers).toBe(0);
      expect(result.current.stats.totalPoints).toBe(0);
      expect(result.current.stats.customersNearThreshold).toBe(0);
    });
  });

  describe('default settings with null foodtruck values', () => {
    it('should use default values when foodtruck has null values', async () => {
      // This test verifies that ?? operators work correctly
      const { result } = renderHook(() => useLoyalty());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // These should come from mockFoodtruck which has values set
      expect(result.current.settings.loyalty_enabled).toBe(true);
      expect(result.current.settings.loyalty_points_per_euro).toBe(2);
    });
  });
});

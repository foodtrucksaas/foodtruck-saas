import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Location } from '@foodtruck/shared';
import { useCustomers, formatDate, type CustomerWithLocations } from './useCustomers';

// Mock supabase
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
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test');

describe('useCustomers', () => {
  const mockLocations: Location[] = [
    { id: 'loc-1', foodtruck_id: 'ft-1', name: 'Marché Central', address: '1 Place du Marché', latitude: null, longitude: null, created_at: '2024-01-01' },
    { id: 'loc-2', foodtruck_id: 'ft-1', name: 'Place de la Gare', address: '2 Rue de la Gare', latitude: null, longitude: null, created_at: '2024-01-01' },
  ];

  const today = new Date();
  const fiveDaysAgo = new Date(today); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fortyDaysAgo = new Date(today); fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
  const tenDaysAgo = new Date(today); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const mockCustomers: CustomerWithLocations[] = [
    {
      id: 'cust-1', foodtruck_id: 'ft-1', email: 'loyal@test.com', name: 'Jean Dupont', phone: '0612345678',
      email_opt_in: true, sms_opt_in: true, first_order_at: fiveDaysAgo.toISOString(), last_order_at: fiveDaysAgo.toISOString(),
      total_orders: 10, total_spent: 50000, loyalty_points: 100, lifetime_points: 150, created_at: '2024-01-01',
      opted_in_at: '2024-01-01', updated_at: '2024-01-01',
      customer_locations: [{ location_id: 'loc-1', order_count: 8, location: mockLocations[0] }],
    },
    {
      id: 'cust-2', foodtruck_id: 'ft-1', email: 'new@test.com', name: 'Marie Martin', phone: '0698765432',
      email_opt_in: true, sms_opt_in: false, first_order_at: fiveDaysAgo.toISOString(), last_order_at: fiveDaysAgo.toISOString(),
      total_orders: 2, total_spent: 4000, loyalty_points: 20, lifetime_points: 20, created_at: '2024-01-10',
      opted_in_at: '2024-01-10', updated_at: '2024-01-10',
      customer_locations: [{ location_id: 'loc-2', order_count: 2, location: mockLocations[1] }],
    },
    {
      id: 'cust-3', foodtruck_id: 'ft-1', email: 'inactive@test.com', name: 'Pierre Bernard', phone: null,
      email_opt_in: false, sms_opt_in: false, first_order_at: fortyDaysAgo.toISOString(), last_order_at: fortyDaysAgo.toISOString(),
      total_orders: 3, total_spent: 6000, loyalty_points: 0, lifetime_points: 30, created_at: '2023-06-01',
      opted_in_at: null, updated_at: '2023-06-01',
      customer_locations: [],
    },
    {
      id: 'cust-4', foodtruck_id: 'ft-1', email: 'noopts@test.com', name: 'Sophie Laurent', phone: '0611111111',
      email_opt_in: false, sms_opt_in: false, first_order_at: tenDaysAgo.toISOString(), last_order_at: tenDaysAgo.toISOString(),
      total_orders: 6, total_spent: 12000, loyalty_points: 60, lifetime_points: 60, created_at: '2024-01-05',
      opted_in_at: null, updated_at: '2024-01-05',
      customer_locations: [{ location_id: 'loc-1', order_count: 6, location: mockLocations[0] }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockCustomers, error: null }),
            }),
          }),
        };
      }
      if (table === 'locations') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockLocations, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useCustomers());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch customers and locations on mount', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.customers).toHaveLength(4);
      expect(result.current.locations).toHaveLength(2);
    });
  });

  describe('stats', () => {
    it('should calculate total customers', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.total).toBe(4);
    });

    it('should calculate email opt-in count', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.emailOptIn).toBe(2); // loyal@test.com and new@test.com
    });

    it('should calculate SMS opt-in count', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.smsOptIn).toBe(1); // only loyal@test.com
    });

    it('should calculate loyal customers (5+ orders)', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.loyal).toBe(2); // cust-1 (10 orders) and cust-4 (6 orders)
    });

    it('should calculate active customers (ordered in last 30 days)', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats.active).toBe(3); // cust-1, cust-2, cust-4 (not cust-3 - 40 days ago)
    });
  });

  describe('search filtering', () => {
    it('should filter by email', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('loyal');
      });

      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].email).toBe('loyal@test.com');
    });

    it('should filter by name', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('marie');
      });

      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].name).toBe('Marie Martin');
    });

    it('should filter by phone', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('0612345678');
      });

      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].phone).toBe('0612345678');
    });

    it('should be case insensitive', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('DUPONT');
      });

      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].name).toBe('Jean Dupont');
    });
  });

  describe('segment filtering', () => {
    it('should filter opted_in customers', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterSegment('opted_in');
      });

      expect(result.current.customers).toHaveLength(2);
      expect(result.current.customers.every(c => c.email_opt_in || c.sms_opt_in)).toBe(true);
    });

    it('should filter loyal customers', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterSegment('loyal');
      });

      expect(result.current.customers).toHaveLength(2);
      expect(result.current.customers.every(c => c.total_orders >= 5)).toBe(true);
    });

    it('should filter inactive customers', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterSegment('inactive');
      });

      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].email).toBe('inactive@test.com');
    });

    it('should filter new customers (first order in last 7 days)', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterSegment('new');
      });

      // cust-1 and cust-2 have first_order_at 5 days ago
      expect(result.current.customers).toHaveLength(2);
    });
  });

  describe('location filtering', () => {
    it('should filter by location', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterLocation('loc-1');
      });

      expect(result.current.customers).toHaveLength(2); // cust-1 and cust-4
      expect(result.current.customers.every(c =>
        c.customer_locations?.some(cl => cl.location_id === 'loc-1')
      )).toBe(true);
    });

    it('should combine location with segment filter', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterSegment('loyal');
        result.current.setFilterLocation('loc-1');
      });

      // Only cust-1 and cust-4 are loyal AND at loc-1
      expect(result.current.customers).toHaveLength(2);
    });

    it('should combine search with filters', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery('jean');
        result.current.setFilterSegment('loyal');
      });

      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].name).toBe('Jean Dupont');
    });
  });

  describe('UI state', () => {
    it('should toggle filters visibility', async () => {
      const { result } = renderHook(() => useCustomers());

      expect(result.current.showFilters).toBe(false);

      act(() => {
        result.current.setShowFilters(true);
      });

      expect(result.current.showFilters).toBe(true);
    });
  });

  describe('exportCSV', () => {
    it('should create CSV blob', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.exportCSV();
      });

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export only filtered customers', async () => {
      const { result } = renderHook(() => useCustomers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setFilterSegment('loyal');
      });

      // Now only 2 customers should be exported
      expect(result.current.customers).toHaveLength(2);

      act(() => {
        result.current.exportCSV();
      });

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});

describe('formatDate', () => {
  it('should format valid date string', () => {
    const result = formatDate('2024-01-15T10:00:00Z');
    expect(result).toMatch(/15.*janv.*2024/i);
  });

  it('should return dash for null date', () => {
    const result = formatDate(null);
    expect(result).toBe('-');
  });

  it('should return dash for undefined date', () => {
    const result = formatDate(undefined as unknown as null);
    expect(result).toBe('-');
  });
});

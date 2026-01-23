import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimeSlots } from './useTimeSlots';
import type { ScheduleWithLocation, FoodtruckSettings } from './useCheckoutData';

// Mock the api module to prevent any async calls
vi.mock('../lib/api', () => ({
  api: {
    schedules: {
      getAvailableSlots: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('useTimeSlots', () => {
  const mockLocation = {
    id: 'loc-1',
    foodtruck_id: 'ft-1',
    name: 'Place du marche',
    address: '1 rue du marche',
    latitude: 48.8566,
    longitude: 2.3522,
    created_at: '2024-01-01',
  };

  const mockSchedules: ScheduleWithLocation[] = [
    {
      id: 'sched-1',
      foodtruck_id: 'ft-1',
      day_of_week: 1, // Monday
      start_time: '11:00',
      end_time: '14:00',
      is_active: true,
      location_id: 'loc-1',
      location: mockLocation,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  const mockSettings: FoodtruckSettings = {
    slotInterval: 15,
    maxOrdersPerSlot: 5,
    allowAdvanceOrders: true,
    advanceOrderDays: 7,
    allowAsapOrders: false,
    minPrepTime: 15,
    offersStackable: false,
    promoCodesStackable: true,
    loyaltyEnabled: false,
  };

  // Stable references to avoid re-renders
  const emptyExceptions = new Map();
  const mondayDate = new Date('2024-01-15T10:00:00'); // Monday at 10am
  const tuesdayDate = new Date('2024-01-16T10:00:00'); // Tuesday at 10am

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return empty slots when foodtruckId is undefined', () => {
      const { result } = renderHook(() =>
        useTimeSlots(undefined, mondayDate, mockSchedules, emptyExceptions, mockSettings)
      );

      expect(result.current.slots).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should return empty slots when settings is null', () => {
      const { result } = renderHook(() =>
        useTimeSlots('ft-1', mondayDate, mockSchedules, emptyExceptions, null)
      );

      expect(result.current.slots).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should return empty schedules for unscheduled day', () => {
      const { result } = renderHook(() =>
        useTimeSlots('ft-1', tuesdayDate, mockSchedules, emptyExceptions, mockSettings)
      );

      // Tuesday has no schedule in mockSchedules (day_of_week: 1 = Monday)
      expect(result.current.schedules).toEqual([]);
    });
  });

  describe('schedule matching', () => {
    it('should find schedules for the correct day of week', () => {
      const { result } = renderHook(() =>
        useTimeSlots('ft-1', mondayDate, mockSchedules, emptyExceptions, mockSettings)
      );

      // Monday (day 1) should match our schedule
      expect(result.current.schedules).toHaveLength(1);
      expect(result.current.schedules[0].id).toBe('sched-1');
    });
  });

  describe('schedule exceptions', () => {
    it('should return empty when day is closed due to exception', () => {
      const closedExceptions = new Map([
        ['2024-01-15', { is_closed: true }],
      ]);

      const { result } = renderHook(() =>
        useTimeSlots('ft-1', mondayDate, mockSchedules, closedExceptions, mockSettings)
      );

      expect(result.current.slots).toEqual([]);
      expect(result.current.schedules).toEqual([]);
    });
  });
});

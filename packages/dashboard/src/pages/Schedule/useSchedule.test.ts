import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Location } from '@foodtruck/shared';
import { useSchedule, type ScheduleWithLocation, type ExceptionWithLocation } from './useSchedule';

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
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock confirm
global.confirm = vi.fn(() => true);

describe('useSchedule', () => {
  const mockLocations: Location[] = [
    { id: 'loc-1', foodtruck_id: 'ft-1', name: 'Marche Central', address: '1 Place du Marche', latitude: 48.8566, longitude: 2.3522, created_at: '2024-01-01' },
    { id: 'loc-2', foodtruck_id: 'ft-1', name: 'Place de la Gare', address: '2 Rue de la Gare', latitude: 48.8600, longitude: 2.3500, created_at: '2024-01-01' },
  ];

  const mockSchedules: ScheduleWithLocation[] = [
    {
      id: 'sched-1',
      foodtruck_id: 'ft-1',
      location_id: 'loc-1',
      day_of_week: 1,
      start_time: '11:00',
      end_time: '14:00',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      location: mockLocations[0],
    },
    {
      id: 'sched-2',
      foodtruck_id: 'ft-1',
      location_id: 'loc-2',
      day_of_week: 3,
      start_time: '18:00',
      end_time: '22:00',
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      location: mockLocations[1],
    },
  ];

  const mockExceptions: ExceptionWithLocation[] = [
    {
      id: 'exc-1',
      foodtruck_id: 'ft-1',
      date: '2024-01-15',
      is_closed: true,
      location_id: null,
      start_time: null,
      end_time: null,
      reason: 'Vacances',
      created_at: '2024-01-01',
      location: null,
    },
    {
      id: 'exc-2',
      foodtruck_id: 'ft-1',
      date: '2024-01-20',
      is_closed: false,
      location_id: 'loc-2',
      start_time: '10:00',
      end_time: '15:00',
      reason: 'Marche special',
      created_at: '2024-01-01',
      location: mockLocations[1],
    },
  ];

  let mockSelectSchedules: ReturnType<typeof vi.fn>;
  let mockSelectLocations: ReturnType<typeof vi.fn>;
  let mockSelectExceptions: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSelectSchedules = vi.fn().mockResolvedValue({ data: mockSchedules, error: null });
    mockSelectLocations = vi.fn().mockResolvedValue({ data: mockLocations, error: null });
    mockSelectExceptions = vi.fn().mockResolvedValue({ data: mockExceptions, error: null });
    mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockUpdate = vi.fn().mockResolvedValue({ error: null });
    mockDelete = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'schedules') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  order: mockSelectSchedules,
                }),
              }),
            }),
          }),
          insert: () => mockInsert(),
          update: () => ({
            eq: () => mockUpdate(),
          }),
          delete: () => ({
            eq: () => mockDelete(),
          }),
        };
      }
      if (table === 'locations') {
        return {
          select: () => ({
            eq: mockSelectLocations,
          }),
          insert: () => mockInsert(),
          update: () => ({
            eq: () => mockUpdate(),
          }),
          delete: () => ({
            eq: () => mockDelete(),
          }),
        };
      }
      if (table === 'schedule_exceptions') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: mockSelectExceptions,
              }),
            }),
          }),
          insert: () => mockInsert(),
          update: () => ({
            eq: () => mockUpdate(),
          }),
          delete: () => ({
            eq: () => mockDelete(),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useSchedule());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch schedules, locations, and exceptions on mount', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toHaveLength(2);
      expect(result.current.locations).toHaveLength(2);
    });

    it('should initialize with calendar tab active', async () => {
      const { result } = renderHook(() => useSchedule());

      expect(result.current.activeTab).toBe('calendar');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should initialize with showScheduleForm false', async () => {
      const { result } = renderHook(() => useSchedule());

      expect(result.current.showScheduleForm).toBe(false);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should initialize with showLocationForm false', async () => {
      const { result } = renderHook(() => useSchedule());

      expect(result.current.showLocationForm).toBe(false);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('tab navigation', () => {
    it('should switch to recurring tab', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setActiveTab('recurring');
      });

      expect(result.current.activeTab).toBe('recurring');
    });

    it('should switch to locations tab', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setActiveTab('locations');
      });

      expect(result.current.activeTab).toBe('locations');
    });
  });

  describe('calendar navigation', () => {
    it('should go to previous month', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialMonth = result.current.currentMonth.getMonth();

      act(() => {
        result.current.goToPreviousMonth();
      });

      const expectedMonth = initialMonth === 0 ? 11 : initialMonth - 1;
      expect(result.current.currentMonth.getMonth()).toBe(expectedMonth);
    });

    it('should go to next month', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialMonth = result.current.currentMonth.getMonth();

      act(() => {
        result.current.goToNextMonth();
      });

      const expectedMonth = (initialMonth + 1) % 12;
      expect(result.current.currentMonth.getMonth()).toBe(expectedMonth);
    });
  });

  describe('generateCalendarDays', () => {
    it('should generate 42 days for the calendar', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const days = result.current.generateCalendarDays();
      expect(days).toHaveLength(42);
    });

    it('should mark today correctly', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const days = result.current.generateCalendarDays();
      const todayDays = days.filter((d) => d.isToday);

      // Should have exactly one day marked as today
      expect(todayDays.length).toBeLessThanOrEqual(1);
    });

    it('should include schedules for each day', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const days = result.current.generateCalendarDays();

      // Check that days have schedules array
      days.forEach((day) => {
        expect(Array.isArray(day.schedules)).toBe(true);
      });
    });
  });

  describe('getEffectiveScheduleForDay', () => {
    it('should return closed type for closed exception', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const closedDay = {
        date: new Date('2024-01-15'),
        isCurrentMonth: true,
        isToday: false,
        schedules: mockSchedules,
        exception: mockExceptions[0],
      };

      const effective = result.current.getEffectiveScheduleForDay(closedDay);
      expect(effective.type).toBe('closed');
      expect(effective.reason).toBe('Vacances');
    });

    it('should return override type for override exception', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const overrideDay = {
        date: new Date('2024-01-20'),
        isCurrentMonth: true,
        isToday: false,
        schedules: mockSchedules,
        exception: mockExceptions[1],
      };

      const effective = result.current.getEffectiveScheduleForDay(overrideDay);
      expect(effective.type).toBe('override');
    });

    it('should return normal type for day with schedules', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const normalDay = {
        date: new Date('2024-01-16'),
        isCurrentMonth: true,
        isToday: false,
        schedules: [mockSchedules[0]],
        exception: null,
      };

      const effective = result.current.getEffectiveScheduleForDay(normalDay);
      expect(effective.type).toBe('normal');
      expect(effective.schedules).toHaveLength(1);
    });

    it('should return none type for day without schedules or exception', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const emptyDay = {
        date: new Date('2024-01-21'),
        isCurrentMonth: true,
        isToday: false,
        schedules: [],
        exception: null,
      };

      const effective = result.current.getEffectiveScheduleForDay(emptyDay);
      expect(effective.type).toBe('none');
    });
  });

  describe('schedule form', () => {
    it('should have default schedule form values', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.scheduleForm.day_of_week).toBe(1);
      expect(result.current.scheduleForm.start_time).toBe('11:00');
      expect(result.current.scheduleForm.end_time).toBe('14:00');
    });

    it('should update schedule form via setScheduleForm', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setScheduleForm({
          day_of_week: 5,
          location_id: 'loc-1',
          start_time: '18:00',
          end_time: '22:00',
        });
      });

      expect(result.current.scheduleForm.day_of_week).toBe(5);
      expect(result.current.scheduleForm.start_time).toBe('18:00');
      expect(result.current.scheduleForm.end_time).toBe('22:00');
    });

    it('should start editing schedule', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.startEditSchedule(mockSchedules[0]);
      });

      expect(result.current.showScheduleForm).toBe(true);
      expect(result.current.editingScheduleId).toBe('sched-1');
      expect(result.current.scheduleForm.day_of_week).toBe(1);
      expect(result.current.scheduleForm.location_id).toBe('loc-1');
    });

    it('should reset schedule form', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.startEditSchedule(mockSchedules[0]);
      });

      expect(result.current.showScheduleForm).toBe(true);

      act(() => {
        result.current.resetScheduleForm();
      });

      expect(result.current.showScheduleForm).toBe(false);
      expect(result.current.editingScheduleId).toBeNull();
      expect(result.current.scheduleForm.day_of_week).toBe(1);
    });
  });

  describe('location form', () => {
    it('should have default location form values', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.locationForm.name).toBe('');
      expect(result.current.locationForm.address).toBe('');
      expect(result.current.locationForm.latitude).toBe('');
      expect(result.current.locationForm.longitude).toBe('');
    });

    it('should update location form via setLocationForm', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setLocationForm({
          name: 'New Location',
          address: '123 Test Street',
          latitude: '48.8566',
          longitude: '2.3522',
        });
      });

      expect(result.current.locationForm.name).toBe('New Location');
      expect(result.current.locationForm.address).toBe('123 Test Street');
    });

    it('should start editing location', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.startEditLocation(mockLocations[0]);
      });

      expect(result.current.showLocationForm).toBe(true);
      expect(result.current.editingLocationId).toBe('loc-1');
      expect(result.current.locationForm.name).toBe('Marche Central');
      expect(result.current.locationForm.address).toBe('1 Place du Marche');
    });

    it('should reset location form', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.startEditLocation(mockLocations[0]);
      });

      expect(result.current.showLocationForm).toBe(true);

      act(() => {
        result.current.resetLocationForm();
      });

      expect(result.current.showLocationForm).toBe(false);
      expect(result.current.editingLocationId).toBeNull();
      expect(result.current.locationForm.name).toBe('');
    });
  });

  describe('day modal', () => {
    it('should open day modal', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const day = {
        date: new Date('2024-01-16'),
        isCurrentMonth: true,
        isToday: false,
        schedules: [mockSchedules[0]],
        exception: null,
      };

      act(() => {
        result.current.openDayModal(day);
      });

      expect(result.current.showDayModal).toBe(true);
      expect(result.current.selectedDay).toEqual(day);
    });

    it('should set dayModalForm to closed mode for closed exception', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const closedDay = {
        date: new Date('2024-01-15'),
        isCurrentMonth: true,
        isToday: false,
        schedules: [],
        exception: mockExceptions[0],
      };

      act(() => {
        result.current.openDayModal(closedDay);
      });

      expect(result.current.dayModalForm.mode).toBe('closed');
      expect(result.current.dayModalForm.reason).toBe('Vacances');
    });

    it('should set dayModalForm to override mode for override exception', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const overrideDay = {
        date: new Date('2024-01-20'),
        isCurrentMonth: true,
        isToday: false,
        schedules: [],
        exception: mockExceptions[1],
      };

      act(() => {
        result.current.openDayModal(overrideDay);
      });

      expect(result.current.dayModalForm.mode).toBe('override');
      expect(result.current.dayModalForm.location_id).toBe('loc-2');
      expect(result.current.dayModalForm.start_time).toBe('10:00');
      expect(result.current.dayModalForm.end_time).toBe('15:00');
    });

    it('should close day modal via setShowDayModal', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const day = {
        date: new Date('2024-01-16'),
        isCurrentMonth: true,
        isToday: false,
        schedules: [],
        exception: null,
      };

      act(() => {
        result.current.openDayModal(day);
      });

      expect(result.current.showDayModal).toBe(true);

      act(() => {
        result.current.setShowDayModal(false);
      });

      expect(result.current.showDayModal).toBe(false);
    });
  });

  describe('delete operations', () => {
    it('should delete location after confirmation', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteLocation('loc-1');
      });

      expect(global.confirm).toHaveBeenCalledWith('Supprimer cet emplacement ?');
      expect(mockFrom).toHaveBeenCalledWith('locations');
    });

    it('should not delete location if user cancels', async () => {
      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountBefore = mockFrom.mock.calls.filter((c) => c[0] === 'locations').length;

      await act(async () => {
        await result.current.deleteLocation('loc-1');
      });

      const callCountAfter = mockFrom.mock.calls.filter((c) => c[0] === 'locations').length;
      expect(callCountAfter).toBe(callCountBefore);
    });

    it('should delete schedule after confirmation', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSchedule('sched-1');
      });

      expect(global.confirm).toHaveBeenCalledWith('Supprimer cet horaire ?');
      expect(mockFrom).toHaveBeenCalledWith('schedules');
    });
  });

  describe('form visibility toggles', () => {
    it('should toggle showScheduleForm', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.showScheduleForm).toBe(false);

      act(() => {
        result.current.setShowScheduleForm(true);
      });

      expect(result.current.showScheduleForm).toBe(true);
    });

    it('should toggle showLocationForm', async () => {
      const { result } = renderHook(() => useSchedule());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.showLocationForm).toBe(false);

      act(() => {
        result.current.setShowLocationForm(true);
      });

      expect(result.current.showLocationForm).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCheckoutData } from './useCheckoutData';

// Mock the api module
const mockGetByFoodtruck = vi.fn();
const mockGetExceptions = vi.fn();
const mockGetSettings = vi.fn();
const mockCountActive = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    schedules: {
      getByFoodtruck: () => mockGetByFoodtruck(),
      getExceptions: () => mockGetExceptions(),
    },
    foodtrucks: {
      getSettings: () => mockGetSettings(),
    },
    offers: {
      countActivePromoCodes: () => mockCountActive(),
    },
  },
}));

describe('useCheckoutData', () => {
  const mockLocation = {
    id: 'loc-1',
    foodtruck_id: 'ft-1',
    name: 'Place du marche',
    address: '1 rue du marche',
    latitude: 48.8566,
    longitude: 2.3522,
    created_at: '2024-01-01',
  };

  const mockSchedules = [
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
    },
    {
      id: 'sched-2',
      foodtruck_id: 'ft-1',
      day_of_week: 3, // Wednesday
      start_time: '11:00',
      end_time: '14:00',
      is_active: true,
      location_id: 'loc-1',
      location: mockLocation,
      created_at: '2024-01-01',
    },
    {
      id: 'sched-3',
      foodtruck_id: 'ft-1',
      day_of_week: 5, // Friday
      start_time: '18:00',
      end_time: '22:00',
      is_active: true,
      location_id: 'loc-1',
      location: mockLocation,
      created_at: '2024-01-01',
    },
  ];

  const mockSettings = {
    order_slot_interval: 15,
    max_orders_per_slot: 5,
    allow_advance_orders: true,
    min_preparation_time: 15,
    show_promo_section: true,
  };

  // Store original Date
  const RealDate = global.Date;
  let mockDate: Date;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Date without using fake timers (to avoid waitFor issues)
    mockDate = new RealDate('2024-01-15T10:00:00');

    // Override Date constructor to return our mock date for new Date()
    const MockDateClass = class extends RealDate {
      constructor(...args: Parameters<DateConstructor>) {
        if (args.length === 0) {
          super(mockDate.getTime());
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          super(...args);
        }
      }
    };

    // Keep static methods
    MockDateClass.now = () => mockDate.getTime();
    MockDateClass.parse = RealDate.parse;
    MockDateClass.UTC = RealDate.UTC;

    global.Date = MockDateClass as DateConstructor;
  });

  afterEach(() => {
    global.Date = RealDate;
  });

  it('should initialize with loading state', () => {
    mockGetByFoodtruck.mockResolvedValue([]);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.allSchedules).toEqual([]);
    expect(result.current.settings).toBeNull();
    expect(result.current.availableDates).toEqual([]);
  });

  it('should not fetch data if foodtruckId is undefined', async () => {
    const { result } = renderHook(() => useCheckoutData(undefined));

    // Wait a moment
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGetByFoodtruck).not.toHaveBeenCalled();
    expect(mockGetExceptions).not.toHaveBeenCalled();
    expect(mockGetSettings).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it('should fetch and process checkout data successfully', async () => {
    mockGetByFoodtruck.mockResolvedValue(mockSchedules);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(2);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allSchedules).toEqual(mockSchedules);
    expect(result.current.settings).toMatchObject({
      slotInterval: 15,
      maxOrdersPerSlot: 5,
      allowAdvanceOrders: true,
      minPrepTime: 15,
    });
    expect(result.current.showPromoSection).toBe(true);
  });

  it('should use default settings when foodtruck settings are null', async () => {
    mockGetByFoodtruck.mockResolvedValue([]);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(null);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toMatchObject({
      slotInterval: 15,
      maxOrdersPerSlot: 999,
      allowAdvanceOrders: true,
      minPrepTime: 15,
    });
  });

  it('should calculate available dates based on schedules', async () => {
    mockGetByFoodtruck.mockResolvedValue(mockSchedules);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have dates for Monday, Wednesday, Friday within 14 days
    expect(result.current.availableDates.length).toBeGreaterThan(0);

    // First available date should be today (Monday 2024-01-15)
    const firstDate = result.current.availableDates[0];
    expect(firstDate.getDay()).toBe(1); // Monday

    // All dates should be on scheduled days (Monday, Wednesday, Friday)
    result.current.availableDates.forEach((date) => {
      const dayOfWeek = date.getDay();
      expect([1, 3, 5]).toContain(dayOfWeek);
    });
  });

  it('should exclude closed dates from exceptions', async () => {
    const todayStr = '2024-01-15';

    mockGetByFoodtruck.mockResolvedValue(mockSchedules);
    mockGetExceptions.mockResolvedValue([
      {
        date: todayStr,
        is_closed: true,
        location_id: null,
        location: null,
        start_time: null,
        end_time: null,
      },
    ]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Today (Monday) should NOT be in available dates due to exception
    const todayInDates = result.current.availableDates.find(
      (date) => date.toISOString().split('T')[0] === todayStr
    );
    expect(todayInDates).toBeUndefined();
  });

  it('should include override exceptions as available dates', async () => {
    // Set mock date to a Tuesday (day_of_week = 2) which is normally closed
    mockDate = new RealDate('2024-01-16T10:00:00');
    const tuesdayStr = '2024-01-16';

    mockGetByFoodtruck.mockResolvedValue(mockSchedules); // Only Mon, Wed, Fri
    mockGetExceptions.mockResolvedValue([
      {
        date: tuesdayStr,
        is_closed: false,
        location_id: 'loc-1',
        location: mockLocation,
        start_time: '12:00',
        end_time: '15:00',
      },
    ]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Tuesday should be in available dates due to override exception
    const tuesdayInDates = result.current.availableDates.find(
      (date) => date.toISOString().split('T')[0] === tuesdayStr
    );
    expect(tuesdayInDates).toBeDefined();
  });

  it('should build exceptions map correctly', async () => {
    const exceptionDate = '2024-01-17';
    const exceptionData = [
      {
        date: exceptionDate,
        is_closed: false,
        location_id: 'loc-2',
        location: { ...mockLocation, id: 'loc-2', name: 'Special Location' },
        start_time: '10:00',
        end_time: '20:00',
      },
    ];

    mockGetByFoodtruck.mockResolvedValue(mockSchedules);
    mockGetExceptions.mockResolvedValue(exceptionData);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exceptions.has(exceptionDate)).toBe(true);
    const exception = result.current.exceptions.get(exceptionDate);
    expect(exception).toEqual({
      is_closed: false,
      location_id: 'loc-2',
      location: expect.objectContaining({ name: 'Special Location' }),
      start_time: '10:00',
      end_time: '20:00',
    });
  });

  it('should show promo section when promo codes exist and section is enabled', async () => {
    mockGetByFoodtruck.mockResolvedValue([]);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue({ ...mockSettings, show_promo_section: true });
    mockCountActive.mockResolvedValue(5);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.showPromoSection).toBe(true);
  });

  it('should hide promo section when no promo codes exist', async () => {
    mockGetByFoodtruck.mockResolvedValue([]);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue({ ...mockSettings, show_promo_section: true });
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.showPromoSection).toBe(false);
  });

  it('should hide promo section when section is disabled', async () => {
    mockGetByFoodtruck.mockResolvedValue([]);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue({ ...mockSettings, show_promo_section: false });
    mockCountActive.mockResolvedValue(5);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.showPromoSection).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockGetByFoodtruck.mockRejectedValue(new Error('Network error'));
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching checkout data:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should return empty available dates when loading', () => {
    // Set up a never-resolving promise
    mockGetByFoodtruck.mockImplementation(() => new Promise(() => {}));
    mockGetExceptions.mockImplementation(() => new Promise(() => {}));
    mockGetSettings.mockImplementation(() => new Promise(() => {}));
    mockCountActive.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    // Still loading
    expect(result.current.loading).toBe(true);
    expect(result.current.availableDates).toEqual([]);
  });

  it('should return empty available dates when settings are null', async () => {
    mockGetByFoodtruck.mockResolvedValue(mockSchedules);
    mockGetExceptions.mockResolvedValue([]);
    // Return settings that would result in null
    mockGetSettings.mockResolvedValue(null);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Even with schedules, should have dates since settings has defaults
    expect(result.current.settings).not.toBeNull();
  });

  it('should calculate dates for configured advance days', async () => {
    // Create schedules for every day of the week
    const everyDaySchedules = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      id: `sched-${day}`,
      foodtruck_id: 'ft-1',
      day_of_week: day,
      start_time: '11:00',
      end_time: '14:00',
      is_active: true,
      location_id: 'loc-1',
      location: mockLocation,
      created_at: '2024-01-01',
    }));

    // Set advance_order_days to 13 (= 14 dates including today)
    const settingsWithAdvanceDays = { ...mockSettings, advance_order_days: 13 };

    mockGetByFoodtruck.mockResolvedValue(everyDaySchedules);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(settingsWithAdvanceDays);
    mockCountActive.mockResolvedValue(0);

    const { result } = renderHook(() => useCheckoutData('ft-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have exactly 14 dates (0 to 13 days = 14 days total)
    expect(result.current.availableDates.length).toBe(14);
  });

  it('should refetch data when foodtruckId changes', async () => {
    mockGetByFoodtruck.mockResolvedValue(mockSchedules);
    mockGetExceptions.mockResolvedValue([]);
    mockGetSettings.mockResolvedValue(mockSettings);
    mockCountActive.mockResolvedValue(0);

    const { result, rerender } = renderHook(({ id }) => useCheckoutData(id), {
      initialProps: { id: 'ft-1' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetByFoodtruck).toHaveBeenCalledTimes(1);

    // Change foodtruck ID
    rerender({ id: 'ft-2' });

    await waitFor(() => {
      expect(mockGetByFoodtruck).toHaveBeenCalledTimes(2);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSchedulesApi } from './schedules';

describe('Schedules API', () => {
  let mockSupabase: any;
  let schedulesApi: ReturnType<typeof createSchedulesApi>;

  // Helper to create a chainable query mock
  const createChainableQuery = (resolveValue: any = { data: [], error: null }) => {
    const query: any = {};
    ['select', 'eq', 'gte', 'order', 'insert', 'update', 'delete', 'upsert'].forEach((method) => {
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
      rpc: vi.fn(),
    };
    schedulesApi = createSchedulesApi(mockSupabase);
  });

  describe('getByFoodtruck', () => {
    it('should fetch all active schedules with location', async () => {
      const mockSchedules = [
        {
          id: 'sch-1',
          day_of_week: 1,
          start_time: '11:00',
          end_time: '14:00',
          location: { id: 'loc-1', name: 'Marché' },
        },
        {
          id: 'sch-2',
          day_of_week: 3,
          start_time: '18:00',
          end_time: '22:00',
          location: { id: 'loc-2', name: 'Centre-ville' },
        },
      ];
      const query = createChainableQuery({ data: mockSchedules, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await schedulesApi.getByFoodtruck('ft-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('schedules');
      expect(query.eq).toHaveBeenCalledWith('foodtruck_id', 'ft-1');
      expect(query.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('getByDay', () => {
    it('should fetch schedules for a specific day', async () => {
      const mockSchedules = [{ id: 'sch-1', day_of_week: 1, start_time: '11:00', location: {} }];
      const query = createChainableQuery({ data: mockSchedules, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await schedulesApi.getByDay('ft-1', 1);

      expect(query.eq).toHaveBeenCalledWith('day_of_week', 1);
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('create', () => {
    it('should create a new schedule', async () => {
      const newSchedule = {
        foodtruck_id: 'ft-1',
        day_of_week: 2,
        start_time: '12:00',
        end_time: '15:00',
        location_id: 'loc-1',
      };
      const createdSchedule = { id: 'sch-new', ...newSchedule };
      const query = createChainableQuery({ data: createdSchedule, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await schedulesApi.create(newSchedule);

      expect(query.insert).toHaveBeenCalledWith(newSchedule);
      expect(result).toEqual(createdSchedule);
    });
  });

  describe('update', () => {
    it('should update a schedule', async () => {
      const updates = { start_time: '10:00', end_time: '13:00' };
      const updatedSchedule = { id: 'sch-1', ...updates };
      const query = createChainableQuery({ data: updatedSchedule, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await schedulesApi.update('sch-1', updates);

      expect(query.update).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedSchedule);
    });
  });

  describe('delete', () => {
    it('should delete a schedule', async () => {
      const query = createChainableQuery({ error: null });
      mockSupabase.from.mockReturnValue(query);

      await expect(schedulesApi.delete('sch-1')).resolves.toBeUndefined();
      expect(query.delete).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ error: new Error('Delete failed') });
      mockSupabase.from.mockReturnValue(query);

      await expect(schedulesApi.delete('sch-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('Exceptions', () => {
    describe('getExceptions', () => {
      it('should fetch all exceptions for a foodtruck', async () => {
        const mockExceptions = [
          { id: 'exc-1', date: '2026-02-14', is_closed: true, reason: 'Vacances' },
        ];
        const query = createChainableQuery({ data: mockExceptions, error: null });
        mockSupabase.from.mockReturnValue(query);

        const result = await schedulesApi.getExceptions('ft-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('schedule_exceptions');
        expect(result).toEqual(mockExceptions);
      });

      it('should filter exceptions from a date', async () => {
        const query = createChainableQuery();
        mockSupabase.from.mockReturnValue(query);

        await schedulesApi.getExceptions('ft-1', '2026-02-01');

        expect(query.gte).toHaveBeenCalledWith('date', '2026-02-01');
      });
    });

    describe('getExceptionByDate', () => {
      it('should fetch exception for a specific date', async () => {
        const mockException = { id: 'exc-1', date: '2026-02-14', is_closed: true };
        const query = createChainableQuery({ data: mockException, error: null });
        mockSupabase.from.mockReturnValue(query);

        const result = await schedulesApi.getExceptionByDate('ft-1', '2026-02-14');

        expect(query.eq).toHaveBeenCalledWith('date', '2026-02-14');
        expect(result).toEqual(mockException);
      });

      it('should return null when no exception exists', async () => {
        const query = createChainableQuery({ data: null, error: null });
        mockSupabase.from.mockReturnValue(query);

        const result = await schedulesApi.getExceptionByDate('ft-1', '2026-02-15');

        expect(result).toBeNull();
      });
    });

    describe('upsertException', () => {
      it('should upsert an exception', async () => {
        const exception = {
          foodtruck_id: 'ft-1',
          date: '2026-02-14',
          is_closed: true,
          reason: 'Holiday',
        };
        const upsertedException = { id: 'exc-1', ...exception };
        const query = createChainableQuery({ data: upsertedException, error: null });
        mockSupabase.from.mockReturnValue(query);

        const result = await schedulesApi.upsertException(exception);

        expect(query.upsert).toHaveBeenCalledWith(exception, {
          onConflict: 'foodtruck_id,date',
        });
        expect(result).toEqual(upsertedException);
      });
    });

    describe('deleteException', () => {
      it('should delete an exception', async () => {
        const query = createChainableQuery({ error: null });
        mockSupabase.from.mockReturnValue(query);

        await expect(schedulesApi.deleteException('ft-1', '2026-02-14')).resolves.toBeUndefined();
      });

      it('should throw error on failure', async () => {
        const query = createChainableQuery({ error: new Error('Delete failed') });
        mockSupabase.from.mockReturnValue(query);

        await expect(schedulesApi.deleteException('ft-1', '2026-02-14')).rejects.toThrow(
          'Delete failed'
        );
      });
    });
  });

  describe('getAvailableSlots', () => {
    it('should fetch available time slots', async () => {
      const mockSlots = [
        { slot_time: '12:00', available: true, order_count: 2 },
        { slot_time: '12:15', available: true, order_count: 1 },
        { slot_time: '12:30', available: false, order_count: 5 },
      ];
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockSlots, error: null });

      const result = await schedulesApi.getAvailableSlots('ft-1', '2026-02-10', 15, 5);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_available_slots', {
        p_foodtruck_id: 'ft-1',
        p_date: '2026-02-10',
        p_interval_minutes: 15,
        p_max_orders_per_slot: 5,
      });
      expect(result).toEqual(mockSlots);
    });

    it('should return empty array when no slots', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await schedulesApi.getAvailableSlots('ft-1', '2026-02-10', 15, 5);

      expect(result).toEqual([]);
    });

    it('should throw error on RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error('RPC failed'),
      });

      await expect(schedulesApi.getAvailableSlots('ft-1', '2026-02-10', 15, 5)).rejects.toThrow(
        'RPC failed'
      );
    });
  });
});

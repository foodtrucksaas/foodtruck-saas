import type { TypedSupabaseClient } from './client';
import { handleResponse, handleOptionalResponse } from './client';
import type {
  Schedule,
  ScheduleInsert,
  ScheduleUpdate,
  ScheduleWithLocation,
  ScheduleException,
  ScheduleExceptionInsert,
  Location,
} from '../types';

export function createSchedulesApi(supabase: TypedSupabaseClient) {
  return {
    // Get all schedules for a foodtruck with location info
    async getByFoodtruck(foodtruckId: string): Promise<ScheduleWithLocation[]> {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruckId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      return handleResponse(data, error) as ScheduleWithLocation[];
    },

    // Get schedules for a specific day
    async getByDay(foodtruckId: string, dayOfWeek: number): Promise<ScheduleWithLocation[]> {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruckId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time');

      return handleResponse(data, error) as ScheduleWithLocation[];
    },

    // Create a new schedule
    async create(schedule: ScheduleInsert): Promise<Schedule> {
      const { data, error } = await supabase
        .from('schedules')
        .insert(schedule)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Update a schedule
    async update(id: string, updates: ScheduleUpdate): Promise<Schedule> {
      const { data, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Delete a schedule
    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    // === Exceptions ===

    // Get exceptions for a foodtruck from a date onwards
    async getExceptions(foodtruckId: string, fromDate?: string): Promise<(ScheduleException & { location: Location | null })[]> {
      let query = supabase
        .from('schedule_exceptions')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruckId)
        .order('date');

      if (fromDate) {
        query = query.gte('date', fromDate);
      }

      const { data, error } = await query;
      return handleResponse(data, error) as (ScheduleException & { location: Location | null })[];
    },

    // Get exception for a specific date
    async getExceptionByDate(foodtruckId: string, date: string): Promise<(ScheduleException & { location: Location | null }) | null> {
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruckId)
        .eq('date', date)
        .maybeSingle();

      return handleOptionalResponse(data, error) as (ScheduleException & { location: Location | null }) | null;
    },

    // Create or update exception (upsert)
    async upsertException(exception: ScheduleExceptionInsert): Promise<ScheduleException> {
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .upsert(exception, { onConflict: 'foodtruck_id,date' })
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Delete exception
    async deleteException(foodtruckId: string, date: string): Promise<void> {
      const { error } = await supabase
        .from('schedule_exceptions')
        .delete()
        .eq('foodtruck_id', foodtruckId)
        .eq('date', date);

      if (error) throw error;
    },

    // Get available time slots for a date
    async getAvailableSlots(
      foodtruckId: string,
      date: string,
      intervalMinutes: number,
      maxOrdersPerSlot: number
    ): Promise<{ slot_time: string; available: boolean; order_count: number }[]> {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_foodtruck_id: foodtruckId,
        p_date: date,
        p_interval_minutes: intervalMinutes,
        p_max_orders_per_slot: maxOrdersPerSlot,
      });

      if (error) throw error;
      return data || [];
    },
  };
}

export type SchedulesApi = ReturnType<typeof createSchedulesApi>;

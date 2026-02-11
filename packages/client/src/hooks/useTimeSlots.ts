import { useState, useEffect } from 'react';
import { formatLocalDate } from '@foodtruck/shared';
import { api } from '../lib/api';
import type { ScheduleWithLocation, ScheduleException, FoodtruckSettings } from './useCheckoutData';

export interface SlotWithLocation {
  time: string;
  available: boolean;
  orderCount: number;
  scheduleId: string;
  locationName: string;
  locationId: string;
}

interface UseTimeSlotsResult {
  slots: SlotWithLocation[];
  schedules: ScheduleWithLocation[];
  loading: boolean;
  notOpenYet: { openTime: string } | null;
  isCurrentlyOpen: boolean;
}

export function useTimeSlots(
  foodtruckId: string | undefined,
  selectedDate: Date,
  allSchedules: ScheduleWithLocation[],
  exceptions: Map<string, ScheduleException>,
  settings: FoodtruckSettings | null
): UseTimeSlotsResult {
  const [slots, setSlots] = useState<SlotWithLocation[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [notOpenYet, setNotOpenYet] = useState<{ openTime: string } | null>(null);
  const [isCurrentlyOpen, setIsCurrentlyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function generateSlotsForDate() {
      if (!foodtruckId || !settings) return;

      setLoading(true);

      const dayOfWeek = selectedDate.getDay();
      const dateStr = formatLocalDate(selectedDate);

      // Check if there's an exception for this date
      const exception = exceptions.get(dateStr);

      // Determine schedules for this day
      let daySchedules: ScheduleWithLocation[];

      if (exception) {
        if (exception.is_closed) {
          setSchedules([]);
          setSlots([]);
          setNotOpenYet(null);
          setLoading(false);
          return;
        }

        // Override exception - create virtual schedule from exception data
        if (exception.location && exception.start_time && exception.end_time) {
          daySchedules = [
            {
              id: `exception-${dateStr}`,
              foodtruck_id: foodtruckId,
              day_of_week: dayOfWeek,
              start_time: exception.start_time,
              end_time: exception.end_time,
              is_active: true,
              location_id: exception.location_id || '',
              location: exception.location,
              created_at: new Date().toISOString(),
            } as ScheduleWithLocation,
          ];
        } else {
          daySchedules = allSchedules.filter((s) => s.day_of_week === dayOfWeek);
        }
      } else {
        daySchedules = allSchedules.filter((s) => s.day_of_week === dayOfWeek);
      }

      setSchedules(daySchedules);

      if (daySchedules.length === 0) {
        setSlots([]);
        setNotOpenYet(null);
        setLoading(false);
        return;
      }

      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

      // Check if foodtruck is currently open (current time within any schedule's hours)
      if (isToday) {
        const currentlyOpen = daySchedules.some((sched) => {
          const [startH, startM] = sched.start_time.split(':').map(Number);
          const [endH, endM] = sched.end_time.split(':').map(Number);
          return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM;
        });
        setIsCurrentlyOpen(currentlyOpen);
      } else {
        setIsCurrentlyOpen(false);
      }

      // Check if advance orders are allowed
      if (isToday && !settings.allowAdvanceOrders) {
        let anyOpenOrFuture = false;
        let earliestOpenTime = '';

        for (const sched of daySchedules) {
          const [endH, endM] = sched.end_time.split(':').map(Number);
          const closeMinutes = endH * 60 + endM;

          if (currentMinutes < closeMinutes) {
            anyOpenOrFuture = true;
            if (!earliestOpenTime || sched.start_time < earliestOpenTime) {
              earliestOpenTime = sched.start_time;
            }
          }
        }

        if (!anyOpenOrFuture) {
          setSlots([]);
          setNotOpenYet({ openTime: earliestOpenTime.substring(0, 5) });
          setLoading(false);
          return;
        }
      }
      setNotOpenYet(null);

      // Fetch slot availability from API
      const slotsData = await api.schedules.getAvailableSlots(
        foodtruckId,
        dateStr,
        settings.slotInterval,
        settings.maxOrdersPerSlot
      );

      if (cancelled) return;

      // Calculate buffer for prep time
      const marginByPrepTime: Record<number, number> = { 5: 0, 10: 2, 15: 3 };
      const margin = marginByPrepTime[settings.minPrepTime] ?? 0;
      const bufferMinutes = isToday ? currentMinutes + settings.minPrepTime - margin : 0;

      // Create slot availability map
      const slotAvailabilityMap = new Map<string, { available: boolean; orderCount: number }>();
      (slotsData || []).forEach((s) => {
        const timeStr = s.slot_time.substring(0, 5);
        slotAvailabilityMap.set(timeStr, { available: s.available, orderCount: s.order_count });
      });

      // Generate slots for each schedule
      const allSlots: SlotWithLocation[] = [];

      for (const sched of daySchedules) {
        const [startH, startM] = sched.start_time.split(':').map(Number);
        const [endH, endM] = sched.end_time.split(':').map(Number);
        const openMinutes = startH * 60 + startM;
        const closeMinutes = endH * 60 + endM;

        for (let mins = openMinutes; mins < closeMinutes; mins += settings.slotInterval) {
          if (isToday && mins < bufferMinutes) continue;

          const h = Math.floor(mins / 60);
          const m = mins % 60;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

          const slotInfo = slotAvailabilityMap.get(timeStr) || { available: true, orderCount: 0 };

          allSlots.push({
            time: timeStr,
            available: slotInfo.available,
            orderCount: slotInfo.orderCount,
            scheduleId: sched.id,
            locationName: sched.location?.name || 'Emplacement inconnu',
            locationId: sched.location?.id || '',
          });
        }
      }

      allSlots.sort((a, b) => a.time.localeCompare(b.time));
      setSlots(allSlots);
      setLoading(false);
    }

    generateSlotsForDate();
    return () => {
      cancelled = true;
    };
  }, [foodtruckId, settings, allSchedules, selectedDate, exceptions]);

  return { slots, schedules, loading, notOpenYet, isCurrentlyOpen };
}

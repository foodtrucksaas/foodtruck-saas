import { useState, useEffect, useMemo } from 'react';
import type { Schedule, Location } from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { api } from '../lib/api';

export interface ScheduleWithLocation extends Schedule {
  location: Location;
}

export interface ScheduleException {
  is_closed: boolean;
  location_id?: string | null;
  location?: Location | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface FoodtruckSettings {
  slotInterval: number;
  maxOrdersPerSlot: number;
  allowAdvanceOrders: boolean;
  advanceOrderDays: number;
  allowAsapOrders: boolean;
  minPrepTime: number;
  offersStackable: boolean;
  promoCodesStackable: boolean;
  loyaltyEnabled: boolean;
}

interface UseCheckoutDataResult {
  loading: boolean;
  error: string | null;
  allSchedules: ScheduleWithLocation[];
  exceptions: Map<string, ScheduleException>;
  settings: FoodtruckSettings | null;
  availableDates: Date[];
  showPromoSection: boolean;
}

export function useCheckoutData(foodtruckId: string | undefined): UseCheckoutDataResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSchedules, setAllSchedules] = useState<ScheduleWithLocation[]>([]);
  const [exceptions, setExceptions] = useState<Map<string, ScheduleException>>(new Map());
  const [settings, setSettings] = useState<FoodtruckSettings | null>(null);
  const [showPromoSection, setShowPromoSection] = useState(false);

  useEffect(() => {
    async function fetchInitialData() {
      if (!foodtruckId) return;

      setError(null);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = formatLocalDate(today);

      try {
        const [schedulesData, exceptionsData, foodtruckSettings, promoCount] = await Promise.all([
          api.schedules.getByFoodtruck(foodtruckId),
          api.schedules.getExceptions(foodtruckId, todayStr),
          api.foodtrucks.getSettings(foodtruckId),
          api.offers.countActivePromoCodes(foodtruckId),
        ]);

        const settingsData: FoodtruckSettings = {
          slotInterval: foodtruckSettings?.order_slot_interval ?? 15,
          maxOrdersPerSlot: foodtruckSettings?.max_orders_per_slot ?? 999,
          allowAdvanceOrders: foodtruckSettings?.allow_advance_orders !== false,
          advanceOrderDays: foodtruckSettings?.advance_order_days ?? 7,
          allowAsapOrders: foodtruckSettings?.allow_asap_orders ?? false,
          minPrepTime: foodtruckSettings?.min_preparation_time ?? 15,
          offersStackable: foodtruckSettings?.offers_stackable ?? false,
          promoCodesStackable: foodtruckSettings?.promo_codes_stackable !== false,
          loyaltyEnabled: foodtruckSettings?.loyalty_enabled ?? false,
        };
        setSettings(settingsData);

        setAllSchedules(schedulesData as ScheduleWithLocation[]);

        // Build exceptions map
        const exceptionsMap = new Map<string, ScheduleException>();
        (exceptionsData || []).forEach((exc) => {
          exceptionsMap.set(exc.date, {
            is_closed: exc.is_closed ?? false,
            location_id: exc.location_id,
            location: exc.location,
            start_time: exc.start_time,
            end_time: exc.end_time,
          });
        });
        setExceptions(exceptionsMap);

        // Check if promo section should be shown
        const hasPromoCodes = promoCount > 0;
        const isPromoSectionEnabled = foodtruckSettings?.show_promo_section !== false;
        setShowPromoSection(hasPromoCodes && isPromoSectionEnabled);
      } catch (err) {
        console.error('Erreur lors du chargement des donnees:', err);
        setError('Impossible de charger les informations. Veuillez reessayer.');
      }

      setLoading(false);
    }

    fetchInitialData();
  }, [foodtruckId]);

  // Calculate available dates
  const availableDates = useMemo(() => {
    if (loading || !settings) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Use merchant's advance order days setting, default to 7 if not set
    const maxAdvanceDays = settings.advanceOrderDays || 7;
    const dates: Date[] = [];

    for (let i = 0; i < maxAdvanceDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = formatLocalDate(date);
      const dayOfWeek = date.getDay();

      const exception = exceptions.get(dateStr);
      if (exception) {
        if (exception.is_closed) continue;
        dates.push(date);
      } else {
        const hasSchedule = allSchedules.some((s) => s.day_of_week === dayOfWeek);
        if (hasSchedule) {
          dates.push(date);
        }
      }
    }

    return dates;
  }, [loading, settings, allSchedules, exceptions]);

  return {
    loading,
    error,
    allSchedules,
    exceptions,
    settings,
    availableDates,
    showPromoSection,
  };
}

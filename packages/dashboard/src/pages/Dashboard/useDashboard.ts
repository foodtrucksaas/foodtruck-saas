import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { useOrderNotification } from '../../contexts/OrderNotificationContext';
import { formatLocalDate } from '@foodtruck/shared';
import type { DashboardStats } from '@foodtruck/shared';

// --- Types ---

export type TodayStatus =
  | { type: 'open'; locationName: string; startTime: string; endTime: string }
  | { type: 'closed'; reason: string | null }
  | { type: 'no_service' };

export interface UpcomingOrder {
  id: string;
  status: string;
  pickup_time: string;
  total_amount: number;
  customer_name: string | null;
  order_items: { id: string }[];
}

// --- Hook ---

export function useDashboard() {
  const { foodtruck, menuItems } = useFoodtruck();
  const { refreshTrigger } = useOrderNotification();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({ type: 'no_service' });
  const [upcomingOrders, setUpcomingOrders] = useState<UpcomingOrder[]>([]);
  const [activeOffersCount, setActiveOffersCount] = useState(0);
  const [weekOrderCount, setWeekOrderCount] = useState(0);
  const [weekOrderAmount, setWeekOrderAmount] = useState(0);

  // Derived: out-of-stock items from context (no query needed)
  const outOfStockItems = useMemo(
    () => menuItems.filter((item) => item.is_available === false),
    [menuItems]
  );

  // --- Stable data (fetched once on mount) ---

  const fetchStableData = useCallback(async () => {
    if (!foodtruck) return;

    const today = new Date();
    const todayStr = formatLocalDate(today);
    const dayOfWeek = today.getDay(); // 0=Sunday

    // Monday of current week
    const monday = new Date(today);
    const dow = today.getDay();
    monday.setDate(today.getDate() - dow + (dow === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = formatLocalDate(monday);

    const [schedulesRes, exceptionRes, offersRes, weekRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruck.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time')
        .limit(1),
      supabase
        .from('schedule_exceptions')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruck.id)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruck.id)
        .eq('is_active', true),
      supabase
        .from('orders')
        .select('total_amount')
        .eq('foodtruck_id', foodtruck.id)
        .gte('pickup_time', `${mondayStr}T00:00:00`)
        .neq('status', 'cancelled'),
    ]);

    // Today's schedule
    const exception = exceptionRes.data as {
      is_closed: boolean | null;
      reason: string | null;
      start_time: string | null;
      end_time: string | null;
      location: { name: string } | null;
    } | null;
    const schedules = (schedulesRes.data || []) as {
      start_time: string;
      end_time: string;
      location: { name: string };
    }[];

    if (exception) {
      if (exception.is_closed) {
        setTodayStatus({ type: 'closed', reason: exception.reason });
      } else {
        setTodayStatus({
          type: 'open',
          locationName: exception.location?.name ?? '',
          startTime: exception.start_time ?? '',
          endTime: exception.end_time ?? '',
        });
      }
    } else if (schedules.length > 0) {
      const s = schedules[0];
      setTodayStatus({
        type: 'open',
        locationName: s.location.name,
        startTime: s.start_time,
        endTime: s.end_time,
      });
    } else {
      setTodayStatus({ type: 'no_service' });
    }

    // Active offers
    setActiveOffersCount(offersRes.count ?? 0);

    // Week stats
    const weekOrders = weekRes.data || [];
    setWeekOrderCount(weekOrders.length);
    setWeekOrderAmount(weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0));
  }, [foodtruck]);

  // --- Volatile data (polled every 30s + refreshTrigger) ---

  const fetchVolatileData = useCallback(async () => {
    if (!foodtruck) return;

    const today = new Date();
    const todayStr = formatLocalDate(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);

    const [statsRes, ordersRes] = await Promise.all([
      supabase.rpc('get_dashboard_stats', { p_foodtruck_id: foodtruck.id }),
      supabase
        .from('orders')
        .select('id, status, pickup_time, total_amount, customer_name, order_items(id)')
        .eq('foodtruck_id', foodtruck.id)
        .gte('pickup_time', `${todayStr}T00:00:00`)
        .lt('pickup_time', `${tomorrowStr}T00:00:00`)
        .not('status', 'in', '("cancelled","picked_up")')
        .order('pickup_time', { ascending: true })
        .limit(5),
    ]);

    setStats(statsRes.data as unknown as DashboardStats | null);
    setUpcomingOrders((ordersRes.data || []) as UpcomingOrder[]);
    setLoading(false);
  }, [foodtruck]);

  // Initial fetch: stable + volatile
  useEffect(() => {
    if (!foodtruck) return;
    fetchStableData();
    fetchVolatileData();
    const interval = setInterval(fetchVolatileData, 30000);
    return () => clearInterval(interval);
  }, [foodtruck, fetchStableData, fetchVolatileData]);

  // Refresh on order changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchVolatileData();
    }
  }, [refreshTrigger, fetchVolatileData]);

  return {
    loading,
    stats,
    todayStatus,
    upcomingOrders,
    outOfStockItems,
    activeOffersCount,
    weekOrderCount,
    weekOrderAmount,
  };
}

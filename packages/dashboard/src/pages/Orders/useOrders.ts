import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { useOrderNotification } from '../../contexts/OrderNotificationContext';

// Get the "business day" - after 2am show today, before 2am show yesterday
function getBusinessDate(): Date {
  const now = new Date();
  const hour = now.getHours();
  // Between midnight and 2am, consider it as "yesterday's" business day
  if (hour < 2) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  return now;
}

export function useOrders() {
  const { foodtruck } = useFoodtruck();
  const {
    soundEnabled,
    setSoundEnabled,
    acceptOrder: contextAcceptOrder,
    refreshTrigger,
  } = useOrderNotification();
  const [orders, setOrders] = useState<OrderWithItemsAndOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItemsAndOptions | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(getBusinessDate());
  const nowRef = useRef<HTMLDivElement>(null);

  const slotInterval = foodtruck?.order_slot_interval ?? 15;

  // Check if viewing today (business day) or future
  const isToday = useMemo(() => {
    const businessDay = getBusinessDate();
    return selectedDate.toDateString() === businessDay.toDateString();
  }, [selectedDate]);

  const isFuture = useMemo(() => {
    const businessDay = getBusinessDate();
    businessDay.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected > businessDay;
  }, [selectedDate]);

  // Fetch orders for the selected date
  const fetchOrders = useCallback(async () => {
    if (!foodtruck) return;
    const dateStr = formatLocalDate(selectedDate);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = formatLocalDate(nextDay);

    // Optimized select: only fetch needed fields for the orders list view
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id, status, pickup_time, total_amount, discount_amount, notes,
        customer_email, customer_name, customer_phone, created_at,
        cancellation_reason, cancelled_by,
        order_items (
          id, quantity, unit_price, notes,
          menu_item:menu_items (id, name, price),
          order_item_options (id, option_name, option_group_name, price_modifier)
        )
      `
      )
      .eq('foodtruck_id', foodtruck.id)
      .gte('pickup_time', `${dateStr}T00:00:00`)
      .lt('pickup_time', `${nextDayStr}T00:00:00`)
      .order('pickup_time', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    if (data) setOrders(data as unknown as OrderWithItemsAndOptions[]);
    setLoading(false);
  }, [foodtruck, selectedDate]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Refresh when orders are accepted/cancelled from popup
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchOrders();
    }
  }, [refreshTrigger, fetchOrders]);

  // Polling to refresh orders list (30s fallback - realtime is primary)
  useEffect(() => {
    if (!foodtruck?.id) return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [foodtruck?.id, fetchOrders]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to now indicator on load
  useEffect(() => {
    if (!loading && nowRef.current) {
      nowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading]);

  // Accept order
  const acceptOrder = useCallback(
    async (id: string) => {
      await contextAcceptOrder(id);
      fetchOrders();
    },
    [contextAcceptOrder, fetchOrders]
  );

  // Cancel order with reason (required)
  const cancelOrderWithReason = useCallback(
    async (id: string, reason: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_by: 'merchant',
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error cancelling order:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('Cancel order failed: no data returned (test mode?)');
        return;
      }

      await fetchOrders();
    },
    [fetchOrders]
  );

  // Mark order as ready
  const markReady = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error marking order as ready:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('Mark ready failed: no data returned (test mode?)');
        return;
      }

      await fetchOrders();
    },
    [fetchOrders]
  );

  // Mark order as picked up
  const markPickedUp = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'picked_up' })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error marking order as picked up:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('Mark picked up failed: no data returned (test mode?)');
        return;
      }

      await fetchOrders();
    },
    [fetchOrders]
  );

  // Update pickup time
  const updatePickupTime = useCallback(
    async (id: string, currentPickupTime: string, newTime: string) => {
      const currentDate = new Date(currentPickupTime);
      const [hours, minutes] = newTime.split(':').map(Number);
      currentDate.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .update({ pickup_time: currentDate.toISOString() })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating pickup time:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('Update pickup time failed: no data returned (test mode?)');
        return;
      }

      await fetchOrders();
    },
    [fetchOrders]
  );

  // Group orders by time slots
  const groupedOrders = useMemo(() => {
    const grouped: { slot: string; orders: OrderWithItemsAndOptions[] }[] = [];
    const map: Record<string, OrderWithItemsAndOptions[]> = {};

    orders.forEach((o) => {
      const pickupDate = new Date(o.pickup_time);
      const hour = pickupDate.getHours().toString().padStart(2, '0');
      const minute = pickupDate.getMinutes();
      const slot = Math.floor(minute / slotInterval) * slotInterval;
      const slotKey = `${hour}:${slot.toString().padStart(2, '0')}`;
      if (!map[slotKey]) map[slotKey] = [];
      map[slotKey].push(o);
    });

    Object.keys(map)
      .sort()
      .forEach((slot) => {
        grouped.push({ slot, orders: map[slot] });
      });

    return grouped;
  }, [orders, slotInterval]);

  // Current time slot
  const currentSlotStr = useMemo(() => {
    const h = currentTime.getHours().toString().padStart(2, '0');
    const m = Math.floor(currentTime.getMinutes() / slotInterval) * slotInterval;
    return `${h}:${m.toString().padStart(2, '0')}`;
  }, [currentTime, slotInterval]);

  // Setting for ready status
  const useReadyStatus = foodtruck?.use_ready_status || false;

  // Stats - separate ready count when useReadyStatus is enabled
  const pending = orders.filter((o) => o.status === 'pending').length;
  const confirmed = useReadyStatus
    ? orders.filter((o) => o.status === 'confirmed').length
    : orders.filter((o) => o.status === 'confirmed' || o.status === 'ready').length;
  const ready = orders.filter((o) => o.status === 'ready').length;
  const pickedUp = orders.filter(
    (o) => o.status === 'picked_up' || o.status === 'cancelled' || o.status === 'no_show'
  ).length;

  // Date navigation
  const goToPreviousDay = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(getBusinessDate());
  }, []);

  const setDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  return {
    // State
    orders,
    loading,
    selectedOrder,
    setSelectedOrder,
    groupedOrders,
    currentSlotStr,
    slotInterval,
    nowRef,
    pending,
    confirmed,
    ready,
    pickedUp,
    useReadyStatus,

    // Date navigation
    selectedDate,
    isToday,
    isFuture,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setDate,

    // Sound
    soundEnabled,
    setSoundEnabled,

    // Actions
    acceptOrder,
    cancelOrderWithReason,
    markReady,
    markPickedUp,
    updatePickupTime,
  };
}

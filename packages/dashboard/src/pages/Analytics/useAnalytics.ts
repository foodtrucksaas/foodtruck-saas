import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import type { AnalyticsData } from '@foodtruck/shared';
import {
  DAY_NAMES,
  formatLocalDate,
  safeNumber,
  calculatePercentageChange,
} from '@foodtruck/shared';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'last7days', label: '7 derniers jours' },
  { key: 'last30days', label: '30 derniers jours' },
  { key: 'thisMonth', label: 'Ce mois' },
  { key: 'lastMonth', label: 'Mois dernier' },
  { key: 'custom', label: 'Personnalisé' },
];

function getDateRangeFromPreset(preset: DatePreset): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: today };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end };
    }
    default:
      return { start: today, end: today };
  }
}

export function formatDateForInput(date: Date): string {
  return formatLocalDate(date);
}

function formatDateDisplay(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function useAnalytics() {
  const { foodtruck } = useFoodtruck();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DatePreset>('last7days');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const dateRange = useMemo(() => {
    if (preset === 'custom' && customStartDate && customEndDate) {
      return { start: new Date(customStartDate), end: new Date(customEndDate) };
    }
    return getDateRangeFromPreset(preset);
  }, [preset, customStartDate, customEndDate]);

  useEffect(() => {
    if (!foodtruck) return;
    setLoading(true);
    supabase
      .rpc('get_analytics', {
        p_foodtruck_id: foodtruck.id,
        p_start_date: formatDateForInput(dateRange.start),
        p_end_date: formatDateForInput(dateRange.end),
      })
      .then(({ data }) => {
        setAnalytics(data as unknown as AnalyticsData);
        setLoading(false);
      });
  }, [foodtruck, dateRange]);

  const revenueChange = calculatePercentageChange(
    safeNumber(analytics?.orderAmount),
    safeNumber(analytics?.previousOrderAmount)
  );
  const orderChange = calculatePercentageChange(
    safeNumber(analytics?.orderCount),
    safeNumber(analytics?.previousOrderCount)
  );
  const avgChange = calculatePercentageChange(
    safeNumber(analytics?.averageOrderValue),
    safeNumber(analytics?.previousAverageOrderValue)
  );

  const revenueData = useMemo(() => {
    if (!analytics?.amountByDay) return [];
    // Build a map of existing data
    const dataMap = new Map(
      analytics.amountByDay.map((d) => [d.date, { amount: d.amount, order_count: d.order_count }])
    );
    // Generate all days in range
    const days: { date: string; fullDate: string; revenue: number; orders: number }[] = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (current <= end) {
      const key = formatDateForInput(current);
      const entry = dataMap.get(key);
      days.push({
        date: formatDateDisplay(key),
        fullDate: key,
        revenue: entry ? entry.amount / 100 : 0,
        orders: entry ? entry.order_count : 0,
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [analytics, dateRange]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i}h`,
      orders: 0,
      revenue: 0,
    }));
    analytics?.ordersByHour?.forEach((h) => {
      if (hours[h.hour]) {
        hours[h.hour].orders = h.order_count;
        hours[h.hour].revenue = h.amount / 100;
      }
    });
    return hours.filter((h) => h.hour >= 10 && h.hour <= 22);
  }, [analytics]);

  const dayOfWeekData = useMemo(() => {
    const days = DAY_NAMES.map((name, i) => ({
      day: i,
      name: name.substring(0, 3),
      fullName: name,
      orders: 0,
      revenue: 0,
    }));
    analytics?.ordersByDayOfWeek?.forEach((d) => {
      if (days[d.day_of_week]) {
        days[d.day_of_week].orders = d.order_count;
        days[d.day_of_week].revenue = d.amount / 100;
      }
    });
    return days;
  }, [analytics]);

  const maxItemRevenue = useMemo(() => {
    if (!analytics?.topItems?.length) return 0;
    const max = Math.max(...analytics.topItems.map((i) => safeNumber(i.amount)));
    return Number.isFinite(max) ? max : 0;
  }, [analytics]);

  const exportCSV = useCallback(() => {
    if (!analytics) return;
    const rows = [
      ['Période', `${analytics.startDate} - ${analytics.endDate}`],
      [''],
      ['Métriques principales'],
      ['Montant des commandes', (analytics.orderAmount / 100).toFixed(2) + ' €'],
      ['Commandes', analytics.orderCount.toString()],
      ['Panier moyen', (analytics.averageOrderValue / 100).toFixed(2) + ' €'],
      ['Clients uniques', analytics.uniqueCustomers.toString()],
      [''],
      ['Produits les plus vendus'],
      ['Produit', 'Quantité', 'Montant'],
      ...(analytics.topItems?.map((item) => [
        item.menuItemName,
        item.quantity.toString(),
        (item.amount / 100).toFixed(2) + ' €',
      ]) || []),
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stats-${analytics.startDate}-${analytics.endDate}.csv`;
    link.click();
  }, [analytics]);

  return {
    analytics,
    loading,
    preset,
    setPreset,
    showPresetDropdown,
    setShowPresetDropdown,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    revenueChange,
    orderChange,
    avgChange,
    revenueData,
    hourlyData,
    dayOfWeekData,
    maxItemRevenue,
    exportCSV,
  };
}

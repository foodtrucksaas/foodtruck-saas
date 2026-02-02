import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import type { Customer, Location } from '@foodtruck/shared';

export type FilterSegment = 'all' | 'opted_in' | 'loyal' | 'inactive' | 'new';

const ITEMS_PER_PAGE = 20;

export interface CustomerWithLocations extends Customer {
  customer_locations: { location_id: string; order_count: number; location: Location }[];
}

export function useCustomers() {
  const { foodtruck } = useFoodtruck();
  const [customers, setCustomers] = useState<CustomerWithLocations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<FilterSegment>('all');
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!foodtruck) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('customers')
        .select('*, customer_locations(location_id, order_count, location:locations(*))')
        .eq('foodtruck_id', foodtruck.id)
        .order('last_order_at', { ascending: false }),
      supabase.from('locations').select('*').eq('foodtruck_id', foodtruck.id).order('name'),
    ]).then(([customersRes, locationsRes]) => {
      if (customersRes.data) setCustomers(customersRes.data as unknown as CustomerWithLocations[]);
      if (locationsRes.data) setLocations(locationsRes.data);
      setLoading(false);
    });
  }, [foodtruck]);

  const stats = useMemo(() => {
    const total = customers.length;
    const emailOptIn = customers.filter((c) => c.email_opt_in).length;
    const smsOptIn = customers.filter((c) => c.sms_opt_in).length;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const active = customers.filter(
      (c) => c.last_order_at && new Date(c.last_order_at) > thirtyDaysAgo
    ).length;
    const loyal = customers.filter((c) => c.total_orders >= 5).length;
    return { total, emailOptIn, smsOptIn, active, loyal };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.email.toLowerCase().includes(query) ||
          c.name?.toLowerCase().includes(query) ||
          c.phone?.includes(query)
      );
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    switch (filterSegment) {
      case 'opted_in':
        result = result.filter((c) => c.email_opt_in || c.sms_opt_in);
        break;
      case 'loyal':
        result = result.filter((c) => c.total_orders >= 5);
        break;
      case 'inactive':
        result = result.filter(
          (c) => !c.last_order_at || new Date(c.last_order_at) < thirtyDaysAgo
        );
        break;
      case 'new':
        result = result.filter(
          (c) => c.first_order_at && new Date(c.first_order_at) > sevenDaysAgo
        );
        break;
    }
    if (filterLocation)
      result = result.filter((c) =>
        c.customer_locations?.some((cl) => cl.location_id === filterLocation)
      );
    return result;
  }, [customers, searchQuery, filterSegment, filterLocation]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSegment, filterLocation]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const exportCSV = useCallback(() => {
    const rows = [
      [
        'Email',
        'Nom',
        'Téléphone',
        'Commandes',
        'Total cmd',
        'Points Fidélité',
        'Email Opt-in',
        'SMS Opt-in',
        'Dernière commande',
      ],
      ...filteredCustomers.map((c) => [
        c.email,
        c.name || '',
        c.phone || '',
        c.total_orders.toString(),
        (c.total_spent / 100).toFixed(2),
        c.loyalty_points.toString(),
        c.email_opt_in ? 'Oui' : 'Non',
        c.sms_opt_in ? 'Oui' : 'Non',
        c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('fr-FR') : '',
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filteredCustomers]);

  return {
    customers: paginatedCustomers,
    totalCustomers: filteredCustomers.length,
    locations,
    loading,
    stats,
    searchQuery,
    setSearchQuery,
    filterSegment,
    setFilterSegment,
    filterLocation,
    setFilterLocation,
    showFilters,
    setShowFilters,
    exportCSV,
    currentPage,
    setCurrentPage,
    totalPages,
  };
}

export function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

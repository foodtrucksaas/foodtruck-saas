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
  const [totalCount, setTotalCount] = useState(0);

  // Stats loaded once (not paginated)
  const [stats, setStats] = useState({ total: 0, emailOptIn: 0, smsOptIn: 0, active: 0, loyal: 0 });

  // Load locations and stats once
  useEffect(() => {
    if (!foodtruck) return;

    // Fetch locations
    supabase
      .from('locations')
      .select('id, name')
      .eq('foodtruck_id', foodtruck.id)
      .order('name')
      .then(({ data }) => {
        if (data) setLocations(data as Location[]);
      });

    // Fetch stats via counts (much lighter than loading all customers)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    Promise.all([
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruck.id),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruck.id)
        .eq('email_opt_in', true),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruck.id)
        .eq('sms_opt_in', true),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruck.id)
        .gte('last_order_at', thirtyDaysAgoStr),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruck.id)
        .gte('total_orders', 5),
    ]).then(([totalRes, emailRes, smsRes, activeRes, loyalRes]) => {
      setStats({
        total: totalRes.count ?? 0,
        emailOptIn: emailRes.count ?? 0,
        smsOptIn: smsRes.count ?? 0,
        active: activeRes.count ?? 0,
        loyal: loyalRes.count ?? 0,
      });
    });
  }, [foodtruck]);

  // Fetch paginated + filtered customers
  useEffect(() => {
    if (!foodtruck) return;
    setLoading(true);

    let query = supabase
      .from('customers')
      .select(
        `
        id, email, name, phone, total_orders, total_spent, loyalty_points,
        email_opt_in, sms_opt_in, first_order_at, last_order_at,
        customer_locations(location_id, order_count, location:locations(id, name))
      `,
        { count: 'exact' }
      )
      .eq('foodtruck_id', foodtruck.id)
      .order('last_order_at', { ascending: false });

    // Server-side search
    if (searchQuery) {
      query = query.or(
        `email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
      );
    }

    // Server-side segment filters
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    switch (filterSegment) {
      case 'opted_in':
        query = query.or('email_opt_in.eq.true,sms_opt_in.eq.true');
        break;
      case 'loyal':
        query = query.gte('total_orders', 5);
        break;
      case 'inactive':
        query = query.or(`last_order_at.is.null,last_order_at.lt.${thirtyDaysAgo.toISOString()}`);
        break;
      case 'new':
        query = query.gte('first_order_at', sevenDaysAgo.toISOString());
        break;
    }

    // Server-side pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    query = query.range(from, from + ITEMS_PER_PAGE - 1);

    query.then(({ data, count }) => {
      if (data) setCustomers(data as unknown as CustomerWithLocations[]);
      setTotalCount(count ?? 0);
      setLoading(false);
    });
  }, [foodtruck, searchQuery, filterSegment, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSegment, filterLocation]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Client-side location filter (location is in nested join, can't easily filter server-side)
  const displayedCustomers = useMemo(() => {
    if (!filterLocation) return customers;
    return customers.filter((c) =>
      c.customer_locations?.some((cl) => cl.location_id === filterLocation)
    );
  }, [customers, filterLocation]);

  const exportCSV = useCallback(async () => {
    if (!foodtruck) return;

    // For export, fetch all filtered customers (no pagination)
    let query = supabase
      .from('customers')
      .select(
        'id, email, name, phone, total_orders, total_spent, loyalty_points, email_opt_in, sms_opt_in, last_order_at'
      )
      .eq('foodtruck_id', foodtruck.id)
      .order('last_order_at', { ascending: false });

    if (searchQuery) {
      query = query.or(
        `email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
      );
    }

    const { data } = await query;
    if (!data) return;

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
      ...data.map((c: any) => [
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
  }, [foodtruck, searchQuery]);

  return {
    customers: displayedCustomers,
    totalCustomers: totalCount,
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

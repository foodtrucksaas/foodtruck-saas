import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Clock, CheckCircle, ArrowRight, Package } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { DashboardStats } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useFoodtruck } from '../contexts/FoodtruckContext';
import { useOrderNotification } from '../contexts/OrderNotificationContext';

export default function Dashboard() {
  const { foodtruck } = useFoodtruck();
  const { refreshTrigger, showAllPendingOrders } = useOrderNotification();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!foodtruck) return;

    const { data } = await supabase.rpc('get_dashboard_stats', {
      p_foodtruck_id: foodtruck.id,
    });

    setStats(data as unknown as DashboardStats | null);
    setLoading(false);
  }, [foodtruck]);

  // Initial fetch + polling every 30 seconds (realtime handles immediate updates)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Immediate refresh when orders are accepted/cancelled from popup
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStats();
    }
  }, [refreshTrigger, fetchStats]);

  // Row 1: Orders stats (simplified if auto_accept_orders is enabled)
  const orderStats = foodtruck?.auto_accept_orders
    ? [
        {
          name: "Commandes aujourd'hui",
          value: stats?.todayOrders ?? '-',
          icon: ShoppingBag,
          color: 'bg-primary-500',
          onClick: undefined as (() => void) | undefined,
        },
      ]
    : [
        {
          name: 'En attente',
          value: stats?.pendingOrders ?? '-',
          icon: Clock,
          color: 'bg-warning-500',
          onClick: stats?.pendingOrders ? showAllPendingOrders : undefined,
        },
        {
          name: 'Acceptées',
          value: stats?.confirmedOrders ?? stats?.preparingOrders ?? '-',
          icon: CheckCircle,
          color: 'bg-info-500',
          onClick: undefined as (() => void) | undefined,
        },
        {
          name: 'Retirées',
          value: stats?.pickedUpOrders ?? '-',
          icon: Package,
          color: 'bg-success-500',
          onClick: undefined as (() => void) | undefined,
        },
      ];

  // Row 2: Order amount (not revenue - payments handled externally)
  const totalOrderAmount = stats ? stats.todayOrderAmount : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome message */}
      <p className="text-sm text-gray-600">Bienvenue, {foodtruck?.name}</p>

      {/* Stats - Row 1: Commandes - grid 2 colonnes sur mobile, 3 sur desktop */}
      <div
        className={`grid gap-3 sm:gap-4 ${
          orderStats.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {orderStats.map((stat, index) => (
          <div
            key={stat.name}
            role={stat.onClick ? 'button' : undefined}
            tabIndex={stat.onClick ? 0 : undefined}
            onKeyDown={stat.onClick ? (e) => e.key === 'Enter' && stat.onClick?.() : undefined}
            className={`card p-3 sm:p-5 ${
              stat.onClick
                ? 'cursor-pointer min-h-[72px] hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
                : ''
            } ${
              // Sur mobile avec 3 cards: la 3e prend toute la largeur
              orderStats.length === 3 && index === 2 ? 'col-span-2 sm:col-span-1' : ''
            }`}
            onClick={stat.onClick}
          >
            <div
              className={`flex items-center gap-2 sm:gap-4 ${
                orderStats.length === 1 ? 'justify-center' : ''
              }`}
            >
              <div
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${stat.color} shadow-lg flex-shrink-0`}
              >
                <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className={`${orderStats.length === 1 ? 'text-center' : 'min-w-0 flex-1'}`}>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate leading-tight">
                  {stat.name}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats - Row 2: Montant commandes du jour */}
      <div className="card p-4 sm:p-6 bg-white border-l-4 border-l-success-500">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-success-500 shadow-lg flex-shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {stats ? formatPrice(totalOrderAmount) : '-'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              Montant des commandes du jour
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link
          to="/orders"
          className="card p-4 sm:p-6 min-h-[72px] hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-3 min-h-[44px]">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                Voir les commandes
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
                Gerez les commandes en temps reel
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-200 ease-out flex-shrink-0" />
          </div>
        </Link>

        <Link
          to="/menu"
          className="card p-4 sm:p-6 min-h-[72px] hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-3 min-h-[44px]">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Gerer le menu</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
                Ajoutez ou modifiez vos plats
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-200 ease-out flex-shrink-0" />
          </div>
        </Link>

        <Link
          to="/schedule"
          className="card p-4 sm:p-6 min-h-[72px] hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-3 min-h-[44px]">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Planning</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
                Configurez vos horaires et emplacements
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-200 ease-out flex-shrink-0" />
          </div>
        </Link>
      </div>
    </div>
  );
}

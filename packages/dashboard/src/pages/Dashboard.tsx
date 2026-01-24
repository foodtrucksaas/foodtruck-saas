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
          name: 'Acceptées',
          value: stats?.confirmedOrders ?? stats?.preparingOrders ?? '-',
          icon: CheckCircle,
          color: 'bg-blue-500',
          onClick: undefined as (() => void) | undefined,
        },
        {
          name: 'En attente',
          value: stats?.pendingOrders ?? '-',
          icon: Clock,
          color: 'bg-amber-500',
          onClick: stats?.pendingOrders ? showAllPendingOrders : undefined,
        },
        {
          name: 'Retirées',
          value: stats?.pickedUpOrders ?? '-',
          icon: Package,
          color: 'bg-emerald-500',
          onClick: undefined as (() => void) | undefined,
        },
      ];

  // Row 2: Order amount (not revenue - payments handled externally)
  const totalOrderAmount = stats ? stats.todayOrderAmount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">Bienvenue sur votre espace {foodtruck?.name}</p>
        </div>
      </div>

      {/* Stats - Row 1: Commandes */}
      <div
        className={`grid gap-4 ${orderStats.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-3'}`}
      >
        {orderStats.map((stat) => (
          <div
            key={stat.name}
            className={`card p-4 ${stat.onClick ? 'cursor-pointer hover:border-primary-300 hover:shadow-md transition-all' : ''}`}
            onClick={stat.onClick}
          >
            <div
              className={`flex items-center gap-3 ${orderStats.length === 1 ? 'justify-center' : ''}`}
            >
              <div className={`p-2 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className={orderStats.length === 1 ? 'text-center' : 'min-w-0'}>
                <p className="text-xl font-bold text-gray-900 truncate">{stat.value}</p>
                <p className="text-xs text-gray-500 truncate">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats - Row 2: Montant commandes du jour */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats ? formatPrice(totalOrderAmount) : '-'}
            </p>
            <p className="text-sm text-gray-500">Montant des commandes du jour</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/orders" className="card p-6 hover:border-primary-200 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Voir les commandes</h3>
              <p className="text-sm text-gray-500 mt-1">Gérez les commandes en temps réel</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
          </div>
        </Link>

        <Link to="/menu" className="card p-6 hover:border-primary-200 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Gérer le menu</h3>
              <p className="text-sm text-gray-500 mt-1">Ajoutez ou modifiez vos plats</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
          </div>
        </Link>

        <Link to="/schedule" className="card p-6 hover:border-primary-200 transition-colors group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Planning</h3>
              <p className="text-sm text-gray-500 mt-1">Configurez vos horaires et emplacements</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}

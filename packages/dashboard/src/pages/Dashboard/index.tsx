import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  Package,
  ShoppingBag,
  ArrowRight,
  MapPin,
  XCircle,
  Calendar,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import { formatPrice, formatTime } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { useOrderNotification } from '../../contexts/OrderNotificationContext';
import { Skeleton } from '../../components/Skeleton';
import { useDashboard } from './useDashboard';
import type { TodayStatus } from './useDashboard';

// --- Helpers ---

function getStatusStyle(status: string) {
  switch (status) {
    case 'pending':
      return { bg: 'bg-warning-100', text: 'text-warning-700', label: 'En attente' };
    case 'confirmed':
      return { bg: 'bg-info-100', text: 'text-info-700', label: 'Acceptée' };
    case 'ready':
      return { bg: 'bg-success-100', text: 'text-success-700', label: 'Prête' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
  }
}

// --- Components ---

function StatCard({
  icon: Icon,
  color,
  value,
  label,
  onClick,
}: {
  icon: React.ElementType;
  color: string;
  value: string | number;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`card p-3 ${
        onClick
          ? 'cursor-pointer hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
          : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${color} shadow-md flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-[11px] sm:text-xs text-gray-500 truncate leading-tight">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TodayBanner({ status }: { status: TodayStatus }) {
  return (
    <div
      className={`card p-3 sm:p-4 border-l-4 ${
        status.type === 'open'
          ? 'border-l-primary-500'
          : status.type === 'closed'
            ? 'border-l-red-400'
            : 'border-l-gray-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {status.type === 'open' && (
            <>
              <div className="p-2 rounded-xl bg-primary-100 flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  {status.locationName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTime(status.startTime)} – {formatTime(status.endTime)}
                </p>
              </div>
            </>
          )}
          {status.type === 'closed' && (
            <>
              <div className="p-2 rounded-xl bg-red-100 flex-shrink-0">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  Fermé aujourd'hui
                </p>
                {status.reason && <p className="text-xs text-gray-500 truncate">{status.reason}</p>}
              </div>
            </>
          )}
          {status.type === 'no_service' && (
            <>
              <div className="p-2 rounded-xl bg-gray-100 flex-shrink-0">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Pas de service prévu aujourd'hui</p>
            </>
          )}
        </div>
        <Link
          to="/schedule"
          className="text-xs text-primary-500 hover:text-primary-600 flex-shrink-0 font-medium"
        >
          Planning →
        </Link>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// --- Page ---

export default function Dashboard() {
  const { foodtruck } = useFoodtruck();
  const { showAllPendingOrders } = useOrderNotification();
  const {
    loading,
    stats,
    todayStatus,
    upcomingOrders,
    outOfStockItems,
    activeOffers,
    weekOrderCount,
    weekOrderAmount,
  } = useDashboard();

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  const isAutoAccept = foodtruck?.auto_accept_orders;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Section 1: Today's Info Banner */}
      <TodayBanner status={todayStatus} />

      {/* Section 2: Stats Row */}
      <div className={`grid gap-3 ${isAutoAccept ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {!isAutoAccept && (
          <StatCard
            icon={Clock}
            color="bg-warning-500"
            value={stats?.pendingOrders ?? '-'}
            label="En attente"
            onClick={stats?.pendingOrders ? showAllPendingOrders : undefined}
          />
        )}
        <StatCard
          icon={isAutoAccept ? ShoppingBag : CheckCircle}
          color={isAutoAccept ? 'bg-primary-500' : 'bg-info-500'}
          value={isAutoAccept ? (stats?.todayOrders ?? '-') : (stats?.confirmedOrders ?? '-')}
          label={isAutoAccept ? 'Commandes du jour' : 'Acceptées'}
        />
        <StatCard
          icon={Package}
          color="bg-success-500"
          value={stats?.pickedUpOrders ?? '-'}
          label="Retirées"
        />
        <StatCard
          icon={Banknote}
          color="bg-primary-500"
          value={stats ? formatPrice(stats.todayOrderAmount) : '-'}
          label="Montant du jour"
        />
      </div>

      {/* Section 3: Upcoming Orders */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Commandes à venir</h2>
        </div>

        {upcomingOrders.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune commande à venir</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingOrders.map((order) => {
              const pickupDate = new Date(order.pickup_time);
              const timeStr = `${pickupDate.getHours().toString().padStart(2, '0')}h${pickupDate.getMinutes().toString().padStart(2, '0')}`;
              const statusStyle = getStatusStyle(order.status);
              const itemsSummary = order.order_items
                .map(
                  (item) =>
                    `${item.quantity > 1 ? item.quantity + '× ' : ''}${item.menu_item?.name ?? '?'}`
                )
                .join(', ');

              return (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-mono font-semibold text-gray-900 w-12 flex-shrink-0">
                    {timeStr}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{itemsSummary}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {order.customer_name || 'Client'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {formatPrice(order.total_amount)}
                  </span>
                  <span
                    className={`inline-flex text-[11px] ${statusStyle.bg} ${statusStyle.text} px-2 py-0.5 rounded-full font-medium flex-shrink-0`}
                  >
                    {statusStyle.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <Link
          to="/orders"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-gray-100 text-sm font-medium text-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          Voir toutes les commandes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Section 4: Alerts / Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Out of stock */}
        <div className="card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-100 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Rupture de stock</span>
          </div>
          {outOfStockItems.length === 0 ? (
            <p className="text-xs text-gray-400">Tout est disponible</p>
          ) : (
            <>
              <p className="text-lg font-bold text-red-600">{outOfStockItems.length}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {outOfStockItems
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(', ')}
                {outOfStockItems.length > 3 && '...'}
              </p>
              <Link
                to="/menu"
                className="text-xs text-primary-500 hover:text-primary-600 mt-1.5 inline-block font-medium"
              >
                Gérer →
              </Link>
            </>
          )}
        </div>

        {/* Active offers */}
        <div className="card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-100 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Offres actives</span>
          </div>
          {activeOffers.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune offre active</p>
          ) : activeOffers.length <= 5 ? (
            <ul className="space-y-0.5 mt-1">
              {activeOffers.map((offer) => (
                <li key={offer.id} className="text-xs text-gray-700 truncate">
                  {offer.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg font-bold text-gray-900">{activeOffers.length}</p>
          )}
          <Link
            to="/offers"
            className="text-xs text-primary-500 hover:text-primary-600 mt-1.5 inline-block font-medium"
          >
            Gérer →
          </Link>
        </div>

        {/* Week stats */}
        <div className="card p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-100 flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Cette semaine</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatPrice(weekOrderAmount)}</p>
          <p className="text-xs text-gray-500">
            {weekOrderCount} commande{weekOrderCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

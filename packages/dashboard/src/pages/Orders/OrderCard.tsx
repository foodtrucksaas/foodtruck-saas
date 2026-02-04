import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';

interface OrderCardProps {
  order: OrderWithItemsAndOptions;
  onClick: () => void;
}

export const OrderCard = memo(function OrderCard({ order, onClick }: OrderCardProps) {
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';
  const isReady = order.status === 'ready';
  const isPickedUp = order.status === 'picked_up';
  const isDone = isPickedUp || order.status === 'cancelled' || order.status === 'no_show';

  const getStatusStyle = () => {
    if (isPending) return { bg: 'bg-warning-100', text: 'text-warning-600', label: 'En attente' };
    if (isConfirmed) return { bg: 'bg-info-100', text: 'text-info-600', label: 'Acceptée' };
    if (isReady) return { bg: 'bg-success-100', text: 'text-success-600', label: 'Prête' };
    if (isPickedUp) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Retirée' };
    if (order.status === 'cancelled')
      return { bg: 'bg-error-100', text: 'text-error-600', label: 'Annulée' };
    if (order.status === 'no_show')
      return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Non récupérée' };
    return { bg: 'bg-gray-100', text: 'text-gray-500', label: order.status };
  };

  const status = getStatusStyle();

  const itemsSummary = order.order_items
    .map((item) => `${item.quantity}x ${item.menu_item.name}`)
    .join(', ');

  return (
    <article
      className={`card rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[72px] overflow-hidden active:scale-[0.98] ${
        isDone
          ? 'bg-gray-50 border border-gray-300 opacity-60 hover:opacity-80'
          : isPending
            ? 'bg-warning-50 border-2 border-warning-500 hover:border-warning-600 hover:shadow-lg hover:-translate-y-0.5'
            : isConfirmed
              ? 'bg-info-50 border-2 border-info-500 hover:border-info-600 hover:shadow-lg hover:-translate-y-0.5'
              : isReady
                ? 'bg-success-50 border-2 border-success-500 hover:border-success-600 hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-0.5'
      }`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Commande de ${order.customer_name}, ${status.label}, ${itemsSummary}, ${formatPrice(order.total_amount)}`}
    >
      {/* Row 1: Dot + Name + Badge + Chevron */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div
          className={`status-dot flex-shrink-0 ${isPending ? 'status-dot-pending' : isConfirmed ? 'status-dot-confirmed' : isReady ? 'status-dot-ready' : 'status-dot-done'}`}
          aria-hidden="true"
        />
        <span
          className={`font-semibold truncate max-w-[120px] sm:max-w-[180px] md:max-w-none flex-1 min-w-0 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}
        >
          {order.customer_name}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs ${status.bg} ${status.text} px-2 sm:px-2.5 py-1 rounded-full font-medium flex-shrink-0`}
        >
          {status.label}
        </span>
        <ChevronRight
          className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 hidden sm:block"
          aria-hidden="true"
        />
      </div>

      {/* Row 2: Items + Price */}
      <div className="flex items-center justify-between mt-2 ml-0 sm:ml-5 gap-2">
        <span
          className={`text-xs sm:text-sm line-clamp-1 truncate min-w-0 flex-1 ${isDone ? 'text-gray-400' : 'text-gray-600'}`}
        >
          {order.order_items.map((item, idx) => (
            <span key={idx}>
              {idx > 0 && ', '}
              <span className={`font-medium ${isDone ? 'text-gray-500' : 'text-gray-800'}`}>
                {item.quantity}x
              </span>{' '}
              {item.menu_item.name}
            </span>
          ))}
        </span>
        <span
          className={`font-bold flex-shrink-0 text-sm sm:text-base ${isDone ? 'text-gray-500' : 'text-gray-900'}`}
        >
          {formatPrice(order.total_amount)}
        </span>
      </div>
    </article>
  );
});

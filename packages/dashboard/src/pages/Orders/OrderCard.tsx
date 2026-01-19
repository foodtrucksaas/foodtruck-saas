import { ChevronRight } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';

interface OrderCardProps {
  order: OrderWithItemsAndOptions;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';
  const isReady = order.status === 'ready';
  const isPickedUp = order.status === 'picked_up';
  const isDone = isPickedUp || order.status === 'cancelled' || order.status === 'no_show';

  const getStatusStyle = () => {
    if (isPending) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' };
    if (isConfirmed) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Acceptée' };
    if (isReady) return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Prête' };
    if (isPickedUp) return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Retirée' };
    if (order.status === 'cancelled') return { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulée' };
    if (order.status === 'no_show') return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Non récupérée' };
    return { bg: 'bg-gray-100', text: 'text-gray-500', label: order.status };
  };

  const status = getStatusStyle();

  return (
    <div
      className={`rounded-xl shadow-sm px-4 py-3.5 cursor-pointer transition-all duration-200 group ${
        isDone
          ? 'bg-gray-50 border border-gray-200 opacity-60 hover:opacity-80'
          : isPending
          ? 'bg-yellow-50 border-2 border-yellow-300 hover:border-yellow-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
          : isConfirmed
          ? 'bg-blue-50 border-2 border-blue-300 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
          : isReady
          ? 'bg-purple-50 border-2 border-purple-300 hover:border-purple-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
          : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
      }`}
      onClick={onClick}
    >
      {/* Row 1: Dot + Name + Badge + Chevron */}
      <div className="flex items-center gap-2.5">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPending ? 'bg-yellow-400' : isConfirmed ? 'bg-blue-400' : isReady ? 'bg-purple-400' : isDone ? 'bg-gray-300' : 'bg-green-400'} ring-2 ring-offset-1 ${isPending ? 'ring-yellow-200' : isConfirmed ? 'ring-blue-200' : isReady ? 'ring-purple-200' : isDone ? 'ring-gray-200' : 'ring-green-200'}`} />
        <span className={`font-semibold truncate flex-1 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>{order.customer_name}</span>
        <span className={`inline-flex items-center gap-1 text-xs ${status.bg} ${status.text} px-2.5 py-1 rounded-full font-medium flex-shrink-0`}>
          {status.label}
        </span>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>

      {/* Row 2: Items + Price */}
      <div className="flex items-center justify-between mt-2 ml-5">
        <span className={`text-sm line-clamp-1 ${isDone ? 'text-gray-400' : 'text-gray-600'}`}>
          {order.order_items.map((item, idx) => (
            <span key={idx}>
              {idx > 0 && ', '}
              <span className={`font-medium ${isDone ? 'text-gray-500' : 'text-gray-800'}`}>{item.quantity}x</span> {item.menu_item.name}
            </span>
          ))}
        </span>
        <span className={`font-bold flex-shrink-0 ml-3 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>{formatPrice(order.total_amount)}</span>
      </div>
    </div>
  );
}

import { X, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatPrice, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { useState, useEffect } from 'react';

interface PendingOrdersModalProps {
  orders: OrderWithItemsAndOptions[];
  totalPendingCount?: number;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function PendingOrdersModal({
  orders,
  totalPendingCount,
  onAccept,
  onCancel,
  onClose,
  onRefresh,
}: PendingOrdersModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Only auto-refresh if we have 0 orders but there are pending orders to show
  // Don't refresh while user is working through orders (causes modal to close unexpectedly)
  useEffect(() => {
    if (orders.length === 0 && totalPendingCount && totalPendingCount > 0 && onRefresh) {
      onRefresh();
    }
  }, [totalPendingCount, orders.length, onRefresh]);

  if (orders.length === 0) return null;

  // Ensure currentIndex is valid
  const safeIndex = Math.min(currentIndex, orders.length - 1);
  const order = orders[safeIndex];

  if (!order) return null;

  const time = new Date(order.pickup_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const discountAmount = (order as OrderWithItemsAndOptions & { discount_amount?: number }).discount_amount || 0;

  const goNext = () => {
    if (safeIndex < orders.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const goPrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleAccept = () => {
    onAccept(order.id);
    // Stay at same index (next order will slide in) or go back if at end
    if (safeIndex >= orders.length - 1 && safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleCancel = () => {
    onCancel(order.id);
    if (safeIndex >= orders.length - 1 && safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Single backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-yellow-500 text-white px-5 py-4 relative">
          {/* Close button - more visible */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-yellow-800" />
          </button>

          <h2 className="text-xl font-bold pr-10">
            {orders.length} commande{orders.length > 1 ? 's' : ''} à valider
          </h2>
        </div>

        {/* Navigation with dots */}
        {orders.length > 1 && (
          <div className="flex items-center justify-between px-2 py-2 bg-gray-50 border-b">
            <button
              onClick={goPrev}
              disabled={safeIndex === 0}
              className="w-12 h-12 rounded-xl hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Dots indicator */}
            <div className="flex items-center gap-2">
              {orders.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-3 rounded-full transition-all ${
                    idx === safeIndex
                      ? 'bg-yellow-500 w-8'
                      : 'bg-gray-300 hover:bg-gray-400 w-3'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={safeIndex === orders.length - 1}
              className="w-12 h-12 rounded-xl hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Pickup time - prominent */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-lg">{time}</span>
            </div>
          </div>

          {/* Customer name */}
          <h3 className="text-xl font-bold text-gray-900 mb-1">{order.customer_name}</h3>
          {/* Order ID */}
          <p className="font-mono text-xs text-gray-400 mb-4">{formatOrderId(order.id)}</p>

          {/* Items */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Articles commandés</h4>
            <div className="space-y-2">
              {order.order_items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span className="text-gray-900">
                      <span className="font-semibold">{item.quantity}x</span> {item.menu_item.name}
                    </span>
                    <span className="text-gray-600">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                  {item.order_item_options && item.order_item_options.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">
                      {item.order_item_options.map((opt) => opt.option_name).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <p className="ml-6 text-xs text-amber-600 italic">
                      💬 {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Note du client</h4>
              <p className="text-yellow-900">{order.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="py-3 border-t border-gray-200 space-y-1">
            {discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span>{formatPrice(order.total_amount + discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-green-600">
                  <span>Réduction</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-400 hover:text-red-500 text-sm transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

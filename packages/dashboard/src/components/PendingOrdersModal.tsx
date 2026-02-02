import { X, Check, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';
import { formatPrice, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { useState, useEffect } from 'react';

interface PendingOrdersModalProps {
  orders: OrderWithItemsAndOptions[];
  totalPendingCount?: number;
  onAccept: (id: string, pickupTime?: string) => void;
  onCancel: (id: string) => void;
  onClose: () => void;
  onRefresh?: () => void;
  minPrepTime?: number; // in minutes
}

export default function PendingOrdersModal({
  orders,
  totalPendingCount,
  onAccept,
  onCancel,
  onClose,
  onRefresh,
  minPrepTime = 15,
}: PendingOrdersModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedTimes, setEditedTimes] = useState<Record<string, string>>({});

  // Only auto-refresh if we have 0 orders but there are pending orders to show
  useEffect(() => {
    if (orders.length === 0 && totalPendingCount && totalPendingCount > 0 && onRefresh) {
      onRefresh();
    }
  }, [totalPendingCount, orders.length, onRefresh]);

  // Initialize edited times for ASAP orders
  useEffect(() => {
    setEditedTimes((prev) => {
      const newEditedTimes: Record<string, string> = { ...prev };
      let hasChanges = false;

      orders.forEach((order) => {
        if ((order as { is_asap?: boolean | null }).is_asap === true && !prev[order.id]) {
          hasChanges = true;
          // Calculate suggested time: order created_at + min prep time
          const orderDate = new Date(order.created_at || new Date());
          orderDate.setMinutes(orderDate.getMinutes() + minPrepTime);

          // Round to next 5 minutes
          const minutes = orderDate.getMinutes();
          const roundedMinutes = Math.ceil(minutes / 5) * 5;
          orderDate.setMinutes(roundedMinutes);

          // Make sure it's not in the past
          const now = new Date();
          if (orderDate < now) {
            now.setMinutes(now.getMinutes() + minPrepTime);
            const nowMinutes = now.getMinutes();
            now.setMinutes(Math.ceil(nowMinutes / 5) * 5);
            newEditedTimes[order.id] = now.toTimeString().slice(0, 5);
          } else {
            newEditedTimes[order.id] = orderDate.toTimeString().slice(0, 5);
          }
        }
      });

      return hasChanges ? newEditedTimes : prev;
    });
  }, [orders, minPrepTime]);

  if (orders.length === 0) return null;

  // Ensure currentIndex is valid
  const safeIndex = Math.min(currentIndex, orders.length - 1);
  const order = orders[safeIndex];

  if (!order) return null;

  // is_asap is part of Order type from database.types.ts
  const isAsap = (order as { is_asap?: boolean | null }).is_asap === true;

  const displayTime =
    isAsap && editedTimes[order.id]
      ? editedTimes[order.id]
      : new Date(order.pickup_time).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });

  // Extract discount info
  const orderWithDiscounts = order as OrderWithItemsAndOptions & {
    discount_amount?: number;
    deal_discount?: number;
    deal_id?: string;
    promo_code_id?: string;
  };
  const discountAmount = orderWithDiscounts.discount_amount || 0;
  const dealDiscount = orderWithDiscounts.deal_discount || 0;
  const hasPromoCode = !!orderWithDiscounts.promo_code_id;
  const hasDeal = !!orderWithDiscounts.deal_id || dealDiscount > 0;

  // Determine discount label
  const getDiscountLabel = () => {
    const labels: string[] = [];
    if (hasPromoCode) labels.push('code promo');
    if (hasDeal) labels.push('offre');
    // If there's discount but no promo/deal, it's likely loyalty
    if (discountAmount > 0 && !hasPromoCode && !hasDeal) labels.push('fidélité');
    // If discount is greater than deal discount and no promo, could include loyalty
    if (discountAmount > dealDiscount && hasDeal && !hasPromoCode) labels.push('fidélité');

    if (labels.length === 0) return 'Réduction';
    return `Réduction (${labels.join(' + ')})`;
  };

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

  const handleTimeChange = (orderId: string, time: string) => {
    setEditedTimes((prev) => ({ ...prev, [orderId]: time }));
  };

  const handleAccept = () => {
    if (isAsap && editedTimes[order.id]) {
      // Build full pickup time from today's date + edited time
      const today = new Date();
      const [hours, minutes] = editedTimes[order.id].split(':').map(Number);
      today.setHours(hours, minutes, 0, 0);
      onAccept(order.id, today.toISOString());
    } else {
      onAccept(order.id);
    }

    // Stay at same index or go back if at end
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
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Single backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - fullscreen on mobile with scroll */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="bg-yellow-500 text-white px-4 sm:px-5 py-4 relative flex-shrink-0">
          {/* Close button - larger touch target */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-5 h-5 text-yellow-800" />
          </button>

          <h2 className="text-lg sm:text-xl font-bold pr-12">
            {orders.length} commande{orders.length > 1 ? 's' : ''} à valider
          </h2>
        </div>

        {/* Navigation with dots */}
        {orders.length > 1 && (
          <div className="flex items-center justify-between px-2 py-2 bg-gray-50 border-b flex-shrink-0">
            <button
              onClick={goPrev}
              disabled={safeIndex === 0}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Dots indicator */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {orders.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`min-h-[28px] min-w-[28px] h-3 rounded-full transition-all flex items-center justify-center ${
                    idx === safeIndex ? 'bg-yellow-500 w-8' : 'bg-gray-300 hover:bg-gray-400 w-3'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={safeIndex === orders.length - 1}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Content - scrollable */}
        <div
          className="p-4 sm:p-6 overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Pickup time */}
          {/* Pickup time */}
          {isAsap ? (
            <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span className="font-bold text-primary-700">Commande au plus vite</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Heure de retrait :</label>
                <input
                  type="time"
                  value={editedTimes[order.id] || ''}
                  onChange={(e) => handleTimeChange(order.id, e.target.value)}
                  className="text-xl font-bold bg-white border-2 border-primary-400 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg mb-3">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-lg">{displayTime}</span>
            </div>
          )}

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
                    <span className="text-gray-600">
                      {formatPrice(item.unit_price * item.quantity)}
                    </span>
                  </div>
                  {item.order_item_options && item.order_item_options.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">
                      {item.order_item_options.map((opt) => opt.option_name).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <p className="ml-6 text-xs text-amber-600 italic">💬 {item.notes}</p>
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
                  <span>{getDiscountLabel()}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions - sticky at bottom */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-shrink-0 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="min-h-[48px] px-4 py-3 text-gray-400 hover:text-red-500 text-sm transition-colors active:scale-95"
            >
              Refuser
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 min-h-[48px] px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
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

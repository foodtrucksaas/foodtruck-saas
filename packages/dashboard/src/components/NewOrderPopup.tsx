import { X, Check } from 'lucide-react';
import { formatPrice, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';

interface NewOrderPopupProps {
  order: OrderWithItemsAndOptions;
  onAccept: () => void;
  onCancel: () => void;
  onClose: () => void;
  stackIndex?: number;
  totalInStack?: number;
  isAutoAccept?: boolean;
}

export default function NewOrderPopup({
  order,
  onAccept,
  onCancel,
  onClose,
  stackIndex = 0,
  totalInStack: _totalInStack = 1,
  isAutoAccept = false,
}: NewOrderPopupProps) {
  // Convert UTC to local time
  const time = new Date(order.pickup_time).toLocaleTimeString('fr-FR', {
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
    if (discountAmount > 0 && !hasPromoCode && !hasDeal) labels.push('fidélité');
    if (discountAmount > dealDiscount && hasDeal && !hasPromoCode) labels.push('fidélité');

    if (labels.length === 0) return 'Réduction';
    return `Réduction (${labels.join(' + ')})`;
  };

  // Only show backdrop for the topmost popup (index 0)
  const isTopmost = stackIndex === 0;
  // Calculate z-index: must be higher than header (z-[9999]), older popups behind
  const zIndex = 10000 - stackIndex;
  // Offset for stacking effect
  const offsetY = stackIndex * 8;
  const offsetX = stackIndex * 4;
  const scale = 1 - stackIndex * 0.02;

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        zIndex,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Backdrop - only for topmost */}
      {isTopmost && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-in"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md animate-bounce-in overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        style={{
          transform: `translateY(${offsetY}px) translateX(${offsetX}px) scale(${scale})`,
          opacity: isTopmost ? 1 : 0.95,
        }}
      >
        {/* Header */}
        <div
          className={`${isAutoAccept ? 'bg-green-500' : 'bg-yellow-500'} text-white px-4 sm:px-5 py-4 relative flex-shrink-0`}
        >
          {/* Close button - larger touch target */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-150 active:scale-90"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center justify-between gap-3 pr-12">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold">Nouvelle commande !</h2>
              {isAutoAccept && <p className="text-green-100 text-sm">Acceptée automatiquement</p>}
            </div>
            <div className="bg-white/20 rounded-xl px-3 sm:px-4 py-2 flex-shrink-0">
              <span className="text-2xl sm:text-3xl font-bold">{time}</span>
            </div>
          </div>
        </div>

        {/* Content - scrollable */}
        <div
          className="p-4 sm:p-6 overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Customer name */}
          <h3 className="text-xl font-bold text-gray-900 mb-1">{order.customer_name}</h3>
          {/* Order ID */}
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-xs text-gray-400">{formatOrderId(order.id)}</span>
          </div>

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

        {/* Actions - with safe area */}
        <div
          className="px-4 sm:px-6 pt-2 border-t border-gray-100 flex-shrink-0 bg-white"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          {isAutoAccept ? (
            <button
              onClick={onClose}
              className="w-full px-4 py-3.5 min-h-[48px] bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              OK
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={onCancel}
                className="order-2 sm:order-1 px-4 py-3 min-h-[48px] text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95"
              >
                Refuser
              </button>
              <button
                onClick={onAccept}
                className="order-1 sm:order-2 flex-1 px-4 py-3.5 min-h-[52px] bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Accepter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

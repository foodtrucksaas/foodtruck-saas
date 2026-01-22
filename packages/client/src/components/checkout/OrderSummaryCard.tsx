import { Minus, Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { formatPrice, formatTime } from '@foodtruck/shared';
import type { CartItem, SelectedOption } from '@foodtruck/shared';
import type { SlotWithLocation, ScheduleWithLocation } from '../../hooks';

interface OrderSummaryCardProps {
  items: CartItem[];
  total: number;
  promoDiscount: number;
  loyaltyDiscount: number;
  dealDiscount: number;
  dealName?: string;
  finalTotal: number;
  selectedDate: Date;
  selectedSlot: SlotWithLocation | undefined;
  schedules: ScheduleWithLocation[];
  getCartKey: (menuItemId: string, selectedOptions?: SelectedOption[]) => string;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onRemoveItem: (key: string) => void;
}

export function OrderSummaryCard({
  items,
  total,
  promoDiscount,
  loyaltyDiscount,
  dealDiscount,
  dealName,
  finalTotal,
  selectedDate,
  selectedSlot,
  schedules,
  getCartKey,
  onUpdateQuantity,
  onRemoveItem,
}: OrderSummaryCardProps) {
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? "Aujourd'hui"
    : selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
      <h2 className="font-bold text-anthracite mb-4">Votre commande</h2>

      {/* Items */}
      <div className="space-y-4">
        {items.map((item) => {
          const cartKey = getCartKey(item.menuItem.id, item.selectedOptions);
          const sizeOption = item.selectedOptions?.find(opt => opt.isSizeOption);
          const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;
          const supplementsTotal = item.selectedOptions?.reduce(
            (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier), 0
          ) || 0;
          const itemTotal = (basePrice + supplementsTotal) * item.quantity;

          return (
            <div key={cartKey} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-anthracite">{item.menuItem.name}</p>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {item.selectedOptions.map((opt) => opt.name).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-400 italic mt-1">
                    "{item.notes}"
                  </p>
                )}
                <p className="text-sm font-bold text-primary-500 mt-1">
                  {formatPrice(itemTotal)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(cartKey, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4 text-anthracite" />
                </button>
                <span className="w-6 text-center font-semibold text-anthracite">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(cartKey, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveItem(cartKey)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pickup Reminder */}
      {selectedSlot && (
        <div className="mt-4 p-3 bg-gradient-to-r from-primary-50 to-orange-50 rounded-xl border border-primary-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-700">
                {dateLabel} à {formatTime(selectedSlot.time)}
              </p>
              {schedules.length > 1 && (
                <p className="text-sm text-primary-600 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {selectedSlot.locationName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
        <div className="flex justify-between text-gray-500">
          <span>Sous-total</span>
          <span className="font-medium">{formatPrice(total)}</span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-success-600">
            <span>Code promo</span>
            <span className="font-medium">-{formatPrice(promoDiscount)}</span>
          </div>
        )}
        {dealDiscount > 0 && dealName && (
          <div className="flex justify-between text-success-600">
            <span>Offre : {dealName}</span>
            <span className="font-medium">-{formatPrice(dealDiscount)}</span>
          </div>
        )}
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between text-success-600">
            <span>Récompense fidélité</span>
            <span className="font-medium">-{formatPrice(loyaltyDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <span className="font-bold text-anthracite">Total</span>
          <span className="font-bold text-primary-500 text-xl">{formatPrice(finalTotal)}</span>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryCard;

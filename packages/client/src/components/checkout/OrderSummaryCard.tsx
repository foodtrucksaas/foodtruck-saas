import { Minus, Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { formatPrice, formatTime } from '@foodtruck/shared';
import type { CartItem, AppliedOfferDetail } from '@foodtruck/shared';
import type { SlotWithLocation, ScheduleWithLocation } from '../../hooks';

interface OrderSummaryCardProps {
  items: CartItem[];
  total: number;
  promoDiscount: number;
  loyaltyDiscount: number;
  appliedOffers: AppliedOfferDetail[];
  finalTotal: number;
  selectedDate: Date;
  selectedSlot: SlotWithLocation | undefined;
  schedules: ScheduleWithLocation[];
  getCartKey: (menuItemId: string, selectedOptions?: any[]) => string;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onRemoveItem: (key: string) => void;
}

export function OrderSummaryCard({
  items,
  total,
  promoDiscount,
  loyaltyDiscount,
  appliedOffers,
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

  const totalSavings = appliedOffers.reduce((sum, o) => sum + o.discount_amount, 0) + promoDiscount + loyaltyDiscount;

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.9) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(255,107,53,0.05) 0%, transparent 50%)',
        }}
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Votre commande</h2>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {items.reduce((sum, i) => sum + i.quantity, 0)} articles
          </span>
        </div>

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
              <div
                key={cartKey}
                className="group flex items-center gap-4 p-3 -mx-3 rounded-2xl transition-all duration-200 hover:bg-white/60"
              >
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.menuItem.name}</p>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.selectedOptions.map((opt, idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100/80 rounded-full"
                            >
                              {opt.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-400 italic mt-1.5 truncate">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(cartKey, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-150 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-gray-900 tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(cartKey, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white flex items-center justify-center transition-all duration-150 active:scale-95 shadow-sm shadow-primary-500/25"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(cartKey)}
                    className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 flex items-center justify-center transition-all duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pickup info - Floating pill */}
        {selectedSlot && (
          <div className="mt-5">
            <div
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(255,138,101,0.08) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-orange-500 flex items-center justify-center shadow-sm">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {dateLabel} · {formatTime(selectedSlot.time)}
                </p>
                {schedules.length > 1 && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedSlot.locationName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        {/* Pricing breakdown */}
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Articles</span>
            <span className="text-sm font-medium text-gray-700 tabular-nums">{formatPrice(total)}</span>
          </div>

          {/* Applied offers */}
          {appliedOffers.length > 0 && (
            <div className="space-y-2">
              {appliedOffers.map((offer) => (
                <div
                  key={offer.offer_id}
                  className="flex items-center justify-between gap-3"
                >
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{
                      background: offer.offer_type === 'buy_x_get_y'
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.08) 100%)'
                        : 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(124,58,237,0.08) 100%)',
                    }}
                  >
                    <span className="text-base">
                      {offer.offer_type === 'buy_x_get_y' ? '🎁' : '✨'}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {offer.offer_name}
                      {offer.times_applied > 1 && (
                        <span className="text-gray-400 ml-1">×{offer.times_applied}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                    -{formatPrice(offer.discount_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Loyalty */}
          {loyaltyDiscount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)',
                }}
              >
                <span className="text-base">⭐</span>
                <span className="text-xs font-medium text-gray-700">Fidélité</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                -{formatPrice(loyaltyDiscount)}
              </span>
            </div>
          )}

          {/* Promo code */}
          {promoDiscount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(37,99,235,0.08) 100%)',
                }}
              >
                <span className="text-base">🏷️</span>
                <span className="text-xs font-medium text-gray-700">Code promo</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                -{formatPrice(promoDiscount)}
              </span>
            </div>
          )}
        </div>

        {/* Total savings badge */}
        {totalSavings > 0 && (
          <div className="mt-4 flex justify-center">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-700"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)',
              }}
            >
              <span>🎉</span>
              <span>Vous économisez {formatPrice(totalSavings)}</span>
            </div>
          </div>
        )}

        {/* Final total - Hero section */}
        <div
          className="mt-5 p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,138,101,0.05) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Montant estimé</p>
              <p className="text-[10px] text-gray-400 mt-0.5">à régler sur place</p>
            </div>
            <p
              className="text-3xl font-bold tabular-nums"
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {formatPrice(finalTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryCard;

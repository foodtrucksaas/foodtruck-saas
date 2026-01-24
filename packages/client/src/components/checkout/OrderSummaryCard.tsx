import { useState } from 'react';
import { Minus, Plus, X, Tag, Check, Loader2 } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type {
  CartItem,
  AppliedOfferDetail,
  CustomerLoyaltyInfo,
  SelectedOption,
} from '@foodtruck/shared';

interface OrderSummaryCardProps {
  items: CartItem[];
  total: number;
  promoDiscount: number;
  loyaltyDiscount: number;
  appliedOffers: AppliedOfferDetail[];
  finalTotal: number;
  getCartKey: (menuItemId: string, selectedOptions?: SelectedOption[]) => string;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onRemoveItem: (key: string) => void;
  // Loyalty props
  loyaltyInfo?: CustomerLoyaltyInfo | null;
  loyaltyLoading?: boolean;
  loyaltyOptIn?: boolean;
  useLoyaltyReward?: boolean;
  onToggleUseLoyaltyReward?: (use: boolean) => void;
  // Promo code props
  showPromoSection?: boolean;
  promoCode?: string;
  onPromoCodeChange?: (code: string) => void;
  onValidatePromoCode?: () => void;
  onRemovePromo?: () => void;
  promoLoading?: boolean;
  promoError?: string | null;
  appliedPromo?: {
    code: string;
    discountType: string;
    discountValue: number;
    discount: number;
  } | null;
}

export function OrderSummaryCard({
  items,
  total,
  promoDiscount,
  loyaltyDiscount,
  appliedOffers,
  finalTotal,
  getCartKey,
  onUpdateQuantity,
  onRemoveItem,
  // Loyalty
  loyaltyInfo,
  loyaltyLoading,
  loyaltyOptIn,
  useLoyaltyReward,
  onToggleUseLoyaltyReward,
  // Promo
  showPromoSection,
  promoCode = '',
  onPromoCodeChange,
  onValidatePromoCode,
  onRemovePromo,
  promoLoading,
  promoError,
  appliedPromo,
}: OrderSummaryCardProps) {
  const [showPromoInput, setShowPromoInput] = useState(false);

  const totalSavings =
    appliedOffers.reduce((sum, o) => sum + o.discount_amount, 0) + promoDiscount + loyaltyDiscount;
  const hasDiscounts = totalSavings > 0;

  // Loyalty calculations
  const currentPoints = loyaltyInfo?.loyalty_points || 0;
  const threshold = loyaltyInfo?.loyalty_threshold || 50;
  const pointsPerEuro = loyaltyInfo?.loyalty_points_per_euro || 1;
  const orderTotalAfterDiscount = Math.max(0, total - promoDiscount - loyaltyDiscount);
  const pointsToEarn = Math.floor((orderTotalAfterDiscount / 100) * pointsPerEuro);
  const futurePoints = currentPoints + pointsToEarn;
  const willReachReward = futurePoints >= threshold && !loyaltyInfo?.can_redeem;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Votre commande</h2>
          <span className="text-xs text-gray-400">
            {items.reduce((s, i) => s + i.quantity, 0)} articles
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {items.map((item) => {
          const cartKey = getCartKey(item.menuItem.id, item.selectedOptions);
          const sizeOption = item.selectedOptions?.find((opt) => opt.isSizeOption);
          const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;
          const supplementsTotal =
            item.selectedOptions?.reduce(
              (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier),
              0
            ) || 0;
          const itemTotal = (basePrice + supplementsTotal) * item.quantity;

          // Only show non-default options
          const meaningfulOptions = item.selectedOptions?.filter(
            (opt) => opt.priceModifier !== 0 || opt.isSizeOption
          );
          const optionsText = meaningfulOptions?.map((opt) => opt.name).join(', ');

          return (
            <div
              key={cartKey}
              className="flex items-center gap-3 px-4 py-3 group transition-all duration-200 hover:bg-gray-50"
            >
              {/* Quantity stepper */}
              <div className="flex items-center bg-gray-100 rounded-lg transition-all duration-200 hover:bg-gray-200">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(cartKey, item.quantity - 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums transition-all">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(cartKey, item.quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{item.menuItem.name}</p>
                {optionsText && <p className="text-xs text-gray-400 truncate">{optionsText}</p>}
              </div>

              {/* Price */}
              <p className="font-semibold text-gray-900 text-sm tabular-nums">
                {formatPrice(itemTotal)}
              </p>

              {/* Remove button - always visible on mobile, hover on desktop */}
              <button
                type="button"
                onClick={() => onRemoveItem(cartKey)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="bg-gray-50 px-4 py-3 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sous-total</span>
          <span className="text-gray-700 tabular-nums">{formatPrice(total)}</span>
        </div>

        {/* Discounts */}
        {appliedOffers.map((offer) => (
          <div key={offer.offer_id} className="flex justify-between text-sm">
            <span className="text-emerald-600 truncate pr-2">
              {offer.offer_name}
              {offer.times_applied > 1 && (
                <span className="opacity-60"> ×{offer.times_applied}</span>
              )}
            </span>
            <span className="text-emerald-600 font-medium tabular-nums whitespace-nowrap">
              −{formatPrice(offer.discount_amount)}
            </span>
          </div>
        ))}
        {/* Only show loyalty discount here if NOT showing the checkbox (which already displays it) */}
        {loyaltyDiscount > 0 && !loyaltyInfo?.can_redeem && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Fidélité</span>
            <span className="text-emerald-600 font-medium tabular-nums">
              −{formatPrice(loyaltyDiscount)}
            </span>
          </div>
        )}
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600">Code promo</span>
            <span className="text-emerald-600 font-medium tabular-nums">
              −{formatPrice(promoDiscount)}
            </span>
          </div>
        )}

        {/* Loyalty Section - Clean minimal design */}
        {loyaltyOptIn && loyaltyInfo && !loyaltyLoading && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {/* Can redeem - checkbox */}
            {loyaltyInfo.can_redeem ? (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useLoyaltyReward}
                      onChange={(e) => onToggleUseLoyaltyReward?.(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center">
                      {useLoyaltyReward && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700">Utiliser ma récompense</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  −{formatPrice(loyaltyInfo.max_discount)}
                </span>
              </label>
            ) : (
              /* Progress display - minimal */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Fidélité{' '}
                    <span className="text-emerald-600 font-medium">+{pointsToEarn} pts</span>
                  </span>
                  <span className="text-xs tabular-nums">
                    <span className="text-gray-600 font-medium">{futurePoints}</span>
                    <span className="text-gray-400">/{threshold} pts</span>
                  </span>
                </div>
                <div className="relative">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (futurePoints / threshold) * 100)}%` }}
                    />
                  </div>
                  {/* Goal marker */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-gray-300 rounded-full" />
                </div>
                <p className="text-xs text-emerald-600 font-medium">
                  {willReachReward
                    ? '🎉 Récompense débloquée à la prochaine commande !'
                    : `Plus que ${threshold - futurePoints} pts pour ${formatPrice(loyaltyInfo.loyalty_reward)} offerts !`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Promo Code Section */}
        {showPromoSection && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {appliedPromo ? (
              <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{appliedPromo.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600">
                    −
                    {appliedPromo.discountType === 'percentage'
                      ? `${appliedPromo.discountValue}%`
                      : formatPrice(appliedPromo.discount)}
                  </span>
                  <button
                    type="button"
                    onClick={onRemovePromo}
                    className="p-1 hover:bg-emerald-100 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                </div>
              </div>
            ) : showPromoInput ? (
              <div className="flex gap-2 animate-fade-in">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => onPromoCodeChange?.(e.target.value.toUpperCase())}
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all duration-200 uppercase"
                  placeholder="CODE PROMO"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onValidatePromoCode}
                  disabled={promoLoading || !promoCode}
                  className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50 transition-all duration-150 active:scale-95"
                >
                  {promoLoading ? <Loader2 className="w-4 h-4 animate-spinner" /> : 'OK'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPromoInput(false);
                    onPromoCodeChange?.('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPromoInput(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Tag className="w-4 h-4" />
                <span>Ajouter un code promo</span>
              </button>
            )}
            {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-end pt-3 mt-3 border-t border-gray-200">
          <div>
            <p className="text-sm font-semibold text-gray-900">Montant estimé</p>
            <p className="text-[10px] text-gray-400">à régler sur place</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              {formatPrice(finalTotal)}
            </p>
            {hasDiscounts && (
              <p className="text-[10px] text-emerald-600 font-medium">
                {formatPrice(totalSavings)} économisés
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryCard;

import { useState, useMemo } from 'react';
import { Minus, Plus, X, Tag, Check, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice, calculateBundlePrice } from '@foodtruck/shared';
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
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  const toggleBundleExpand = (bundleId: string) => {
    setExpandedBundles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bundleId)) {
        newSet.delete(bundleId);
      } else {
        newSet.add(bundleId);
      }
      return newSet;
    });
  };

  const totalSavings =
    appliedOffers.reduce((sum, o) => sum + o.discount_amount, 0) + promoDiscount + loyaltyDiscount;
  const hasDiscounts = totalSavings > 0;

  // Separate manual bundles from regular items
  const manualBundles = items.filter((item) => item.bundleInfo);
  const regularItems = items.filter((item) => !item.bundleInfo);

  // Get auto-detected bundle offers that consume REGULAR cart items (not items inside manual bundles)
  const autoBundleOffers = useMemo(() => {
    const bundleOffers = appliedOffers.filter((offer) => offer.offer_type === 'bundle');

    // Only keep bundles that have at least one consumed item matching a regular cart item
    return bundleOffers.filter((offer) => {
      return offer.items_consumed.some((consumed) =>
        regularItems.some((item) => item.menuItem.id === consumed.menu_item_id)
      );
    });
  }, [appliedOffers, regularItems]);

  // Expand auto bundles with times_applied > 1 into separate display instances
  const expandedAutoBundles = useMemo(() => {
    return autoBundleOffers.flatMap((offer) => {
      if (offer.times_applied <= 1) return [offer];
      const perInstanceItems = offer.items_consumed.map((consumed) => ({
        ...consumed,
        quantity: Math.round(consumed.quantity / offer.times_applied),
      }));
      const discountPerInstance = Math.round(offer.discount_amount / offer.times_applied);
      return Array.from({ length: offer.times_applied }, (_, i) => ({
        ...offer,
        offer_id: `${offer.offer_id}__${i}`,
        items_consumed: perInstanceItems,
        discount_amount: discountPerInstance,
        times_applied: 1,
      }));
    });
  }, [autoBundleOffers]);

  // Build a map of which regular items are consumed by which auto-bundle
  const itemsConsumedByBundle = useMemo(() => {
    const map = new Map<string, { offerId: string; quantityConsumed: number }>();

    for (const offer of autoBundleOffers) {
      for (const consumed of offer.items_consumed) {
        const existing = map.get(consumed.menu_item_id);
        if (existing) {
          existing.quantityConsumed += consumed.quantity;
        } else {
          map.set(consumed.menu_item_id, {
            offerId: offer.offer_id,
            quantityConsumed: consumed.quantity,
          });
        }
      }
    }

    return map;
  }, [autoBundleOffers]);

  // Regular items not consumed by any bundle
  const independentItems = regularItems.filter((item) => {
    const consumed = itemsConsumedByBundle.get(item.menuItem.id);
    return !consumed || consumed.quantityConsumed < item.quantity;
  });

  // Get items consumed by a specific bundle offer
  const getItemsForBundle = (offer: AppliedOfferDetail) => {
    return offer.items_consumed.map((consumed) => {
      const cartItem = regularItems.find((item) => item.menuItem.id === consumed.menu_item_id);
      return {
        ...consumed,
        name: cartItem?.menuItem.name || 'Article',
        cartItem,
      };
    });
  };

  // Build a map of free items from buy_x_get_y offers
  const freeItemsMap = useMemo(() => {
    const map = new Map<string, { freeQty: number; offerName: string }>();
    for (const offer of appliedOffers) {
      if (offer.offer_type === 'buy_x_get_y' && offer.free_item_name && offer.discount_amount > 0) {
        for (const consumed of offer.items_consumed) {
          const cartItem = regularItems.find(
            (item) =>
              item.menuItem.id === consumed.menu_item_id &&
              item.menuItem.name === offer.free_item_name
          );
          if (cartItem) {
            const existing = map.get(consumed.menu_item_id);
            if (existing) {
              existing.freeQty += offer.times_applied;
            } else {
              map.set(consumed.menu_item_id, {
                freeQty: offer.times_applied,
                offerName: offer.offer_name,
              });
            }
            break;
          }
        }
      }
    }
    return map;
  }, [appliedOffers, regularItems]);

  // Visual subtotal: total minus all offer discounts (bundles + free items shown inline)
  const offerTotalDiscount = appliedOffers.reduce((sum, o) => sum + o.discount_amount, 0);
  const visualSubtotal = total - offerTotalDiscount;

  // Remove all constituent items of an auto-detected bundle
  const handleRemoveAutoBundle = (offer: AppliedOfferDetail) => {
    const items = getItemsForBundle(offer);
    for (const bi of items) {
      if (bi.cartItem) {
        const key = getCartKey(bi.cartItem.menuItem.id, bi.cartItem.selectedOptions);
        if (bi.cartItem.quantity <= bi.quantity) {
          onRemoveItem(key);
        } else {
          onUpdateQuantity(key, bi.cartItem.quantity - bi.quantity);
        }
      }
    }
  };

  // Add another instance of an auto-detected bundle (duplicate consumed items)
  const handleAddAutoBundle = (offer: AppliedOfferDetail) => {
    const items = getItemsForBundle(offer);
    for (const bi of items) {
      if (bi.cartItem) {
        const key = getCartKey(bi.cartItem.menuItem.id, bi.cartItem.selectedOptions);
        onUpdateQuantity(key, bi.cartItem.quantity + bi.quantity);
      }
    }
  };

  // Loyalty calculations - use finalTotal (actual amount to pay) for points
  const currentPoints = loyaltyInfo?.loyalty_points || 0;
  // Ensure threshold is never 0 to prevent division by zero
  const threshold =
    loyaltyInfo?.loyalty_threshold && loyaltyInfo.loyalty_threshold > 0
      ? loyaltyInfo.loyalty_threshold
      : 50;
  const pointsPerEuro = loyaltyInfo?.loyalty_points_per_euro || 1;
  const pointsToEarn = Math.floor((finalTotal / 100) * pointsPerEuro);
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
        {/* Auto-detected Bundles - Grouped from regular items */}
        {expandedAutoBundles.map((offer) => {
          const bundleItems = getItemsForBundle(offer);
          const isExpanded = expandedBundles.has(offer.offer_id);
          // Calculate bundle total from config (we show the discounted total)
          const bundleTotal = bundleItems.reduce((sum, bi) => {
            if (!bi.cartItem) return sum;
            const sizeOpt = bi.cartItem.selectedOptions?.find((o) => o.isSizeOption);
            const price = sizeOpt ? sizeOpt.priceModifier : bi.cartItem.menuItem.price;
            return sum + price * bi.quantity;
          }, 0);
          const discountedTotal = bundleTotal - offer.discount_amount / offer.times_applied;

          return (
            <div key={`bundle-${offer.offer_id}`} className="bg-primary-50/30">
              {/* Bundle header */}
              <div className="relative flex items-center gap-3 px-4 py-3 group">
                {/* Quantity stepper */}
                <div className="flex items-center bg-gray-100 rounded-lg transition-all duration-200 hover:bg-gray-200">
                  <button
                    type="button"
                    onClick={() => handleRemoveAutoBundle(offer)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                    aria-label="Réduire la quantité"
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">
                    {offer.times_applied}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddAutoBundle(offer)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>

                {/* Bundle info */}
                <button
                  type="button"
                  onClick={() => toggleBundleExpand(offer.offer_id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <p className="font-medium text-gray-900 text-sm">{offer.offer_name}</p>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {bundleItems.map((bi) => bi.name).join(' + ')}
                  </p>
                </button>

                {/* Price */}
                <p className="font-semibold text-gray-900 text-sm tabular-nums flex-shrink-0">
                  {formatPrice(discountedTotal * offer.times_applied)}
                </p>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveAutoBundle(offer)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                  aria-label="Supprimer"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Expanded bundle details */}
              {isExpanded && (
                <div className="pl-[72px] pr-4 pb-3 space-y-1">
                  {bundleItems.map((bi, idx) => {
                    const optStr =
                      bi.cartItem?.selectedOptions && bi.cartItem.selectedOptions.length > 0
                        ? bi.cartItem.selectedOptions
                            .map((o) => {
                              const mod =
                                !o.isSizeOption && o.priceModifier > 0
                                  ? ` (+${formatPrice(o.priceModifier)})`
                                  : '';
                              return `${o.name}${mod}`;
                            })
                            .join(', ')
                        : '';
                    return (
                      <p key={idx} className="text-xs text-gray-500">
                        <span className="italic">
                          {bi.quantity > 1 && `${bi.quantity}× `}
                          {bi.name}
                        </span>
                        {optStr && <span className="text-gray-400"> ({optStr})</span>}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Manual Bundles (from BundleBuilder) */}
        {manualBundles.map((item) => {
          const cartKey = getCartKey(item.menuItem.id, item.selectedOptions);
          const bundleInfo = item.bundleInfo!;
          const { total: itemTotal } = calculateBundlePrice(bundleInfo, item.quantity);
          const isExpanded = expandedBundles.has(cartKey);

          return (
            <div key={cartKey} className="bg-primary-50/30">
              {/* Bundle header */}
              <div className="relative flex items-center gap-3 px-4 py-3 group">
                {/* Quantity stepper */}
                <div className="flex items-center bg-gray-100 rounded-lg transition-all duration-200 hover:bg-gray-200">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(cartKey, item.quantity - 1)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                    aria-label="Réduire la quantité"
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(cartKey, item.quantity + 1)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>

                {/* Bundle info */}
                <button
                  type="button"
                  onClick={() => toggleBundleExpand(cartKey)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <p className="font-medium text-gray-900 text-sm">{bundleInfo.bundleName}</p>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {bundleInfo.selections.map((s) => s.menuItem.name).join(' + ')}
                  </p>
                </button>

                {/* Price */}
                <p className="font-semibold text-gray-900 text-sm tabular-nums flex-shrink-0">
                  {formatPrice(itemTotal)}
                </p>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(cartKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                  aria-label="Supprimer"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Expanded bundle details */}
              {isExpanded && (
                <div className="pl-[72px] pr-4 pb-3 space-y-1">
                  {bundleInfo.selections.map((sel, idx) => {
                    const optStr =
                      sel.selectedOptions && sel.selectedOptions.length > 0
                        ? sel.selectedOptions
                            .map((o) => {
                              const mod =
                                !o.isSizeOption && o.priceModifier > 0
                                  ? ` (+${formatPrice(o.priceModifier)})`
                                  : '';
                              return `${o.name}${mod}`;
                            })
                            .join(', ')
                        : '';
                    return (
                      <p key={idx} className="text-xs text-gray-500">
                        <span className="italic">{sel.menuItem.name}</span>
                        {optStr && <span className="text-gray-400"> ({optStr})</span>}
                        {sel.supplement > 0 && (
                          <span className="text-amber-600 ml-1">
                            +{formatPrice(sel.supplement)}
                          </span>
                        )}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Independent items (not part of any bundle) */}
        {independentItems.map((item) => {
          const consumed = itemsConsumedByBundle.get(item.menuItem.id);
          const displayQuantity = consumed
            ? item.quantity - consumed.quantityConsumed
            : item.quantity;

          if (displayQuantity <= 0) return null;

          const cartKey = getCartKey(item.menuItem.id, item.selectedOptions);
          const sizeOption = item.selectedOptions?.find((opt) => opt.isSizeOption);
          const basePrice = sizeOption ? sizeOption.priceModifier : item.menuItem.price;
          const supplementsTotal =
            item.selectedOptions?.reduce(
              (sum, opt) => sum + (opt.isSizeOption ? 0 : opt.priceModifier),
              0
            ) || 0;
          const unitPrice = basePrice + supplementsTotal;

          // Check if some quantity is free via buy_x_get_y
          const freeInfo = freeItemsMap.get(item.menuItem.id);
          const freeQty = freeInfo ? Math.min(freeInfo.freeQty, displayQuantity) : 0;
          const paidQty = displayQuantity - freeQty;
          const itemTotal = unitPrice * paidQty;

          const optionsText = item.selectedOptions
            ?.map((opt) => {
              const mod =
                !opt.isSizeOption && opt.priceModifier > 0
                  ? ` (+${formatPrice(opt.priceModifier)})`
                  : '';
              return `${opt.name}${mod}`;
            })
            .join(', ');

          return (
            <div
              key={cartKey}
              className="relative flex items-center gap-3 px-4 py-3 group transition-all duration-200 hover:bg-gray-50"
            >
              {/* Quantity stepper */}
              <div className="flex items-center bg-gray-100 rounded-lg transition-all duration-200 hover:bg-gray-200">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(cartKey, item.quantity - 1)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                  aria-label="Réduire la quantité"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums transition-all">
                  {consumed ? `${displayQuantity}` : item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(cartKey, item.quantity + 1)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all active:scale-90"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{item.menuItem.name}</p>
                {optionsText && <p className="text-xs text-gray-400 truncate">{optionsText}</p>}
                {freeQty > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">{freeInfo!.offerName}</p>
                )}
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                {freeQty > 0 && freeQty >= displayQuantity ? (
                  /* All items are free */
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-400 line-through tabular-nums">
                      {formatPrice(unitPrice * displayQuantity)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      Offert
                    </span>
                  </div>
                ) : freeQty > 0 ? (
                  /* Some items free, some paid */
                  <div>
                    <p className="font-semibold text-gray-900 text-sm tabular-nums">
                      {formatPrice(itemTotal)}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-gray-400 line-through tabular-nums">
                        {formatPrice(unitPrice * freeQty)}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">
                        Offert
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-gray-900 text-sm tabular-nums">
                    {formatPrice(itemTotal)}
                  </p>
                )}
              </div>

              {/* Remove button - always visible on mobile, hover on desktop */}
              <button
                type="button"
                onClick={() => onRemoveItem(cartKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-red-500 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                aria-label="Supprimer"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Totals - pr-[72px] aligns prices with item prices (accounting for X button + gap) */}
      <div className="bg-gray-50 px-4 py-3 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sous-total</span>
          <span className="text-gray-700 tabular-nums">{formatPrice(visualSubtotal)}</span>
        </div>

        {/* Discounts (excluding bundles and buy_x_get_y shown inline) */}
        {appliedOffers
          .filter((offer) => offer.offer_type !== 'bundle' && offer.offer_type !== 'buy_x_get_y')
          .map((offer) => (
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
              <div className="space-y-2">
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
                {pointsToEarn > 0 && (
                  <p className="text-xs text-gray-500 pl-7">
                    Cette commande vous rapporte{' '}
                    <span className="text-emerald-600 font-medium">+{pointsToEarn} pts</span>
                  </p>
                )}
              </div>
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
                    ? `🎉 Récompense atteinte ! ${formatPrice(loyaltyInfo.loyalty_reward)} seront déduits lors de votre prochaine commande`
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
                    aria-label="Retirer le code promo"
                    className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-emerald-100 rounded-full transition-colors"
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
                  className="px-4 py-2 min-h-[44px] rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50 transition-all duration-150 active:scale-95"
                >
                  {promoLoading ? <Loader2 className="w-4 h-4 animate-spinner" /> : 'OK'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPromoInput(false);
                    onPromoCodeChange?.('');
                  }}
                  aria-label="Annuler"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPromoInput(true)}
                className="flex items-center gap-2 w-full bg-white hover:bg-gray-100 rounded-lg px-3 py-2.5 min-h-[44px] text-sm text-gray-500 hover:text-gray-700 border border-gray-200 border-dashed transition-colors active:scale-[0.98]"
              >
                <Tag className="w-4 h-4" />
                <span>Ajouter un code promo</span>
              </button>
            )}
            {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
          </div>
        )}

        {/* Total */}
        <div className="mt-3 bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm font-semibold text-gray-900">Montant estimé</p>
              <p className="text-xs text-gray-400">à régler sur place</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 tabular-nums">
                {formatPrice(finalTotal)}
              </p>
              {hasDiscounts && (
                <p className="text-xs text-emerald-600 font-medium">
                  {formatPrice(totalSavings)} économisés
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryCard;

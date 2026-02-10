import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, ArrowLeft, MapPin, Package } from 'lucide-react';
import { formatPrice, formatDateTime, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

interface OfferUse {
  id: string;
  offer_id: string;
  discount_amount: number;
  free_item_name: string | null;
  offer: {
    name: string;
    offer_type: string;
    config: Record<string, unknown>;
    offer_items: Array<{
      menu_item_id: string;
      role: string;
      quantity: number;
      menu_item: { category_id: string } | null;
    }>;
  } | null;
}

type OrderWithOffers = OrderWithItemsAndOptions & {
  offer_uses?: OfferUse[];
  offer_discount?: number;
};

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderWithOffers | null>(null);
  const [loading, setLoading] = useState(true);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(
            `
            *,
            order_items (
              *,
              menu_item:menu_items (*),
              order_item_options (*)
            ),
            offer_uses (
              id, offer_id, discount_amount, free_item_name,
              offer:offers (name, offer_type, config, offer_items (menu_item_id, role, quantity))
            )
          `
          )
          .eq('id', orderId)
          .single();

        if (isMounted) {
          if (error) {
            console.error('Error fetching order:', error);
          } else {
            setOrder(data as unknown as OrderWithOffers);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOrder();

    // Subscribe to realtime updates with error handling
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (isMounted) {
            setOrder((prev) => (prev ? { ...prev, ...payload.new } : null));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for order:', orderId);
        }
      });

    return () => {
      isMounted = false;
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Parse offer_uses into structured data (hooks must be before early returns)
  const offerUses = useMemo(() => order?.offer_uses || [], [order?.offer_uses]);
  const orderItems = order?.order_items || [];

  // Group items into: manual bundles, auto bundles, free items, independent
  const {
    manualBundleGroups,
    autoBundleGroups,
    freeItemIds,
    freeOfferNames,
    independentItems,
    promoOffers,
  } = useMemo(() => {
    // 1. Manual bundles: identified by notes field "[BundleName]"
    const manualGroups: {
      name: string;
      items: typeof orderItems;
      totalPrice: number;
    }[] = [];
    const manualBundleItemIds = new Set<string>();

    const bundleMap = new Map<string, { items: typeof orderItems; totalPrice: number }>();

    for (const item of orderItems) {
      const match = item.notes?.match(/^\[(.+)\]$/);
      if (match) {
        const bundleName = match[1];
        manualBundleItemIds.add(item.id);
        const existing = bundleMap.get(bundleName);
        if (existing) {
          existing.items.push(item);
          existing.totalPrice += item.unit_price * item.quantity;
        } else {
          bundleMap.set(bundleName, {
            items: [item],
            totalPrice: item.unit_price * item.quantity,
          });
        }
      }
    }

    for (const [name, data] of bundleMap) {
      manualGroups.push({ name, ...data });
    }

    // 2. Free items from buy_x_get_y (detect BEFORE bundles so they aren't claimed)
    const freeIds = new Set<string>();
    const freeOfferNames = new Map<string, string>(); // itemId -> offer name
    const buyXgetYUses = offerUses.filter(
      (u) => u.offer?.offer_type === 'buy_x_get_y' && u.free_item_name
    );
    for (const use of buyXgetYUses) {
      const match = orderItems.find(
        (item) =>
          item.menu_item.name === use.free_item_name &&
          !manualBundleItemIds.has(item.id) &&
          !freeIds.has(item.id)
      );
      if (match) {
        freeIds.add(match.id);
        freeOfferNames.set(match.id, use.offer?.name || 'Offre');
      }
    }

    // 3. Auto-detected bundles from offer_uses (offer_type = 'bundle')
    const autoGroups: {
      name: string;
      discount: number;
      fixedPrice: number;
      items: Array<{
        name: string;
        quantity: number;
        originalPrice: number;
        order_item_options?: Array<{
          option_name: string;
          option_group_name: string;
          price_modifier: number;
        }>;
      }>;
    }[] = [];
    const autoBundleItemIds = new Set<string>();

    // Group bundle uses by offer_id to split items across instances
    const bundleUses = offerUses.filter((u) => u.offer?.offer_type === 'bundle');
    const bundleUsesByOffer = new Map<string, typeof bundleUses>();
    for (const use of bundleUses) {
      const id = use.offer_id;
      if (!bundleUsesByOffer.has(id)) bundleUsesByOffer.set(id, []);
      bundleUsesByOffer.get(id)!.push(use);
    }

    for (const [, uses] of bundleUsesByOffer) {
      const firstUse = uses[0];
      if (!firstUse.offer) continue;
      const config = firstUse.offer.config as {
        fixed_price?: number;
        bundle_categories?: Array<{
          category_id?: string;
          category_ids?: string[];
          quantity?: number;
        }>;
      };
      const numInstances = uses.length;

      // Use bundle_categories from config to match the right items per category
      const bundleCats = config?.bundle_categories || [];
      const allMatchedItems: typeof orderItems = [];

      if (bundleCats.length > 0) {
        // Match items per category as the optimization algorithm does
        for (const cat of bundleCats) {
          // Support both single category_id and array category_ids
          const catIds: string[] = [];
          if (cat.category_id) catIds.push(cat.category_id);
          if (cat.category_ids) catIds.push(...cat.category_ids);
          const qtyPerInstance = cat.quantity || 1;
          const totalNeeded = qtyPerInstance * numInstances;

          // Find eligible items from this category, sorted by price desc (most expensive first)
          const eligible = orderItems
            .filter(
              (item) =>
                catIds.includes(item.menu_item?.category_id || '') &&
                !manualBundleItemIds.has(item.id) &&
                !freeIds.has(item.id) &&
                !autoBundleItemIds.has(item.id)
            )
            .sort((a, b) => b.unit_price - a.unit_price);

          // Expand items with qty > 1 into individual units
          const expandedEligible: (typeof orderItems)[0][] = [];
          for (const item of eligible) {
            for (let q = 0; q < item.quantity; q++) {
              expandedEligible.push({ ...item, quantity: 1 });
            }
          }

          // Take only the needed amount
          for (let j = 0; j < Math.min(expandedEligible.length, totalNeeded); j++) {
            autoBundleItemIds.add(expandedEligible[j].id);
            allMatchedItems.push(expandedEligible[j]);
          }
        }
      } else {
        // Fallback: use offer_items menu_item_ids (less precise)
        const bundleMenuItemIds = new Set(
          (firstUse.offer.offer_items || []).map((oi) => oi.menu_item_id)
        );
        for (const item of orderItems) {
          if (
            bundleMenuItemIds.has(item.menu_item_id) &&
            !manualBundleItemIds.has(item.id) &&
            !freeIds.has(item.id) &&
            !autoBundleItemIds.has(item.id)
          ) {
            autoBundleItemIds.add(item.id);
            allMatchedItems.push(item);
          }
        }
      }

      if (numInstances <= 1) {
        // Single instance
        autoGroups.push({
          name: firstUse.offer.name,
          discount: firstUse.discount_amount,
          fixedPrice: config?.fixed_price || 0,
          items: allMatchedItems.map((item) => ({
            name: item.menu_item.name,
            quantity: item.quantity,
            originalPrice: item.menu_item.price,
            order_item_options: item.order_item_options,
          })),
        });
      } else {
        // Multiple instances - distribute items across bundles by category
        const byCategory = new Map<string, (typeof orderItems)[0][]>();
        for (const item of allMatchedItems) {
          const cat = item.menu_item?.category_id || 'unknown';
          if (!byCategory.has(cat)) byCategory.set(cat, []);
          byCategory.get(cat)!.push(item);
        }

        const categoryGroups = Array.from(byCategory.values());
        for (let i = 0; i < numInstances; i++) {
          let instanceItems: (typeof orderItems)[0][];
          if (categoryGroups.length > 1) {
            instanceItems = categoryGroups.map((group) => group[i]).filter(Boolean);
          } else {
            const perInstance = Math.ceil(allMatchedItems.length / numInstances);
            instanceItems = allMatchedItems.slice(i * perInstance, (i + 1) * perInstance);
          }

          autoGroups.push({
            name: firstUse.offer.name,
            discount: uses[i]?.discount_amount || 0,
            fixedPrice: config?.fixed_price || 0,
            items: instanceItems.map((item) => ({
              name: item.menu_item.name,
              quantity: 1,
              originalPrice: item.menu_item.price,
              order_item_options: item.order_item_options,
            })),
          });
        }
      }
    }

    // 4. Remaining independent items
    const independent = orderItems.filter(
      (item) => !manualBundleItemIds.has(item.id) && !autoBundleItemIds.has(item.id)
    );

    // 5. Promo/threshold offers (for discount lines)
    const promos = offerUses.filter(
      (u) => u.offer?.offer_type !== 'bundle' && u.offer?.offer_type !== 'buy_x_get_y'
    );

    return {
      manualBundleGroups: manualGroups,
      autoBundleGroups: autoGroups,
      freeItemIds: freeIds,
      freeOfferNames: freeOfferNames,
      independentItems: independent,
      promoOffers: promos,
    };
  }, [orderItems, offerUses]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
        aria-label="Chargement en cours"
      >
        <div
          className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"
          aria-hidden="true"
        />
        <span className="sr-only">Chargement de la commande</span>
      </div>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Commande non trouvee</p>
        <Link
          to="/"
          className="btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Retour a l'accueil
        </Link>
      </main>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';

  // Discount breakdown
  // discount_amount = promo + loyalty + offer discounts (all combined by checkout)
  // offer_discount = just the offer/bundle part (stored separately)
  const discountAmount = order.discount_amount || 0;
  const offerDiscount = order.offer_discount || 0;
  // Promo discount from promo_code_uses (if applicable)
  const promoDiscountTotal = promoOffers.reduce((sum, u) => sum + (u.discount_amount || 0), 0);
  // Loyalty = total discount - offer discount - promo discount
  const loyaltyDiscount = Math.max(0, discountAmount - offerDiscount - promoDiscountTotal);
  const totalSavings = discountAmount;
  const subtotal = order.order_items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const hasDiscounts = loyaltyDiscount > 0 || promoOffers.length > 0;

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Retour a l'accueil"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-semibold">Commande {formatOrderId(order.id)}</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 animate-fade-in-up">
        {/* Success/Cancelled Banner */}
        {success && (
          <div
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-bounce-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="w-6 h-6 text-green-500" aria-hidden="true" />
            <div>
              <p className="font-medium text-green-800">Paiement reussi !</p>
              <p className="text-sm text-green-600">Votre commande a ete confirmee.</p>
            </div>
          </div>
        )}

        {cancelled && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up"
            role="alert"
            aria-live="assertive"
          >
            <XCircle className="w-6 h-6 text-red-500" aria-hidden="true" />
            <div>
              <p className="font-medium text-red-800">Paiement annule</p>
              <p className="text-sm text-red-600">Votre commande n'a pas ete validee.</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <section
          className="card p-6 transition-all duration-300"
          aria-labelledby="order-status-heading"
        >
          {isCancelled ? (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" aria-hidden="true" />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">
                Commande annulee
              </h2>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <Clock
                className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-status-pulse"
                aria-hidden="true"
              />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">
                En attente de validation
              </h2>
              <p className="text-gray-500 mt-2">
                Le food truck va confirmer votre commande. Vous recevrez un email de confirmation.
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="text-center">
              <CheckCircle
                className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce-in"
                aria-hidden="true"
              />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">
                Commande confirmee !
              </h2>
              <p className="text-gray-500 mt-2">
                Rendez-vous au food truck a{' '}
                <span className="font-semibold text-gray-900">
                  {new Date(order.pickup_time).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>{' '}
                pour recuperer votre commande.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <CheckCircle
                className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce-in"
                aria-hidden="true"
              />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">
                Commande traitee
              </h2>
            </div>
          )}
        </section>

        {/* Order Details */}
        <section className="card p-4" aria-labelledby="order-details-heading">
          <h2 id="order-details-heading" className="font-semibold text-gray-900 mb-3">
            Details de la commande
          </h2>
          <div className="space-y-3">
            {/* Manual bundles (BundleBuilder) */}
            {manualBundleGroups.map((bundle, idx) => (
              <div key={`manual-bundle-${idx}`} className="bg-primary-50/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm">{bundle.name}</span>
                  </div>
                  <span className="font-semibold text-sm tabular-nums">
                    {formatPrice(bundle.totalPrice)}
                  </span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {bundle.items.map((item) => (
                    <div key={item.id}>
                      <p className="text-xs text-gray-500">
                        {item.quantity > 1 && `${item.quantity}× `}
                        {item.menu_item.name}
                      </p>
                      {item.order_item_options && item.order_item_options.length > 0 && (
                        <p className="text-[11px] text-gray-400 pl-2">
                          {item.order_item_options
                            .map((o) => {
                              const mod =
                                o.price_modifier > 0 ? ` (+${formatPrice(o.price_modifier)})` : '';
                              return `${o.option_name}${mod}`;
                            })
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Auto-detected bundles */}
            {autoBundleGroups.map((bundle, idx) => (
              <div key={`auto-bundle-${idx}`} className="bg-primary-50/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm">{bundle.name}</span>
                  </div>
                  <span className="font-semibold text-sm tabular-nums">
                    {formatPrice(bundle.fixedPrice)}
                  </span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {bundle.items.map((bi, biIdx) => {
                    const optionStr =
                      bi.order_item_options && bi.order_item_options.length > 0
                        ? ` (${bi.order_item_options.map((o) => o.option_name).join(', ')})`
                        : '';
                    return (
                      <p key={biIdx} className="text-xs text-gray-500">
                        {bi.quantity > 1 && `${bi.quantity}× `}
                        {bi.name}
                        {optionStr}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Independent items (including free items) */}
            {independentItems.length > 0 && (
              <ul className="space-y-2" aria-label="Articles commandes">
                {independentItems.map((item) => {
                  const isFree = freeItemIds.has(item.id);
                  const offerName = freeOfferNames.get(item.id);
                  const options = item.order_item_options;
                  const optionStr =
                    options && options.length > 0
                      ? ` (${options.map((o) => o.option_name).join(', ')})`
                      : '';
                  return (
                    <li key={item.id}>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <span className="text-gray-600 text-sm">
                            {item.quantity}x {item.menu_item.name}
                            <span className="text-gray-400">{optionStr}</span>
                          </span>
                          {isFree && offerName && (
                            <p className="text-xs text-emerald-600 font-medium">{offerName}</p>
                          )}
                        </div>
                        {isFree ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm text-gray-400 line-through tabular-nums">
                              {formatPrice(item.unit_price * item.quantity)}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              Offert
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-sm tabular-nums flex-shrink-0">
                            {formatPrice(item.unit_price * item.quantity)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-3 mt-3 space-y-1.5">
            {hasDiscounts && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span className="text-gray-500 tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                {promoOffers.map((u) => (
                  <div key={u.id} className="flex justify-between text-sm">
                    <span className="text-emerald-600">{u.offer?.name || 'Promo'}</span>
                    <span className="text-emerald-600 font-medium tabular-nums">
                      −{formatPrice(u.discount_amount)}
                    </span>
                  </div>
                ))}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Fidélité</span>
                    <span className="text-emerald-600 font-medium tabular-nums">
                      −{formatPrice(loyaltyDiscount)}
                    </span>
                  </div>
                )}
              </>
            )}
            <div
              className={`flex justify-between ${hasDiscounts ? 'pt-1.5 border-t border-gray-100' : ''}`}
            >
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-primary-600 tabular-nums">
                {formatPrice(order.total_amount)}
              </span>
            </div>
            {totalSavings > 0 && (
              <p className="text-xs text-emerald-600 font-medium text-right">
                {formatPrice(totalSavings)} économisés
              </p>
            )}
          </div>
        </section>

        {/* Pickup Info */}
        <section className="card p-4" aria-labelledby="pickup-info-heading">
          <h2 id="pickup-info-heading" className="font-semibold text-gray-900 mb-3">
            Retrait
          </h2>
          <div className="space-y-2 text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" aria-hidden="true" />
              <span>{formatDateTime(order.pickup_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" aria-hidden="true" />
              <span>Client : {order.customer_name}</span>
            </div>
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3" role="note">
            <p className="text-sm text-amber-800">
              <strong>Montant a regler sur place :</strong> {formatPrice(order.total_amount)}
            </p>
          </div>
        </section>

        {/* Back to Menu */}
        <Link
          to={`/${order.foodtruck_id}`}
          className="btn-secondary w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Voir le menu
        </Link>
      </div>
    </main>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, ArrowLeft, MapPin, Package } from 'lucide-react';
import { formatPrice, formatDateTime, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

interface OfferUse {
  id: string;
  discount_amount: number;
  free_item_name: string | null;
  offer: { name: string; offer_type: string } | null;
}

type OrderWithOffers = OrderWithItemsAndOptions & {
  offer_uses?: OfferUse[];
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
              id, discount_amount, free_item_name,
              offer:offers (name, offer_type)
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

  const bundleOffers = useMemo(() => {
    const bundles: { name: string; discount: number }[] = [];
    const bundleUses = offerUses.filter((u) => u.offer?.offer_type === 'bundle');
    if (bundleUses.length === 0) return bundles;

    const byOffer = new Map<string, { name: string; totalDiscount: number }>();
    for (const u of bundleUses) {
      const name = u.offer?.name || 'Formule';
      const existing = byOffer.get(name);
      if (existing) {
        existing.totalDiscount += u.discount_amount || 0;
      } else {
        byOffer.set(name, { name, totalDiscount: u.discount_amount || 0 });
      }
    }

    for (const [, bundle] of byOffer) {
      bundles.push({ name: bundle.name, discount: bundle.totalDiscount });
    }
    return bundles;
  }, [offerUses]);

  // Free items from buy_x_get_y offers
  const freeItemNames = useMemo(() => {
    const names = new Set<string>();
    for (const u of offerUses) {
      if (u.offer?.offer_type === 'buy_x_get_y' && u.free_item_name) {
        names.add(u.free_item_name);
      }
    }
    return names;
  }, [offerUses]);

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
  const offerDiscountTotal = offerUses.reduce((sum, u) => sum + (u.discount_amount || 0), 0);
  const totalDiscount = order.discount_amount || 0;
  const loyaltyDiscount = Math.max(0, totalDiscount - offerDiscountTotal);
  const promoOffers = offerUses.filter(
    (u) => u.offer?.offer_type !== 'bundle' && u.offer?.offer_type !== 'buy_x_get_y'
  );
  const subtotal = order.order_items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const hasDiscounts = totalDiscount > 0;

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
          <div className="space-y-2">
            {/* Bundle offers */}
            {bundleOffers.map((bundle, idx) => (
              <div key={`bundle-${idx}`} className="bg-primary-50/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span className="font-medium text-gray-900 text-sm">{bundle.name}</span>
                </div>
                {bundle.discount > 0 && (
                  <p className="text-xs text-emerald-600 font-medium pl-6">
                    Économie : {formatPrice(bundle.discount)}
                  </p>
                )}
              </div>
            ))}

            {/* Order items */}
            <ul className="space-y-2" aria-label="Articles commandes">
              {order.order_items.map((item) => {
                const isFree = freeItemNames.has(item.menu_item.name) && item.unit_price === 0;
                const options = item.order_item_options?.filter((o) => o.price_modifier !== 0);
                return (
                  <li key={item.id}>
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="text-gray-600 text-sm">
                          {item.quantity}x {item.menu_item.name}
                        </span>
                        {options && options.length > 0 && (
                          <p className="text-xs text-gray-400">
                            {options.map((o) => o.option_name).join(', ')}
                          </p>
                        )}
                      </div>
                      {isFree ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-sm text-gray-400 line-through tabular-nums">
                            {formatPrice(item.menu_item.price * item.quantity)}
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
            {hasDiscounts && (
              <p className="text-xs text-emerald-600 font-medium text-right">
                {formatPrice(totalDiscount)} économisés
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

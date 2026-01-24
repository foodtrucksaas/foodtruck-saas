import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  MapPin,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItems } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (*)
          )
        `)
        .eq('id', orderId)
        .single();

      setOrder(data as OrderWithItems);
      setLoading(false);
    }

    fetchOrder();

    // Subscribe to realtime updates
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
          setOrder((prev) =>
            prev ? { ...prev, ...payload.new } : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Chargement en cours">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">Chargement de la commande</span>
      </div>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Commande non trouvee</p>
        <Link to="/" className="btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
          Retour a l'accueil
        </Link>
      </main>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-11 h-11 flex items-center justify-center -ml-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label="Retour a l'accueil">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-semibold">Commande {formatOrderId(order.id)}</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 animate-fade-in-up">
        {/* Success/Cancelled Banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-bounce-in" role="status" aria-live="polite">
            <CheckCircle className="w-6 h-6 text-green-500" aria-hidden="true" />
            <div>
              <p className="font-medium text-green-800">Paiement reussi !</p>
              <p className="text-sm text-green-600">Votre commande a ete confirmee.</p>
            </div>
          </div>
        )}

        {cancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up" role="alert" aria-live="assertive">
            <XCircle className="w-6 h-6 text-red-500" aria-hidden="true" />
            <div>
              <p className="font-medium text-red-800">Paiement annule</p>
              <p className="text-sm text-red-600">Votre commande n'a pas ete validee.</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <section className="card p-6 transition-all duration-300" aria-labelledby="order-status-heading">
          {isCancelled ? (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" aria-hidden="true" />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">Commande annulee</h2>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-status-pulse" aria-hidden="true" />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">En attente de validation</h2>
              <p className="text-gray-500 mt-2">
                Le food truck va confirmer votre commande. Vous recevrez un email de confirmation.
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce-in" aria-hidden="true" />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">Commande confirmee !</h2>
              <p className="text-gray-500 mt-2">
                Rendez-vous au food truck a{' '}
                <span className="font-semibold text-gray-900">
                  {new Date(order.pickup_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {' '}pour recuperer votre commande.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce-in" aria-hidden="true" />
              <h2 id="order-status-heading" className="text-xl font-bold text-gray-900">Commande traitee</h2>
            </div>
          )}
        </section>

        {/* Order Details */}
        <section className="card p-4" aria-labelledby="order-details-heading">
          <h2 id="order-details-heading" className="font-semibold text-gray-900 mb-3">Details de la commande</h2>
          <ul className="space-y-3" aria-label="Articles commandes">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span className="text-gray-600">
                  {item.quantity}x {item.menu_item.name}
                </span>
                <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-primary-600">{formatPrice(order.total_amount)}</span>
          </div>
        </section>

        {/* Pickup Info */}
        <section className="card p-4" aria-labelledby="pickup-info-heading">
          <h2 id="pickup-info-heading" className="font-semibold text-gray-900 mb-3">Retrait</h2>
          <div className="space-y-2 text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" aria-hidden="true" />
              <span>{formatDateTime(order.pickup_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" aria-hidden="true" />
              <span>{order.customer_name}</span>
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

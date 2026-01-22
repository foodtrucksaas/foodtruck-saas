import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { formatPrice, formatDateTime, formatOrderId } from '@foodtruck/shared';
import type { OrderWithItems } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;

      setError(null);

      try {
        const { data, error: fetchError } = await supabase
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

        if (fetchError) {
          console.error('Erreur lors du chargement de la commande:', fetchError);
          if (fetchError.code === 'PGRST116') {
            setError('Commande introuvable. Verifiez le lien ou contactez le food truck.');
          } else {
            setError('Impossible de charger votre commande. Veuillez reessayer.');
          }
        } else {
          setOrder(data as OrderWithItems);
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError('Probleme de connexion. Verifiez votre connexion internet.');
      }

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA]">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Oups ! Une erreur est survenue
        </h1>
        <p className="text-gray-500 mb-6 text-center max-w-sm">{error}</p>
        <div className="flex gap-3">
          <Link to="/" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
            Retour a l'accueil
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Commande non trouvee</p>
        <Link to="/" className="btn-primary">
          Retour a l'accueil
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Commande {formatOrderId(order.id)}</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Success/Cancelled Banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Paiement réussi !</p>
              <p className="text-sm text-green-600">Votre commande a été confirmée.</p>
            </div>
          </div>
        )}

        {cancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Paiement annulé</p>
              <p className="text-sm text-red-600">Votre commande n'a pas été validée.</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="card p-6">
          {isCancelled ? (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Commande annulée</h2>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-bold text-gray-900">En attente de validation</h2>
              <p className="text-gray-500 mt-2">
                Le food truck va confirmer votre commande. Vous recevrez un email de confirmation.
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Commande confirmée !</h2>
              <p className="text-gray-500 mt-2">
                Rendez-vous au food truck à{' '}
                <span className="font-semibold text-gray-900">
                  {new Date(order.pickup_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {' '}pour récupérer votre commande.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Commande traitée</h2>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Détails de la commande</h3>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-600">
                  {item.quantity}x {item.menu_item.name}
                </span>
                <span className="font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-primary-600">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Pickup Info */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Retrait</h3>
          <div className="space-y-2 text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              <span>{formatDateTime(order.pickup_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span>{order.customer_name}</span>
            </div>
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Montant à régler sur place :</strong> {formatPrice(order.total_amount)}
            </p>
          </div>
        </div>

        {/* Back to Menu */}
        <Link
          to={`/${order.foodtruck_id}`}
          className="btn-secondary w-full justify-center"
        >
          Voir le menu
        </Link>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Package, Search, AlertCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, formatDateTime, formatOrderId, ORDER_STATUSES } from '@foodtruck/shared';
import { useCart } from '../contexts/CartContext';
import { getSubdomain } from '../lib/subdomain';

const STATUS_COLOR_CLASSES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  picked_up: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
};
import type { Order } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { clearCart, setFoodtruck, addItem } = useCart();
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem('foodtruck-email');
    if (savedEmail) {
      setEmail(savedEmail);
      setSearchEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      if (!searchEmail) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(
            `
            *,
            order_items (
              id, quantity, unit_price, notes,
              menu_item:menu_items (id, name, price, foodtruck_id, is_available, category_id)
            )
          `
          )
          .eq('customer_email', searchEmail)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMountedRef.current) return;

        if (fetchError) {
          throw fetchError;
        }

        setOrders(data || []);
      } catch (err) {
        if (!isMountedRef.current) return;

        console.error('Error fetching orders:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Une erreur est survenue lors du chargement des commandes'
        );
        setOrders([]);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    fetchOrders();
  }, [searchEmail]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      localStorage.setItem('foodtruck-email', email);
      setSearchEmail(email);
    }
  };

  const handleReorder = (order: any) => {
    const items = order.order_items || [];
    const availableItems = items.filter((oi: any) => oi.menu_item && oi.menu_item.is_available);

    if (availableItems.length === 0) {
      toast.error('Les articles de cette commande ne sont plus disponibles');
      return;
    }

    clearCart();
    setFoodtruck(order.foodtruck_id);

    for (const oi of availableItems) {
      addItem(oi.menu_item, oi.quantity);
    }

    if (availableItems.length < items.length) {
      toast('Certains articles ne sont plus disponibles', { icon: '⚠️' });
    } else {
      toast.success('Panier restauré !');
    }

    const subdomain = getSubdomain();
    navigate(subdomain ? '/checkout' : `/${order.foodtruck_id}`);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Mes commandes</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Email Search */}
        <form onSubmit={handleSearch} className="card p-4">
          <label className="label">Votre email</label>
          <div className="flex gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="input flex-1 min-h-[44px] text-base"
              aria-label="Votre email"
            />
            <button
              type="submit"
              className="btn-primary min-w-[44px] min-h-[44px]"
              aria-label="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="card p-4 bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Erreur de chargement</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setSearchEmail(email)}
                  className="btn-secondary mt-3 text-sm"
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        ) : searchEmail && orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande trouvée</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/order/${order.id}`}
                className="card p-4 block active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-gray-900">
                        {formatOrderId(order.id)}
                      </span>
                      {order.status &&
                        ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR_CLASSES[order.status] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].label}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {order.created_at && formatDateTime(order.created_at)}
                    </div>
                  </div>
                  <span className="font-bold text-primary-600">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReorder(order);
                  }}
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Recommander
                </button>
              </Link>
            ))}
          </div>
        ) : !searchEmail ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Entrez votre email pour voir vos commandes</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

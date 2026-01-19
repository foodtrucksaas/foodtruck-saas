import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Package, Search } from 'lucide-react';
import { formatPrice, formatDateTime, formatOrderId, ORDER_STATUSES } from '@foodtruck/shared';
import type { Order } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';

export default function OrderHistory() {
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

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
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', searchEmail)
        .order('created_at', { ascending: false })
        .limit(20);

      setOrders(data || []);
      setLoading(false);
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

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
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
                      {order.status && ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${
                            ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].color
                          }-100 text-${ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].color}-700`}
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

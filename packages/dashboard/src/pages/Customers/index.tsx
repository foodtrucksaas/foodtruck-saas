import {
  Users,
  Mail,
  Phone,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  MapPin,
  ShoppingBag,
  MailCheck,
  MessageSquare,
  Download,
  Gift,
} from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import { useCustomers, formatDate, type FilterSegment } from './useCustomers';
import { CustomersPageSkeleton } from '../../components/Skeleton';

const SEGMENTS = [
  { key: 'all', label: 'Tous' },
  { key: 'opted_in', label: 'Opt-in' },
  { key: 'loyal', label: 'Fidèles' },
  { key: 'inactive', label: 'Inactifs' },
  { key: 'new', label: 'Nouveaux' },
] as const;

export default function Customers() {
  const {
    customers,
    locations,
    loading,
    stats,
    searchQuery,
    setSearchQuery,
    filterSegment,
    setFilterSegment,
    filterLocation,
    setFilterLocation,
    showFilters,
    setShowFilters,
    exportCSV,
  } = useCustomers();

  if (loading) {
    return <CustomersPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Gérez votre base clients et vos campagnes</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          value={stats.total}
          label="Clients total"
        />
        <StatCard
          icon={MailCheck}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          value={stats.emailOptIn}
          label="Opt-in email"
        />
        <StatCard
          icon={MessageSquare}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          value={stats.smsOptIn}
          label="Opt-in SMS"
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          value={stats.active}
          label="Actifs (30j)"
        />
        <StatCard
          icon={ShoppingBag}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          value={stats.loyal}
          label="Fidèles (5+ cmd)"
        />
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95 ${showFilters || filterSegment !== 'all' || filterLocation ? 'bg-primary-50 text-primary-700 border-2 border-primary-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {(filterSegment !== 'all' || filterLocation) && (
              <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {(filterSegment !== 'all' ? 1 : 0) + (filterLocation ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Segment</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map((seg) => (
                  <button
                    key={seg.key}
                    onClick={() => setFilterSegment(seg.key as FilterSegment)}
                    className={`px-3 py-2 min-h-[36px] rounded-xl text-sm font-medium transition-all active:scale-95 ${filterSegment === seg.key ? 'bg-primary-500 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emplacement</label>
              <select
                value={filterLocation || ''}
                onChange={(e) => setFilterLocation(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tous les emplacements</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {customers.length} client{customers.length !== 1 ? 's' : ''} trouvé
        {customers.length !== 1 ? 's' : ''}
      </p>

      {/* Customers List */}
      {customers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun client trouvé</p>
          <p className="text-sm text-gray-400 mt-1">
            Les clients apparaîtront ici après leur première commande
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {customers.map((customer) => (
              <div key={customer.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {customer.name || 'Client anonyme'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors active:scale-95"
                        aria-label="Envoyer un email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone}`}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors active:scale-95"
                        aria-label="Appeler"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{customer.total_orders}</p>
                    <p className="text-xs text-gray-500">Commandes</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatPrice(customer.total_spent)}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-amber-600">
                      {customer.loyalty_points}
                    </p>
                    <p className="text-xs text-gray-500">Points</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(customer.last_order_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    {customer.email_opt_in && (
                      <span
                        className="w-6 h-6 flex items-center justify-center rounded bg-green-100"
                        title="Email opt-in"
                      >
                        <Mail className="w-3 h-3 text-green-600" />
                      </span>
                    )}
                    {customer.sms_opt_in && (
                      <span
                        className="w-6 h-6 flex items-center justify-center rounded bg-blue-100"
                        title="SMS opt-in"
                      >
                        <MessageSquare className="w-3 h-3 text-blue-600" />
                      </span>
                    )}
                  </div>
                </div>
                {customer.customer_locations && customer.customer_locations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {customer.customer_locations.slice(0, 2).map((cl) => (
                      <span
                        key={cl.location_id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600"
                      >
                        <MapPin className="w-3 h-3" />
                        {cl.location?.name}
                      </span>
                    ))}
                    {customer.customer_locations.length > 2 && (
                      <span className="text-xs text-gray-400 py-1">
                        +{customer.customer_locations.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commandes
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total cmd
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opt-in
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière commande
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emplacements
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {customer.name || 'Client anonyme'}
                          </p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                              aria-label="Envoyer un email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone}`}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                              aria-label="Appeler"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
                          {customer.total_orders}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-gray-900">
                          {formatPrice(customer.total_spent)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {customer.loyalty_points > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                            <Gift className="w-3 h-3" />
                            {customer.loyalty_points}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">0</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {customer.email_opt_in && (
                            <span
                              className="w-6 h-6 flex items-center justify-center rounded bg-green-100"
                              title="Email opt-in"
                            >
                              <Mail className="w-3 h-3 text-green-600" />
                            </span>
                          )}
                          {customer.sms_opt_in && (
                            <span
                              className="w-6 h-6 flex items-center justify-center rounded bg-blue-100"
                              title="SMS opt-in"
                            >
                              <MessageSquare className="w-3 h-3 text-blue-600" />
                            </span>
                          )}
                          {!customer.email_opt_in && !customer.sms_opt_in && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(customer.last_order_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {customer.customer_locations?.slice(0, 2).map((cl) => (
                            <span
                              key={cl.location_id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600"
                            >
                              <MapPin className="w-3 h-3" />
                              {cl.location?.name}
                              <span className="text-gray-400">({cl.order_count})</span>
                            </span>
                          ))}
                          {customer.customer_locations &&
                            customer.customer_locations.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{customer.customer_locations.length - 2}
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

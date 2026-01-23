import { useState, useEffect, useRef, ReactNode } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { Calendar, ChevronDown, Download, Clock, MapPin } from 'lucide-react';
import { Package, ShoppingBag, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { formatPrice, safeDivide, safeNumber } from '@foodtruck/shared';
import { useAnalytics, DATE_PRESETS } from './useAnalytics';
import { AnalyticsPageSkeleton } from '../../components/Skeleton';

// Chart wrapper that only renders when container has valid dimensions
function SafeChart({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if container has dimensions
    const checkSize = () => {
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        setHasSize(true);
      }
    };

    // Use ResizeObserver to detect when container gets dimensions
    const observer = new ResizeObserver(checkSize);
    observer.observe(container);

    // Initial check
    checkSize();

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {hasSize && children}
    </div>
  );
}

export default function Analytics() {
  const {
    analytics, loading, preset, setPreset, showPresetDropdown, setShowPresetDropdown,
    customStartDate, setCustomStartDate, customEndDate, setCustomEndDate,
    revenueChange, orderChange, avgChange, revenueData, hourlyData, dayOfWeekData, maxItemRevenue, exportCSV,
  } = useAnalytics();

  if (loading) {
    return <AnalyticsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-600">Analysez les performances de votre food truck</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Calendar className="w-4 h-4" />
              {DATE_PRESETS.find((p) => p.key === preset)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showPresetDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPresetDropdown(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                  {DATE_PRESETS.map((p) => (
                    <button key={p.key} onClick={() => { setPreset(p.key); setShowPresetDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${preset === p.key ? 'text-primary-600 font-medium' : 'text-gray-700'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <span className="text-gray-400">→</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200">
            <Download className="w-4 h-4" />Exporter
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Package} iconBg="bg-green-100" iconColor="text-green-600" label="Montant des commandes" value={formatPrice(analytics?.orderAmount || 0)} change={revenueChange} />
        <KpiCard icon={ShoppingBag} iconBg="bg-blue-100" iconColor="text-blue-600" label="Commandes" value={analytics?.orderCount || 0} change={orderChange} />
        <KpiCard icon={TrendingUp} iconBg="bg-purple-100" iconColor="text-purple-600" label="Panier moyen" value={formatPrice(analytics?.averageOrderValue || 0)} change={avgChange} />
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-gray-500 mb-1">Clients uniques</p><p className="text-2xl font-bold text-gray-900">{analytics?.uniqueCustomers || 0}</p></div>
            <div className="p-2 rounded-lg bg-amber-100"><Users className="w-5 h-5 text-amber-600" /></div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500"><span>{analytics?.returningCustomers || 0} clients fidèles</span></div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution des montants</h2>
          {revenueData.length > 0 ? (
            <SafeChart className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)} €`, 'Montant']} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#ed7b20" strokeWidth={2} dot={{ fill: '#ed7b20', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </SafeChart>
          ) : <p className="text-gray-500 text-center py-12">Pas de données pour cette période</p>}
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Commandes par jour</h2>
          <SafeChart className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value: number, name: string) => [value, name === 'orders' ? 'Commandes' : 'Montant']}
                  labelFormatter={(_: unknown, payload: Array<{ payload?: { fullName?: string } }>) => payload?.[0]?.payload?.fullName || ''}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="orders" fill="#ed7b20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SafeChart>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-gray-400" /><h2 className="text-lg font-semibold text-gray-900">Heures de pointe</h2></div>
          <SafeChart className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis dataKey="label" stroke="#6b7280" fontSize={10} interval={1} />
                <YAxis stroke="#6b7280" fontSize={10} width={30} />
                <Tooltip formatter={(value: number) => [value, 'Commandes']} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SafeChart>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-gray-400" /><h2 className="text-lg font-semibold text-gray-900">Par emplacement</h2></div>
          {analytics?.amountByLocation && analytics.amountByLocation.length > 0 ? (
            <div className="space-y-3">
              {analytics.amountByLocation.slice(0, 5).map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate flex-1">{loc.locationName}</span>
                  <div className="text-right ml-2"><p className="text-sm font-semibold">{formatPrice(safeNumber(loc.amount))}</p><p className="text-xs text-gray-400">{loc.orderCount} cmd</p></div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-8">Aucune donnée</p>}
        </div>
      </div>

      {/* Top Items */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Produits les plus vendus</h2>
        {analytics?.topItems && analytics.topItems.length > 0 ? (
          <div className="space-y-4">
            {analytics.topItems.map((item, index) => {
              const percentage = safeDivide(item.amount, maxItemRevenue) * 100;
              return (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 truncate">{item.menuItemName}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-2">{formatPrice(safeNumber(item.amount))}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-20 text-right">{item.quantity} vendus</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-gray-500 text-center py-8">Aucune vente pour cette période</p>}
      </div>

      {/* Categories Performance */}
      {analytics?.categoryStats && analytics.categoryStats.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance par catégorie</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.categoryStats.map((cat, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900 mb-2">{cat.categoryName || 'Sans catégorie'}</p>
                <p className="text-2xl font-bold text-primary-600">{formatPrice(safeNumber(cat.amount))}</p>
                <p className="text-sm text-gray-500">{cat.quantity} articles vendus</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, change }: {
  icon: React.ElementType; iconBg: string; iconColor: string; label: string; value: string | number; change: number;
}) {
  const displayChange = Number.isFinite(change) ? change : 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-sm text-gray-500 mb-1">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>
        <div className={`p-2 rounded-lg ${iconBg}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
      </div>
      <div className={`flex items-center gap-1 mt-2 text-sm ${displayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {displayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{displayChange >= 0 ? '+' : ''}{displayChange.toFixed(1)}%</span>
        <span className="text-gray-400 ml-1">vs période préc.</span>
      </div>
    </div>
  );
}

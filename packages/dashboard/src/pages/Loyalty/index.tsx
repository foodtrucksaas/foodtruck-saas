import {
  Gift,
  Users,
  TrendingUp,
  Award,
  Settings as SettingsIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import { useLoyalty } from './useLoyalty';

export default function Loyalty() {
  const {
    customers,
    loading,
    stats,
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    settingsLoading,
    toggleEnabled,
    toggleAllowMultiple,
    saveValues,
  } = useLoyalty();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme de fidélité</h1>
          <p className="text-gray-600">Gérez votre programme de fidélité et suivez vos clients</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${settings.loyalty_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
        >
          {settings.loyalty_enabled ? 'Activé' : 'Désactivé'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          value={stats.activeCustomers}
          label="Clients inscrits"
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          value={stats.totalPoints}
          label="Points en circulation"
        />
        <StatCard
          icon={Award}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          value={0}
          label="Récompenses utilisées"
        />
        <StatCard
          icon={Gift}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          value={stats.customersNearThreshold}
          label="Proches du seuil"
        />
      </div>

      {/* Settings */}
      <div className="card">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-4 min-h-[52px] active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Paramètres du programme</span>
          </div>
          {settingsOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {settingsOpen && (
          <div className="px-4 pb-4 space-y-6 border-t border-gray-100 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">Activer la fidélité</p>
                <p className="text-sm text-gray-500 mt-1">
                  {settings.loyalty_enabled
                    ? 'Les clients cumulent des points à chaque commande.'
                    : 'Le programme de fidélité est désactivé.'}
                </p>
              </div>
              <Toggle checked={settings.loyalty_enabled} onChange={toggleEnabled} />
            </div>
            {settings.loyalty_enabled && (
              <>
                <div>
                  <label className="label">Points par euro dépensé</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.loyalty_points_per_euro}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        loyalty_points_per_euro: parseInt(e.target.value) || 1,
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    className="input w-full sm:w-28 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="label">Seuil de récompense (points)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.loyalty_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        loyalty_threshold: parseInt(e.target.value) || 50,
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    className="input w-full sm:w-28 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="label">Récompense (en €)</label>
                  <div className="relative w-full sm:w-32">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={(settings.loyalty_reward / 100).toFixed(2).replace('.', ',')}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                        const parsed = parseFloat(value);
                        setSettings({
                          ...settings,
                          loyalty_reward: !isNaN(parsed) ? Math.round(parsed * 100) : 500,
                        });
                      }}
                      className="input w-full pr-8 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      €
                    </span>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Accepter le cumul de points</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {settings.loyalty_allow_multiple
                        ? 'Les clients peuvent utiliser plusieurs récompenses en une seule commande.'
                        : 'Une seule récompense par commande.'}
                    </p>
                  </div>
                  <Toggle
                    checked={settings.loyalty_allow_multiple}
                    onChange={toggleAllowMultiple}
                  />
                </div>
                <div className="bg-primary-50 rounded-lg p-4">
                  <p className="text-sm text-primary-800">
                    <strong>Résumé :</strong> Vos clients gagnent{' '}
                    <strong>
                      {settings.loyalty_points_per_euro} point
                      {settings.loyalty_points_per_euro > 1 ? 's' : ''}
                    </strong>{' '}
                    par euro dépensé. À <strong>{settings.loyalty_threshold} points</strong>, ils
                    bénéficient de <strong>{formatPrice(settings.loyalty_reward)}</strong> de
                    réduction.
                  </p>
                </div>
                <button
                  onClick={saveValues}
                  disabled={settingsLoading}
                  className="btn-primary min-h-[44px] w-full sm:w-auto active:scale-[0.98]"
                >
                  {settingsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Enregistrer les valeurs'
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Customer Ranking */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Classement clients</h2>
          <p className="text-sm text-gray-500">Clients inscrits au programme de fidélité</p>
        </div>
        {customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun client inscrit au programme</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Points
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Progression
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Commandes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total dépensé
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer, index) => {
                  const progress = Math.min(
                    100,
                    (customer.loyalty_points / settings.loyalty_threshold) * 100
                  );
                  const canRedeem = customer.loyalty_points >= settings.loyalty_threshold;
                  const redeemableCount = settings.loyalty_allow_multiple
                    ? Math.floor(customer.loyalty_points / settings.loyalty_threshold)
                    : canRedeem
                      ? 1
                      : 0;
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${index < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{customer.name || 'Client'}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">
                          {customer.loyalty_points}
                        </span>
                        <span className="text-gray-400 text-sm"> pts</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${canRedeem ? 'bg-green-500' : 'bg-primary-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {canRedeem && (
                            <span className="text-xs font-medium text-green-600">
                              {redeemableCount}x
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {customer.total_orders}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatPrice(customer.total_spent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 ${checked ? 'bg-primary-500' : 'bg-gray-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`}
      />
    </button>
  );
}

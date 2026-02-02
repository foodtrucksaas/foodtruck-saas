import {
  Gift,
  Users,
  TrendingUp,
  Award,
  Settings as SettingsIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Eye,
  Sparkles,
} from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import { useLoyalty } from './useLoyalty';

// Number input with stepper buttons for mobile
function NumberInput({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  suffix,
  prefix,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
}) {
  const decrease = () => {
    const newValue = value - step;
    if (newValue >= min) onChange(newValue);
  };

  const increase = () => {
    const newValue = value + step;
    if (!max || newValue <= max) onChange(newValue);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={decrease}
        disabled={value <= min}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
      >
        <Minus className="w-5 h-5" />
      </button>
      <div className="relative flex-1 min-w-[80px]">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const parsed = parseInt(e.target.value);
            if (!isNaN(parsed) && parsed >= min && (!max || parsed <= max)) {
              onChange(parsed);
            }
          }}
          className={`input w-full text-center min-h-[44px] font-medium ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={increase}
        disabled={max !== undefined && value >= max}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}

// Euro input with stepper
function EuroInput({
  value,
  onChange,
  min = 100,
  step = 100,
}: {
  value: number; // in cents
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  const displayValue = (value / 100).toFixed(2).replace('.', ',');

  const decrease = () => {
    const newValue = value - step;
    if (newValue >= min) onChange(newValue);
  };

  const increase = () => {
    onChange(value + step);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={decrease}
        disabled={value <= min}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
      >
        <Minus className="w-5 h-5" />
      </button>
      <div className="relative flex-1 min-w-[100px]">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => {
            const val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) {
              onChange(Math.round(parsed * 100));
            }
          }}
          className="input w-full text-center min-h-[44px] font-medium pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
      </div>
      <button
        type="button"
        onClick={increase}
        className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - hidden on mobile (Layout provides header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="hidden sm:block">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Programme de fidelite</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gerez votre programme et suivez vos clients
          </p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full text-sm font-medium self-start sm:self-auto ${settings.loyalty_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
        >
          {settings.loyalty_enabled ? 'Active' : 'Desactive'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          className="w-full flex items-center justify-between p-4 min-h-[52px] active:bg-gray-50 transition-colors active:scale-[0.99]"
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
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
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
                <div className="space-y-4">
                  <div>
                    <label className="label mb-2">Points par euro dépensé</label>
                    <NumberInput
                      value={settings.loyalty_points_per_euro}
                      onChange={(value) =>
                        setSettings({
                          ...settings,
                          loyalty_points_per_euro: value,
                        })
                      }
                      min={1}
                      max={10}
                      suffix="pts"
                    />
                  </div>
                  <div>
                    <label className="label mb-2">Seuil de récompense</label>
                    <NumberInput
                      value={settings.loyalty_threshold}
                      onChange={(value) =>
                        setSettings({
                          ...settings,
                          loyalty_threshold: value,
                        })
                      }
                      min={10}
                      step={10}
                      suffix="pts"
                    />
                  </div>
                  <div>
                    <label className="label mb-2">Récompense</label>
                    <EuroInput
                      value={settings.loyalty_reward}
                      onChange={(value) =>
                        setSettings({
                          ...settings,
                          loyalty_reward: value,
                        })
                      }
                      min={100}
                      step={100}
                    />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 sm:gap-4 pt-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">Accepter le cumul de récompenses</p>
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

                {/* Client Preview Card */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Aperçu client</span>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Programme fidélité</p>
                        <p className="text-xs text-gray-500">
                          {settings.loyalty_points_per_euro} pt
                          {settings.loyalty_points_per_euro > 1 ? 's' : ''}/€
                        </p>
                      </div>
                    </div>
                    {/* Progress bar example */}
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">35 points</span>
                        <span className="text-gray-500">{settings.loyalty_threshold} pts</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (35 / settings.loyalty_threshold) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Plus que {settings.loyalty_threshold - 35} points pour{' '}
                        {formatPrice(settings.loyalty_reward)} de réduction
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary-50 rounded-xl p-4">
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
                  className="btn-primary min-h-[48px] w-full active:scale-[0.98] flex items-center justify-center font-medium"
                >
                  {settingsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Enregistrer les modifications'
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
    <div className="card p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
        >
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-[34px] w-[60px] min-w-[60px] min-h-[44px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 items-center ${checked ? 'bg-primary-500' : 'bg-gray-200'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-[26px]' : 'translate-x-1'}`}
      />
    </button>
  );
}

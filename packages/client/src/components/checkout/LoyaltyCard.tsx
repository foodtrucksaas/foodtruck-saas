import { Loader2 } from 'lucide-react';
import { formatPrice, type CustomerLoyaltyInfo } from '@foodtruck/shared';

interface LoyaltyCardProps {
  loyaltyInfo: CustomerLoyaltyInfo;
  loading: boolean;
  orderTotal: number;
  promoDiscount: number;
  loyaltyDiscount: number;
  useLoyaltyReward: boolean;
  loyaltyOptIn: boolean;
  onToggleUseLoyaltyReward: (use: boolean) => void;
  onToggleLoyaltyOptIn: (optIn: boolean) => void;
}

export function LoyaltyCard({
  loyaltyInfo,
  loading,
  orderTotal,
  promoDiscount,
  loyaltyDiscount,
  useLoyaltyReward,
  loyaltyOptIn,
  onToggleUseLoyaltyReward,
  onToggleLoyaltyOptIn: _onToggleLoyaltyOptIn,
}: LoyaltyCardProps) {
  void _onToggleLoyaltyOptIn;
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Chargement...</span>
      </div>
    );
  }

  const currentPoints = loyaltyInfo.loyalty_points || 0;
  const threshold = loyaltyInfo.loyalty_threshold || 50;
  const pointsPerEuro = loyaltyInfo.loyalty_points_per_euro || 1;
  const orderTotalAfterDiscount = Math.max(0, orderTotal - promoDiscount - loyaltyDiscount);
  const pointsToEarn = Math.floor((orderTotalAfterDiscount / 100) * pointsPerEuro);
  const futurePoints = currentPoints + pointsToEarn;
  const progress = Math.min(100, (currentPoints / threshold) * 100);
  const willReachReward = futurePoints >= threshold && !loyaltyInfo.can_redeem;

  if (!loyaltyOptIn) {
    return null;
  }

  // Can redeem - show checkbox
  if (loyaltyInfo.can_redeem) {
    return (
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={useLoyaltyReward}
            onChange={(e) => onToggleUseLoyaltyReward(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center">
            {useLoyaltyReward && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-900">
            Utiliser ma récompense
          </span>
          <span className="text-sm font-semibold text-emerald-600 ml-1">
            −{formatPrice(loyaltyInfo.max_discount)}
          </span>
          {loyaltyInfo.redeemable_count > 1 && (
            <span className="text-xs text-gray-400 ml-1">
              ({loyaltyInfo.redeemable_count}×)
            </span>
          )}
        </div>
      </label>
    );
  }

  // Progress bar
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Fidélité</span>
        <span className="text-xs text-gray-400">
          {currentPoints}/{threshold} pts
          {pointsToEarn > 0 && (
            <span className="text-emerald-500 ml-1">+{pointsToEarn}</span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {willReachReward ? (
        <p className="text-xs text-emerald-600">
          Récompense débloquée à la prochaine commande !
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          Encore {threshold - futurePoints} pts → {formatPrice(loyaltyInfo.loyalty_reward)} offerts
        </p>
      )}
    </div>
  );
}

export default LoyaltyCard;

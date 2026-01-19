import { Gift, Loader2 } from 'lucide-react';
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
  onToggleLoyaltyOptIn,
}: LoyaltyCardProps) {
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-gray-400 text-sm">
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
  const futureProgress = Math.min(100, (futurePoints / threshold) * 100);
  const currentProgress = Math.min(100, (currentPoints / threshold) * 100);
  const willReachReward = futurePoints >= threshold && !loyaltyInfo.can_redeem;

  return (
    <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Programme fidélité</span>
        </div>
        {loyaltyInfo.loyalty_opt_in === true && (
          <button
            type="button"
            onClick={() => onToggleLoyaltyOptIn(false)}
            className="text-xs text-gray-500 hover:text-red-500 underline"
          >
            Se désinscrire
          </button>
        )}
      </div>

      {loyaltyOptIn ? (
        <>
          {/* Réduction */}
          <div className="flex justify-end mb-1">
            <span className="text-xs text-amber-600">{formatPrice(loyaltyInfo.loyalty_reward)} de réduction</span>
          </div>

          {/* Barre de progression */}
          <div className="relative h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${currentProgress}%` }}
            />
            {pointsToEarn > 0 && (
              <div
                className="absolute h-full bg-green-400 transition-all duration-500"
                style={{ left: `${currentProgress}%`, width: `${Math.min(futureProgress - currentProgress, 100 - currentProgress)}%` }}
              />
            )}
          </div>

          {/* Labels */}
          <div className="relative h-4 mt-1 text-xs">
            <span
              className="absolute text-amber-700 font-semibold transform -translate-x-full"
              style={{ left: `${currentProgress}%` }}
            >
              {currentPoints}
            </span>
            {pointsToEarn > 0 && futureProgress < 85 && (
              <span
                className="absolute text-green-600 font-medium transform -translate-x-full"
                style={{ left: `${futureProgress}%` }}
              >
                +{pointsToEarn}
              </span>
            )}
            <span className="absolute right-0 text-amber-600">{threshold}</span>
          </div>

          {loyaltyInfo.can_redeem ? (
            <label className="flex items-start gap-2 p-2 bg-green-100 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={useLoyaltyReward}
                onChange={(e) => onToggleUseLoyaltyReward(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-green-400 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="text-sm text-green-800 font-medium block">
                  🎉 Utiliser {loyaltyInfo.redeemable_count > 1 ? `mes ${loyaltyInfo.redeemable_count} récompenses` : 'ma récompense'} : -{formatPrice(loyaltyInfo.max_discount)}
                </span>
                {loyaltyInfo.redeemable_count > 1 && (
                  <span className="text-xs text-green-600 block mt-0.5">
                    {loyaltyInfo.redeemable_count} × {formatPrice(loyaltyInfo.loyalty_reward)} = {formatPrice(loyaltyInfo.max_discount)}
                  </span>
                )}
              </div>
            </label>
          ) : willReachReward ? (
            <p className="text-xs text-green-600 mt-2">
              🎁 Récompense disponible à la prochaine commande !
            </p>
          ) : (
            <p className="text-xs text-amber-500 mt-2">
              Plus que {threshold - futurePoints} points avant votre prochaine réduction !
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-amber-700">
            {loyaltyInfo.loyalty_opt_in === true
              ? 'Vous ne participerez plus au programme fidélité.'
              : 'Activez la fidélité pour cumuler des points !'}
          </p>
          {loyaltyInfo.loyalty_opt_in === true && (
            <button
              type="button"
              onClick={() => onToggleLoyaltyOptIn(true)}
              className="text-xs text-primary-600 hover:text-primary-700 underline ml-2 whitespace-nowrap"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LoyaltyCard;

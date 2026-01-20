import { Gift, Check } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { ApplicableOffer } from '@foodtruck/shared';

interface OffersBannerProps {
  offers: ApplicableOffer[];
}

export default function OffersBanner({ offers }: OffersBannerProps) {
  if (offers.length === 0) return null;

  const formatOfferReward = (offer: ApplicableOffer) => {
    if (offer.free_item_name) {
      return offer.free_item_name;
    }
    if (offer.calculated_discount > 0) {
      return `-${formatPrice(offer.calculated_discount)}`;
    }
    return '';
  };

  return (
    <div className="space-y-2">
      {offers.map((offer) => {
        const isApplicable = offer.is_applicable;
        const progress = offer.progress_required > 0
          ? Math.min(100, (offer.progress_current / offer.progress_required) * 100)
          : 0;

        return (
          <div
            key={offer.offer_id}
            className={`rounded-xl p-3 border ${
              isApplicable
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {isApplicable ? (
                  <Check className="w-5 h-5 mt-0.5 text-green-600" />
                ) : (
                  <Gift className="w-5 h-5 mt-0.5 text-gray-400" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      isApplicable ? 'text-green-800' : 'text-gray-600'
                    }`}
                  >
                    {offer.offer_name}
                  </p>
                  {offer.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {offer.description}
                    </p>
                  )}
                </div>
              </div>
              {isApplicable ? (
                <span className="text-green-600 font-bold text-sm whitespace-nowrap">
                  {formatOfferReward(offer)}
                </span>
              ) : offer.progress_required > 0 ? (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {offer.progress_current}/{offer.progress_required}
                </span>
              ) : null}
            </div>
            {!isApplicable && offer.progress_required > 0 && offer.progress_current > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Plus que {offer.progress_required - offer.progress_current} pour débloquer
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

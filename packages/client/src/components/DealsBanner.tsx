import { useState } from 'react';
import { Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { ApplicableDeal } from '@foodtruck/shared';

interface DealsBannerProps {
  deals: ApplicableDeal[];
  compact?: boolean;
}

export default function DealsBanner({ deals, compact = false }: DealsBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (deals.length === 0) return null;

  const formatDealReward = (deal: ApplicableDeal) => {
    switch (deal.reward_type) {
      case 'free_item':
        return deal.reward_item_name ? `${deal.reward_item_name} offert` : 'Article offert';
      case 'cheapest_in_cart':
        if (deal.is_applicable && deal.cheapest_item_name) {
          return `${deal.cheapest_item_name} offert`;
        }
        return 'Le moins cher offert';
      case 'percentage':
        return `-${deal.reward_value}%`;
      case 'fixed':
        return `-${formatPrice(deal.reward_value || 0)}`;
    }
  };

  const formatDealCondition = (deal: ApplicableDeal) => {
    return `${deal.trigger_quantity} ${deal.trigger_category_name || 'articles'}`;
  };

  if (compact) {
    // Version compacte pour la page menu
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              {deals.length} offre{deals.length > 1 ? 's' : ''} disponible{deals.length > 1 ? 's' : ''}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-green-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-green-600" />
          )}
        </button>
        {expanded && (
          <div className="px-4 pb-3 space-y-2">
            {deals.map((deal) => (
              <div
                key={deal.deal_id}
                className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2"
              >
                <span className="text-gray-700">{deal.deal_name}</span>
                <span className="text-green-600 font-medium">{formatDealReward(deal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Version détaillée pour le checkout
  return (
    <div className="space-y-2">
      {deals.map((deal) => {
        const isApplicable = deal.is_applicable;

        return (
          <div
            key={deal.deal_id}
            className={`rounded-xl p-3 border ${
              isApplicable
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Gift
                  className={`w-5 h-5 mt-0.5 ${
                    isApplicable ? 'text-green-600' : 'text-gray-400'
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      isApplicable ? 'text-green-800' : 'text-gray-600'
                    }`}
                  >
                    {deal.deal_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDealCondition(deal)} = {formatDealReward(deal)}
                  </p>
                </div>
              </div>
              {isApplicable ? (
                <span className="text-green-600 font-bold text-sm whitespace-nowrap">
                  -{formatPrice(deal.calculated_discount)}
                </span>
              ) : (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {deal.items_needed > 0
                    ? `+${deal.items_needed} pour débloquer`
                    : ''}
                </span>
              )}
            </div>
            {!isApplicable && deal.items_in_cart > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{
                      width: `${Math.min(100, (deal.items_in_cart / deal.trigger_quantity) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  {deal.items_in_cart}/{deal.trigger_quantity} {deal.trigger_category_name}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

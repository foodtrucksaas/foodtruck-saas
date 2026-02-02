import {
  Package,
  Gift,
  Tag,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { formatPrice, OFFER_TYPE_LABELS } from '@foodtruck/shared';
import type {
  OfferWithItems,
  OfferType,
  BundleConfig,
  BuyXGetYConfig,
  PromoCodeConfig,
  ThresholdDiscountConfig,
} from '@foodtruck/shared';

interface OfferCardProps {
  offer: OfferWithItems;
  onToggle: (offer: OfferWithItems) => void;
  onEdit: (offer: OfferWithItems) => void;
  onDelete: (id: string) => void;
}

const typeIcons: Record<OfferType, typeof Package> = {
  bundle: Package,
  buy_x_get_y: Gift,
  promo_code: Tag,
  threshold_discount: TrendingUp,
};

const typeColors: Record<OfferType, string> = {
  bundle: 'bg-primary-100 text-primary-600',
  buy_x_get_y: 'bg-amber-100 text-amber-600',
  promo_code: 'bg-blue-100 text-blue-600',
  threshold_discount: 'bg-emerald-100 text-emerald-600',
};

function formatOfferSummary(offer: OfferWithItems): string {
  switch (offer.offer_type) {
    case 'bundle': {
      const config = offer.config as BundleConfig & {
        type?: string;
        bundle_categories?: unknown[];
      };
      // For category_choice bundles, show number of choices
      if (config.type === 'category_choice' && config.bundle_categories?.length) {
        const choiceCount = config.bundle_categories.length;
        return `${choiceCount} choix pour ${formatPrice(config.fixed_price || 0)}`;
      }
      // For specific items bundles
      return `${offer.offer_items?.length || 0} articles pour ${formatPrice(config.fixed_price || 0)}`;
    }
    case 'buy_x_get_y': {
      const config = offer.config as BuyXGetYConfig & { type?: string };
      const reward =
        config.reward_type === 'free' ? 'offert' : `-${formatPrice(config.reward_value || 0)}`;
      const isCategoryBased = config.type === 'category_choice';
      const triggerLabel = isCategoryBased ? 'achetés' : 'acheté(s)';
      return `${config.trigger_quantity} ${triggerLabel} = ${config.reward_quantity} ${reward}${isCategoryBased ? ' (catégorie)' : ''}`;
    }
    case 'promo_code': {
      const config = offer.config as PromoCodeConfig;
      const promoDiscount =
        config.discount_type === 'percentage'
          ? `-${config.discount_value}%`
          : `-${formatPrice(config.discount_value || 0)}`;
      return `Code: ${config.code} = ${promoDiscount}`;
    }
    case 'threshold_discount': {
      const config = offer.config as ThresholdDiscountConfig;
      const thresholdDiscount =
        config.discount_type === 'percentage'
          ? `-${config.discount_value}%`
          : `-${formatPrice(config.discount_value || 0)}`;
      return `Des ${formatPrice(config.min_amount || 0)} = ${thresholdDiscount}`;
    }
    default:
      return '';
  }
}

export function OfferCard({ offer, onToggle, onEdit, onDelete }: OfferCardProps) {
  const Icon = typeIcons[offer.offer_type];
  const colorClass = typeColors[offer.offer_type];

  return (
    <div
      className={`card p-4 sm:p-5 border-l-4 hover:shadow-md transition-shadow ${
        offer.is_active ? 'border-l-emerald-500' : 'border-l-gray-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className={`p-2.5 sm:p-3 rounded-xl ${colorClass} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">{offer.name}</h3>
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium whitespace-nowrap">
                {OFFER_TYPE_LABELS[offer.offer_type]}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{formatOfferSummary(offer)}</p>
            {offer.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{offer.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>
                  {offer.current_uses || 0} utilisation{(offer.current_uses || 0) > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Validity info */}
            {(offer.start_date || offer.end_date || offer.time_start) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {offer.start_date && (
                  <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                    Du {new Date(offer.start_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {offer.end_date && (
                  <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                    Jusqu'au {new Date(offer.end_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {offer.time_start && offer.time_end && (
                  <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full font-medium">
                    {offer.time_start.slice(0, 5)} - {offer.time_end.slice(0, 5)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 self-end sm:self-start ml-auto sm:ml-0">
          <button
            onClick={() => onToggle(offer)}
            className={`p-2.5 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-95 ${
              offer.is_active
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={offer.is_active ? 'Désactiver' : 'Activer'}
          >
            {offer.is_active ? (
              <ToggleRight className="w-6 h-6" />
            ) : (
              <ToggleLeft className="w-6 h-6" />
            )}
          </button>
          <button
            onClick={() => onEdit(offer)}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
            title="Modifier"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(offer.id)}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

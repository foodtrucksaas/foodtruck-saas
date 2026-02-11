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
  GripVertical,
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
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface OfferCardProps {
  offer: OfferWithItems;
  onToggle: (offer: OfferWithItems) => void;
  onEdit: (offer: OfferWithItems) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
}

const typeIcons: Record<OfferType, typeof Package> = {
  bundle: Package,
  buy_x_get_y: Gift,
  promo_code: Tag,
  threshold_discount: TrendingUp,
};

const typeColors: Record<OfferType, string> = {
  bundle: 'bg-primary-500 text-white',
  buy_x_get_y: 'bg-warning-500 text-white',
  promo_code: 'bg-info-500 text-white',
  threshold_discount: 'bg-success-500 text-white',
};

const typeBadgeColors: Record<OfferType, string> = {
  bundle: 'bg-primary-100 text-primary-700',
  buy_x_get_y: 'bg-warning-100 text-warning-600',
  promo_code: 'bg-info-100 text-info-600',
  threshold_discount: 'bg-success-100 text-success-600',
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
      return `Dès ${formatPrice(config.min_amount || 0)} = ${thresholdDiscount}`;
    }
    default:
      return '';
  }
}

export function OfferCard({
  offer,
  onToggle,
  onEdit,
  onDelete,
  isDragging = false,
  dragHandleProps,
}: OfferCardProps) {
  const Icon = typeIcons[offer.offer_type];
  const colorClass = typeColors[offer.offer_type];
  const badgeColorClass = typeBadgeColors[offer.offer_type];

  return (
    <div
      className={`card p-4 sm:p-5 border-l-4 hover:shadow-md transition-shadow ${
        offer.is_active ? 'border-l-success-500' : 'border-l-gray-300'
      } ${isDragging ? 'shadow-lg ring-2 ring-primary-300 bg-primary-50' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Drag handle */}
          {dragHandleProps && (
            <button
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
              aria-label="Glisser pour réorganiser"
            >
              <GripVertical className="w-5 h-5" />
            </button>
          )}
          <div className={`p-2.5 sm:p-3 rounded-xl ${colorClass} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">{offer.name}</h3>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${badgeColorClass}`}
              >
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
                  <span className="text-xs px-2.5 py-1 bg-info-50 text-info-600 rounded-full font-medium">
                    Du {new Date(offer.start_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {offer.end_date && (
                  <span className="text-xs px-2.5 py-1 bg-info-50 text-info-600 rounded-full font-medium">
                    Jusqu'au {new Date(offer.end_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {offer.time_start && offer.time_end && (
                  <span className="text-xs px-2.5 py-1 bg-warning-50 text-warning-600 rounded-full font-medium">
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
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-medium transition-all duration-200 active:scale-95 ${
              offer.is_active
                ? 'bg-success-500 text-white hover:bg-success-600'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            title={offer.is_active ? 'Désactiver' : 'Activer'}
          >
            {offer.is_active ? (
              <>
                <ToggleRight className="w-4 h-4" />
                <span>Dispo</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" />
                <span>Indispo</span>
              </>
            )}
          </button>
          <button
            onClick={() => onEdit(offer)}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-info-600 hover:bg-info-50 transition-all active:scale-95"
            title="Modifier"
            aria-label="Modifier l'offre"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(offer.id)}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-error-600 hover:bg-error-50 transition-all active:scale-95"
            title="Supprimer"
            aria-label="Supprimer l'offre"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

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
import type { OfferWithItems, OfferType } from '@foodtruck/shared';

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
  bundle: 'bg-purple-100 text-purple-600',
  buy_x_get_y: 'bg-pink-100 text-pink-600',
  promo_code: 'bg-blue-100 text-blue-600',
  threshold_discount: 'bg-green-100 text-green-600',
};

function formatOfferSummary(offer: OfferWithItems): string {
  const config = offer.config as any;

  switch (offer.offer_type) {
    case 'bundle':
      // For category_choice bundles, show number of choices
      if (config.type === 'category_choice' && config.bundle_categories?.length) {
        const choiceCount = config.bundle_categories.length;
        return `${choiceCount} choix pour ${formatPrice(config.fixed_price || 0)}`;
      }
      // For specific items bundles
      return `${offer.offer_items?.length || 0} articles pour ${formatPrice(config.fixed_price || 0)}`;
    case 'buy_x_get_y':
      const reward = config.reward_type === 'free' ? 'offert' : `-${formatPrice(config.reward_value || 0)}`;
      const isCategoryBased = config.type === 'category_choice';
      const triggerLabel = isCategoryBased ? 'achetés' : 'acheté(s)';
      return `${config.trigger_quantity} ${triggerLabel} = ${config.reward_quantity} ${reward}${isCategoryBased ? ' (catégorie)' : ''}`;
    case 'promo_code':
      const promoDiscount = config.discount_type === 'percentage'
        ? `-${config.discount_value}%`
        : `-${formatPrice(config.discount_value || 0)}`;
      return `Code: ${config.code} = ${promoDiscount}`;
    case 'threshold_discount':
      const thresholdDiscount = config.discount_type === 'percentage'
        ? `-${config.discount_value}%`
        : `-${formatPrice(config.discount_value || 0)}`;
      return `Des ${formatPrice(config.min_amount || 0)} = ${thresholdDiscount}`;
    default:
      return '';
  }
}

export function OfferCard({ offer, onToggle, onEdit, onDelete }: OfferCardProps) {
  const Icon = typeIcons[offer.offer_type];
  const colorClass = typeColors[offer.offer_type];

  return (
    <div
      className={`card p-4 border-l-4 ${
        offer.is_active ? 'border-l-green-500' : 'border-l-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">{offer.name}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
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
                <span>{offer.current_uses || 0} utilisation{(offer.current_uses || 0) > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Validity info */}
            {(offer.start_date || offer.end_date || offer.time_start) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {offer.start_date && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                    Du {new Date(offer.start_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {offer.end_date && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                    Jusqu'au {new Date(offer.end_date).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {offer.time_start && offer.time_end && (
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded">
                    {offer.time_start.slice(0, 5)} - {offer.time_end.slice(0, 5)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(offer)}
            className={`p-2 rounded-lg transition-colors ${
              offer.is_active
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={offer.is_active ? 'Desactiver' : 'Activer'}
          >
            {offer.is_active ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => onEdit(offer)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Modifier"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(offer.id)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

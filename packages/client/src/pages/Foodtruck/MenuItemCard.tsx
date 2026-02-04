import { memo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem } from '@foodtruck/shared';

interface MenuItemCardProps {
  item: MenuItem;
  hasOptions: boolean;
  quantity: number;
  onAdd: () => void;
  onUpdate: (delta: number) => void;
}

const MenuItemCard = memo(function MenuItemCard({
  item,
  hasOptions,
  quantity,
  onAdd,
  onUpdate,
}: MenuItemCardProps) {
  const isInCart = quantity > 0;

  // Handle card click - add item if not in cart or has options
  const handleCardClick = () => {
    if (!isInCart || hasOptions) {
      onAdd();
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${item.name}, ${formatPrice(item.price)}${item.description ? `, ${item.description}` : ''}${isInCart ? `, ${quantity} dans le panier` : ''}`}
      className={`bg-white rounded-2xl p-4 flex gap-4 cursor-pointer transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        isInCart
          ? 'ring-2 ring-primary-500/20 bg-primary-50/30'
          : 'border border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
      style={{
        boxShadow: isInCart
          ? '0 2px 12px rgba(249, 112, 102, 0.08)'
          : '0 1px 4px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Header with name and cart badge */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-anthracite text-[15px] leading-tight">{item.name}</h3>
            {isInCart && hasOptions && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center animate-bounce-in">
                {quantity}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-snug">
              {item.description}
            </p>
          )}

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">Allergènes : {item.allergens.join(', ')}</p>
          )}
        </div>

        {/* Price + Action row */}
        <div className="flex items-center justify-between mt-3">
          {quantity > 0 && !hasOptions ? (
            <>
              <span className="font-bold text-gray-900 text-base">
                {formatPrice(item.price * quantity)}
              </span>
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                role="group"
                aria-label={`Quantite de ${item.name}`}
              >
                <button
                  type="button"
                  onClick={() => onUpdate(-1)}
                  aria-label={`Retirer un ${item.name}`}
                  className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <Minus className="w-4 h-4 text-anthracite" aria-hidden="true" />
                </button>
                <span
                  className="w-8 text-center font-bold text-anthracite tabular-nums transition-transform"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdate(1)}
                  aria-label={`Ajouter un ${item.name}`}
                  className="w-11 h-11 rounded-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-500"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                {hasOptions && <span className="text-xs text-gray-500 block">À partir de</span>}
                <span className="font-bold text-gray-900 text-base">{formatPrice(item.price)}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                aria-label={
                  hasOptions
                    ? `Choisir les options pour ${item.name}`
                    : `Ajouter ${item.name} au panier`
                }
                className="h-11 px-5 rounded-lg text-sm font-semibold transition-all active:scale-95 bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {hasOptions ? 'Choisir' : 'Ajouter'}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
});

export default MenuItemCard;

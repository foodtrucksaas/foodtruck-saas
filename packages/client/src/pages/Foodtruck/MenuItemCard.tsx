import { memo, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem } from '@foodtruck/shared';

interface MenuItemCardProps {
  item: MenuItem;
  hasOptions: boolean;
  quantity: number;
  onAdd: () => void;
  onUpdate: (delta: number) => void;
  showPhoto?: boolean;
}

const MenuItemCard = memo(function MenuItemCard({
  item,
  hasOptions,
  quantity,
  onAdd,
  onUpdate,
  showPhoto = true,
}: MenuItemCardProps) {
  const isInCart = quantity > 0;
  const hasImage = showPhoto && item.image_url;

  // Handle card click - add item if not in cart or has options
  const handleCardClick = useCallback(() => {
    if (!isInCart || hasOptions) {
      onAdd();
    }
  }, [isInCart, hasOptions, onAdd]);

  // Memoized handlers for increment/decrement
  const handleDecrement = useCallback(() => onUpdate(-1), [onUpdate]);
  const handleIncrement = useCallback(() => onUpdate(1), [onUpdate]);

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-xl border p-4 flex gap-4 transition-all duration-200 cursor-pointer ${
        isInCart
          ? 'border-primary-200 bg-primary-50/30'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}
    >
      {/* Image - only show if there's an actual image */}
      {hasImage && (
        <img
          src={item.image_url!}
          alt={item.name}
          className="w-[72px] h-[72px] rounded-lg object-cover flex-shrink-0"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Header with name and cart badge */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-anthracite text-[15px] leading-tight">{item.name}</h3>
            {isInCart && hasOptions && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                {quantity}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[13px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">{item.description}</p>
          )}

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <p className="text-[11px] text-gray-400 mt-1">
              Allergènes : {item.allergens.join(', ')}
            </p>
          )}
        </div>

        {/* Price + Action row */}
        <div className="flex items-center justify-between mt-3">
          {quantity > 0 && !hasOptions ? (
            <>
              <span className="font-bold text-primary-500 text-base">
                {formatPrice(item.price * quantity)}
              </span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleDecrement}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                >
                  <Minus className="w-4 h-4 text-anthracite" />
                </button>
                <span className="w-8 text-center font-bold text-anthracite">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  className="w-9 h-9 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                {hasOptions && (
                  <span className="text-[11px] text-gray-400 block">À partir de</span>
                )}
                <span className="font-bold text-primary-500 text-base">{formatPrice(item.price)}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className="h-9 px-5 rounded-lg text-sm font-semibold transition-all active:scale-95 bg-primary-500 hover:bg-primary-600 text-white"
              >
                {hasOptions ? 'Choisir' : 'Ajouter'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default MenuItemCard;

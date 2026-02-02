import { Edit2, Trash2, ToggleLeft, ToggleRight, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem } from '@foodtruck/shared';
import { OptimizedImage } from '../OptimizedImage';

interface MenuItemCardProps {
  item: MenuItem;
  index?: number;
  totalItems?: number;
  onEdit: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function MenuItemCard({
  item,
  index = 0,
  totalItems = 1,
  onEdit,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MenuItemCardProps) {
  return (
    <div className={`card p-3 sm:p-4 ${!item.is_available ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Reorder controls - hidden on mobile, visible on tablet+ */}
        {onMoveUp && onMoveDown && totalItems > 1 && (
          <div className="hidden sm:flex flex-col justify-center -ml-1">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
              title="Monter"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalItems - 1}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
              title="Descendre"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
        {/* Image - responsive sizing */}
        {item.image_url ? (
          <OptimizedImage
            src={item.image_url}
            alt={item.name}
            width={80}
            height={80}
            className="rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 object-cover"
            sizes="(max-width: 640px) 64px, 80px"
            placeholderColor="#f3f4f6"
            fallback={
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">🍽️</span>
              </div>
            }
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl sm:text-2xl">🍽️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Header with name and price */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                  {item.name}
                </h3>
                {item.is_daily_special && (
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
              </div>
              {item.description && (
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              {(item.allergens ?? []).length > 0 && (
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">
                  Allergènes: {(item.allergens ?? []).join(', ')}
                </p>
              )}
            </div>
            {/* Price - always visible */}
            <p className="font-bold text-primary-600 whitespace-nowrap text-sm sm:text-base flex-shrink-0">
              {formatPrice(item.price)}
            </p>
          </div>
          {/* Action buttons - wrap on mobile */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            <button
              onClick={() => onToggle(item)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2 min-h-[44px] sm:min-h-[44px] rounded-xl text-xs sm:text-xs font-medium transition-all duration-200 active:scale-95 ${
                item.is_available
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {item.is_available ? (
                <>
                  <ToggleRight className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Disponible</span>
                  <span className="xs:hidden">Dispo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Indisponible</span>
                  <span className="xs:hidden">Indispo</span>
                </>
              )}
            </button>
            {/* Mobile reorder buttons */}
            {onMoveUp && onMoveDown && totalItems > 1 && (
              <div className="flex sm:hidden items-center">
                <button
                  onClick={onMoveUp}
                  disabled={index === 0}
                  className="min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                  title="Monter"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={onMoveDown}
                  disabled={index === totalItems - 1}
                  className="min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                  title="Descendre"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={() => onEdit(item)}
              className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all duration-150 active:scale-90"
            >
              <Edit2 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 transition-all duration-150 active:scale-90"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

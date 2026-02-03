import { Edit2, Trash2, ToggleLeft, ToggleRight, Star, GripVertical } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem } from '@foodtruck/shared';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  isDragging?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
}

export function MenuItemCard({
  item,
  onEdit,
  onToggle,
  onDelete,
  isDragging = false,
  dragHandleProps,
}: MenuItemCardProps) {
  return (
    <div
      className={`card p-3 sm:p-4 ${!item.is_available ? 'opacity-60' : ''} ${
        isDragging ? 'shadow-lg ring-2 ring-primary-300 bg-primary-50' : ''
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Drag handle - only shown when dragHandleProps is provided */}
        {dragHandleProps && (
          <button
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className="flex items-center justify-center w-8 h-8 -ml-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Glisser pour réorganiser"
          >
            <GripVertical className="w-5 h-5" />
          </button>
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
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            <button
              onClick={() => onToggle(item)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2 min-h-[44px] sm:min-h-[44px] rounded-xl text-xs sm:text-xs font-medium transition-all duration-200 active:scale-95 ${
                item.is_available
                  ? 'bg-success-500 text-white hover:bg-success-600'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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

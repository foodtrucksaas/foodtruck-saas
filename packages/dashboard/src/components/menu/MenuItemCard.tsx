import { Edit2, Trash2, ToggleLeft, ToggleRight, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { MenuItem } from '@foodtruck/shared';

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

export function MenuItemCard({ item, index = 0, totalItems = 1, onEdit, onToggle, onDelete, onMoveUp, onMoveDown }: MenuItemCardProps) {
  return (
    <div className={`card p-4 ${!item.is_available ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        {onMoveUp && onMoveDown && totalItems > 1 && (
          <div className="flex flex-col justify-center">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Monter"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalItems - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Descendre"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-20 h-20 rounded-lg object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                {item.is_daily_special && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              {item.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
              )}
              {(item.allergens ?? []).length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Allergènes: {(item.allergens ?? []).join(', ')}
                </p>
              )}
            </div>
            <p className="font-bold text-primary-600 whitespace-nowrap">
              {formatPrice(item.price)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onToggle(item)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                item.is_available
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {item.is_available ? (
                <>
                  <ToggleRight className="w-4 h-4" /> Disponible
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" /> Indisponible
                </>
              )}
            </button>
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <Edit2 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="p-1.5 rounded hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

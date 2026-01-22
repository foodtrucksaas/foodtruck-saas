import { memo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { Category } from '@foodtruck/shared';
import type { MenuItemWithOptions } from './useQuickOrder';

interface ProductsGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  items: MenuItemWithOptions[];
  loading: boolean;
  onItemClick: (item: MenuItemWithOptions) => void;
}

export const ProductsGrid = memo(function ProductsGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  items,
  loading,
  onItemClick,
}: ProductsGridProps) {
  return (
    <>
      {/* Categories */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-auto p-3 md:p-4 pb-24 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                className="bg-white rounded-xl p-3 md:p-4 text-left hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border border-gray-100"
              >
                {item.image_url && (
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 md:mb-3 bg-gray-100">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 text-xs md:text-sm line-clamp-2 mb-1">
                  {item.name}
                </h3>
                <p className="text-primary-600 font-bold text-sm md:text-base">{formatPrice(item.price)}</p>
                {item.option_groups && item.option_groups.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 hidden md:block">Options disponibles</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
});

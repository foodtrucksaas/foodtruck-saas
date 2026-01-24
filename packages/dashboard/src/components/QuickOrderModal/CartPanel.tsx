import { X, Plus, Minus, Trash2, ShoppingBag, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { CartItem } from './useQuickOrder';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (uniqueId: string, delta: number) => void;
  onRemove: (uniqueId: string) => void;
  variant?: 'desktop' | 'mobile';
}

function CartItemRow({ item, onUpdateQuantity, onRemove, variant = 'desktop' }: CartItemRowProps) {
  const optionsTotal = item.selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0);
  const itemTotal = (item.menuItem.price + optionsTotal) * item.quantity;

  if (variant === 'mobile') {
    return (
      <div className="bg-gray-50 rounded-xl p-3 relative">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{item.menuItem.name}</p>
            {item.selectedOptions.length > 0 && (
              <p className="text-xs text-gray-500">
                {item.selectedOptions.map((o) => o.name).join(', ')}
              </p>
            )}
          </div>
          <p className="font-bold text-gray-900 text-sm ml-2">{formatPrice(itemTotal)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(item.uniqueId, -1)}
              className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-semibold">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.uniqueId, 1)}
              className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => onRemove(item.uniqueId)}
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 relative group">
      <button
        onClick={() => onRemove(item.uniqueId)}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{item.menuItem.name}</p>
          {item.selectedOptions.length > 0 && (
            <p className="text-xs text-gray-500 truncate">
              {item.selectedOptions.map((o) => o.name).join(', ')}
            </p>
          )}
        </div>
        <p className="font-bold text-gray-900 text-sm ml-2">{formatPrice(itemTotal)}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQuantity(item.uniqueId, -1)}
            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 hover:bg-gray-100 active:scale-95 transition-all"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.uniqueId, 1)}
            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 hover:bg-gray-100 active:scale-95 transition-all"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <button
          onClick={() => onRemove(item.uniqueId)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface DesktopCartPanelProps {
  cart: CartItem[];
  cartTotal: number;
  cartItemsCount: number;
  onUpdateQuantity: (uniqueId: string, delta: number) => void;
  onRemove: (uniqueId: string) => void;
  onContinue: () => void;
}

export function DesktopCartPanel({
  cart,
  cartTotal,
  cartItemsCount,
  onUpdateQuantity,
  onRemove,
  onContinue,
}: DesktopCartPanelProps) {
  return (
    <div className="hidden md:flex w-80 bg-white border-l border-gray-200 flex-col">
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Panier</h3>
          {cart.length > 0 && (
            <span className="bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {cartItemsCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Panier vide</p>
            <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <CartItemRow
                key={item.uniqueId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                variant="desktop"
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-2xl text-gray-900">{formatPrice(cartTotal)}</span>
        </div>

        <button
          onClick={onContinue}
          disabled={cart.length === 0}
          className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-5 h-5" />
          Continuer
        </button>
      </div>
    </div>
  );
}

interface MobileCartOverlayProps {
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (uniqueId: string, delta: number) => void;
  onRemove: (uniqueId: string) => void;
  onClose: () => void;
  onCloseModal: () => void;
  onContinue: () => void;
}

export function MobileCartOverlay({
  cart,
  cartTotal,
  onUpdateQuantity,
  onRemove,
  onClose,
  onCloseModal,
  onContinue,
}: MobileCartOverlayProps) {
  return (
    <div className="md:hidden fixed inset-0 z-20 flex flex-col bg-white">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h3 className="font-bold text-gray-900 text-lg">Panier</h3>
        </div>
        <button
          onClick={onCloseModal}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl active:scale-95 transition-all"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Panier vide</p>
            <p className="text-xs mt-1">Cliquez sur un produit pour l'ajouter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <CartItemRow
                key={item.uniqueId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                variant="mobile"
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-2xl text-gray-900">{formatPrice(cartTotal)}</span>
        </div>

        <button
          onClick={onContinue}
          disabled={cart.length === 0}
          className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-5 h-5" />
          Continuer
        </button>
      </div>
    </div>
  );
}

interface FloatingCartButtonProps {
  cartItemsCount: number;
  onClick: () => void;
}

export function FloatingCartButton({ cartItemsCount, onClick }: FloatingCartButtonProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-6 right-6 z-10 bg-primary-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center"
    >
      <ShoppingBag className="w-6 h-6" />
      {cartItemsCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
          {cartItemsCount}
        </span>
      )}
    </button>
  );
}

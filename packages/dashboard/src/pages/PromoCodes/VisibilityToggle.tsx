import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';

interface VisibilityToggleProps {
  foodtruck: Foodtruck | null;
  activeCodesCount: number;
  onToggle: () => void;
}

export function VisibilityToggle({
  foodtruck,
  activeCodesCount,
  onToggle,
}: VisibilityToggleProps) {
  const isVisible = foodtruck?.show_promo_section !== false;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {isVisible ? (
            <Eye className="w-5 h-5 text-primary-500 mt-0.5" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-400 mt-0.5" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              Afficher la section code promo aux clients
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isVisible
                ? 'Vos clients peuvent saisir un code promo lors du paiement.'
                : 'La section code promo est masquée pour vos clients.'}
            </p>
            {!isVisible && activeCodesCount > 0 && (
              <div className="flex items-center gap-2 mt-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Attention : vous avez {activeCodesCount} code(s) promo actif(s) mais la section est masquée !
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isVisible ? 'bg-primary-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isVisible ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

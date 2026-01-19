import { Ticket, Check, X, Loader2 } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { AppliedPromo } from '../../hooks';

interface PromoCodeSectionProps {
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  appliedPromo: AppliedPromo | null;
  promoLoading: boolean;
  promoError: string | null;
  onValidate: () => void;
  onRemove: () => void;
}

export function PromoCodeSection({
  promoCode,
  onPromoCodeChange,
  appliedPromo,
  promoLoading,
  promoError,
  onValidate,
  onRemove,
}: PromoCodeSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
      <h2 className="font-bold text-anthracite mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-info-50 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-info-500" />
        </div>
        Code promo
      </h2>

      {appliedPromo ? (
        <div className="flex items-center justify-between bg-success-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="font-semibold text-success-700">{appliedPromo.code}</p>
              <p className="text-sm text-success-600">
                {appliedPromo.discountType === 'percentage'
                  ? `-${appliedPromo.discountValue}%`
                  : `-${formatPrice(appliedPromo.discountValue)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 hover:bg-success-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-success-600" />
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => onPromoCodeChange(e.target.value)}
                placeholder="Entrez votre code"
                className="input w-full uppercase"
              />
            </div>
            <button
              type="button"
              onClick={onValidate}
              disabled={!promoCode.trim() || promoLoading}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-anthracite rounded-xl font-semibold disabled:opacity-50 transition-colors"
            >
              {promoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Appliquer'
              )}
            </button>
          </div>
          {promoError && (
            <p className="text-sm text-error-500 mt-2">{promoError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PromoCodeSection;

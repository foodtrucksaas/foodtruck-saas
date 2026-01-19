import { X, Percent, Euro } from 'lucide-react';
import type { PromoCodeForm } from './usePromoCodes';

interface PromoCodeModalProps {
  form: PromoCodeForm;
  setForm: React.Dispatch<React.SetStateAction<PromoCodeForm>>;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function PromoCodeModal({
  form,
  setForm,
  isEditing,
  onSubmit,
  onClose,
}: PromoCodeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Modifier le code' : 'Nouveau code promo'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code promo *
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="input w-full uppercase"
              placeholder="PROMO10"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Le code sera en majuscules
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnel)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input w-full"
              placeholder="Promo de rentrée"
            />
          </div>

          {/* Type de réduction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de réduction *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, discountType: 'percentage', maxDiscount: '' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                  form.discountType === 'percentage'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Percent className="w-5 h-5" />
                Pourcentage
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, discountType: 'fixed', maxDiscount: '' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                  form.discountType === 'fixed'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Euro className="w-5 h-5" />
                Montant fixe
              </button>
            </div>
          </div>

          {/* Valeur de la réduction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valeur de la réduction *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value.replace(/[^0-9.,]/g, '') })}
                className="input w-full pr-10"
                placeholder={form.discountType === 'percentage' ? '10' : '5'}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {form.discountType === 'percentage' ? '%' : '€'}
              </span>
            </div>
          </div>

          {/* Max discount (si pourcentage) */}
          {form.discountType === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Réduction max (optionnel)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value.replace(/[^0-9.,]/g, '') })}
                  className="input w-full pr-10"
                  placeholder="20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ex: -10% mais max 20€ de réduction
              </p>
            </div>
          )}

          {/* Montant minimum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commande minimum (optionnel)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value.replace(/[^0-9.,]/g, '') })}
                className="input w-full pr-10"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
          </div>

          {/* Dates de validité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valide à partir du
              </label>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valide jusqu'au
              </label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Vide = pas de limite
              </p>
            </div>
          </div>

          {/* Limites d'utilisation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisations max
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/[^0-9]/g, '') })}
                className="input w-full"
                placeholder="Illimité"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max par client
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.maxUsesPerCustomer}
                onChange={(e) => setForm({ ...form, maxUsesPerCustomer: e.target.value.replace(/[^0-9]/g, '') })}
                className="input w-full"
                placeholder="1"
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium"
            >
              {isEditing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

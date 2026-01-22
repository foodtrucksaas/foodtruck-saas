import { useState } from 'react';
import { Wallet, Banknote, CreditCard, Smartphone, FileText, Check } from 'lucide-react';
import { PAYMENT_METHODS } from '@foodtruck/shared';
import type { Foodtruck } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import toast from 'react-hot-toast';

const ICON_MAP: Record<string, React.ElementType> = {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  FileText,
};

interface PaymentMethodsSectionProps {
  foodtruck: Foodtruck | null;
}

export function PaymentMethodsSection({ foodtruck }: PaymentMethodsSectionProps) {
  const { updateFoodtruck } = useFoodtruck();
  const [loading, setLoading] = useState(false);

  const currentMethods = foodtruck?.payment_methods || ['cash', 'card'];

  const toggleMethod = async (methodId: string) => {
    setLoading(true);
    try {
      const newMethods = currentMethods.includes(methodId)
        ? currentMethods.filter((m) => m !== methodId)
        : [...currentMethods, methodId];

      // Ensure at least one method is selected
      if (newMethods.length === 0) {
        toast.error('Sélectionnez au moins un moyen de paiement');
        setLoading(false);
        return;
      }

      await updateFoodtruck({ payment_methods: newMethods });
      toast.success('Moyens de paiement mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
    setLoading(false);
  };

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Moyens de paiement acceptés</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Sélectionnez les moyens de paiement que vous acceptez. Ces informations seront affichées à vos clients.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PAYMENT_METHODS.map((method) => {
          const Icon = ICON_MAP[method.icon] || Wallet;
          const isSelected = currentMethods.includes(method.id);

          return (
            <button
              key={method.id}
              onClick={() => toggleMethod(method.id)}
              disabled={loading}
              className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium flex-1 text-left">{method.label}</span>
              {isSelected && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

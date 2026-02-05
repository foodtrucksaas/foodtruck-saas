import { useState } from 'react';
import { Wallet, Banknote, CreditCard, Smartphone, FileText, Check } from 'lucide-react';
import { PAYMENT_METHODS } from '@foodtruck/shared';
import type { Foodtruck } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { ErrorAlert, SuccessAlert } from '../../components/Alert';

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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentMethods = foodtruck?.payment_methods || ['cash', 'card'];

  const toggleMethod = async (methodId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const newMethods = currentMethods.includes(methodId)
        ? currentMethods.filter((m) => m !== methodId)
        : [...currentMethods, methodId];

      // Ensure at least one method is selected
      if (newMethods.length === 0) {
        setError('Sélectionnez au moins un moyen de paiement');
        setTimeout(() => setError(null), 3000);
        setLoading(false);
        return;
      }

      await updateFoodtruck({ payment_methods: newMethods });
      setSuccessMessage('Moyens de paiement mis a jour');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setError('Erreur lors de la mise a jour');
      setTimeout(() => setError(null), 3000);
    }
    setLoading(false);
  };

  return (
    <section className="card p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Moyens de paiement acceptés</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Sélectionnez les moyens de paiement que vous acceptez. Ces informations seront affichées à
        vos clients.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {PAYMENT_METHODS.map((method) => {
          const Icon = ICON_MAP[method.icon] || Wallet;
          const isSelected = currentMethods.includes(method.id);

          return (
            <button
              key={method.id}
              onClick={() => toggleMethod(method.id)}
              disabled={loading}
              className={`p-2.5 sm:p-3 min-h-[48px] rounded-lg border-2 transition-all flex items-center gap-2 active:scale-[0.98] ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-left truncate">{method.label}</span>
              {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {error && <ErrorAlert className="mt-3">{error}</ErrorAlert>}
      {successMessage && <SuccessAlert className="mt-3">{successMessage}</SuccessAlert>}
    </section>
  );
}

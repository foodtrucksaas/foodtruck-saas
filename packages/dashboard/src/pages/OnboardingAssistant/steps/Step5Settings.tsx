import { Banknote, CreditCard, Smartphone, Ticket, Clock, Check } from 'lucide-react';
import { useOnboarding } from '../OnboardingContext';
import { AssistantBubble, StepContainer } from '../components';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Espèces', icon: Banknote },
  { id: 'card', label: 'Carte bancaire', icon: CreditCard },
  { id: 'contactless', label: 'Sans contact', icon: Smartphone },
  { id: 'ticket_resto', label: 'Titres-restaurant', icon: Ticket },
];

const SLOT_INTERVALS = [
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
];

export function Step5Settings() {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();

  const togglePaymentMethod = (methodId: string) => {
    const current = state.settings.payment_methods;
    const newMethods = current.includes(methodId)
      ? current.filter((m) => m !== methodId)
      : [...current, methodId];
    dispatch({ type: 'UPDATE_SETTINGS', settings: { payment_methods: newMethods } });
  };

  const setSlotInterval = (interval: number) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { pickup_slot_interval: interval } });
  };

  const handleContinue = () => {
    nextStep();
  };

  const isValid = state.settings.payment_methods.length > 0;

  return (
    <StepContainer
      onBack={prevStep}
      onNext={handleContinue}
      nextLabel="Terminer"
      nextDisabled={!isValid}
    >
      <div className="space-y-8">
        <AssistantBubble message="Dernières configurations !" emoji="⚙️" />

        {/* Payment methods */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Moyens de paiement acceptés</h3>
            <p className="text-sm text-gray-500 mt-1">
              Sélectionnez les moyens de paiement que vous acceptez sur place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
              const isSelected = state.settings.payment_methods.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePaymentMethod(id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 shadow-card'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`}
                  />
                  <span
                    className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}
                  >
                    {label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot interval */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Intervalle des créneaux</h3>
            <p className="text-sm text-gray-500 mt-1">
              Les clients choisiront un créneau de retrait selon cet intervalle.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <select
              value={state.settings.pickup_slot_interval}
              onChange={(e) => setSlotInterval(parseInt(e.target.value))}
              className="input min-h-[48px] text-base flex-1"
            >
              {SLOT_INTERVALS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Exemple :</span> Avec un intervalle de{' '}
              {state.settings.pickup_slot_interval} minutes, vos clients pourront choisir des
              créneaux comme 12h00,{' '}
              {(() => {
                const m1 = state.settings.pickup_slot_interval;
                const m2 = m1 * 2;
                const h1 = Math.floor(m1 / 60);
                const h2 = Math.floor(m2 / 60);
                return `${12 + h1}h${(m1 % 60).toString().padStart(2, '0')}, ${12 + h2}h${(m2 % 60).toString().padStart(2, '0')}`;
              })()}
              ...
            </p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}

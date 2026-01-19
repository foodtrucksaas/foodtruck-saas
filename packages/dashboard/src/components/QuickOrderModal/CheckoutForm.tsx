import { User, Clock, FileText, Check, ChevronLeft, X } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';

interface CheckoutFormProps {
  customerName: string;
  pickupTime: string;
  notes: string;
  cartTotal: number;
  isSubmitting: boolean;
  availableTimeSlots: string[];
  slotAvailability: Record<string, { available: boolean; orderCount: number }>;
  onCustomerNameChange: (value: string) => void;
  onPickupTimeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function CheckoutFormContent({
  customerName,
  pickupTime,
  notes,
  cartTotal,
  isSubmitting,
  availableTimeSlots,
  slotAvailability,
  onCustomerNameChange,
  onPickupTimeChange,
  onNotesChange,
  onSubmit,
}: Omit<CheckoutFormProps, 'onBack'>) {
  return (
    <div className="space-y-6">
      {/* Customer Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-2" />
          Nom du client
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Ex: Jean Dupont"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
          autoFocus
        />
      </div>

      {/* Pickup Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="w-4 h-4 inline mr-2" />
          Heure de retrait
        </label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => onPickupTimeChange('now')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              pickupTime === 'now'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className={`font-medium ${pickupTime === 'now' ? 'text-primary-700' : 'text-gray-700'}`}>
              Maintenant
            </p>
            <p className="text-xs text-gray-500 mt-1">Dès que possible</p>
          </button>
          <button
            onClick={() => onPickupTimeChange(availableTimeSlots[1] || availableTimeSlots[0])}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              pickupTime !== 'now'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className={`font-medium ${pickupTime !== 'now' ? 'text-primary-700' : 'text-gray-700'}`}>
              Plus tard
            </p>
            <p className="text-xs text-gray-500 mt-1">Choisir un créneau</p>
          </button>
        </div>
        {pickupTime !== 'now' && (
          <select
            value={pickupTime}
            onChange={(e) => onPickupTimeChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
          >
            {availableTimeSlots.map((slot) => {
              const slotInfo = slotAvailability[slot];
              const isFull = slotInfo && !slotInfo.available;
              return (
                <option key={slot} value={slot}>
                  {slot}{isFull ? ' (complet)' : ''}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          Notes (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Instructions spéciales..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          rows={2}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={isSubmitting || !customerName.trim()}
        className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Création...
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            Créer la commande • {formatPrice(cartTotal)}
          </>
        )}
      </button>
    </div>
  );
}

export function DesktopCheckoutStep(props: CheckoutFormProps) {
  return (
    <div className="hidden md:flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={props.onBack}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          >
            ← Retour aux produits
          </button>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Finaliser la commande</h3>
            <CheckoutFormContent {...props} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MobileCheckoutOverlayProps extends CheckoutFormProps {
  onClose: () => void;
}

export function MobileCheckoutOverlay(props: MobileCheckoutOverlayProps) {
  return (
    <div className="md:hidden fixed inset-0 z-20 flex flex-col bg-white">
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={props.onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h3 className="font-bold text-gray-900 text-lg">Finaliser</h3>
        </div>
        <button onClick={props.onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <CheckoutFormContent {...props} />
      </div>
    </div>
  );
}

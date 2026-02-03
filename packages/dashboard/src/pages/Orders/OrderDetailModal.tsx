import { useState } from 'react';
import { X, Pencil, Check, Package, XCircle } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { ErrorAlert } from '../../components/Alert';

const CANCEL_REASONS = [
  "Client a demandé l'annulation",
  'Produit indisponible',
  'Créneau complet',
  'Fermeture exceptionnelle',
  'Client injoignable',
  'Autre',
];

interface OrderDetailModalProps {
  order: OrderWithItemsAndOptions;
  useReadyStatus?: boolean;
  onClose: () => void;
  onAccept: () => void;
  onCancelWithReason: (reason: string) => void;
  onMarkReady?: () => void;
  onMarkPickedUp: () => void;
  onUpdatePickupTime: (newTime: string) => void;
}

export function OrderDetailModal({
  order,
  useReadyStatus = false,
  onClose,
  onAccept,
  onCancelWithReason,
  onMarkReady,
  onMarkPickedUp,
  onUpdatePickupTime,
}: OrderDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTime, setEditTime] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonOther, setCancelReasonOther] = useState('');
  const [cancelError, setCancelError] = useState('');

  const isPending = order.status === 'pending';
  const isConfirmed = order.status === 'confirmed';
  const isReady = order.status === 'ready';
  const pickupTime = new Date(order.pickup_time).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const pickupDate = new Date(order.pickup_time).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const shortOrderId = order.id.slice(-6).toUpperCase();

  const getHeaderColor = () => {
    if (isPending) return 'bg-gradient-to-r from-warning-500 to-warning-600';
    if (isConfirmed) return 'bg-gradient-to-r from-info-500 to-info-600';
    if (isReady) return 'bg-gradient-to-r from-success-500 to-success-600';
    if (order.status === 'cancelled') return 'bg-gradient-to-r from-error-500 to-error-600';
    return 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const handleCancelSubmit = () => {
    setCancelError('');
    const finalReason =
      cancelReason === 'Autre' ? cancelReasonOther.trim() || 'Autre motif' : cancelReason;
    if (finalReason) {
      onCancelWithReason(finalReason);
    } else {
      setCancelError("Veuillez sélectionner un motif d'annulation");
    }
  };

  const handleEditTime = () => {
    const currentTime = new Date(order.pickup_time);
    setEditTime(
      `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`
    );
    setIsEditing(true);
  };

  const canModifyTime =
    order.status !== 'picked_up' && order.status !== 'cancelled' && order.status !== 'no_show';
  const canCancel =
    order.status !== 'picked_up' && order.status !== 'cancelled' && order.status !== 'no_show';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 animate-backdrop-in" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - with safe area for notch/Dynamic Island */}
        <div
          className={`${getHeaderColor()} text-white px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:py-4 relative`}
        >
          <button
            onClick={onClose}
            className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 sm:right-3 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between pr-12 sm:pr-10 gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm opacity-80">#{shortOrderId}</p>
              <h2 className="text-lg sm:text-xl font-bold truncate">{order.customer_name}</h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl sm:text-2xl font-bold">{pickupTime}</p>
              <p className="text-xs sm:text-sm opacity-80">{pickupDate}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Contact info */}
          {(order.customer_email || order.customer_phone) && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              {order.customer_email && (
                <p className="text-sm text-gray-600">📧 {order.customer_email}</p>
              )}
              {order.customer_phone && (
                <p className="text-sm text-gray-600">📱 {order.customer_phone}</p>
              )}
            </div>
          )}

          {/* Status badge */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                isPending
                  ? 'bg-warning-100 text-warning-600'
                  : isConfirmed
                    ? 'bg-info-100 text-info-600'
                    : isReady
                      ? 'bg-success-100 text-success-600'
                      : order.status === 'cancelled'
                        ? 'bg-error-100 text-error-600'
                        : order.status === 'no_show'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isPending
                ? 'En attente'
                : isConfirmed
                  ? 'Acceptée'
                  : isReady
                    ? 'Prête'
                    : order.status === 'cancelled'
                      ? 'Annulée'
                      : order.status === 'no_show'
                        ? 'Non récupérée'
                        : 'Retirée'}
            </span>
          </div>

          {/* Payment info notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800">
              💰 <strong>Montant à régler sur place :</strong> {formatPrice(order.total_amount)}
            </p>
          </div>

          {/* Items */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Articles</h4>
            <div className="space-y-2">
              {order.order_items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <div>
                    <span className="font-medium">
                      {item.quantity}x {item.menu_item.name}
                    </span>
                    {item.order_item_options && item.order_item_options.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {item.order_item_options.map((opt) => opt.option_name).join(', ')}
                      </p>
                    )}
                    {item.notes && <p className="text-xs text-amber-600 italic">💬 {item.notes}</p>}
                  </div>
                  <span className="text-gray-600">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-warning-50 border border-warning-500 rounded-xl p-3">
              <h4 className="text-sm font-medium text-warning-600 mb-1">Note</h4>
              <p className="text-gray-900">{order.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="font-medium text-gray-600">Total</span>
            <span className="text-2xl font-bold">{formatPrice(order.total_amount)}</span>
          </div>
        </div>

        {/* Actions - with safe area for iPhone home indicator */}
        <div className="border-t p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          {showCancelModal ? (
            <CancelReasonForm
              reasons={CANCEL_REASONS}
              selectedReason={cancelReason}
              otherReason={cancelReasonOther}
              error={cancelError}
              onReasonChange={setCancelReason}
              onOtherReasonChange={setCancelReasonOther}
              onCancel={() => {
                setShowCancelModal(false);
                setCancelReason('');
                setCancelReasonOther('');
                setCancelError('');
              }}
              onSubmit={handleCancelSubmit}
            />
          ) : isEditing ? (
            <EditTimeForm
              editTime={editTime}
              onTimeChange={setEditTime}
              onCancel={() => setIsEditing(false)}
              onSubmit={() => editTime && onUpdatePickupTime(editTime)}
            />
          ) : (
            <>
              {/* Secondary actions - icon buttons */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 pb-2">
                {canModifyTime && (
                  <button
                    onClick={handleEditTime}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                    title="Modifier l'heure"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-error-50 hover:bg-error-100 flex items-center justify-center transition-colors active:scale-95"
                    title="Annuler la commande"
                  >
                    <XCircle className="w-4 h-4 text-error-500" />
                  </button>
                )}
              </div>

              {/* Main action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {isPending && (
                  <button
                    onClick={onAccept}
                    className="w-full sm:flex-1 px-4 py-3.5 min-h-[48px] sm:min-h-[44px] bg-gradient-to-r from-info-500 to-info-600 hover:from-info-600 hover:to-info-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                  >
                    <Check className="w-5 h-5" />
                    Accepter la commande
                  </button>
                )}
                {/* Show "Mark Ready" + "Mark Picked Up" when useReadyStatus is enabled and order is confirmed */}
                {useReadyStatus && isConfirmed && onMarkReady && (
                  <>
                    <button
                      onClick={onMarkReady}
                      className="w-full sm:flex-1 px-4 py-3 min-h-[48px] sm:min-h-[44px] bg-success-500 hover:bg-success-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4" />
                      Prête
                    </button>
                    <button
                      onClick={onMarkPickedUp}
                      className="w-full sm:flex-1 px-4 py-3 min-h-[48px] sm:min-h-[44px] bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                    >
                      <Package className="w-4 h-4" />
                      Retirée
                    </button>
                  </>
                )}
                {/* Show only "Mark Picked Up" when useReadyStatus is disabled and order is confirmed */}
                {!useReadyStatus && isConfirmed && (
                  <button
                    onClick={onMarkPickedUp}
                    className="w-full sm:flex-1 px-4 py-4 min-h-[52px] sm:min-h-[48px] bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                  >
                    <Package className="w-5 h-5" />
                    Commande retirée
                  </button>
                )}
                {/* Show "Mark Picked Up" when order is ready */}
                {isReady && (
                  <button
                    onClick={onMarkPickedUp}
                    className="w-full sm:flex-1 px-4 py-4 min-h-[52px] sm:min-h-[48px] bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                  >
                    <Package className="w-5 h-5" />
                    Commande retirée
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function CancelReasonForm({
  reasons,
  selectedReason,
  otherReason,
  error,
  onReasonChange,
  onOtherReasonChange,
  onCancel,
  onSubmit,
}: {
  reasons: string[];
  selectedReason: string;
  otherReason: string;
  error?: string;
  onReasonChange: (reason: string) => void;
  onOtherReasonChange: (reason: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Motif d'annulation *</label>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {reasons.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 p-3 min-h-[44px] rounded-lg border cursor-pointer transition-all ${
                selectedReason === reason
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="cancelReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => onReasonChange(e.target.value)}
                className="w-5 h-5 min-w-[20px] text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}
        </div>
        {selectedReason === 'Autre' && (
          <textarea
            value={otherReason}
            onChange={(e) => onOtherReasonChange(e.target.value)}
            placeholder="Precisez le motif..."
            className="w-full mt-2 px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-base"
            rows={2}
            autoFocus
          />
        )}
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onCancel}
          className="w-full sm:flex-1 px-4 py-3 min-h-[48px] sm:min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors active:scale-[0.98]"
        >
          Retour
        </button>
        <button
          onClick={onSubmit}
          disabled={!selectedReason}
          className="w-full sm:flex-1 px-4 py-3 min-h-[48px] sm:min-h-[44px] bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors active:scale-[0.98]"
        >
          Confirmer l'annulation
        </button>
      </div>
    </div>
  );
}

function EditTimeForm({
  editTime,
  onTimeChange,
  onCancel,
  onSubmit,
}: {
  editTime: string;
  onTimeChange: (time: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Heure de retrait</label>
        <input
          type="time"
          value={editTime}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onCancel}
          className="w-full sm:flex-1 px-4 py-3 min-h-[48px] sm:min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors active:scale-[0.98]"
        >
          Retour
        </button>
        <button
          onClick={onSubmit}
          className="w-full sm:flex-1 px-4 py-3 min-h-[48px] sm:min-h-[44px] bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors active:scale-[0.98]"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

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
    if (isPending) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
    if (isConfirmed) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (isReady) return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
    if (order.status === 'cancelled') return 'bg-gradient-to-r from-red-500 to-red-600';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 animate-backdrop-in" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${getHeaderColor()} text-white px-5 py-4 relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between pr-10">
            <div>
              <p className="text-sm opacity-80">#{shortOrderId}</p>
              <h2 className="text-xl font-bold">{order.customer_name}</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{pickupTime}</p>
              <p className="text-sm opacity-80">{pickupDate}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                  ? 'bg-yellow-100 text-yellow-700'
                  : isConfirmed
                    ? 'bg-blue-100 text-blue-700'
                    : isReady
                      ? 'bg-emerald-100 text-emerald-700'
                      : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Note</h4>
              <p className="text-yellow-900">{order.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="font-medium text-gray-600">Total</span>
            <span className="text-2xl font-bold">{formatPrice(order.total_amount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t p-4 space-y-3">
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
              <div className="flex items-center justify-center gap-3 pb-2">
                {canModifyTime && (
                  <button
                    onClick={handleEditTime}
                    className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                    title="Modifier l'heure"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-11 h-11 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors active:scale-95"
                    title="Annuler la commande"
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>

              {/* Main action buttons */}
              <div className="flex gap-3">
                {isPending && (
                  <button
                    onClick={onAccept}
                    className="flex-1 px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
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
                      className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4" />
                      Prête
                    </button>
                    <button
                      onClick={onMarkPickedUp}
                      className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
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
                    className="flex-1 px-4 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                  >
                    <Package className="w-5 h-5" />
                    Commande retirée
                  </button>
                )}
                {/* Show "Mark Picked Up" when order is ready */}
                {isReady && (
                  <button
                    onClick={onMarkPickedUp}
                    className="flex-1 px-4 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
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
        <div className="space-y-2">
          {reasons.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
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
                className="w-4 h-4 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}
        </div>
        {selectedReason === 'Autre' && (
          <textarea
            value={otherReason}
            onChange={(e) => onOtherReasonChange(e.target.value)}
            placeholder="Précisez le motif..."
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            rows={2}
            autoFocus
          />
        )}
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
        >
          Retour
        </button>
        <button
          onClick={onSubmit}
          disabled={!selectedReason}
          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
        >
          Retour
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

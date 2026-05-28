import { X } from 'lucide-react';
import { OrderSettingsSection } from '../Settings/OrderSettingsSection';
import { useSettings } from '../Settings/useSettings';

interface OrderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderSettingsModal({ isOpen, onClose }: OrderSettingsModalProps) {
  const {
    foodtruck,
    editForm,
    editingField,
    editLoading,
    startEditing,
    cancelEditing,
    saveField,
    updateEditForm,
  } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-200 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Paramètres des commandes</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <OrderSettingsSection
            foodtruck={foodtruck}
            editForm={editForm}
            editingField={editingField}
            editLoading={editLoading}
            onStartEdit={startEditing}
            onSave={saveField}
            onCancel={cancelEditing}
            onUpdateForm={updateEditForm}
          />
        </div>
      </div>
    </div>
  );
}

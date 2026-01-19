import { Plus, Ticket } from 'lucide-react';
import { usePromoCodes } from './usePromoCodes';
import { PromoCodeModal } from './PromoCodeModal';
import { PromoCodeTable } from './PromoCodeTable';
import { PromoCodeStats } from './PromoCodeStats';
import { VisibilityToggle } from './VisibilityToggle';

export default function PromoCodes() {
  const {
    promoCodes,
    loading,
    showModal,
    editingCode,
    copiedCode,
    form,
    setForm,
    foodtruck,
    stats,
    handleSubmit,
    toggleActive,
    deletePromoCode,
    openEditModal,
    openCreateModal,
    closeModal,
    copyCode,
    togglePromoSection,
  } = usePromoCodes();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Codes Promo</h1>
          <p className="text-gray-600 mt-1">
            Créez des codes de réduction pour vos clients
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau code
        </button>
      </div>

      {/* Visibility Toggle */}
      {promoCodes.length > 0 && (
        <VisibilityToggle
          foodtruck={foodtruck}
          activeCodesCount={stats.activeCodes}
          onToggle={togglePromoSection}
        />
      )}

      {/* Stats */}
      <PromoCodeStats
        activeCodes={stats.activeCodes}
        totalUses={stats.totalUses}
        totalDiscountGiven={stats.totalDiscountGiven}
      />

      {/* Liste des codes */}
      {promoCodes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun code promo
          </h3>
          <p className="text-gray-500 mb-4">
            Créez votre premier code pour attirer des clients !
          </p>
          <button onClick={openCreateModal} className="btn-primary">
            Créer un code
          </button>
          <p className="text-xs text-gray-400 mt-6">
            La section "Code promo" apparaîtra automatiquement pour vos clients lors du paiement dès que vous aurez créé votre premier code. Vous pourrez ensuite la masquer si besoin.
          </p>
        </div>
      ) : (
        <PromoCodeTable
          promoCodes={promoCodes}
          copiedCode={copiedCode}
          onCopy={copyCode}
          onToggleActive={toggleActive}
          onEdit={openEditModal}
          onDelete={deletePromoCode}
        />
      )}

      {/* Modal */}
      {showModal && (
        <PromoCodeModal
          form={form}
          setForm={setForm}
          isEditing={!!editingCode}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

import { Plus, Sparkles, Users } from 'lucide-react';
import { useOffers } from './useOffers';
import { SortableOfferList } from './SortableOfferList';
import { OfferWizard } from './OfferWizard';

export default function Offers() {
  const {
    offers,
    categories,
    menuItems,
    loading,
    saving,
    showWizard,
    editingOffer,
    form,
    setForm,
    wizardStep,
    setWizardStep,
    activeCount,
    totalUses,
    handleSubmit,
    toggleActive,
    deleteOffer,
    openEditWizard,
    closeWizard,
    openCreateWizard,
    reorderOffers,
  } = useOffers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - hidden on mobile (Layout provides header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <p className="hidden sm:block text-sm sm:text-base text-gray-600">
          Gérez toutes vos offres promotionnelles
        </p>
        <button
          onClick={() => openCreateWizard()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] w-full sm:w-auto bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nouvelle offre
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-success-500 flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Offres actives</p>
            </div>
          </div>
        </div>
        <div className="card p-3 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-info-500 flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalUses}</p>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Utilisations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune offre créée</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez votre première offre promotionnelle pour attirer plus de clients
          </p>
          <button
            onClick={() => openCreateWizard()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Créer une offre
          </button>
        </div>
      ) : (
        <SortableOfferList
          offers={offers}
          onToggle={toggleActive}
          onEdit={openEditWizard}
          onDelete={deleteOffer}
          onReorder={reorderOffers}
        />
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <OfferWizard
          editingOffer={editingOffer}
          form={form}
          categories={categories}
          menuItems={menuItems}
          step={wizardStep}
          saving={saving}
          onFormChange={setForm}
          onStepChange={setWizardStep}
          onSubmit={handleSubmit}
          onClose={closeWizard}
        />
      )}
    </div>
  );
}

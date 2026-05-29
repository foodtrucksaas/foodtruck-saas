import { useState } from 'react';
import { Plus, Sparkles, Users, Settings } from 'lucide-react';
import { useOffers } from './useOffers';
import { SortableOfferList } from './SortableOfferList';
import { OfferWizard } from './OfferWizard';
import { OfferSettingsModal } from './OfferSettingsModal';
import { useCanWrite } from '../../hooks/useCanWrite';

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
  const [showSettings, setShowSettings] = useState(false);
  const canWrite = useCanWrite();
  const disabledTitle = !canWrite
    ? 'Réactivez votre abonnement pour utiliser cette fonctionnalité.'
    : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Offer Settings Modal */}
      <OfferSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Header - hidden on mobile (Layout provides header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <p className="hidden sm:block text-sm sm:text-base text-gray-600">Gère toutes tes offres</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            aria-label="Paramètres des offres"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => openCreateWizard()}
            disabled={!canWrite}
            title={disabledTitle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Nouvelle offre
          </button>
        </div>
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
          <p className="text-gray-500">Aucune offre active</p>
          <p className="text-sm text-gray-400 mt-1">
            Une offre bien pensée peut booster tes pré-commandes.
          </p>
          <button
            onClick={() => openCreateWizard()}
            disabled={!canWrite}
            title={disabledTitle}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          readOnly={!canWrite}
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

import { Plus, Sparkles, Users } from 'lucide-react';
import { useOffers } from './useOffers';
import { OfferCard } from './OfferCard';
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
  } = useOffers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offres & Promotions</h1>
          <p className="text-gray-600">Gerez toutes vos offres promotionnelles</p>
        </div>
        <button
          onClick={() => openCreateWizard()}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nouvelle offre
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-sm text-gray-500">Offres actives</p>
            </div>
          </div>
        </div>
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalUses}</p>
              <p className="text-sm text-gray-500">Utilisations totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune offre creee</p>
          <p className="text-sm text-gray-400 mt-1">
            Creez votre premiere offre promotionnelle pour attirer plus de clients
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
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onToggle={toggleActive}
              onEdit={openEditWizard}
              onDelete={deleteOffer}
            />
          ))}
        </div>
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

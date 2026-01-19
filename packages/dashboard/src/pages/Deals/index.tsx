import { Plus, Package, Users, Euro } from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import { useDeals } from './useDeals';
import { DealCard } from './DealCard';
import { DealModal } from './DealModal';

export default function Deals() {
  const {
    deals, categories, menuItems, categoryOptions, loading, showModal, editingDeal, form, setForm,
    activeCount, totalUses, totalDiscount,
    handleSubmit, toggleActive, deleteDeal, openEditModal, closeModal, openCreateModal, getCategoryName, formatReward,
  } = useDeals();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Formules & Deals</h1><p className="text-gray-600">Créez des offres promotionnelles automatiques</p></div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Nouvelle formule</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><Package className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{activeCount}</p><p className="text-xs text-gray-500">Formules actives</p></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{totalUses}</p><p className="text-xs text-gray-500">Utilisations totales</p></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Euro className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{formatPrice(totalDiscount)}</p><p className="text-xs text-gray-500">Réductions accordées</p></div>
          </div>
        </div>
      </div>

      {/* Deals List */}
      {deals.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune formule créée</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre première offre promotionnelle</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onToggle={toggleActive}
              onEdit={openEditModal}
              onDelete={deleteDeal}
              getCategoryName={getCategoryName}
              formatReward={formatReward}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <DealModal
          editingDeal={editingDeal}
          form={form}
          categories={categories}
          menuItems={menuItems}
          categoryOptions={categoryOptions}
          onFormChange={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

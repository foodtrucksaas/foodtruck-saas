import { Plus, Send } from 'lucide-react';
import { useCampaigns } from './useCampaigns';
import { CampaignModal } from './CampaignModal';
import { CampaignCard } from './CampaignCard';

export default function Campaigns() {
  const {
    campaigns,
    locations,
    loading,
    showModal,
    editingCampaign,
    recipientCount,
    sending,
    form,
    setForm,
    openNewCampaign,
    openEditCampaign,
    closeModal,
    saveCampaign,
    deleteCampaign,
    sendCampaign,
  } = useCampaigns();

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
          <h1 className="text-2xl font-bold text-gray-900">Campagnes</h1>
          <p className="text-gray-600">Envoyez des emails et SMS à vos clients</p>
        </div>
        <button
          onClick={openNewCampaign}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle campagne
        </button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <Send className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune campagne</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez votre première campagne pour fidéliser vos clients
          </p>
          <button
            onClick={openNewCampaign}
            className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            Créer une campagne
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              locations={locations}
              sending={sending === campaign.id}
              onSend={() => sendCampaign(campaign)}
              onEdit={() => openEditCampaign(campaign)}
              onDelete={() => deleteCampaign(campaign.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CampaignModal
          form={form}
          setForm={setForm}
          locations={locations}
          recipientCount={recipientCount}
          isEditing={!!editingCampaign}
          onSave={saveCampaign}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

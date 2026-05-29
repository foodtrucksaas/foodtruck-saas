import { Plus } from 'lucide-react';
import { EmptyState } from '@foodtruck/shared';
import { useCampaigns } from './useCampaigns';
import { CampaignModal } from './CampaignModal';
import { CampaignCard } from './CampaignCard';
import { useCanWrite } from '../../hooks/useCanWrite';

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
  const canWrite = useCanWrite();
  const disabledTitle = !canWrite
    ? 'Réactive ton abonnement pour utiliser cette fonctionnalité.'
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
      {/* Header - hidden on mobile (Layout provides header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <p className="hidden sm:block text-sm sm:text-base text-gray-600">
          Envoie des emails et SMS à tes clients
        </p>
        <button
          onClick={openNewCampaign}
          disabled={!canWrite}
          title={disabledTitle}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] w-full sm:w-auto bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nouvelle campagne
        </button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="no-campaign"
            title="Aucune campagne"
            description="Envoie des emails et SMS à tes clients : promotions, nouveautés, horaires exceptionnels..."
            action={canWrite ? { label: 'Nouvelle campagne', onClick: openNewCampaign } : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              locations={locations}
              sending={sending === campaign.id}
              onSend={() => sendCampaign(campaign)}
              onEdit={() => openEditCampaign(campaign)}
              onDelete={() => deleteCampaign(campaign.id)}
              readOnly={!canWrite}
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

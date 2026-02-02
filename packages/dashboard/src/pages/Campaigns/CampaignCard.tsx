import { Mail, MessageSquare, Users, Send, Edit2, Trash2, Eye, MousePointer } from 'lucide-react';
import type { Campaign, CampaignTargeting, CampaignChannel, Location } from '@foodtruck/shared';
import { SEGMENT_OPTIONS } from './useCampaigns';

interface CampaignCardProps {
  campaign: Campaign;
  locations: Location[];
  sending: boolean;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CampaignCard({
  campaign,
  locations,
  sending,
  onSend,
  onEdit,
  onDelete,
}: CampaignCardProps) {
  const targeting = campaign.targeting as CampaignTargeting;
  const openRate =
    campaign.sent_count > 0 ? (campaign.opened_count / campaign.sent_count) * 100 : 0;
  const clickRate =
    campaign.sent_count > 0 ? (campaign.clicked_count / campaign.sent_count) * 100 : 0;

  const isSent = campaign.sent_count > 0;

  return (
    <div className="card p-4 sm:p-5 hover:shadow-md transition-shadow">
      {/* Layout mobile: structure verticale optimisee */}
      <div className="flex flex-col gap-3">
        {/* Header row: nom + status + canal */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-base leading-tight">
                {campaign.name}
              </h3>
              <StatusBadge sentCount={campaign.sent_count} />
            </div>
          </div>
          <span className="flex items-center gap-1 text-gray-400 flex-shrink-0">
            <ChannelIcon channel={campaign.channel} />
          </span>
        </div>

        {/* Info row: destinataires et segment */}
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{campaign.recipients_count}</span>
            <span className="text-gray-500 hidden xs:inline">destinataires</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-xs sm:text-sm truncate">
            {SEGMENT_OPTIONS.find((s) => s.key === targeting.segment)?.label}
            {targeting.segment === 'location' &&
              locations.find((l) => l.id === targeting.location_id) && (
                <span className="ml-1 text-gray-400">
                  ({locations.find((l) => l.id === targeting.location_id)?.name})
                </span>
              )}
          </span>
        </div>

        {/* Stats row - grid layout pour mobile */}
        {isSent && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
            <StatItem
              icon={<Send className="w-4 h-4" />}
              value={campaign.sent_count.toString()}
              label="Envoyes"
              color="gray"
            />
            <StatItem
              icon={<Eye className="w-4 h-4" />}
              value={`${openRate.toFixed(0)}%`}
              label="Ouverts"
              color="blue"
            />
            <StatItem
              icon={<MousePointer className="w-4 h-4" />}
              value={`${clickRate.toFixed(0)}%`}
              label="Clics"
              color="green"
            />
          </div>
        )}

        {/* Actions row - toujours en bas */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {!isSent && (
            <>
              <button
                onClick={onSend}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-medium text-sm transition-all shadow-md active:scale-95"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Envoyer</span>
              </button>
              <button
                onClick={onEdit}
                className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-gray-100 rounded-xl text-gray-500 transition-colors active:scale-95"
                aria-label="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
          {isSent && (
            <div className="flex-1 text-xs text-gray-400">
              Envoyee le{' '}
              {new Date(
                (campaign as { sent_at?: string }).sent_at || campaign.created_at
              ).toLocaleDateString('fr-FR')}
            </div>
          )}
          <button
            onClick={onDelete}
            className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors active:scale-95"
            aria-label="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant stat pour affichage inline
function StatItem({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: 'gray' | 'blue' | 'green';
}) {
  const colorClasses = {
    gray: 'text-gray-500 bg-gray-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
  };

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-1">
        {icon}
        <span className="font-semibold text-sm">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide opacity-75">{label}</span>
    </div>
  );
}

function StatusBadge({ sentCount }: { sentCount: number }) {
  if (sentCount > 0) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        Envoyée
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      Brouillon
    </span>
  );
}

function ChannelIcon({ channel }: { channel: CampaignChannel }) {
  switch (channel) {
    case 'email':
      return <Mail className="w-4 h-4" />;
    case 'sms':
      return <MessageSquare className="w-4 h-4" />;
    case 'both':
      return (
        <div className="flex gap-1">
          <Mail className="w-4 h-4" />
          <MessageSquare className="w-4 h-4" />
        </div>
      );
  }
}

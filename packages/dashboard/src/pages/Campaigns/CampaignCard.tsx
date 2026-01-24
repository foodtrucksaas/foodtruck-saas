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

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
            <StatusBadge sentCount={campaign.sent_count} />
            <span className="flex items-center gap-1 text-gray-400">
              <ChannelIcon channel={campaign.channel} />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {campaign.recipients_count} destinataires
            </span>
            <span>
              {SEGMENT_OPTIONS.find((s) => s.key === targeting.segment)?.label}
              {targeting.segment === 'location' &&
                locations.find((l) => l.id === targeting.location_id) && (
                  <span className="ml-1 text-gray-400">
                    ({locations.find((l) => l.id === targeting.location_id)?.name})
                  </span>
                )}
            </span>
          </div>

          {campaign.sent_count > 0 && (
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{campaign.sent_count} envoyés</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">{openRate.toFixed(1)}% ouverts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MousePointer className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">{clickRate.toFixed(1)}% clics</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {campaign.sent_count === 0 && (
            <>
              <button
                onClick={onSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-medium transition-all shadow-md active:scale-95"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Envoyer
              </button>
              <button
                onClick={onEdit}
                className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-gray-100 rounded-xl text-gray-500 transition-colors active:scale-95"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
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

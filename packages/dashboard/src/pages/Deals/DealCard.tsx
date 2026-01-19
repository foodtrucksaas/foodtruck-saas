import { Gift, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { DealWithOption } from './useDeals';

interface DealCardProps {
  deal: DealWithOption;
  onToggle: (deal: DealWithOption) => void;
  onEdit: (deal: DealWithOption) => void;
  onDelete: (id: string) => void;
  getCategoryName: (id: string | null) => string;
  formatReward: (deal: DealWithOption) => string;
}

export function DealCard({ deal, onToggle, onEdit, onDelete, getCategoryName, formatReward }: DealCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${deal.is_active ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{deal.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${deal.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {deal.is_active ? 'Actif' : 'Inactif'}
            </span>
          </div>
          {deal.description && <p className="text-sm text-gray-500 mt-1">{deal.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <span className="font-medium">Condition :</span>
              <span>
                {deal.trigger_quantity} {getCategoryName(deal.trigger_category_id)}
                {deal.trigger_option?.name && <span className="text-primary-600 ml-1">({deal.trigger_option.name})</span>}
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <Gift className="w-4 h-4" />
              <span>{formatReward(deal)}</span>
            </div>
            <div className="text-gray-400">Utilisée {deal.times_used ?? 0} fois</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(deal)}
            className={`p-2 rounded-lg transition-colors ${deal.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            title={deal.is_active ? 'Désactiver' : 'Activer'}
          >
            {deal.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => onEdit(deal)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Modifier">
            <Edit2 className="w-5 h-5" />
          </button>
          <button onClick={() => onDelete(deal.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Supprimer">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

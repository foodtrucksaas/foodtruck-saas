import {
  Copy,
  Check,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { PromoCode } from '@foodtruck/shared';
import { formatDiscount, isExpired, isMaxedOut } from './usePromoCodes';

interface PromoCodeTableProps {
  promoCodes: PromoCode[];
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onToggleActive: (promo: PromoCode) => void;
  onEdit: (promo: PromoCode) => void;
  onDelete: (id: string) => void;
}

export function PromoCodeTable({
  promoCodes,
  copiedCode,
  onCopy,
  onToggleActive,
  onEdit,
  onDelete,
}: PromoCodeTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
              Code
            </th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
              Réduction
            </th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
              Validité
            </th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
              Utilisations
            </th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
              Statut
            </th>
            <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {promoCodes.map((promo) => {
            const expired = isExpired(promo);
            const maxed = isMaxedOut(promo);

            return (
              <tr key={promo.id} className={expired || maxed ? 'bg-gray-50' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-bold">
                      {promo.code}
                    </code>
                    <button
                      onClick={() => onCopy(promo.code)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copier"
                    >
                      {copiedCode === promo.code ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {promo.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {promo.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-green-600">
                    {formatDiscount(promo)}
                  </span>
                  {promo.min_order_amount > 0 && (
                    <p className="text-xs text-gray-500">
                      Min. {(promo.min_order_amount / 100).toFixed(0)}€
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {promo.valid_until ? (
                    <span className={expired ? 'text-red-500' : 'text-gray-600'}>
                      Jusqu'au {new Date(promo.valid_until).toLocaleDateString('fr-FR')}
                    </span>
                  ) : (
                    <span className="text-gray-400">Illimité</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={maxed ? 'text-red-500' : ''}>
                    {promo.current_uses}
                    {promo.max_uses && ` / ${promo.max_uses}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleActive(promo)}
                    disabled={expired || maxed}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      !promo.is_active || expired || maxed
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {promo.is_active && !expired && !maxed ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        Actif
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        {expired ? 'Expiré' : maxed ? 'Épuisé' : 'Inactif'}
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(promo)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(promo.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

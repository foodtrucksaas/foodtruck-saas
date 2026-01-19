import { Ticket, Users, Euro } from 'lucide-react';

interface PromoCodeStatsProps {
  activeCodes: number;
  totalUses: number;
  totalDiscountGiven: number;
}

export function PromoCodeStats({
  activeCodes,
  totalUses,
  totalDiscountGiven,
}: PromoCodeStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Ticket className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Codes actifs</p>
            <p className="text-xl font-bold text-gray-900">{activeCodes}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Utilisations totales</p>
            <p className="text-xl font-bold text-gray-900">{totalUses}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Euro className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Réductions accordées</p>
            <p className="text-xl font-bold text-gray-900">
              {(totalDiscountGiven / 100).toFixed(2)}€
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

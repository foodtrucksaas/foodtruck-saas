import type { OfferType } from '@foodtruck/shared';
import { OFFER_TYPE_LABELS, OFFER_TYPE_DESCRIPTIONS } from '@foodtruck/shared';
import { typeIcons } from './wizardTypes';

interface OfferTypeSelectorProps {
  onSelect: (type: OfferType) => void;
}

export function OfferTypeSelector({ onSelect }: OfferTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">Choisissez le type d'offre a creer</p>
      <div className="grid gap-3">
        {(Object.keys(OFFER_TYPE_LABELS) as OfferType[]).map((type) => {
          const Icon = typeIcons[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 min-h-[60px] border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left active:scale-[0.98]"
            >
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-gray-900">{OFFER_TYPE_LABELS[type]}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{OFFER_TYPE_DESCRIPTIONS[type]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

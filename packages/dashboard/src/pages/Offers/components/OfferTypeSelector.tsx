import type { OfferType } from '@foodtruck/shared';
import { Package, Gift, Tag, TrendingUp } from 'lucide-react';

interface OfferTypeSelectorProps {
  onSelect: (type: OfferType) => void;
}

const offerTypes: {
  type: OfferType;
  icon: typeof Package;
  label: string;
  description: string;
  example: string;
  color: string;
  iconBg: string;
}[] = [
  {
    type: 'bundle',
    icon: Package,
    label: 'Menu / Formule',
    description: 'Le client compose un menu a prix fixe en choisissant parmi vos categories.',
    example: 'Ex : Entree + Plat + Boisson = 12,90 EUR',
    color: 'border-primary-200 hover:border-primary-500 hover:bg-primary-50',
    iconBg: 'bg-primary-100 text-primary-600',
  },
  {
    type: 'buy_x_get_y',
    icon: Gift,
    label: 'Offert a partir de X achetes',
    description: "Quand le client achete un certain nombre d'articles, il recoit un cadeau.",
    example: 'Ex : 3 pizzas achetees = 1 boisson offerte',
    color: 'border-amber-200 hover:border-amber-500 hover:bg-amber-50',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    type: 'promo_code',
    icon: Tag,
    label: 'Code Promo',
    description: 'Un code a saisir par le client pour obtenir une reduction.',
    example: 'Ex : Code BIENVENUE = -10% sur la commande',
    color: 'border-blue-200 hover:border-blue-500 hover:bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    type: 'threshold_discount',
    icon: TrendingUp,
    label: 'Remise au palier',
    description: 'Une reduction automatique quand la commande depasse un certain montant.',
    example: 'Ex : -5 EUR des 25 EUR de commande',
    color: 'border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
];

export function OfferTypeSelector({ onSelect }: OfferTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-900">Quel type d'offre souhaitez-vous creer ?</h3>
        <p className="text-sm text-gray-500 mt-1">
          Choisissez le format le plus adapte a votre besoin
        </p>
      </div>
      <div className="grid gap-3">
        {offerTypes.map(({ type, icon: Icon, label, description, example, color, iconBg }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`flex items-start gap-4 p-4 border-2 rounded-xl transition-all text-left active:scale-[0.98] ${color}`}
          >
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{label}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{description}</p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium italic">{example}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

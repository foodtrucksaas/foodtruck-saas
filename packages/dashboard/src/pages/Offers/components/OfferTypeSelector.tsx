import type { OfferType } from '@foodtruck/shared';
import { Package, Gift, Tag, TrendingUp, Sparkles } from 'lucide-react';

interface OfferTypeSelectorProps {
  onSelect: (type: OfferType) => void;
}

interface OfferTemplate {
  type: OfferType;
  icon: typeof Package;
  title: string;
  example: string;
  description: string;
  color: string;
  bgColor: string;
  popular?: boolean;
}

const templates: OfferTemplate[] = [
  {
    type: 'bundle',
    icon: Package,
    title: 'Menu / Formule',
    example: 'Entree + Plat + Boisson = 15€',
    description: 'Creez une formule a prix fixe avec plusieurs choix',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    popular: true,
  },
  {
    type: 'buy_x_get_y',
    icon: Gift,
    title: 'X achetes = Y offert',
    example: '3 pizzas = 1 boisson offerte',
    description: 'Offrez un article quand le client en achete plusieurs',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
  },
  {
    type: 'promo_code',
    icon: Tag,
    title: 'Code Promo',
    example: '-10% avec WELCOME10',
    description: 'Un code a saisir pour avoir une reduction',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
  },
  {
    type: 'threshold_discount',
    icon: TrendingUp,
    title: 'Remise au palier',
    example: "Des 25€ d'achat = 5€ offerts",
    description: "Reduction automatique a partir d'un montant",
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
];

export function OfferTypeSelector({ onSelect }: OfferTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Quel type d'offre voulez-vous creer ?
        </h3>
        <p className="text-sm text-gray-500">Choisissez le modele qui correspond a votre besoin</p>
      </div>

      <div className="grid gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.type}
              onClick={() => onSelect(template.type)}
              className={`relative flex items-start gap-4 p-4 border-2 rounded-xl transition-all text-left active:scale-[0.98] ${template.bgColor}`}
            >
              {/* Popular badge */}
              {template.popular && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  Populaire
                </div>
              )}

              {/* Icon */}
              <div className={`p-3 rounded-xl bg-white shadow-sm flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${template.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-0.5">{template.title}</h4>

                {/* Example preview - looks like a mini receipt */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-gray-200 mb-2">
                  <span className="text-sm font-medium text-gray-700">{template.example}</span>
                </div>

                <p className="text-sm text-gray-600">{template.description}</p>
              </div>

              {/* Arrow indicator */}
              <div className="flex-shrink-0 self-center">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

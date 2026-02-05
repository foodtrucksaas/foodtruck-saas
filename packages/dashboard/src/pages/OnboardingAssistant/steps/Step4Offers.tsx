import { useState } from 'react';
import { Gift, Package, Tag, TrendingUp, ChevronRight } from 'lucide-react';
import { useOnboarding, OnboardingOffer } from '../OnboardingContext';
import { AssistantBubble, StepContainer, ActionButton, OptionCard } from '../components';

type OfferSubStep = 'ask' | 'select-type' | 'configure' | 'done';

const OFFER_TYPES = [
  {
    type: 'bundle' as const,
    label: 'Menu / Formule',
    description: 'Pizza + Boisson a prix fixe',
    icon: Package,
    example: '"Menu Midi a 12€"',
  },
  {
    type: 'buy_x_get_y' as const,
    label: 'X achetes = Y offert',
    description: '3 pizzas = 1 boisson offerte',
    icon: Gift,
    example: '"3 pizzas = 1 boisson offerte"',
  },
  {
    type: 'promo_code' as const,
    label: 'Code Promo',
    description: 'Code BIENVENUE = -10%',
    icon: Tag,
    example: '"BIENVENUE" = -10%',
  },
  {
    type: 'threshold_discount' as const,
    label: 'Remise au palier',
    description: 'Des 25€ = -5€',
    icon: TrendingUp,
    example: '"Des 25€ = -5€"',
  },
];

export function Step4Offers() {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [subStep, setSubStep] = useState<OfferSubStep>('ask');
  const [selectedType, setSelectedType] = useState<OnboardingOffer['type'] | null>(null);
  const [offerName, setOfferName] = useState('');
  const [offerConfig, setOfferConfig] = useState<Record<string, string | number>>({});

  const handleWantsOffers = (wants: boolean) => {
    dispatch({ type: 'SET_WANTS_OFFERS', wants });
    if (wants) {
      setSubStep('select-type');
    } else {
      nextStep();
    }
  };

  const handleSelectType = (type: OnboardingOffer['type']) => {
    setSelectedType(type);
    // Set default name based on type
    const typeInfo = OFFER_TYPES.find((t) => t.type === type);
    if (typeInfo) {
      setOfferName(typeInfo.label);
    }
    // Set default config
    switch (type) {
      case 'bundle':
        setOfferConfig({ fixed_price: '' });
        break;
      case 'buy_x_get_y':
        setOfferConfig({ trigger_quantity: 3, reward_quantity: 1 });
        break;
      case 'promo_code':
        setOfferConfig({ code: '', discount_type: 'percentage', discount_value: 10 });
        break;
      case 'threshold_discount':
        setOfferConfig({ min_amount: 25, discount_type: 'fixed', discount_value: 5 });
        break;
    }
    setSubStep('configure');
  };

  const isConfigValid = () => {
    if (!offerName.trim()) return false;
    switch (selectedType) {
      case 'bundle':
        return offerConfig.fixed_price && Number(offerConfig.fixed_price) > 0;
      case 'buy_x_get_y':
        return Number(offerConfig.trigger_quantity) > 0 && Number(offerConfig.reward_quantity) > 0;
      case 'promo_code':
        return String(offerConfig.code).trim() && Number(offerConfig.discount_value) > 0;
      case 'threshold_discount':
        return Number(offerConfig.min_amount) > 0 && Number(offerConfig.discount_value) > 0;
      default:
        return false;
    }
  };

  const handleSaveOffer = () => {
    if (!selectedType || !isConfigValid()) return;

    const offer: OnboardingOffer = {
      type: selectedType,
      name: offerName,
      config: { ...offerConfig },
    };

    dispatch({ type: 'ADD_OFFER', offer });
    setSubStep('done');
    // Reset form
    setSelectedType(null);
    setOfferName('');
    setOfferConfig({});
  };

  const handleAddAnother = () => {
    setSubStep('select-type');
  };

  const handleFinish = () => {
    nextStep();
  };

  // Step: Ask if they want offers
  if (subStep === 'ask') {
    return (
      <StepContainer onBack={prevStep} hideActions>
        <div className="space-y-6">
          <AssistantBubble message="Proposez-vous des offres ou formules ?" emoji="🎁" />

          <p className="text-sm text-gray-600">
            Les offres attirent de nouveaux clients et fidelisent les existants !
          </p>

          <div className="space-y-3">
            <ActionButton onClick={() => handleWantsOffers(true)}>
              Oui, je veux creer une offre
            </ActionButton>
            <ActionButton onClick={() => handleWantsOffers(false)} variant="secondary">
              Non, peut-etre plus tard
            </ActionButton>
          </div>
        </div>
      </StepContainer>
    );
  }

  // Step: Select offer type
  if (subStep === 'select-type') {
    return (
      <StepContainer
        onBack={() => {
          if (state.offers.length > 0) {
            setSubStep('done');
          } else {
            setSubStep('ask');
          }
        }}
        hideActions
      >
        <div className="space-y-6">
          <AssistantBubble message="Quel type d'offre souhaitez-vous creer ?" emoji="🎁" />

          <div className="space-y-3">
            {OFFER_TYPES.map(({ type, label, description, icon: Icon, example }) => (
              <OptionCard
                key={type}
                onClick={() => handleSelectType(type)}
                title={label}
                description={`${description} • Ex: ${example}`}
                icon={<Icon className="w-5 h-5" />}
              />
            ))}
          </div>
        </div>
      </StepContainer>
    );
  }

  // Step: Configure offer
  if (subStep === 'configure' && selectedType) {
    const typeInfo = OFFER_TYPES.find((t) => t.type === selectedType);

    return (
      <StepContainer
        onBack={() => setSubStep('select-type')}
        onNext={handleSaveOffer}
        nextLabel="Creer l'offre"
        nextDisabled={!isConfigValid()}
      >
        <div className="space-y-6">
          <AssistantBubble message={`Configurez votre offre "${typeInfo?.label}"`} emoji="⚙️" />

          {/* Offer name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'offre</label>
            <input
              type="text"
              value={offerName}
              onChange={(e) => setOfferName(e.target.value)}
              className="input min-h-[48px] text-base"
              placeholder="Ex: Menu Midi, Code Bienvenue..."
            />
          </div>

          {/* Type-specific config */}
          {selectedType === 'bundle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prix fixe de la formule
              </label>
              <div className="relative w-40">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={offerConfig.fixed_price}
                  onChange={(e) => setOfferConfig({ ...offerConfig, fixed_price: e.target.value })}
                  className="input min-h-[48px] text-base pr-8"
                  placeholder="12.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Vous pourrez configurer les articles inclus plus tard.
              </p>
            </div>
          )}

          {selectedType === 'buy_x_get_y' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Acheter X articles
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerConfig.trigger_quantity}
                    onChange={(e) =>
                      setOfferConfig({
                        ...offerConfig,
                        trigger_quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input min-h-[48px] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    = Y offert(s)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerConfig.reward_quantity}
                    onChange={(e) =>
                      setOfferConfig({
                        ...offerConfig,
                        reward_quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input min-h-[48px] text-base"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Vous pourrez configurer les categories eligibles plus tard.
              </p>
            </div>
          )}

          {selectedType === 'promo_code' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Code promo</label>
                <input
                  type="text"
                  value={offerConfig.code}
                  onChange={(e) =>
                    setOfferConfig({ ...offerConfig, code: e.target.value.toUpperCase() })
                  }
                  className="input min-h-[48px] text-base uppercase"
                  placeholder="BIENVENUE"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type de remise
                  </label>
                  <select
                    value={offerConfig.discount_type}
                    onChange={(e) =>
                      setOfferConfig({ ...offerConfig, discount_type: e.target.value })
                    }
                    className="input min-h-[48px] text-base"
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valeur</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={offerConfig.discount_value}
                      onChange={(e) =>
                        setOfferConfig({
                          ...offerConfig,
                          discount_value: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input min-h-[48px] text-base pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {offerConfig.discount_type === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedType === 'threshold_discount' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Montant minimum de commande
                </label>
                <div className="relative w-40">
                  <input
                    type="number"
                    min="0"
                    value={offerConfig.min_amount}
                    onChange={(e) =>
                      setOfferConfig({
                        ...offerConfig,
                        min_amount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input min-h-[48px] text-base pr-8"
                    placeholder="25"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type de remise
                  </label>
                  <select
                    value={offerConfig.discount_type}
                    onChange={(e) =>
                      setOfferConfig({ ...offerConfig, discount_type: e.target.value })
                    }
                    className="input min-h-[48px] text-base"
                  >
                    <option value="fixed">Montant fixe (€)</option>
                    <option value="percentage">Pourcentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Remise</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={offerConfig.discount_value}
                      onChange={(e) =>
                        setOfferConfig({
                          ...offerConfig,
                          discount_value: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input min-h-[48px] text-base pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {offerConfig.discount_type === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </StepContainer>
    );
  }

  // Step: Done (ask for another)
  if (subStep === 'done') {
    return (
      <StepContainer hideActions>
        <div className="space-y-6">
          <AssistantBubble message="Offre creee !" emoji="✅" variant="success" />

          {/* Summary of offers */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Vos offres</p>
            <div className="space-y-2">
              {state.offers.map((offer, index) => {
                const typeInfo = OFFER_TYPES.find((t) => t.type === offer.type);
                const Icon = typeInfo?.icon || Gift;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{offer.name}</p>
                      <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <AssistantBubble message="Voulez-vous ajouter une autre offre ?" />

          <div className="space-y-3">
            <ActionButton
              onClick={handleAddAnother}
              variant="secondary"
              icon={<Gift className="w-5 h-5" />}
            >
              Oui, ajouter une offre
            </ActionButton>
            <ActionButton onClick={handleFinish} icon={<ChevronRight className="w-5 h-5" />}>
              Non, continuer
            </ActionButton>
          </div>
        </div>
      </StepContainer>
    );
  }

  return null;
}

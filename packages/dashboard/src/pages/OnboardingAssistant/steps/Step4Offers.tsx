import { useState } from 'react';
import { Gift, Package, Tag, TrendingUp, ChevronDown, Check } from 'lucide-react';
import { useOnboarding, OnboardingOffer } from '../OnboardingContext';
import { AssistantBubble, StepContainer, ActionButton, OptionCard } from '../components';

type OfferSubStep = 'ask' | 'select-type' | 'configure' | 'done';

const OFFER_TYPES = [
  {
    type: 'bundle' as const,
    label: 'Menu / Formule',
    description: 'Pizza + Boisson à prix fixe',
    icon: Package,
    example: '"Menu Midi à 12€"',
  },
  {
    type: 'buy_x_get_y' as const,
    label: 'X achetés = Y offert',
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
    description: 'Dès 25€ = -5€',
    icon: TrendingUp,
    example: '"Dès 25€ = -5€"',
  },
];

export function Step4Offers() {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [subStep, setSubStep] = useState<OfferSubStep>(state.offers.length > 0 ? 'done' : 'ask');
  const [selectedType, setSelectedType] = useState<OnboardingOffer['type'] | null>(null);
  const [offerName, setOfferName] = useState('');
  const [offerConfig, setOfferConfig] = useState<Record<string, string | number>>({});
  const [bundleCategories, setBundleCategories] = useState<string[]>([]);
  // Track selected items per category (category name → item IDs). If a category is selected but not in this map, all items are selected.
  const [bundleItems, setBundleItems] = useState<Record<string, string[]>>({});
  // Track selected options per category (category name → option names). If a category has option groups but is not in this map, all options are selected.
  const [bundleOptions, setBundleOptions] = useState<Record<string, string[]>>({});
  // Track which categories are expanded for article detail
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

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
    setOfferName(type === 'bundle' ? '' : OFFER_TYPES.find((t) => t.type === type)?.label || '');
    setBundleCategories([]);
    setBundleItems({});
    setBundleOptions({});
    setExpandedCategories([]);
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
      case 'bundle': {
        if (!offerConfig.fixed_price || Number(offerConfig.fixed_price) <= 0) return false;
        if (bundleCategories.length < 2) return false;
        // Each selected category must have at least 1 item selected
        for (const catName of bundleCategories) {
          const cat = state.categories.find((c) => c.name === catName);
          if (!cat) return false;
          const selectedItemIds = bundleItems[catName];
          // If not in map, all items selected (OK if items exist)
          if (!selectedItemIds && cat.items.length === 0) return false;
          if (selectedItemIds && selectedItemIds.length === 0) return false;
        }
        return true;
      }
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

    const config: Record<string, unknown> = { ...offerConfig };
    if (selectedType === 'bundle') {
      config.bundle_category_names = bundleCategories;
      // Build detailed selection per category
      const bundleSelection: Record<string, { items: string[]; options?: string[] }> = {};
      for (const catName of bundleCategories) {
        const cat = state.categories.find((c) => c.name === catName);
        if (!cat) continue;
        const selectedIds = bundleItems[catName] || cat.items.map((i) => i.id);
        const selectedNames = selectedIds
          .map((id) => cat.items.find((i) => i.id === id)?.name)
          .filter(Boolean) as string[];
        const entry: { items: string[]; options?: string[] } = { items: selectedNames };
        // Include selected options if category has option groups
        const optNames = bundleOptions[catName];
        if (optNames && optNames.length > 0) {
          entry.options = optNames;
        }
        bundleSelection[catName] = entry;
      }
      config.bundle_selection = bundleSelection;
    }

    const offer: OnboardingOffer = {
      type: selectedType,
      name: offerName,
      config,
    };

    dispatch({ type: 'ADD_OFFER', offer });
    setSubStep('done');
    // Reset form
    setSelectedType(null);
    setOfferName('');
    setOfferConfig({});
    setBundleCategories([]);
    setBundleItems({});
    setBundleOptions({});
    setExpandedCategories([]);
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
      <StepContainer onBack={prevStep}>
        <div className="space-y-6">
          <AssistantBubble message="Proposez-vous des offres ou formules ?" emoji="🎁" />

          <p className="text-sm text-gray-600">
            Les offres attirent de nouveaux clients et fidélisent les existants !
          </p>

          <div className="space-y-3">
            <ActionButton onClick={() => handleWantsOffers(true)}>
              Oui, je veux créer une offre
            </ActionButton>
            <ActionButton onClick={() => handleWantsOffers(false)} variant="secondary">
              Non, peut-être plus tard
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
      >
        <div className="space-y-6">
          <AssistantBubble message="Quel type d'offre souhaitez-vous créer ?" emoji="🎁" />

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
        nextLabel="Créer l'offre"
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
            <div className="space-y-5">
              {/* Category selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Catégories incluses
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Le client choisira 1 article dans chaque catégorie. Décochez les articles non
                  éligibles.
                </p>
                {state.categories.length > 0 ? (
                  <div className="space-y-2">
                    {state.categories.map((cat) => {
                      const isCatSelected = bundleCategories.includes(cat.name);
                      const isExpanded = expandedCategories.includes(cat.name);
                      const selectedItemIds = bundleItems[cat.name] || cat.items.map((i) => i.id);
                      const allOptionGroups = cat.optionGroups.filter(
                        (og) => og.options.length > 0
                      );
                      const selectedOpts = bundleOptions[cat.name];

                      const toggleCategory = () => {
                        if (isCatSelected) {
                          setBundleCategories((prev) => prev.filter((c) => c !== cat.name));
                          setExpandedCategories((prev) => prev.filter((c) => c !== cat.name));
                        } else {
                          setBundleCategories((prev) => [...prev, cat.name]);
                          // Default: all items selected
                          setBundleItems((prev) => ({
                            ...prev,
                            [cat.name]: cat.items.map((i) => i.id),
                          }));
                          // Default: all options selected
                          if (allOptionGroups.length > 0) {
                            const allOpts = allOptionGroups.flatMap((og) =>
                              og.options.map((o) => o.name)
                            );
                            setBundleOptions((prev) => ({ ...prev, [cat.name]: allOpts }));
                          }
                          setExpandedCategories((prev) => [...prev, cat.name]);
                        }
                      };

                      const toggleExpand = () => {
                        if (!isCatSelected) return;
                        setExpandedCategories((prev) =>
                          isExpanded ? prev.filter((c) => c !== cat.name) : [...prev, cat.name]
                        );
                      };

                      const toggleItem = (itemId: string) => {
                        setBundleItems((prev) => {
                          const current = prev[cat.name] || cat.items.map((i) => i.id);
                          const next = current.includes(itemId)
                            ? current.filter((id) => id !== itemId)
                            : [...current, itemId];
                          return { ...prev, [cat.name]: next };
                        });
                      };

                      const toggleOption = (optName: string) => {
                        setBundleOptions((prev) => {
                          const allOpts = allOptionGroups.flatMap((og) =>
                            og.options.map((o) => o.name)
                          );
                          const current = prev[cat.name] || allOpts;
                          const next = current.includes(optName)
                            ? current.filter((n) => n !== optName)
                            : [...current, optName];
                          return { ...prev, [cat.name]: next };
                        });
                      };

                      return (
                        <div key={cat.id}>
                          {/* Category header */}
                          <div
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                              isCatSelected
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={toggleCategory}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isCatSelected
                                  ? 'bg-primary-500 border-primary-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isCatSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <button
                              type="button"
                              onClick={isCatSelected ? toggleExpand : toggleCategory}
                              className="flex-1 flex items-center justify-between min-h-[32px]"
                            >
                              <span
                                className={`font-medium text-left ${isCatSelected ? 'text-primary-700' : 'text-gray-700'}`}
                              >
                                {cat.name}
                              </span>
                              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                {isCatSelected
                                  ? `${selectedItemIds.length}/${cat.items.length}`
                                  : `${cat.items.length} article${cat.items.length > 1 ? 's' : ''}`}
                                {isCatSelected && (
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                )}
                              </span>
                            </button>
                          </div>

                          {/* Expanded: items + options */}
                          {isCatSelected && isExpanded && (
                            <div className="ml-4 mt-1 mb-2 space-y-1">
                              {/* Items */}
                              <p className="text-xs font-medium text-gray-500 mt-2 mb-1">
                                Articles éligibles
                              </p>
                              {cat.items.map((item) => {
                                const isItemSelected = selectedItemIds.includes(item.id);
                                const price =
                                  item.prices['base'] || Object.values(item.prices)[0] || 0;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    <div
                                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        isItemSelected
                                          ? 'bg-primary-500 border-primary-500'
                                          : 'border-gray-300'
                                      }`}
                                    >
                                      {isItemSelected && (
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      )}
                                    </div>
                                    <span
                                      className={`flex-1 text-sm text-left ${isItemSelected ? 'text-gray-900' : 'text-gray-400 line-through'}`}
                                    >
                                      {item.name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {price.toFixed(2)}€
                                    </span>
                                  </button>
                                );
                              })}

                              {/* Option groups (sizes, etc.) */}
                              {allOptionGroups.length > 0 && (
                                <>
                                  {allOptionGroups.map((og) => (
                                    <div key={og.id}>
                                      <p className="text-xs font-medium text-gray-500 mt-3 mb-1">
                                        {og.name}{' '}
                                        <span className="font-normal text-gray-400">
                                          ({og.type === 'size' ? 'taille' : 'supplément'})
                                        </span>
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {og.options.map((opt) => {
                                          const isOptSelected =
                                            selectedOpts?.includes(opt.name) ?? true;
                                          return (
                                            <button
                                              key={opt.name}
                                              type="button"
                                              onClick={() => toggleOption(opt.name)}
                                              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                                isOptSelected
                                                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                                                  : 'border-gray-200 text-gray-400 line-through'
                                              }`}
                                            >
                                              {opt.name}
                                              {opt.priceModifier
                                                ? ` (+${(opt.priceModifier / 100).toFixed(2)}€)`
                                                : ''}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                    Aucune catégorie créée. Retournez à l'étape Menu pour en ajouter.
                  </p>
                )}
                {bundleCategories.length > 0 && bundleCategories.length < 2 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Sélectionnez au moins 2 catégories pour créer une formule.
                  </p>
                )}
              </div>

              {/* Price */}
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
                    onChange={(e) =>
                      setOfferConfig({ ...offerConfig, fixed_price: e.target.value })
                    }
                    className="input min-h-[48px] text-base pr-8"
                    placeholder="12.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              </div>

              {/* Preview */}
              {bundleCategories.length >= 2 && offerConfig.fixed_price && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Aperçu :</span> {bundleCategories.join(' + ')} ={' '}
                    {offerConfig.fixed_price}€
                  </p>
                  {bundleCategories.map((catName) => {
                    const cat = state.categories.find((c) => c.name === catName);
                    if (!cat) return null;
                    const selectedIds = bundleItems[catName] || cat.items.map((i) => i.id);
                    const isAllItems = selectedIds.length === cat.items.length;
                    const selectedOptNames = bundleOptions[catName];
                    const allOpts = cat.optionGroups
                      .filter((og) => og.options.length > 0)
                      .flatMap((og) => og.options.map((o) => o.name));
                    const isAllOpts =
                      !selectedOptNames || selectedOptNames.length === allOpts.length;
                    if (isAllItems && isAllOpts) return null;
                    return (
                      <p key={catName} className="text-xs text-blue-600">
                        {catName} :{' '}
                        {!isAllItems && `${selectedIds.length}/${cat.items.length} articles`}
                        {!isAllItems && !isAllOpts && ' · '}
                        {!isAllOpts &&
                          selectedOptNames &&
                          `${selectedOptNames.length}/${allOpts.length} options`}
                      </p>
                    );
                  })}
                </div>
              )}
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
                Vous pourrez configurer les catégories éligibles plus tard.
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
      <StepContainer onBack={prevStep} onNext={handleFinish} nextLabel="Continuer">
        <div className="space-y-6">
          <AssistantBubble message="Vos offres" emoji="🎁" />

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
                    className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-card"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{offer.name}</p>
                      {offer.name !== typeInfo?.label && (
                        <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ActionButton
            onClick={handleAddAnother}
            variant="secondary"
            icon={<Gift className="w-5 h-5" />}
          >
            Ajouter une offre
          </ActionButton>
        </div>
      </StepContainer>
    );
  }

  return null;
}

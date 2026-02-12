import { useState, useEffect } from 'react';
import {
  Gift,
  Package,
  Tag,
  TrendingUp,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import { useOnboarding, OnboardingOffer } from '../OnboardingContext';
import { AssistantBubble, StepContainer, ActionButton, OptionCard } from '../components';
import { useToast, Toast } from '../../../components/Alert';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

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
  const { toast, hideToast, showSuccess } = useToast();
  const confirmDialog = useConfirmDialog();
  // Sub-step from context (persisted via sessionStorage)
  const subStep = state.offerSubStep;
  const setSubStep = (s: OfferSubStep) => dispatch({ type: 'SET_OFFER_SUB_STEP', subStep: s });

  // Restore draft from context if available
  const draft = state.currentOfferDraft;
  const [selectedType, setSelectedType] = useState<OnboardingOffer['type'] | null>(
    draft?.type || null
  );
  const [offerName, setOfferName] = useState(draft?.name || '');
  const [offerConfig, setOfferConfig] = useState<Record<string, string | number>>(
    (draft?.config as Record<string, string | number>) || {}
  );
  const [bundleCategories, setBundleCategories] = useState<string[]>([]);
  // Track excluded items per category (category name → excluded item IDs)
  const [bundleExcludedItems, setBundleExcludedItems] = useState<Record<string, string[]>>({});
  // Track excluded options per item (itemId → excluded option names)
  const [bundleExcludedOptions, setBundleExcludedOptions] = useState<Record<string, string[]>>({});
  // Track which categories are expanded for article detail
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  // Track which items are expanded for option detail
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  // Per-item custom supplements (itemId → supplements)
  const [bundleItemSupplements, setBundleItemSupplements] = useState<
    Record<string, { name: string; price: number }[]>
  >({});
  // Which item currently has the add-supplement form open
  const [addingSupplementFor, setAddingSupplementFor] = useState<string | null>(null);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPrice, setNewSupPrice] = useState('');
  // Buy X Get Y: trigger & reward selection
  const [buyXTriggerCategories, setBuyXTriggerCategories] = useState<string[]>([]);
  const [buyXTriggerExcludedItems, setBuyXTriggerExcludedItems] = useState<
    Record<string, string[]>
  >({});
  const [buyXRewardCategories, setBuyXRewardCategories] = useState<string[]>([]);
  const [buyXRewardExcludedItems, setBuyXRewardExcludedItems] = useState<Record<string, string[]>>(
    {}
  );
  const [showTriggerDetails, setShowTriggerDetails] = useState(false);
  const [showRewardDetails, setShowRewardDetails] = useState(false);
  const [editingOfferIndex, setEditingOfferIndex] = useState<number | null>(null);

  // Sync draft to context so it persists across navigation
  useEffect(() => {
    if (selectedType && subStep === 'configure') {
      dispatch({
        type: 'SET_CURRENT_OFFER_DRAFT',
        draft: { type: selectedType, name: offerName, config: offerConfig },
      });
    }
  }, [selectedType, offerName, offerConfig, subStep, dispatch]);

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
    setBundleExcludedItems({});
    setBundleExcludedOptions({});
    setBundleItemSupplements({});
    setExpandedCategories([]);
    setExpandedItems([]);
    setAddingSupplementFor(null);
    setBuyXTriggerCategories([]);
    setBuyXTriggerExcludedItems({});
    setBuyXRewardCategories([]);
    setBuyXRewardExcludedItems({});
    setShowTriggerDetails(false);
    setShowRewardDetails(false);
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
        // Each selected category must have at least 1 eligible item
        for (const catName of bundleCategories) {
          const cat = state.categories.find((c) => c.name === catName);
          if (!cat || cat.items.length === 0) return false;
          const excluded = bundleExcludedItems[catName] || [];
          if (cat.items.length - excluded.length <= 0) return false;
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
      // Snapshot category IDs for safety (in case categories get renamed before save)
      const catIdMap: Record<string, string> = {};
      for (const catName of bundleCategories) {
        const cat = state.categories.find((c) => c.name === catName);
        if (cat) catIdMap[catName] = cat.id;
      }
      config.bundle_category_ids = catIdMap;
      // Build detailed selection per category
      const bundleSelection: Record<
        string,
        {
          excluded_items: string[];
          excluded_options: Record<string, string[]>;
          item_supplements: Record<string, { name: string; price: number }[]>;
        }
      > = {};
      for (const catName of bundleCategories) {
        const cat = state.categories.find((c) => c.name === catName);
        if (!cat) continue;
        const excludedItemNames = (bundleExcludedItems[catName] || [])
          .map((id) => cat.items.find((i) => i.id === id)?.name)
          .filter(Boolean) as string[];
        // Build per-item excluded options
        const excludedOpts: Record<string, string[]> = {};
        // Build per-item custom supplements
        const itemSupplements: Record<string, { name: string; price: number }[]> = {};
        for (const item of cat.items) {
          const excl = bundleExcludedOptions[item.id];
          if (excl && excl.length > 0) {
            excludedOpts[item.name] = excl;
          }
          const sups = bundleItemSupplements[item.id];
          if (sups && sups.length > 0) {
            itemSupplements[item.name] = sups;
          }
        }
        bundleSelection[catName] = {
          excluded_items: excludedItemNames,
          excluded_options: excludedOpts,
          item_supplements: itemSupplements,
        };
      }
      config.bundle_selection = bundleSelection;
    }

    if (selectedType === 'buy_x_get_y') {
      config.trigger_category_names = buyXTriggerCategories;
      config.reward_category_names = buyXRewardCategories;
      // Build excluded items by name for persistence
      const triggerExcluded: Record<string, string[]> = {};
      for (const catName of buyXTriggerCategories) {
        const cat = state.categories.find((c) => c.name === catName);
        if (!cat) continue;
        const excluded = (buyXTriggerExcludedItems[catName] || [])
          .map((id) => cat.items.find((i) => i.id === id)?.name)
          .filter(Boolean) as string[];
        if (excluded.length > 0) triggerExcluded[catName] = excluded;
      }
      if (Object.keys(triggerExcluded).length > 0) config.trigger_excluded = triggerExcluded;

      const rewardExcluded: Record<string, string[]> = {};
      for (const catName of buyXRewardCategories) {
        const cat = state.categories.find((c) => c.name === catName);
        if (!cat) continue;
        const excluded = (buyXRewardExcludedItems[catName] || [])
          .map((id) => cat.items.find((i) => i.id === id)?.name)
          .filter(Boolean) as string[];
        if (excluded.length > 0) rewardExcluded[catName] = excluded;
      }
      if (Object.keys(rewardExcluded).length > 0) config.reward_excluded = rewardExcluded;
    }

    const offer: OnboardingOffer = {
      type: selectedType,
      name: offerName,
      config,
    };

    if (editingOfferIndex !== null) {
      // Replace existing offer
      const updated = [...state.offers];
      updated[editingOfferIndex] = offer;
      dispatch({ type: 'SET_OFFERS', offers: updated });
      showSuccess('Offre modifiée !');
    } else {
      dispatch({ type: 'ADD_OFFER', offer });
      showSuccess('Offre créée !');
    }

    setSubStep('done');
    // Reset form & clear draft
    dispatch({ type: 'SET_CURRENT_OFFER_DRAFT', draft: null });
    setEditingOfferIndex(null);
    setSelectedType(null);
    setOfferName('');
    setOfferConfig({});
    setBundleCategories([]);
    setBundleExcludedItems({});
    setBundleExcludedOptions({});
    setBundleItemSupplements({});
    setExpandedCategories([]);
    setExpandedItems([]);
    setAddingSupplementFor(null);
    setBuyXTriggerCategories([]);
    setBuyXTriggerExcludedItems({});
    setBuyXRewardCategories([]);
    setBuyXRewardExcludedItems({});
    setShowTriggerDetails(false);
    setShowRewardDetails(false);
  };

  const handleEditOffer = (index: number) => {
    const offer = state.offers[index];
    setEditingOfferIndex(index);
    setSelectedType(offer.type);
    setOfferName(offer.name);

    const cfg = offer.config as Record<string, any>;
    // Shared fields across all offer types
    const sharedFields = {
      description: cfg.description || '',
      start_date: cfg.start_date || '',
      end_date: cfg.end_date || '',
      time_start: cfg.time_start || '',
      time_end: cfg.time_end || '',
    };
    switch (offer.type) {
      case 'bundle': {
        setOfferConfig({ fixed_price: cfg.fixed_price || '', ...sharedFields });
        const catNames: string[] = cfg.bundle_category_names || [];
        setBundleCategories(catNames);
        // Auto-expand all selected categories and their items
        setExpandedCategories([...catNames]);
        const allItemIds = catNames.flatMap((catName: string) => {
          const cat = state.categories.find((c) => c.name === catName);
          return cat ? cat.items.map((i) => i.id) : [];
        });
        setExpandedItems(allItemIds);
        // Restore excluded items/options from bundle_selection
        if (cfg.bundle_selection) {
          const excItems: Record<string, string[]> = {};
          const excOpts: Record<string, string[]> = {};
          const itemSups: Record<string, { name: string; price: number }[]> = {};
          for (const [catName, sel] of Object.entries(
            cfg.bundle_selection as Record<string, any>
          )) {
            const cat = state.categories.find((c) => c.name === catName);
            if (!cat) continue;
            // Map excluded item names back to IDs
            if (sel.excluded_items?.length) {
              excItems[catName] = sel.excluded_items
                .map((name: string) => cat.items.find((i) => i.name === name)?.id)
                .filter(Boolean) as string[];
            }
            if (sel.excluded_options) {
              for (const [itemName, opts] of Object.entries(
                sel.excluded_options as Record<string, string[]>
              )) {
                const item = cat.items.find((i) => i.name === itemName);
                if (item && opts.length > 0) {
                  excOpts[item.id] = opts;
                }
              }
            }
            // Restore per-item custom supplements
            if (sel.item_supplements) {
              for (const [itemName, sups] of Object.entries(
                sel.item_supplements as Record<string, { name: string; price: number }[]>
              )) {
                const item = cat.items.find((i) => i.name === itemName);
                if (item && sups.length > 0) {
                  itemSups[item.id] = sups;
                }
              }
            }
          }
          setBundleExcludedItems(excItems);
          setBundleExcludedOptions(excOpts);
          setBundleItemSupplements(itemSups);
        }
        break;
      }
      case 'buy_x_get_y': {
        setOfferConfig({
          trigger_quantity: cfg.trigger_quantity || 3,
          reward_quantity: cfg.reward_quantity || 1,
          ...sharedFields,
        });
        // Restore trigger/reward categories and exclusions
        setBuyXTriggerCategories(cfg.trigger_category_names || []);
        setBuyXRewardCategories(cfg.reward_category_names || []);
        if (cfg.trigger_excluded) {
          const excl: Record<string, string[]> = {};
          for (const [catName, names] of Object.entries(
            cfg.trigger_excluded as Record<string, string[]>
          )) {
            const cat = state.categories.find((c) => c.name === catName);
            if (!cat) continue;
            excl[catName] = names
              .map((name: string) => cat.items.find((i) => i.name === name)?.id)
              .filter(Boolean) as string[];
          }
          setBuyXTriggerExcludedItems(excl);
        }
        if (cfg.reward_excluded) {
          const excl: Record<string, string[]> = {};
          for (const [catName, names] of Object.entries(
            cfg.reward_excluded as Record<string, string[]>
          )) {
            const cat = state.categories.find((c) => c.name === catName);
            if (!cat) continue;
            excl[catName] = names
              .map((name: string) => cat.items.find((i) => i.name === name)?.id)
              .filter(Boolean) as string[];
          }
          setBuyXRewardExcludedItems(excl);
        }
        break;
      }
      case 'promo_code':
        setOfferConfig({
          code: cfg.code || '',
          discount_type: cfg.discount_type || 'percentage',
          discount_value: cfg.discount_value || 10,
          ...sharedFields,
        });
        break;
      case 'threshold_discount':
        setOfferConfig({
          min_amount: cfg.min_amount || 25,
          discount_type: cfg.discount_type || 'fixed',
          discount_value: cfg.discount_value || 5,
          ...sharedFields,
        });
        break;
    }
    setSubStep('configure');
  };

  const handleDeleteOffer = async (index: number) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Supprimer cette offre ?',
      message: 'Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;
    const updated = state.offers.filter((_, i) => i !== index);
    dispatch({ type: 'SET_OFFERS', offers: updated });
    confirmDialog.closeDialog();
    showSuccess('Offre supprimée');
    if (updated.length === 0) {
      dispatch({ type: 'SET_WANTS_OFFERS', wants: null });
      setSubStep('ask');
    }
  };

  const handleAddAnother = () => {
    setEditingOfferIndex(null);
    setSubStep('select-type');
  };

  const handleFinish = () => {
    nextStep();
  };

  const toastAndDialog = (
    <>
      <Toast {...toast} onDismiss={hideToast} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleClose}
        onConfirm={confirmDialog.handleConfirm}
        loading={confirmDialog.loading}
        {...confirmDialog.options}
      />
    </>
  );

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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optionnel)
            </label>
            <textarea
              value={String(offerConfig.description || '')}
              onChange={(e) => setOfferConfig({ ...offerConfig, description: e.target.value })}
              className="input text-sm resize-none"
              rows={2}
              placeholder="Description visible par vos clients..."
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
                      const excluded = bundleExcludedItems[cat.name] || [];
                      const eligibleCount = cat.items.length - excluded.length;
                      const allOptionGroups = cat.optionGroups.filter(
                        (og) => og.options.length > 0
                      );

                      const toggleCategory = () => {
                        if (isCatSelected) {
                          setBundleCategories((prev) => prev.filter((c) => c !== cat.name));
                          setExpandedCategories((prev) => prev.filter((c) => c !== cat.name));
                          // Collapse all items from this category
                          const itemIds = cat.items.map((i) => i.id);
                          setExpandedItems((prev) => prev.filter((id) => !itemIds.includes(id)));
                        } else {
                          setBundleCategories((prev) => [...prev, cat.name]);
                          setBundleExcludedItems((prev) => ({ ...prev, [cat.name]: [] }));
                          setExpandedCategories((prev) => [...prev, cat.name]);
                          // Auto-expand all items from this category
                          const itemIds = cat.items.map((i) => i.id);
                          setExpandedItems((prev) => [
                            ...prev,
                            ...itemIds.filter((id) => !prev.includes(id)),
                          ]);
                        }
                      };

                      const toggleExpand = () => {
                        if (!isCatSelected) return;
                        if (isExpanded) {
                          setExpandedCategories((prev) => prev.filter((c) => c !== cat.name));
                        } else {
                          setExpandedCategories((prev) => [...prev, cat.name]);
                          // Auto-expand all items when re-expanding category
                          const itemIds = cat.items.map((i) => i.id);
                          setExpandedItems((prev) => [
                            ...prev,
                            ...itemIds.filter((id) => !prev.includes(id)),
                          ]);
                        }
                      };

                      const toggleExcludeItem = (itemId: string) => {
                        setBundleExcludedItems((prev) => {
                          const current = prev[cat.name] || [];
                          const next = current.includes(itemId)
                            ? current.filter((id) => id !== itemId)
                            : [...current, itemId];
                          return { ...prev, [cat.name]: next };
                        });
                        // Collapse item options if excluding
                        if (!(bundleExcludedItems[cat.name] || []).includes(itemId)) {
                          setExpandedItems((prev) => prev.filter((id) => id !== itemId));
                        }
                      };

                      const toggleItemExpand = (itemId: string) => {
                        setExpandedItems((prev) =>
                          prev.includes(itemId)
                            ? prev.filter((id) => id !== itemId)
                            : [...prev, itemId]
                        );
                      };

                      const toggleExcludeOption = (itemId: string, optName: string) => {
                        setBundleExcludedOptions((prev) => {
                          const current = prev[itemId] || [];
                          const next = current.includes(optName)
                            ? current.filter((n) => n !== optName)
                            : [...current, optName];
                          return { ...prev, [itemId]: next };
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
                              aria-label={`${isCatSelected ? 'Retirer' : 'Inclure'} ${cat.name}`}
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
                                  ? `${eligibleCount}/${cat.items.length}`
                                  : `${cat.items.length} article${cat.items.length > 1 ? 's' : ''}`}
                                {isCatSelected && (
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                )}
                              </span>
                            </button>
                          </div>

                          {/* Expanded: items with per-item options */}
                          {isCatSelected && isExpanded && (
                            <div className="ml-2 sm:ml-4 mt-1 mb-2 space-y-0.5">
                              {cat.items.map((item) => {
                                const isExcluded = excluded.includes(item.id);
                                const isItemExpanded = expandedItems.includes(item.id);
                                const price =
                                  item.prices['base'] || Object.values(item.prices)[0] || 0;
                                const itemExcludedOpts = bundleExcludedOptions[item.id] || [];
                                const totalOpts = allOptionGroups.reduce(
                                  (sum, og) => sum + og.options.length,
                                  0
                                );
                                const excludedOptsCount = itemExcludedOpts.length;

                                return (
                                  <div key={item.id}>
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                      <button
                                        type="button"
                                        onClick={() => toggleExcludeItem(item.id)}
                                        aria-label={`${isExcluded ? 'Inclure' : 'Exclure'} ${item.name}`}
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          !isExcluded
                                            ? 'bg-primary-500 border-primary-500'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        {!isExcluded && (
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        )}
                                      </button>
                                      <span
                                        className={`flex-1 text-sm ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                                      >
                                        {item.name}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {Number(price).toFixed(2)}€
                                      </span>
                                      {!isExcluded && (
                                        <button
                                          type="button"
                                          onClick={() => toggleItemExpand(item.id)}
                                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1"
                                        >
                                          {excludedOptsCount > 0 && (
                                            <span className="text-amber-500">
                                              {totalOpts - excludedOptsCount}/{totalOpts}
                                            </span>
                                          )}
                                          {(bundleItemSupplements[item.id] || []).length > 0 && (
                                            <span className="text-green-500">
                                              +{(bundleItemSupplements[item.id] || []).length} sup.
                                            </span>
                                          )}
                                          <ChevronDown
                                            className={`w-3 h-3 transition-transform ${isItemExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                      )}
                                    </div>
                                    {/* Per-item options + supplements */}
                                    {!isExcluded && isItemExpanded && (
                                      <div className="ml-6 sm:ml-9 mb-2 space-y-2">
                                        {/* Existing option groups (sizes, supplements from category) */}
                                        {allOptionGroups.map((og) => (
                                          <div key={og.id}>
                                            <p className="text-xs text-gray-400 mb-1">{og.name}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {og.options.map((opt) => {
                                                const isOptExcluded = itemExcludedOpts.includes(
                                                  opt.name
                                                );
                                                return (
                                                  <button
                                                    key={opt.name}
                                                    type="button"
                                                    onClick={() =>
                                                      toggleExcludeOption(item.id, opt.name)
                                                    }
                                                    className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                                                      !isOptExcluded
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

                                        {/* Custom per-item supplements */}
                                        {(bundleItemSupplements[item.id] || []).length > 0 && (
                                          <div>
                                            <p className="text-xs text-gray-400 mb-1">
                                              Suppléments
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {(bundleItemSupplements[item.id] || []).map(
                                                (sup, si) => (
                                                  <span
                                                    key={si}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-green-300 bg-green-50 text-green-700"
                                                  >
                                                    {sup.name}
                                                    {sup.price > 0 &&
                                                      ` (+${sup.price.toFixed(2)}€)`}
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setBundleItemSupplements((prev) => ({
                                                          ...prev,
                                                          [item.id]: (prev[item.id] || []).filter(
                                                            (_, idx) => idx !== si
                                                          ),
                                                        }));
                                                      }}
                                                      className="text-green-500 hover:text-red-500 ml-0.5"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Add supplement form */}
                                        {addingSupplementFor === item.id ? (
                                          <div className="flex items-end gap-2">
                                            <div className="flex-1">
                                              <input
                                                type="text"
                                                value={newSupName}
                                                onChange={(e) => setNewSupName(e.target.value)}
                                                placeholder="Fromage, Bacon..."
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                autoFocus
                                              />
                                            </div>
                                            <div className="w-20">
                                              <div className="relative">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={newSupPrice}
                                                  onChange={(e) => setNewSupPrice(e.target.value)}
                                                  placeholder="0.00"
                                                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 pr-5"
                                                />
                                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                                  €
                                                </span>
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!newSupName.trim()) return;
                                                const price = parseFloat(newSupPrice) || 0;
                                                setBundleItemSupplements((prev) => ({
                                                  ...prev,
                                                  [item.id]: [
                                                    ...(prev[item.id] || []),
                                                    { name: newSupName.trim(), price },
                                                  ],
                                                }));
                                                setNewSupName('');
                                                setNewSupPrice('');
                                              }}
                                              disabled={!newSupName.trim()}
                                              className="px-2 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAddingSupplementFor(null);
                                                setNewSupName('');
                                                setNewSupPrice('');
                                              }}
                                              className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddingSupplementFor(item.id);
                                              setNewSupName('');
                                              setNewSupPrice('');
                                            }}
                                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 transition-colors"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Supplément
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                {bundleCategories.length < 2 && (
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
                    const excludedCount = (bundleExcludedItems[catName] || []).length;
                    if (excludedCount === 0) return null;
                    return (
                      <p key={catName} className="text-xs text-blue-600">
                        {catName} : {cat.items.length - excludedCount}/{cat.items.length} articles
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedType === 'buy_x_get_y' && (
            <div className="space-y-5">
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

              {/* Trigger categories */}
              {state.categories.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Catégories déclencheurs
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Le client doit acheter X articles de ces catégories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {state.categories.map((cat) => {
                        const isSelected = buyXTriggerCategories.includes(cat.name);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setBuyXTriggerCategories((prev) =>
                                  prev.filter((c) => c !== cat.name)
                                );
                              } else {
                                setBuyXTriggerCategories((prev) => [...prev, cat.name]);
                                setBuyXTriggerExcludedItems((prev) => ({
                                  ...prev,
                                  [cat.name]: [],
                                }));
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Trigger items detail */}
                    {buyXTriggerCategories.length > 0 &&
                      (() => {
                        const triggerItems = buyXTriggerCategories.flatMap((catName) => {
                          const cat = state.categories.find((c) => c.name === catName);
                          return cat ? cat.items.map((i) => ({ ...i, catName })) : [];
                        });
                        const excludedCount = triggerItems.filter((i) =>
                          (buyXTriggerExcludedItems[i.catName] || []).includes(i.id)
                        ).length;
                        const eligibleCount = triggerItems.length - excludedCount;

                        return (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => setShowTriggerDetails(!showTriggerDetails)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <span>
                                {eligibleCount}/{triggerItems.length} articles éligibles
                              </span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${showTriggerDetails ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {showTriggerDetails && (
                              <div className="mt-1 space-y-0.5 ml-1">
                                {triggerItems.map((item) => {
                                  const isExcluded = (
                                    buyXTriggerExcludedItems[item.catName] || []
                                  ).includes(item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setBuyXTriggerExcludedItems((prev) => {
                                          const current = prev[item.catName] || [];
                                          const next = isExcluded
                                            ? current.filter((id) => id !== item.id)
                                            : [...current, item.id];
                                          return { ...prev, [item.catName]: next };
                                        });
                                      }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg hover:bg-gray-50"
                                    >
                                      <span
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          !isExcluded
                                            ? 'bg-primary-500 border-primary-500'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        {!isExcluded && (
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        )}
                                      </span>
                                      <span
                                        className={`text-sm ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                      >
                                        {item.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>

                  {/* Reward categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Catégories récompenses
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Le client reçoit Y articles offerts de ces catégories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {state.categories.map((cat) => {
                        const isSelected = buyXRewardCategories.includes(cat.name);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setBuyXRewardCategories((prev) =>
                                  prev.filter((c) => c !== cat.name)
                                );
                              } else {
                                setBuyXRewardCategories((prev) => [...prev, cat.name]);
                                setBuyXRewardExcludedItems((prev) => ({
                                  ...prev,
                                  [cat.name]: [],
                                }));
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                              isSelected
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Reward items detail */}
                    {buyXRewardCategories.length > 0 &&
                      (() => {
                        const rewardItems = buyXRewardCategories.flatMap((catName) => {
                          const cat = state.categories.find((c) => c.name === catName);
                          return cat ? cat.items.map((i) => ({ ...i, catName })) : [];
                        });
                        const excludedCount = rewardItems.filter((i) =>
                          (buyXRewardExcludedItems[i.catName] || []).includes(i.id)
                        ).length;
                        const eligibleCount = rewardItems.length - excludedCount;

                        return (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => setShowRewardDetails(!showRewardDetails)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <span>
                                {eligibleCount}/{rewardItems.length} articles éligibles
                              </span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${showRewardDetails ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {showRewardDetails && (
                              <div className="mt-1 space-y-0.5 ml-1">
                                {rewardItems.map((item) => {
                                  const isExcluded = (
                                    buyXRewardExcludedItems[item.catName] || []
                                  ).includes(item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setBuyXRewardExcludedItems((prev) => {
                                          const current = prev[item.catName] || [];
                                          const next = isExcluded
                                            ? current.filter((id) => id !== item.id)
                                            : [...current, item.id];
                                          return { ...prev, [item.catName]: next };
                                        });
                                      }}
                                      className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg hover:bg-gray-50"
                                    >
                                      <span
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          !isExcluded
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        {!isExcluded && (
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        )}
                                      </span>
                                      <span
                                        className={`text-sm ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                      >
                                        {item.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>

                  {/* Summary preview */}
                  {buyXTriggerCategories.length > 0 && buyXRewardCategories.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Aperçu :</span> {offerConfig.trigger_quantity}{' '}
                        {buyXTriggerCategories.join(' / ')} = {offerConfig.reward_quantity}{' '}
                        {buyXRewardCategories.join(' / ')} offert
                        {Number(offerConfig.reward_quantity) > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </>
              )}
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

          {/* Optional validity dates & times */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Validité (optionnel)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                <input
                  type="date"
                  value={String(offerConfig.start_date || '')}
                  onChange={(e) => setOfferConfig({ ...offerConfig, start_date: e.target.value })}
                  className="input min-h-[44px] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
                <input
                  type="date"
                  value={String(offerConfig.end_date || '')}
                  onChange={(e) => setOfferConfig({ ...offerConfig, end_date: e.target.value })}
                  className="input min-h-[44px] text-sm"
                />
              </div>
            </div>

            {/* Time slots */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Créneaux horaires</label>
              <p className="text-xs text-gray-400 mb-2">Ex: Menu midi disponible de 12h à 15h</p>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={String(offerConfig.time_start || '')}
                  onChange={(e) => setOfferConfig({ ...offerConfig, time_start: e.target.value })}
                  className="input min-h-[44px] text-sm w-28"
                />
                <span className="text-gray-400 text-sm">à</span>
                <input
                  type="time"
                  value={String(offerConfig.time_end || '')}
                  onChange={(e) => setOfferConfig({ ...offerConfig, time_end: e.target.value })}
                  className="input min-h-[44px] text-sm w-28"
                />
              </div>
            </div>

            {!offerConfig.start_date &&
              !offerConfig.end_date &&
              !offerConfig.time_start &&
              !offerConfig.time_end && (
                <p className="text-xs text-gray-400">
                  Sans dates ni horaires, l'offre sera active immédiatement et sans limite.
                </p>
              )}
          </div>
        </div>
        {toastAndDialog}
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
                    onClick={() => handleEditOffer(index)}
                    className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-card cursor-pointer hover:border-primary-200 transition-all"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{offer.name}</p>
                      <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Pencil className="w-3.5 h-3.5 text-primary-400" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOffer(index);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Supprimer ${offer.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        {toastAndDialog}
      </StepContainer>
    );
  }

  return null;
}

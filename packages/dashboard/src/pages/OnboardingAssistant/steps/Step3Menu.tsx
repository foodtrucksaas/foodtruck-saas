import { useState } from 'react';
import { Plus, Check, Ruler, CircleDot, X, ChevronRight, Trash2, Pencil } from 'lucide-react';
import {
  useOnboarding,
  OnboardingCategory,
  OnboardingOptionGroup,
  OnboardingItem,
} from '../OnboardingContext';
import {
  AssistantBubble,
  StepContainer,
  ActionButton,
  OptionCard,
  QuickSuggestions,
} from '../components';

const CATEGORY_SUGGESTIONS = [
  'Entrées',
  'Plats',
  'Desserts',
  'Boissons',
  'Pizzas',
  'Burgers',
  'Salades',
  'Wraps',
];

const OPTION_TYPES = [
  { type: 'size' as const, label: 'Tailles', description: 'S, M, L, XL...', icon: Ruler },
  {
    type: 'supplement' as const,
    label: 'Suppléments',
    description: 'Fromage, Bacon...',
    icon: Plus,
  },
  { type: 'other' as const, label: 'Autre', description: 'Cuisson, sauce...', icon: CircleDot },
];

function generateId(): string {
  return crypto.randomUUID();
}

export function Step3Menu() {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [categoryName, setCategoryName] = useState('');
  const [selectedOptionType, setSelectedOptionType] = useState<
    'size' | 'supplement' | 'other' | null
  >(null);
  const [optionGroupName, setOptionGroupName] = useState('');
  const [optionValues, setOptionValues] = useState<string[]>([]);
  const [optionPrices, setOptionPrices] = useState<Record<string, string>>({});
  const [newOptionValue, setNewOptionValue] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOptionGroupId, setEditingOptionGroupId] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);

  // Get size options for current category (if any)
  const sizeOptions =
    state.currentCategory?.optionGroups.find((og) => og.type === 'size')?.options || [];
  const hasSizeOptions = sizeOptions.length > 0;

  const handleCreateCategory = () => {
    if (!categoryName.trim()) return;

    const newCategory: OnboardingCategory = {
      id: generateId(),
      name: categoryName.trim(),
      optionGroups: [],
      items: [],
    };

    dispatch({ type: 'ADD_CATEGORY', category: newCategory });
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'options' });
  };

  const handleSkipOptions = () => {
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'items' });
  };

  const handleSelectOptionType = (type: 'size' | 'supplement' | 'other') => {
    setSelectedOptionType(type);

    // Check if a group of this type already exists → edit it
    const existingGroup = state.currentCategory?.optionGroups.find((og) => og.type === type);
    if (existingGroup) {
      setEditingOptionGroupId(existingGroup.id);
      setOptionGroupName(existingGroup.name);
      setOptionValues(existingGroup.options.map((o) => o.name));
      const prices: Record<string, string> = {};
      for (const o of existingGroup.options) {
        if (o.priceModifier) {
          prices[o.name] = (o.priceModifier / 100).toFixed(2);
        }
      }
      setOptionPrices(prices);
    } else {
      setEditingOptionGroupId(null);
      setOptionPrices({});
      // Set default name based on type
      if (type === 'size') {
        setOptionGroupName('Taille');
      } else if (type === 'supplement') {
        setOptionGroupName('Suppléments');
      } else {
        setOptionGroupName('');
      }
    }
  };

  const handleAddOptionValue = () => {
    if (!newOptionValue.trim() || optionValues.includes(newOptionValue.trim())) return;
    setOptionValues([...optionValues, newOptionValue.trim()]);
    setNewOptionValue('');
  };

  const handleRemoveOptionValue = (value: string) => {
    setOptionValues(optionValues.filter((v) => v !== value));
  };

  const handleSaveOptionGroup = () => {
    if (!state.currentCategory || !selectedOptionType || optionValues.length === 0) return;

    const optionGroup: OnboardingOptionGroup = {
      id: editingOptionGroupId || generateId(),
      name: optionGroupName || selectedOptionType,
      type: selectedOptionType,
      options: optionValues.map((name) => ({
        name,
        priceModifier: optionPrices[name]
          ? Math.round(parseFloat(optionPrices[name]) * 100)
          : undefined,
      })),
    };

    if (editingOptionGroupId) {
      dispatch({
        type: 'REPLACE_OPTION_GROUP_IN_CATEGORY',
        categoryId: state.currentCategory.id,
        oldGroupId: editingOptionGroupId,
        optionGroup,
      });
    } else {
      dispatch({
        type: 'ADD_OPTION_GROUP_TO_CATEGORY',
        categoryId: state.currentCategory.id,
        optionGroup,
      });
    }

    // Reset form
    setSelectedOptionType(null);
    setEditingOptionGroupId(null);
    setOptionGroupName('');
    setOptionValues([]);
    setOptionPrices({});
    setNewOptionValue('');
  };

  const handleFinishOptions = () => {
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'items' });
  };

  const handleAddItem = () => {
    if (!state.currentCategory || !itemName.trim()) return;

    // Validate prices
    const prices: Record<string, number> = {};
    if (hasSizeOptions) {
      for (const option of sizeOptions) {
        const priceStr = itemPrices[option.name];
        if (!priceStr) return;
        prices[option.name] = Math.round(parseFloat(priceStr) * 100);
      }
    } else {
      const basePrice = itemPrices['base'];
      if (!basePrice) return;
      prices['base'] = Math.round(parseFloat(basePrice) * 100);
    }

    if (editingItemId) {
      // Update existing item
      dispatch({
        type: 'UPDATE_ITEM_IN_CATEGORY',
        categoryId: state.currentCategory.id,
        item: { id: editingItemId, name: itemName.trim(), prices },
      });
      setEditingItemId(null);
    } else {
      // Add new item
      dispatch({
        type: 'ADD_ITEM_TO_CATEGORY',
        categoryId: state.currentCategory.id,
        item: { id: generateId(), name: itemName.trim(), prices },
      });
    }

    // Reset form & collapse
    setItemName('');
    setItemPrices({});
    setShowItemForm(false);
  };

  const handleEditItem = (item: OnboardingItem) => {
    setEditingItemId(item.id);
    setShowItemForm(true);
    setItemName(item.name);
    // Convert prices from cents back to display format
    const displayPrices: Record<string, string> = {};
    if (hasSizeOptions && item.prices['base'] && !sizeOptions.some((o) => o.name in item.prices)) {
      // Item was created with base price before sizes were added — pre-fill all sizes
      const baseDisplay = (item.prices['base'] / 100).toFixed(2);
      for (const option of sizeOptions) {
        displayPrices[option.name] = baseDisplay;
      }
    } else {
      for (const [key, value] of Object.entries(item.prices)) {
        displayPrices[key] = (value / 100).toFixed(2);
      }
    }
    setItemPrices(displayPrices);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!state.currentCategory) return;
    dispatch({
      type: 'REMOVE_ITEM_FROM_CATEGORY',
      categoryId: state.currentCategory.id,
      itemId,
    });
  };

  const handleEditCategory = (cat: OnboardingCategory) => {
    dispatch({ type: 'SET_CURRENT_CATEGORY', category: cat });
    setCategoryName(cat.name);
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'items' });
  };

  const handleUpdateCategoryName = () => {
    if (!state.currentCategory || !categoryName.trim()) return;
    dispatch({
      type: 'UPDATE_CURRENT_CATEGORY',
      category: { name: categoryName.trim() },
    });
  };

  const handleRemoveCategory = (categoryId: string) => {
    dispatch({ type: 'REMOVE_CATEGORY', categoryId });
  };

  const handleAddAnotherCategory = () => {
    setCategoryName('');
    dispatch({ type: 'SET_CURRENT_CATEGORY', category: null });
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'category' });
  };

  const handleFinishMenu = () => {
    nextStep();
  };

  const SUB_STEPS = ['category', 'options', 'items', 'done'] as const;
  const currentSubStepIndex = SUB_STEPS.indexOf(state.menuSubStep as (typeof SUB_STEPS)[number]);

  const SubStepProgress = () => (
    <div className="flex items-center justify-center gap-1.5">
      {SUB_STEPS.map((_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all ${
            index <= currentSubStepIndex ? 'w-6 bg-primary-500' : 'w-1.5 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );

  // Sub-step: Create category
  if (state.menuSubStep === 'category') {
    const handleBackFromCategory = () => {
      if (state.categories.length > 0) {
        dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'done' });
      } else {
        prevStep();
      }
    };

    return (
      <StepContainer
        onBack={handleBackFromCategory}
        onNext={handleCreateCategory}
        nextLabel="Continuer"
        nextDisabled={!categoryName.trim()}
      >
        <div className="space-y-6">
          <SubStepProgress />
          <AssistantBubble
            message={
              state.categories.length === 0
                ? 'Créons votre menu ! Commencez par créer une catégorie.'
                : 'Ajoutez une nouvelle catégorie.'
            }
            emoji="🍽️"
          />

          {/* Show existing categories */}
          {state.categories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Catégories créées ({state.categories.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {state.categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="px-3 py-1.5 bg-success-50 text-success-700 rounded-lg text-sm flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {cat.name} ({cat.items.length})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom de la catégorie
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="input min-h-[48px] text-base"
              placeholder="Ex: Pizzas, Burgers, Boissons..."
              autoFocus
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Suggestions rapides :</p>
            <QuickSuggestions
              suggestions={CATEGORY_SUGGESTIONS.filter(
                (s) => !state.categories.some((c) => c.name.toLowerCase() === s.toLowerCase())
              )}
              onSelect={(s) => setCategoryName(s)}
              selectedValue={categoryName}
            />
          </div>
        </div>
      </StepContainer>
    );
  }

  // Sub-step: Options
  if (state.menuSubStep === 'options' && state.currentCategory) {
    // Option type selection
    if (!selectedOptionType) {
      return (
        <StepContainer hideActions>
          <div className="space-y-6">
            <SubStepProgress />
            <AssistantBubble
              message={`Vos ${state.currentCategory.name} ont-elles des particularités ?`}
              emoji="🎯"
            />

            <p className="text-sm text-gray-600">
              Par exemple : différentes tailles, types de préparation, suppléments...
            </p>

            <div className="space-y-3">
              {OPTION_TYPES.map(({ type, label, description, icon: Icon }) => (
                <OptionCard
                  key={type}
                  onClick={() => handleSelectOptionType(type)}
                  title={label}
                  description={description}
                  icon={<Icon className="w-5 h-5" />}
                />
              ))}
            </div>

            {/* Show added option groups */}
            {state.currentCategory.optionGroups.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Particularités ajoutées :</p>
                <div className="space-y-2">
                  {state.currentCategory.optionGroups.map((og) => (
                    <button
                      key={og.id}
                      type="button"
                      onClick={() => handleSelectOptionType(og.type)}
                      className="flex items-center gap-2 p-3 bg-success-50 rounded-xl text-sm w-full text-left hover:bg-success-100 transition-colors"
                    >
                      <Check className="w-4 h-4 text-success-600 flex-shrink-0" />
                      <span className="font-medium text-success-700">{og.name}</span>
                      <span className="text-success-600">
                        ({og.options.map((o) => o.name).join(', ')})
                      </span>
                      <Pencil className="w-3 h-3 text-success-400 ml-auto flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ActionButton onClick={handleSkipOptions} variant="outline">
              {state.currentCategory.optionGroups.length > 0
                ? 'Continuer sans autre particularité'
                : 'Non, pas de particularité'}
            </ActionButton>

            {state.currentCategory.optionGroups.length > 0 && (
              <ActionButton onClick={handleFinishOptions}>Passer aux articles</ActionButton>
            )}
          </div>
        </StepContainer>
      );
    }

    // Option values input
    return (
      <StepContainer
        onBack={() => {
          setSelectedOptionType(null);
          setEditingOptionGroupId(null);
          setOptionValues([]);
          setOptionPrices({});
          setNewOptionValue('');
        }}
        onNext={handleSaveOptionGroup}
        nextLabel="Valider"
        nextDisabled={optionValues.length === 0}
      >
        <div className="space-y-6">
          <SubStepProgress />
          <AssistantBubble
            message={
              selectedOptionType === 'size'
                ? 'Quelles tailles proposez-vous ?'
                : selectedOptionType === 'supplement'
                  ? 'Quels suppléments proposez-vous ?'
                  : 'Quelles options proposez-vous ?'
            }
            emoji="📝"
          />

          {/* Option group name (optional for size/supplement) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom du groupe d'options
            </label>
            <input
              type="text"
              value={optionGroupName}
              onChange={(e) => setOptionGroupName(e.target.value)}
              className="input min-h-[48px] text-base"
              placeholder={
                selectedOptionType === 'size'
                  ? 'Taille'
                  : selectedOptionType === 'supplement'
                    ? 'Suppléments'
                    : 'Ex: Cuisson, Sauce...'
              }
            />
          </div>

          {/* Add option values */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ajoutez les options une par une
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOptionValue();
                  }
                }}
                className="input min-h-[48px] text-base flex-1"
                placeholder={
                  selectedOptionType === 'size'
                    ? 'Ex: S, M, L...'
                    : selectedOptionType === 'supplement'
                      ? 'Ex: Fromage, Bacon...'
                      : 'Ex: Saignant, A point...'
                }
              />
              <button
                type="button"
                onClick={handleAddOptionValue}
                disabled={!newOptionValue.trim()}
                className="px-4 py-3 min-h-[48px] bg-primary-50 hover:bg-primary-100 text-primary-600 disabled:bg-gray-100 disabled:text-gray-400 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick suggestions for sizes */}
          {selectedOptionType === 'size' && (
            <QuickSuggestions
              suggestions={['S', 'M', 'L', 'XL', 'Junior', 'Senior'].filter(
                (s) => !optionValues.includes(s)
              )}
              onSelect={(s) => setOptionValues([...optionValues, s])}
            />
          )}

          {/* Display added values */}
          {optionValues.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Options ajoutées :</p>
              <div
                className={
                  selectedOptionType === 'supplement' ? 'space-y-2' : 'flex flex-wrap gap-2'
                }
              >
                {optionValues.map((value) => (
                  <div
                    key={value}
                    className={`flex items-center gap-2 bg-primary-50 text-primary-700 rounded-lg text-sm ${
                      selectedOptionType === 'supplement' ? 'px-3 py-2' : 'px-3 py-1.5'
                    }`}
                  >
                    <span className="font-medium">{value}</span>
                    {selectedOptionType === 'supplement' && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-gray-500">+</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={optionPrices[value] || ''}
                          onChange={(e) =>
                            setOptionPrices({ ...optionPrices, [value]: e.target.value })
                          }
                          className="w-20 px-2 py-1 text-sm border border-primary-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400"
                          placeholder="0.00"
                        />
                        <span className="text-xs text-gray-500">€</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveOptionValue(value);
                        setOptionPrices((prev) => {
                          const next = { ...prev };
                          delete next[value];
                          return next;
                        });
                      }}
                      className="ml-1 hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </StepContainer>
    );
  }

  // Sub-step: Items
  if (state.menuSubStep === 'items' && state.currentCategory) {
    const isItemValid =
      itemName.trim() &&
      (hasSizeOptions
        ? sizeOptions.every((opt) => itemPrices[opt.name] && parseFloat(itemPrices[opt.name]) > 0)
        : itemPrices['base'] && parseFloat(itemPrices['base']) > 0);

    const hasItems = state.currentCategory.items.length > 0;
    // Auto-show form when no items yet
    const isFormVisible = showItemForm || !hasItems;

    const handleFinalizeCategory = () => {
      dispatch({ type: 'FINALIZE_CATEGORY' });
    };

    return (
      <StepContainer
        onBack={() => {
          dispatch({ type: 'SET_CURRENT_CATEGORY', category: null });
          dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'done' });
        }}
        onNext={hasItems ? handleFinalizeCategory : undefined}
        nextLabel="Catégorie terminée"
      >
        <div className="space-y-4">
          <SubStepProgress />

          {/* Inline editable category header */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onBlur={handleUpdateCategoryName}
              className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 min-w-0"
              placeholder="Nom de la catégorie"
            />
            <Pencil className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          </div>

          {/* Option groups summary (compact) */}
          {state.currentCategory.optionGroups.length > 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'options' })}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors"
            >
              {state.currentCategory.optionGroups
                .map((og) => `${og.name}: ${og.options.map((o) => o.name).join(', ')}`)
                .join(' · ')}
              <Pencil className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'options' })}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-500 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Ajouter des options (tailles, suppléments...)
            </button>
          )}

          {/* Item list */}
          {hasItems && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">
                {state.currentCategory.items.length} article
                {state.currentCategory.items.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-1.5">
                {state.currentCategory.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEditItem(item)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      editingItemId === item.id
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'bg-white border-gray-100 shadow-card hover:border-gray-200'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {hasSizeOptions
                          ? Object.entries(item.prices)
                              .map(([size, price]) => `${size}: ${(price / 100).toFixed(2)}€`)
                              .join(' | ')
                          : `${(item.prices['base'] / 100).toFixed(2)}€`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Supprimer ${item.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add item form (collapsible) */}
          {isFormVisible ? (
            <div className="space-y-4 pt-2">
              {hasItems && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700">
                    {editingItemId ? "Modifier l'article" : 'Nouvel article'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="input min-h-[48px] text-base w-full"
                    placeholder="Nom de l'article"
                    autoFocus
                  />
                </div>
                {!hasSizeOptions && (
                  <div className="relative w-28">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemPrices['base'] || ''}
                      onChange={(e) => setItemPrices({ ...itemPrices, base: e.target.value })}
                      className="input min-h-[48px] text-base pr-7 w-full"
                      placeholder="Prix"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      €
                    </span>
                  </div>
                )}
              </div>

              {/* Size prices (separate row when sizes exist) */}
              {hasSizeOptions && (
                <div className="grid grid-cols-3 gap-2">
                  {sizeOptions.map((option) => (
                    <div key={option.name} className="relative">
                      <label className="block text-xs text-gray-500 mb-1">{option.name}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemPrices[option.name] || ''}
                        onChange={(e) =>
                          setItemPrices({ ...itemPrices, [option.name]: e.target.value })
                        }
                        className="input min-h-[44px] text-sm pr-7 w-full"
                        placeholder="0.00"
                      />
                      <span className="absolute right-2.5 bottom-3 text-gray-400 text-sm">€</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {editingItemId || hasItems ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(null);
                      setItemName('');
                      setItemPrices({});
                      setShowItemForm(false);
                    }}
                    className="px-4 py-3 min-h-[48px] text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors"
                  >
                    Annuler
                  </button>
                ) : null}
                <ActionButton onClick={handleAddItem} disabled={!isItemValid}>
                  {editingItemId ? 'Modifier' : 'Ajouter'}
                </ActionButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowItemForm(true)}
              className="w-full p-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ajouter un article
            </button>
          )}
        </div>
      </StepContainer>
    );
  }

  // Sub-step: Done (asking for another category)
  if (state.menuSubStep === 'done') {
    return (
      <StepContainer hideActions>
        <div className="space-y-6">
          <SubStepProgress />
          <AssistantBubble
            message={
              state.categories.length > 0
                ? 'Voici vos catégories. Cliquez pour modifier ou ajoutez-en une nouvelle.'
                : 'Créons votre menu !'
            }
            emoji="📋"
          />

          {/* Summary of categories */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Votre menu</p>
            <div className="space-y-2">
              {state.categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleEditCategory(cat)}
                  className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl shadow-card cursor-pointer hover:border-primary-200 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success-500" />
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {cat.items.length} article{cat.items.length > 1 ? 's' : ''}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-primary-400" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCategory(cat.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Supprimer ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AssistantBubble message="Voulez-vous ajouter une autre catégorie ?" />

          <div className="space-y-3">
            <ActionButton
              onClick={handleAddAnotherCategory}
              variant="secondary"
              icon={<Plus className="w-5 h-5" />}
            >
              Oui, ajouter une catégorie
            </ActionButton>
            <ActionButton onClick={handleFinishMenu} icon={<ChevronRight className="w-5 h-5" />}>
              Non, continuer
            </ActionButton>
          </div>
        </div>
      </StepContainer>
    );
  }

  return null;
}

import { useState } from 'react';
import { Plus, Check, Ruler, CircleDot, X, ChevronRight, FolderPlus } from 'lucide-react';
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
  'Entrees',
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
    label: 'Supplements',
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
  const [newOptionValue, setNewOptionValue] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

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
    setCategoryName('');
  };

  const handleSkipOptions = () => {
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'items' });
  };

  const handleSelectOptionType = (type: 'size' | 'supplement' | 'other') => {
    setSelectedOptionType(type);
    // Set default name based on type
    if (type === 'size') {
      setOptionGroupName('Taille');
    } else if (type === 'supplement') {
      setOptionGroupName('Supplements');
    } else {
      setOptionGroupName('');
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
      id: generateId(),
      name: optionGroupName || selectedOptionType,
      type: selectedOptionType,
      options: optionValues.map((name) => ({ name })),
    };

    dispatch({
      type: 'ADD_OPTION_GROUP_TO_CATEGORY',
      categoryId: state.currentCategory.id,
      optionGroup,
    });

    // Reset form
    setSelectedOptionType(null);
    setOptionGroupName('');
    setOptionValues([]);
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
        if (!priceStr) return; // All sizes need prices
        prices[option.name] = Math.round(parseFloat(priceStr) * 100);
      }
    } else {
      const basePrice = itemPrices['base'];
      if (!basePrice) return;
      prices['base'] = Math.round(parseFloat(basePrice) * 100);
    }

    const item: OnboardingItem = {
      id: generateId(),
      name: itemName.trim(),
      prices,
    };

    dispatch({
      type: 'ADD_ITEM_TO_CATEGORY',
      categoryId: state.currentCategory.id,
      item,
    });

    // Reset form
    setItemName('');
    setItemPrices({});
  };

  const handleAddAnotherCategory = () => {
    dispatch({ type: 'SET_CURRENT_CATEGORY', category: null });
    dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'category' });
  };

  const handleFinishMenu = () => {
    nextStep();
  };

  // Sub-step: Create category
  if (state.menuSubStep === 'category') {
    return (
      <StepContainer
        onBack={prevStep}
        onNext={handleCreateCategory}
        nextLabel="Continuer"
        nextDisabled={!categoryName.trim()}
      >
        <div className="space-y-6">
          <AssistantBubble
            message={
              state.categories.length === 0
                ? 'Creons votre menu ! Commencez par creer une categorie.'
                : 'Ajoutez une nouvelle categorie.'
            }
            emoji="🍽️"
          />

          {/* Show existing categories */}
          {state.categories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Categories creees ({state.categories.length})
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
              Nom de la categorie
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
            <AssistantBubble
              message={`Vos ${state.currentCategory.name} ont-elles des particularites ?`}
              emoji="🎯"
            />

            <p className="text-sm text-gray-600">
              Par exemple : differentes tailles, types de preparation, supplements...
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
                <p className="text-sm font-medium text-gray-700">Particularites ajoutees :</p>
                <div className="space-y-2">
                  {state.currentCategory.optionGroups.map((og) => (
                    <div
                      key={og.id}
                      className="flex items-center gap-2 p-3 bg-success-50 rounded-lg text-sm"
                    >
                      <Check className="w-4 h-4 text-success-600" />
                      <span className="font-medium text-success-700">{og.name}</span>
                      <span className="text-success-600">
                        ({og.options.map((o) => o.name).join(', ')})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ActionButton onClick={handleSkipOptions} variant="outline">
              {state.currentCategory.optionGroups.length > 0
                ? 'Continuer sans autre particularite'
                : 'Non, pas de particularite'}
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
          setOptionValues([]);
          setNewOptionValue('');
        }}
        onNext={handleSaveOptionGroup}
        nextLabel="Ajouter"
        nextDisabled={optionValues.length === 0}
      >
        <div className="space-y-6">
          <AssistantBubble
            message={
              selectedOptionType === 'size'
                ? 'Quelles tailles proposez-vous ?'
                : selectedOptionType === 'supplement'
                  ? 'Quels supplements proposez-vous ?'
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
                    ? 'Supplements'
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
                className="px-4 py-3 min-h-[48px] bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick suggestions for sizes */}
          {selectedOptionType === 'size' && optionValues.length === 0 && (
            <QuickSuggestions
              suggestions={['S', 'M', 'L', 'XL', 'Junior', 'Senior']}
              onSelect={(s) => setOptionValues([...optionValues, s])}
            />
          )}

          {/* Display added values */}
          {optionValues.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Options ajoutees :</p>
              <div className="flex flex-wrap gap-2">
                {optionValues.map((value) => (
                  <div
                    key={value}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionValue(value)}
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

    return (
      <StepContainer hideActions>
        <div className="space-y-6">
          <AssistantBubble message={`Ajoutez vos ${state.currentCategory.name}`} emoji="🍕" />

          {/* Item name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom de l'article
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="input min-h-[48px] text-base"
              placeholder="Ex: Margherita, Burger Classic..."
              autoFocus
            />
          </div>

          {/* Prices */}
          {hasSizeOptions ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prix par taille
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sizeOptions.map((option) => (
                  <div key={option.name}>
                    <label className="block text-xs text-gray-500 mb-1">{option.name}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemPrices[option.name] || ''}
                        onChange={(e) =>
                          setItemPrices({ ...itemPrices, [option.name]: e.target.value })
                        }
                        className="input min-h-[48px] text-base pr-8"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix</label>
              <div className="relative w-40">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemPrices['base'] || ''}
                  onChange={(e) => setItemPrices({ ...itemPrices, base: e.target.value })}
                  className="input min-h-[48px] text-base pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
            </div>
          )}

          <ActionButton onClick={handleAddItem} disabled={!isItemValid}>
            Ajouter cet article
          </ActionButton>

          {/* Added items */}
          {state.currentCategory.items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {state.currentCategory.name} ({state.currentCategory.items.length})
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {state.currentCategory.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-sm text-gray-600">
                      {hasSizeOptions
                        ? Object.entries(item.prices)
                            .map(([size, price]) => `${size}: ${(price / 100).toFixed(2)}€`)
                            .join(' | ')
                        : `${(item.prices['base'] / 100).toFixed(2)}€`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <ActionButton
              onClick={handleAddAnotherCategory}
              variant="secondary"
              icon={<FolderPlus className="w-5 h-5" />}
            >
              Nouvelle categorie
            </ActionButton>
            <ActionButton
              onClick={handleFinishMenu}
              disabled={
                state.categories.length === 0 || state.categories.every((c) => c.items.length === 0)
              }
              icon={<ChevronRight className="w-5 h-5" />}
            >
              Menu termine, continuer
            </ActionButton>
          </div>
        </div>
      </StepContainer>
    );
  }

  // Sub-step: Done (asking for another category)
  if (state.menuSubStep === 'done') {
    return (
      <StepContainer hideActions>
        <div className="space-y-6">
          <AssistantBubble message="Categorie ajoutee !" emoji="✅" variant="success" />

          {/* Summary of categories */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Votre menu</p>
            <div className="space-y-2">
              {state.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success-500" />
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {cat.items.length} article{cat.items.length > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <AssistantBubble message="Voulez-vous ajouter une autre categorie ?" />

          <div className="space-y-3">
            <ActionButton
              onClick={handleAddAnotherCategory}
              variant="secondary"
              icon={<Plus className="w-5 h-5" />}
            >
              Oui, ajouter une categorie
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

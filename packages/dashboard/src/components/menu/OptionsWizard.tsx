import { useState } from 'react';
import {
  Edit2,
  Trash2,
  Settings2,
  X,
  Circle,
  CheckSquare,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { Category } from '@foodtruck/shared';

export interface OptionWizardGroup {
  id?: string;
  name: string;
  type: 'option' | 'supplement';
  values: { name: string; price: string; isAvailable: boolean }[];
}

interface OptionsWizardProps {
  isOpen: boolean;
  category: Category | null;
  groups: OptionWizardGroup[];
  saving: boolean;
  onGroupsChange: (groups: OptionWizardGroup[]) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function OptionsWizard({
  isOpen,
  category,
  groups,
  saving,
  onGroupsChange,
  onSave,
  onClose,
}: OptionsWizardProps) {
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);

  if (!isOpen || !category) return null;

  // Séparer les groupes obligatoires et optionnels
  const requiredGroups = groups
    .map((g, idx) => ({ group: g, originalIndex: idx }))
    .filter(({ group }) => group.type === 'option');
  const optionalGroups = groups
    .map((g, idx) => ({ group: g, originalIndex: idx }))
    .filter(({ group }) => group.type === 'supplement');

  const updateOptionGroup = (index: number, field: string, value: string) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    onGroupsChange(newGroups);
  };

  const removeOptionGroup = (index: number) => {
    const group = groups[index];
    const hasValues = group.values.length > 0;

    if (
      hasValues &&
      !confirm(`Supprimer "${group.name || 'ce groupe'}" et ses ${group.values.length} valeur(s) ?`)
    ) {
      return;
    }

    onGroupsChange(groups.filter((_, i) => i !== index));
    if (editingGroupIndex === index) {
      setEditingGroupIndex(null);
    }
  };

  const addValueToGroup = (groupIdx: number, valueName: string) => {
    if (!valueName.trim()) return;

    const newGroups = [...groups];
    const group = newGroups[groupIdx];

    if (group.values.some((v) => v.name.toLowerCase() === valueName.toLowerCase())) {
      return;
    }

    group.values.push({ name: valueName.trim(), price: '0', isAvailable: true });
    onGroupsChange(newGroups);
  };

  const removeValueFromGroup = (groupIdx: number, valueName: string) => {
    const newGroups = [...groups];
    newGroups[groupIdx].values = newGroups[groupIdx].values.filter((v) => v.name !== valueName);
    onGroupsChange(newGroups);
  };

  const updateValuePrice = (groupIdx: number, valueName: string, price: string) => {
    const newGroups = [...groups];
    const valIdx = newGroups[groupIdx].values.findIndex((v) => v.name === valueName);
    if (valIdx !== -1) {
      newGroups[groupIdx].values[valIdx].price = price;
      onGroupsChange(newGroups);
    }
  };

  const toggleValueAvailability = (groupIdx: number, valueName: string) => {
    const newGroups = [...groups];
    const valIdx = newGroups[groupIdx].values.findIndex((v) => v.name === valueName);
    if (valIdx !== -1) {
      newGroups[groupIdx].values[valIdx].isAvailable =
        !newGroups[groupIdx].values[valIdx].isAvailable;
      onGroupsChange(newGroups);
    }
  };

  // Déplacer un groupe dans sa section (obligatoire ou optionnel)
  const moveGroupWithinSection = (
    originalIndex: number,
    direction: 'up' | 'down',
    sectionGroups: { group: OptionWizardGroup; originalIndex: number }[]
  ) => {
    const posInSection = sectionGroups.findIndex((g) => g.originalIndex === originalIndex);
    if (posInSection === -1) return;

    if (direction === 'up' && posInSection === 0) return;
    if (direction === 'down' && posInSection === sectionGroups.length - 1) return;

    const targetPosInSection = direction === 'up' ? posInSection - 1 : posInSection + 1;
    const targetOriginalIndex = sectionGroups[targetPosInSection].originalIndex;

    const newGroups = [...groups];
    [newGroups[originalIndex], newGroups[targetOriginalIndex]] = [
      newGroups[targetOriginalIndex],
      newGroups[originalIndex],
    ];
    onGroupsChange(newGroups);
  };

  const addRequiredGroup = (name: string) => {
    // Insérer après les autres groupes obligatoires
    const lastRequiredIndex =
      requiredGroups.length > 0 ? requiredGroups[requiredGroups.length - 1].originalIndex : -1;
    const newGroups = [...groups];
    newGroups.splice(lastRequiredIndex + 1, 0, { name, type: 'option', values: [] });
    onGroupsChange(newGroups);
  };

  const addOptionalGroup = (name: string) => {
    // Ajouter à la fin (les optionnels sont toujours après les obligatoires)
    onGroupsChange([...groups, { name, type: 'supplement', values: [] }]);
  };

  // Rendu d'une carte de groupe
  const renderGroupCard = (
    group: OptionWizardGroup,
    groupIdx: number,
    sectionGroups: { group: OptionWizardGroup; originalIndex: number }[],
    positionInSection: number
  ) => {
    const isEditing = editingGroupIndex === groupIdx || !group.id;
    const isSupplement = group.type === 'supplement';
    const borderColor = isSupplement ? 'border-l-success-500' : 'border-l-info-500';
    const valueBadgeStyle = isSupplement
      ? 'bg-success-50 border-success-200 text-success-700'
      : 'bg-info-50 border-info-200 text-info-700';
    const ChoiceIcon = isSupplement ? CheckSquare : Circle;
    const choiceLabel = isSupplement ? 'Plusieurs choix possibles' : '1 seul choix';

    const canMoveUp = positionInSection > 0;
    const canMoveDown = positionInSection < sectionGroups.length - 1;

    return (
      <div
        key={groupIdx}
        className={`p-4 bg-white rounded-lg border border-l-4 ${borderColor} shadow-sm`}
      >
        {isEditing ? (
          /* Mode édition */
          <>
            <div className="flex items-center gap-2 mb-2">
              {/* Reorder buttons */}
              {sectionGroups.length > 1 && (
                <div className="flex flex-col -my-1">
                  <button
                    type="button"
                    onClick={() => moveGroupWithinSection(groupIdx, 'up', sectionGroups)}
                    disabled={!canMoveUp}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                    title="Monter"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGroupWithinSection(groupIdx, 'down', sectionGroups)}
                    disabled={!canMoveDown}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                    title="Descendre"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              )}
              <input
                type="text"
                value={group.name}
                onChange={(e) => updateOptionGroup(groupIdx, 'name', e.target.value)}
                className="input flex-1 font-medium min-h-[44px]"
                placeholder="Nom du groupe"
              />
              <button
                type="button"
                onClick={() => removeOptionGroup(groupIdx)}
                className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-error-50 active:scale-95 transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-5 h-5 text-error-500" />
              </button>
            </div>
            {/* Indication choix unique/multiple */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 ml-1">
              <ChoiceIcon className="w-3.5 h-3.5" />
              <span>{choiceLabel}</span>
            </div>

            {/* Values */}
            {isSupplement ? (
              /* Suppléments: affichage en liste avec champ prix */
              <div className="space-y-2 mb-3">
                {group.values.map((val, valIdx) => (
                  <div
                    key={valIdx}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      val.isAvailable ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleValueAvailability(groupIdx, val.name)}
                      className={`flex-1 text-sm font-medium text-left ${
                        val.isAvailable ? 'text-gray-700' : 'text-gray-400 line-through'
                      }`}
                      title={val.isAvailable ? 'Cliquer pour désactiver' : 'Cliquer pour réactiver'}
                    >
                      {val.name}
                      {!val.isAvailable && (
                        <span className="ml-2 text-xs text-error-400">(rupture)</span>
                      )}
                    </button>
                    <span className="text-sm text-gray-400">+</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={val.price}
                      onChange={(e) => updateValuePrice(groupIdx, val.name, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="input w-20 py-1.5 text-sm text-right min-h-[44px]"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-gray-500">€</span>
                    <button
                      type="button"
                      onClick={() => removeValueFromGroup(groupIdx, val.name)}
                      className="p-2 rounded hover:bg-error-100 text-gray-400 hover:text-error-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Options (taille, cuisson): affichage en badges */
              <div className="flex flex-wrap gap-2 mb-3">
                {group.values.map((val, valIdx) => (
                  <span
                    key={valIdx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${valueBadgeStyle}`}
                  >
                    {val.name}
                    <button
                      type="button"
                      onClick={() => removeValueFromGroup(groupIdx, val.name)}
                      className="text-current opacity-50 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add value input */}
            {isSupplement ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id={`supplement-name-${groupIdx}`}
                    className="input text-sm w-full pr-14 min-h-[44px]"
                    placeholder="Nom du supplément"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nameInput = e.target as HTMLInputElement;
                        const priceInput = document.getElementById(
                          `supplement-price-${groupIdx}`
                        ) as HTMLInputElement;
                        if (nameInput.value.trim()) {
                          const newGroups = [...groups];
                          newGroups[groupIdx].values.push({
                            name: nameInput.value.trim(),
                            price: priceInput.value || '0',
                            isAvailable: true,
                          });
                          onGroupsChange(newGroups);
                          nameInput.value = '';
                          priceInput.value = '0';
                          nameInput.focus();
                        }
                      }
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Entrée ↵
                  </span>
                </div>
                <span className="text-sm text-gray-400">+</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id={`supplement-price-${groupIdx}`}
                  className="input w-20 text-sm text-right min-h-[44px]"
                  placeholder="0"
                  defaultValue="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const priceInput = e.target as HTMLInputElement;
                      const nameInput = document.getElementById(
                        `supplement-name-${groupIdx}`
                      ) as HTMLInputElement;
                      if (nameInput.value.trim()) {
                        const newGroups = [...groups];
                        newGroups[groupIdx].values.push({
                          name: nameInput.value.trim(),
                          price: priceInput.value || '0',
                          isAvailable: true,
                        });
                        onGroupsChange(newGroups);
                        nameInput.value = '';
                        priceInput.value = '0';
                        nameInput.focus();
                      }
                    }
                  }}
                />
                <span className="text-sm text-gray-500">€</span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  className="input text-sm pr-16 min-h-[44px]"
                  placeholder={`Ajouter une ${group.name?.toLowerCase() || 'valeur'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValueToGroup(groupIdx, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Entrée ↵
                </span>
              </div>
            )}

            {/* Bouton terminer si groupe existant en édition */}
            {group.id && (
              <button
                type="button"
                onClick={() => setEditingGroupIndex(null)}
                className="mt-3 w-full min-h-[48px] py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors active:scale-[0.98]"
              >
                Terminer
              </button>
            )}
          </>
        ) : (
          /* Mode lecture seule */
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {/* Reorder buttons */}
                {sectionGroups.length > 1 && (
                  <div className="flex flex-col -my-1">
                    <button
                      type="button"
                      onClick={() => moveGroupWithinSection(groupIdx, 'up', sectionGroups)}
                      disabled={!canMoveUp}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                      title="Monter"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGroupWithinSection(groupIdx, 'down', sectionGroups)}
                      disabled={!canMoveDown}
                      className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                      title="Descendre"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <span className="font-semibold text-gray-900">{group.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingGroupIndex(groupIdx)}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                  title="Modifier"
                >
                  <Edit2 className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => removeOptionGroup(groupIdx)}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-error-50 transition-colors active:scale-95"
                  title="Supprimer"
                >
                  <Trash2 className="w-5 h-5 text-error-400" />
                </button>
              </div>
            </div>
            {/* Indication choix unique/multiple */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 ml-6">
              <ChoiceIcon className="w-3 h-3" />
              <span>{choiceLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-6">
              {group.values.map((val, valIdx) => {
                const priceNum = parseFloat(val.price) || 0;
                const priceDisplay = priceNum > 0 ? `+${priceNum.toFixed(2)}€` : 'Gratuit';

                return isSupplement ? (
                  <button
                    key={valIdx}
                    type="button"
                    onClick={() => toggleValueAvailability(groupIdx, val.name)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                      val.isAvailable
                        ? valueBadgeStyle
                        : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                    }`}
                    title={
                      val.isAvailable
                        ? 'Cliquer pour marquer en rupture'
                        : 'Cliquer pour remettre en stock'
                    }
                  >
                    {val.name}
                    <span
                      className={`ml-1 ${priceNum > 0 ? 'opacity-70' : 'text-success-600 opacity-80'}`}
                    >
                      {priceDisplay}
                    </span>
                  </button>
                ) : (
                  <span
                    key={valIdx}
                    className={`text-sm px-3 py-1.5 rounded-full border ${valueBadgeStyle}`}
                  >
                    {val.name}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const hasNoGroups = groups.length === 0;
  const hasTaille = groups.some((g) => g.name.toLowerCase() === 'taille');
  const hasCuisson = groups.some((g) => g.name.toLowerCase() === 'cuisson');
  const hasSupplements = groups.some((g) => g.type === 'supplement');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-lg max-h-full sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div
          className="p-4 sm:p-6 flex-1 overflow-y-auto"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">Options : {category.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500">Tailles, cuisson, suppléments...</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {hasNoGroups ? (
            <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 mb-4">
              <Settings2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-gray-500">Aucune option configurée</p>
              <p className="text-xs text-gray-400 mt-1">
                Ajoutez des tailles, cuissons ou suppléments ci-dessous
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 mb-4 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
              {/* Section Obligatoires */}
              {requiredGroups.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-info-500" />
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Obligatoires</h3>
                    <span className="text-xs text-gray-400">1 seul choix par groupe</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {requiredGroups.map(({ group, originalIndex }, positionInSection) =>
                      renderGroupCard(group, originalIndex, requiredGroups, positionInSection)
                    )}
                  </div>
                </div>
              )}

              {/* Section Optionnels */}
              {optionalGroups.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success-500" />
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Optionnels</h3>
                    <span className="text-xs text-gray-400">Plusieurs choix possibles</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {optionalGroups.map(({ group, originalIndex }, positionInSection) =>
                      renderGroupCard(group, originalIndex, optionalGroups, positionInSection)
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add group buttons */}
          {groups.length < 5 && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                {!hasTaille && (
                  <button
                    type="button"
                    onClick={() => addRequiredGroup('Taille')}
                    className="px-3 sm:px-4 py-2 bg-info-50 text-info-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-info-100 border border-info-200 transition-colors min-h-[44px]"
                  >
                    + Taille
                  </button>
                )}
                {!hasCuisson && (
                  <button
                    type="button"
                    onClick={() => addRequiredGroup('Cuisson')}
                    className="px-3 sm:px-4 py-2 bg-info-50 text-info-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-info-100 border border-info-200 transition-colors min-h-[44px]"
                  >
                    + Cuisson
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => addRequiredGroup('')}
                  className="px-3 sm:px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 border border-gray-200 transition-colors min-h-[44px]"
                >
                  + Autre obligatoire
                </button>
                {!hasSupplements && (
                  <button
                    type="button"
                    onClick={() => addOptionalGroup('Suppléments')}
                    className="px-3 sm:px-4 py-2 bg-success-50 text-success-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-success-100 border border-success-200 transition-colors min-h-[44px]"
                  >
                    + Suppléments
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer fixed on mobile with safe area */}
        <div
          className="flex gap-2 sm:gap-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t sm:border-t-0 bg-white flex-shrink-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 min-h-[48px] active:scale-[0.98] transition-transform"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="btn-primary flex-1 min-h-[48px] active:scale-[0.98] transition-transform"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

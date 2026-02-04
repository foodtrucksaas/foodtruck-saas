import { useState } from 'react';
import { Plus, Edit2, Trash2, Settings2, X } from 'lucide-react';
import type { Category } from '@foodtruck/shared';

export interface OptionFormData {
  id?: string;
  name: string;
  price_modifier: string;
  is_available: boolean;
  is_default: boolean;
}

export interface OptionGroupFormData {
  id?: string;
  name: string;
  is_required: boolean;
  is_multiple: boolean;
  options: OptionFormData[];
}

interface CategoryOptionsModalProps {
  isOpen: boolean;
  category: Category | null;
  optionGroups: OptionGroupFormData[];
  saving: boolean;
  onOptionGroupsChange: (groups: OptionGroupFormData[]) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function CategoryOptionsModal({
  isOpen,
  category,
  optionGroups,
  saving,
  onOptionGroupsChange,
  onSave,
  onClose,
}: CategoryOptionsModalProps) {
  const [showOptionGroupForm, setShowOptionGroupForm] = useState(false);
  const [editingOptionGroupIndex, setEditingOptionGroupIndex] = useState<number | null>(null);
  const [optionGroupFormData, setOptionGroupFormData] = useState<OptionGroupFormData>({
    name: '',
    is_required: true,
    is_multiple: false,
    options: [],
  });

  if (!isOpen || !category) return null;

  const openNewGroupForm = () => {
    setOptionGroupFormData({
      name: '',
      is_required: true,
      is_multiple: false,
      options: [{ name: '', price_modifier: '0', is_available: true, is_default: true }],
    });
    setEditingOptionGroupIndex(null);
    setShowOptionGroupForm(true);
  };

  const openEditGroupForm = (group: OptionGroupFormData, index: number) => {
    setOptionGroupFormData(group);
    setEditingOptionGroupIndex(index);
    setShowOptionGroupForm(true);
  };

  const deleteGroup = (index: number) => {
    onOptionGroupsChange(optionGroups.filter((_, i) => i !== index));
  };

  const saveOptionGroup = () => {
    if (!optionGroupFormData.name.trim()) {
      return;
    }
    if (optionGroupFormData.options.every((o) => !o.name.trim())) {
      return;
    }

    const validOptions = optionGroupFormData.options.filter((o) => o.name.trim());

    if (editingOptionGroupIndex !== null) {
      const newGroups = [...optionGroups];
      newGroups[editingOptionGroupIndex] = { ...optionGroupFormData, options: validOptions };
      onOptionGroupsChange(newGroups);
    } else {
      onOptionGroupsChange([...optionGroups, { ...optionGroupFormData, options: validOptions }]);
    }
    setShowOptionGroupForm(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-2xl max-h-full sm:max-h-[90vh] overflow-y-auto flex flex-col">
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
                <p className="text-xs sm:text-sm text-gray-500">
                  Ces options s'appliqueront à tous les plats de cette catégorie
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option Groups List */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label className="label flex items-center gap-2 text-sm">
                  <Settings2 className="w-4 h-4" />
                  Groupes d'options
                </label>
                <button
                  type="button"
                  onClick={openNewGroupForm}
                  className="text-xs sm:text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1 min-h-[44px] px-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un groupe
                </button>
              </div>

              {optionGroups.length === 0 ? (
                <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg">
                  <Settings2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-gray-500">
                    Aucune option pour cette catégorie.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ajoutez des tailles, suppléments, cuissons, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
                  {optionGroups.map((group, idx) => (
                    <div key={idx} className="p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-medium text-gray-900 text-sm sm:text-base">
                            {group.name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              group.is_multiple
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {group.is_multiple ? 'Supplément' : 'Option'}
                          </span>
                          {group.is_required && !group.is_multiple && (
                            <span className="text-xs text-orange-600">(obligatoire)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditGroupForm(group, idx)}
                            className="p-2 rounded hover:bg-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Modifier le groupe"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGroup(idx)}
                            className="p-2 rounded hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Supprimer le groupe"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.options.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="text-xs px-1.5 sm:px-2 py-1 rounded bg-gray-100 text-gray-600"
                          >
                            {opt.name}
                            {parseFloat(opt.price_modifier) !== 0 && (
                              <span className="ml-1">
                                {group.is_multiple ? '+' : ''}
                                {opt.price_modifier}€
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Option Group Form Modal */}
      {showOptionGroupForm && (
        <OptionGroupForm
          formData={optionGroupFormData}
          isEditing={editingOptionGroupIndex !== null}
          onFormDataChange={setOptionGroupFormData}
          onSave={saveOptionGroup}
          onClose={() => setShowOptionGroupForm(false)}
        />
      )}
    </>
  );
}

interface OptionGroupFormProps {
  formData: OptionGroupFormData;
  isEditing: boolean;
  onFormDataChange: (data: OptionGroupFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

function OptionGroupForm({
  formData,
  isEditing,
  onFormDataChange,
  onSave,
  onClose,
}: OptionGroupFormProps) {
  const addOption = () => {
    onFormDataChange({
      ...formData,
      options: [
        ...formData.options,
        { name: '', price_modifier: '0', is_available: true, is_default: false },
      ],
    });
  };

  const updateOption = (index: number, field: string, value: string | boolean) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onFormDataChange({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    onFormDataChange({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-md max-h-full sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div
          className="p-4 sm:p-6 flex-1 overflow-y-auto"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-bold">
              {isEditing ? 'Modifier le groupe' : "Nouveau groupe d'options"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label text-xs sm:text-sm">Nom du groupe *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                className="input min-h-[44px]"
                placeholder="Ex: Taille, Cuisson, Suppléments..."
                required
              />
            </div>

            <div>
              <label className="label mb-2 text-xs sm:text-sm">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onFormDataChange({ ...formData, is_required: true, is_multiple: false })
                  }
                  className={`p-2.5 sm:p-3 rounded-lg border-2 text-left transition-colors min-h-[72px] ${
                    formData.is_required && !formData.is_multiple
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900 block text-sm sm:text-base">
                    Option
                  </span>
                  <span className="text-xs text-gray-500">Taille, cuisson...</span>
                  <span className="text-xs text-gray-400 block mt-1">1 choix obligatoire</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onFormDataChange({ ...formData, is_required: false, is_multiple: true })
                  }
                  className={`p-2.5 sm:p-3 rounded-lg border-2 text-left transition-colors min-h-[72px] ${
                    !formData.is_required && formData.is_multiple
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900 block text-sm sm:text-base">
                    Supplément
                  </span>
                  <span className="text-xs text-gray-500">Sauce, ingrédient...</span>
                  <span className="text-xs text-gray-400 block mt-1">
                    Plusieurs choix optionnels
                  </span>
                </button>
              </div>
              {/* Helper text based on selected type */}
              <div className="mt-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg text-xs sm:text-sm">
                {formData.is_required && !formData.is_multiple ? (
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-700">Prix = prix total du produit</span>
                    <br />
                    <span className="text-xs">Ex: Pizza S = 10€, M = 12€, L = 14€</span>
                  </p>
                ) : (
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-700">Prix = supplément à ajouter</span>
                    <br />
                    <span className="text-xs">Ex: Fromage +1€, Sauce +0.50€</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label text-xs sm:text-sm">Options</label>
                <button
                  type="button"
                  onClick={addOption}
                  className="text-xs sm:text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1 min-h-[44px] px-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div className="space-y-2 max-h-[30vh] sm:max-h-[35vh] overflow-y-auto">
                {formData.options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => updateOption(optIdx, 'name', e.target.value)}
                      className="input flex-1 py-2 text-sm min-h-[44px] min-w-[120px]"
                      placeholder="Nom de l'option"
                    />
                    <div className="flex items-center gap-1">
                      {formData.is_multiple && <span className="text-sm text-gray-500">+</span>}
                      <input
                        type="number"
                        step="0.01"
                        value={opt.price_modifier}
                        onChange={(e) => updateOption(optIdx, 'price_modifier', e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input w-20 sm:w-24 py-2 text-sm text-right min-h-[44px]"
                        placeholder={formData.is_multiple ? '1.00' : '12.00'}
                        title={
                          formData.is_multiple ? 'Supplément à ajouter' : 'Prix total du produit'
                        }
                      />
                      <span className="text-sm text-gray-500">€</span>
                    </div>
                    {formData.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(optIdx)}
                        className="p-2 rounded hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Supprimer l'option"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            className="btn-primary flex-1 min-h-[48px] active:scale-[0.98] transition-transform"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}

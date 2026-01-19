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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Options : {category.name}</h2>
                <p className="text-sm text-gray-500">
                  Ces options s'appliqueront à tous les plats de cette catégorie
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option Groups List */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="label flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Groupes d'options
                </label>
                <button
                  type="button"
                  onClick={openNewGroupForm}
                  className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un groupe
                </button>
              </div>

              {optionGroups.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Settings2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Aucune option pour cette catégorie.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ajoutez des tailles, suppléments, cuissons, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {optionGroups.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{group.name}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            group.is_multiple
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {group.is_multiple ? 'Supplément' : 'Option'}
                          </span>
                          {group.is_required && !group.is_multiple && (
                            <span className="ml-1 text-xs text-orange-600">(obligatoire)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditGroupForm(group, idx)}
                            className="p-1.5 rounded hover:bg-gray-200"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGroup(idx)}
                            className="p-1.5 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.options.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600"
                          >
                            {opt.name}
                            {parseFloat(opt.price_modifier) !== 0 && (
                              <span className="ml-1">
                                {group.is_multiple ? '+' : ''}{opt.price_modifier}€
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

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
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
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {isEditing ? 'Modifier le groupe' : 'Nouveau groupe d\'options'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Nom du groupe *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Ex: Taille, Cuisson, Suppléments..."
                required
              />
            </div>

            <div>
              <label className="label mb-2">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onFormDataChange({ ...formData, is_required: true, is_multiple: false })}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    formData.is_required && !formData.is_multiple
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900 block">Option</span>
                  <span className="text-xs text-gray-500">Taille, cuisson...</span>
                  <span className="text-xs text-gray-400 block mt-1">1 choix obligatoire</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFormDataChange({ ...formData, is_required: false, is_multiple: true })}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    !formData.is_required && formData.is_multiple
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900 block">Supplément</span>
                  <span className="text-xs text-gray-500">Sauce, ingrédient...</span>
                  <span className="text-xs text-gray-400 block mt-1">Plusieurs choix optionnels</span>
                </button>
              </div>
              {/* Helper text based on selected type */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
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
                <label className="label">Options</label>
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div className="space-y-2">
                {formData.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => updateOption(optIdx, 'name', e.target.value)}
                      className="input flex-1 py-1.5 text-sm"
                      placeholder="Nom de l'option"
                    />
                    <div className="flex items-center gap-1">
                      {formData.is_multiple && (
                        <span className="text-sm text-gray-500">+</span>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        value={opt.price_modifier}
                        onChange={(e) => updateOption(optIdx, 'price_modifier', e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input w-24 py-1.5 text-sm text-right"
                        placeholder={formData.is_multiple ? '1.00' : '12.00'}
                        title={formData.is_multiple ? 'Supplément à ajouter' : 'Prix total du produit'}
                      />
                      <span className="text-sm text-gray-500">€</span>
                    </div>
                    {formData.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(optIdx)}
                        className="p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onSave}
                className="btn-primary flex-1"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

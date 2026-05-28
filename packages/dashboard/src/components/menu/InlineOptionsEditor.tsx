import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, X, Copy } from 'lucide-react';
import type {
  MenuItemOptionGroupWithOptions,
  PriceMode,
  OptionTemplate,
  OptionTemplateConfig,
} from '@foodtruck/shared';

// Local editing state for a group being edited
export interface EditingGroup {
  id?: string; // undefined for new groups
  name: string;
  price_mode: PriceMode;
  is_required: boolean;
  is_multiple: boolean;
  display_order: number;
  options: EditingOption[];
}

export interface EditingOption {
  id?: string;
  name: string;
  price_modifier: string; // string for form input (euros)
  is_default: boolean;
  is_available: boolean;
  display_order: number;
}

interface InlineOptionsEditorProps {
  groups: EditingGroup[];
  onGroupsChange: (groups: EditingGroup[]) => void;
  templates: OptionTemplate[];
  onApplyTemplate: (template: OptionTemplate) => void;
  onSaveAsTemplate: (name: string) => void;
}

type GroupPreset = 'size' | 'required' | 'supplement';

const PRESET_CONFIG: Record<
  GroupPreset,
  {
    label: string;
    price_mode: PriceMode;
    is_required: boolean;
    is_multiple: boolean;
    defaultName: string;
  }
> = {
  size: {
    label: 'Taille / Format',
    price_mode: 'absolute',
    is_required: true,
    is_multiple: false,
    defaultName: 'Taille',
  },
  required: {
    label: 'Choix obligatoire',
    price_mode: 'modifier',
    is_required: true,
    is_multiple: false,
    defaultName: '',
  },
  supplement: {
    label: 'Suppléments / Extras',
    price_mode: 'modifier',
    is_required: false,
    is_multiple: true,
    defaultName: 'Suppléments',
  },
};

export function convertGroupsToEditing(groups: MenuItemOptionGroupWithOptions[]): EditingGroup[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    price_mode: (g.price_mode as PriceMode) || 'modifier',
    is_required: g.is_required,
    is_multiple: g.is_multiple,
    display_order: g.display_order,
    options: (g.menu_item_options || []).map((o) => ({
      id: o.id,
      name: o.name,
      price_modifier: (o.price_modifier / 100).toFixed(2),
      is_default: o.is_default,
      is_available: o.is_available,
      display_order: o.display_order,
    })),
  }));
}

export function convertTemplateToEditing(template: OptionTemplate): EditingGroup[] {
  const config = template.config as unknown as OptionTemplateConfig;
  if (!config?.groups) return [];
  return config.groups.map((g) => ({
    name: g.name,
    price_mode: g.price_mode,
    is_required: g.is_required,
    is_multiple: g.is_multiple,
    display_order: g.display_order,
    options: g.options.map((o) => ({
      name: o.name,
      price_modifier: (o.price_modifier / 100).toFixed(2),
      is_default: o.is_default,
      is_available: true,
      display_order: o.display_order,
    })),
  }));
}

export function InlineOptionsEditor({
  groups,
  onGroupsChange,
  templates,
  onApplyTemplate,
  onSaveAsTemplate,
}: InlineOptionsEditorProps) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const hasAbsoluteGroup = groups.some((g) => g.price_mode === 'absolute');

  const addGroup = (preset: GroupPreset) => {
    const config = PRESET_CONFIG[preset];

    if (config.price_mode === 'absolute' && hasAbsoluteGroup) {
      alert(
        'Un seul groupe de type Taille/Format par plat. Les autres groupes ajoutent un supplément.'
      );
      return;
    }

    const newGroup: EditingGroup = {
      name: config.defaultName,
      price_mode: config.price_mode,
      is_required: config.is_required,
      is_multiple: config.is_multiple,
      display_order: groups.length,
      options: [],
    };

    onGroupsChange([...groups, newGroup]);
  };

  const updateGroup = (index: number, updates: Partial<EditingGroup>) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], ...updates };
    onGroupsChange(newGroups);
  };

  const removeGroup = (index: number) => {
    const group = groups[index];
    if (
      group.options.length > 0 &&
      !confirm(
        `Supprimer "${group.name || 'ce groupe'}" et ses ${group.options.length} option(s) ?`
      )
    ) {
      return;
    }
    onGroupsChange(groups.filter((_, i) => i !== index));
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= groups.length) return;
    const newGroups = [...groups];
    [newGroups[index], newGroups[target]] = [newGroups[target], newGroups[index]];
    newGroups.forEach((g, i) => (g.display_order = i));
    onGroupsChange(newGroups);
  };

  const addOption = (groupIndex: number) => {
    const group = groups[groupIndex];
    const newOption: EditingOption = {
      name: '',
      price_modifier: '0.00',
      is_default: group.options.length === 0 && group.is_required,
      is_available: true,
      display_order: group.options.length,
    };
    updateGroup(groupIndex, { options: [...group.options, newOption] });
  };

  const updateOption = (groupIndex: number, optIndex: number, updates: Partial<EditingOption>) => {
    const newOptions = [...groups[groupIndex].options];
    newOptions[optIndex] = { ...newOptions[optIndex], ...updates };
    updateGroup(groupIndex, { options: newOptions });
  };

  const removeOption = (groupIndex: number, optIndex: number) => {
    const newOptions = groups[groupIndex].options.filter((_, i) => i !== optIndex);
    updateGroup(groupIndex, { options: newOptions });
  };

  const handleApplyTemplate = (template: OptionTemplate) => {
    const config = template.config as unknown as OptionTemplateConfig;
    const templateHasAbsolute = config?.groups?.some((g) => g.price_mode === 'absolute');
    if (templateHasAbsolute && hasAbsoluteGroup) {
      alert('Ce template contient un groupe Taille/Format, mais ce plat en a déjà un.');
      return;
    }
    onApplyTemplate(template);
    setShowTemplateMenu(false);
  };

  const handleSaveTemplate = () => {
    if (!saveTemplateName.trim()) return;
    onSaveAsTemplate(saveTemplateName.trim());
    setSaveTemplateName('');
    setShowSaveTemplate(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs sm:text-sm font-medium text-gray-700">
          Options du plat
        </label>
        <div className="flex items-center gap-1">
          {groups.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSaveTemplate(true)}
              className="text-xs text-gray-500 hover:text-primary-600 px-2 py-1 min-h-[36px] flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Sauver template
            </button>
          )}
          {templates.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 min-h-[36px]"
              >
                Importer template
              </button>
              {showTemplateMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[200px]">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleApplyTemplate(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {t.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowTemplateMenu(false)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 border-t rounded-b-lg"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save template input */}
      {showSaveTemplate && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={saveTemplateName}
            onChange={(e) => setSaveTemplateName(e.target.value)}
            placeholder="Nom du template"
            className="input flex-1 text-sm min-h-[40px]"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveTemplate())}
          />
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="btn-primary text-xs px-3 py-2 min-h-[40px]"
          >
            Sauver
          </button>
          <button
            type="button"
            onClick={() => setShowSaveTemplate(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Existing groups */}
      {groups.map((group, groupIdx) => (
        <GroupEditor
          key={group.id || `new-${groupIdx}`}
          group={group}
          groupIndex={groupIdx}
          totalGroups={groups.length}
          onUpdate={(updates) => updateGroup(groupIdx, updates)}
          onRemove={() => removeGroup(groupIdx)}
          onMove={(dir) => moveGroup(groupIdx, dir)}
          onAddOption={() => addOption(groupIdx)}
          onUpdateOption={(optIdx, updates) => updateOption(groupIdx, optIdx, updates)}
          onRemoveOption={(optIdx) => removeOption(groupIdx, optIdx)}
        />
      ))}

      {/* Add group buttons */}
      {groups.length < 5 && (
        <div className="flex flex-wrap gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg">
          {!hasAbsoluteGroup && (
            <button
              type="button"
              onClick={() => addGroup('size')}
              className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 border border-blue-200 min-h-[40px]"
            >
              + Taille / Format
            </button>
          )}
          <button
            type="button"
            onClick={() => addGroup('required')}
            className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 border border-gray-200 min-h-[40px]"
          >
            + Choix obligatoire
          </button>
          <button
            type="button"
            onClick={() => addGroup('supplement')}
            className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 border border-green-200 min-h-[40px]"
          >
            + Suppléments
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Group Editor sub-component
// ============================================

interface GroupEditorProps {
  group: EditingGroup;
  groupIndex: number;
  totalGroups: number;
  onUpdate: (updates: Partial<EditingGroup>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onAddOption: () => void;
  onUpdateOption: (optIndex: number, updates: Partial<EditingOption>) => void;
  onRemoveOption: (optIndex: number) => void;
}

function GroupEditor({
  group,
  groupIndex,
  totalGroups,
  onUpdate,
  onRemove,
  onMove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: GroupEditorProps) {
  const isAbsolute = group.price_mode === 'absolute';
  const borderColor = isAbsolute
    ? 'border-l-blue-500'
    : group.is_multiple
      ? 'border-l-green-500'
      : 'border-l-gray-400';
  const typeLabel = isAbsolute
    ? 'Taille / Format (prix absolu)'
    : group.is_multiple
      ? 'Suppléments (optionnel, multiple)'
      : 'Choix obligatoire (modifier)';

  return (
    <div className={`border border-l-4 ${borderColor} rounded-lg bg-white shadow-sm`}>
      {/* Group header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        {totalGroups > 1 && (
          <div className="flex flex-col -my-1">
            <button
              type="button"
              onClick={() => onMove('up')}
              disabled={groupIndex === 0}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMove('down')}
              disabled={groupIndex === totalGroups - 1}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={group.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="input text-sm font-medium w-full min-h-[40px]"
            placeholder="Nom du groupe"
          />
          <span className="text-xs text-gray-400 mt-0.5 block">{typeLabel}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Options list */}
      <div className="p-3 space-y-2">
        {group.options.map((opt, optIdx) => (
          <div
            key={opt.id || `new-opt-${optIdx}`}
            className={`flex items-center gap-2 ${!opt.is_available ? 'opacity-50' : ''}`}
          >
            <button
              type="button"
              onClick={() => onUpdateOption(optIdx, { is_available: !opt.is_available })}
              className={`text-xs px-2 py-2 rounded min-h-[40px] min-w-[40px] ${
                opt.is_available
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400 line-through'
              }`}
              title={
                opt.is_available
                  ? 'Disponible (cliquer pour désactiver)'
                  : 'Indisponible (cliquer pour réactiver)'
              }
            >
              {opt.is_available ? '✓' : '✗'}
            </button>
            <input
              type="text"
              value={opt.name}
              onChange={(e) => onUpdateOption(optIdx, { name: e.target.value })}
              className="input flex-1 text-sm min-h-[40px]"
              placeholder="Nom de l'option"
            />
            <div className="relative w-24">
              {!isAbsolute && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  +
                </span>
              )}
              <input
                type="number"
                step="0.01"
                min="0"
                value={opt.price_modifier}
                onChange={(e) => onUpdateOption(optIdx, { price_modifier: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                onFocus={(e) => e.target.select()}
                className={`input text-sm text-right min-h-[40px] w-full ${!isAbsolute ? 'pl-5' : ''}`}
                placeholder="0.00"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                €
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveOption(optIdx)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddOption}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 px-2 py-2 min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une option
        </button>
      </div>
    </div>
  );
}

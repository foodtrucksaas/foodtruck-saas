import { ALLERGENS } from '@foodtruck/shared';
import type { Category, MenuItem, OptionTemplate } from '@foodtruck/shared';
import { Modal, Button, Input, Textarea, Select } from '@foodtruck/shared/components';
import { InlineOptionsEditor } from './InlineOptionsEditor';
import type { EditingGroup } from './InlineOptionsEditor';

export interface MenuItemFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  allergens: string[];
  is_daily_special: boolean;
  optionGroups: EditingGroup[];
}

interface MenuItemFormProps {
  isOpen: boolean;
  editingItem: MenuItem | null;
  formData: MenuItemFormData;
  categories: Category[];
  optionTemplates: OptionTemplate[];
  onFormDataChange: (data: MenuItemFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onApplyTemplate: (template: OptionTemplate) => void;
  onSaveAsTemplate: (name: string) => void;
}

export function MenuItemForm({
  isOpen,
  editingItem,
  formData,
  categories,
  optionTemplates,
  onFormDataChange,
  onSubmit,
  onClose,
  onApplyTemplate,
  onSaveAsTemplate,
}: MenuItemFormProps) {
  const categoryOptions = [
    { value: '', label: 'Sans catégorie' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  const hasAbsoluteGroup = formData.optionGroups.some((g) => g.price_mode === 'absolute');

  const footerButtons = (
    <div className="flex gap-3">
      <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
        Annuler
      </Button>
      <Button type="submit" form="menu-item-form" variant="primary" className="flex-1">
        Sauvegarder
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Modifier le plat' : 'Nouveau plat'}
      size="lg"
      footer={footerButtons}
    >
      <form id="menu-item-form" onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <Input
          label="Nom *"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          required
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
          rows={3}
        />

        {editingItem && (
          <Select
            label="Catégorie"
            value={formData.category_id}
            onChange={(e) => onFormDataChange({ ...formData, category_id: e.target.value })}
            options={categoryOptions}
          />
        )}

        {/* Base price — hidden when an absolute group exists (price auto-computed from cheapest option) */}
        {!hasAbsoluteGroup && (
          <div>
            <Input
              label="Prix *"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => onFormDataChange({ ...formData, price: e.target.value })}
              required
              className="min-h-[44px]"
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}

        {/* Inline options editor */}
        <InlineOptionsEditor
          groups={formData.optionGroups}
          onGroupsChange={(groups) => onFormDataChange({ ...formData, optionGroups: groups })}
          templates={optionTemplates}
          onApplyTemplate={onApplyTemplate}
          onSaveAsTemplate={onSaveAsTemplate}
        />

        {/* Allergens */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Allergènes
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {ALLERGENS.map((allergen) => (
              <label
                key={allergen}
                className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm cursor-pointer transition-colors min-h-[44px] flex items-center ${
                  formData.allergens.includes(allergen)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={formData.allergens.includes(allergen)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onFormDataChange({
                        ...formData,
                        allergens: [...formData.allergens, allergen],
                      });
                    } else {
                      onFormDataChange({
                        ...formData,
                        allergens: formData.allergens.filter((a) => a !== allergen),
                      });
                    }
                  }}
                />
                {allergen}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

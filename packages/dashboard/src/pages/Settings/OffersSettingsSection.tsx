import { Tag, Layers, Ticket, Check, X } from 'lucide-react';
import { EditableField } from './EditableField';
import { ToggleCards } from './ToggleCards';
import type { EditingField, EditFormState } from './useSettings';
import type { Foodtruck } from '@foodtruck/shared';

interface OffersSettingsSectionProps {
  foodtruck: Foodtruck | null;
  editForm: EditFormState;
  editingField: EditingField;
  editLoading: boolean;
  onStartEdit: (field: EditingField) => void;
  onSave: (field: EditingField) => void;
  onCancel: () => void;
  onUpdateForm: <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => void;
}

export function OffersSettingsSection({
  foodtruck,
  editForm,
  editingField,
  editLoading,
  onStartEdit,
  onSave,
  onCancel,
  onUpdateForm,
}: OffersSettingsSectionProps) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Tag className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Offres & Promotions</h2>
      </div>

      <div className="space-y-4">
        {/* Offers Stackable */}
        <EditableField
          label="Cumul des offres"
          field="offers_stackable"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <div className="flex items-center gap-2">
              {foodtruck?.offers_stackable ? (
                <>
                  <Layers className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Cumulables</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Meilleure offre uniquement</span>
                </>
              )}
            </div>
          }
          editContent={
            <>
              <p className="text-sm text-gray-500 mb-3">
                Définit si plusieurs offres (formules, X achetés = Y offert, etc.) peuvent se
                cumuler.
              </p>
              <ToggleCards
                currentValue={editForm.offers_stackable}
                onChange={(value) => onUpdateForm('offers_stackable', value)}
                options={[
                  {
                    value: false,
                    icon: Check,
                    title: 'Meilleure offre',
                    description: "Seule la meilleure réduction s'applique",
                  },
                  {
                    value: true,
                    icon: Layers,
                    title: 'Cumulables',
                    description: 'Toutes les offres éligibles se cumulent',
                  },
                ]}
              />
            </>
          }
        />

        {/* Promo Codes Stackable */}
        <EditableField
          label="Cumul codes promo"
          field="promo_codes_stackable"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          hasBorder={false}
          displayValue={
            <div className="flex items-center gap-2">
              {foodtruck?.promo_codes_stackable !== false ? (
                <>
                  <Ticket className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Cumulable avec les offres</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">Non cumulable</span>
                </>
              )}
            </div>
          }
          editContent={
            <>
              <p className="text-sm text-gray-500 mb-3">
                Définit si les codes promo peuvent être utilisés en plus des offres automatiques.
              </p>
              <ToggleCards
                currentValue={editForm.promo_codes_stackable}
                onChange={(value) => onUpdateForm('promo_codes_stackable', value)}
                options={[
                  {
                    value: true,
                    icon: Ticket,
                    title: 'Cumulable',
                    description: "Les codes promo s'ajoutent aux offres",
                  },
                  {
                    value: false,
                    icon: X,
                    title: 'Non cumulable',
                    description: 'Codes promo désactivés si une offre est active',
                  },
                ]}
              />
            </>
          }
        />
      </div>
    </section>
  );
}

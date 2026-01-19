import { ShoppingBag, Hand, Zap, Check, X, CalendarClock, Clock, Bell, Mail, MailX, BellRing, BellOff } from 'lucide-react';
import { EditableField } from './EditableField';
import { ToggleCards, IntervalButtons } from './ToggleCards';
import type { EditingField, EditFormState } from './useSettings';
import type { Foodtruck } from '@foodtruck/shared';

interface OrderSettingsSectionProps {
  foodtruck: Foodtruck | null;
  editForm: EditFormState;
  editingField: EditingField;
  editLoading: boolean;
  onStartEdit: (field: EditingField) => void;
  onSave: (field: EditingField) => void;
  onCancel: () => void;
  onUpdateForm: <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => void;
}

export function OrderSettingsSection({
  foodtruck,
  editForm,
  editingField,
  editLoading,
  onStartEdit,
  onSave,
  onCancel,
  onUpdateForm,
}: OrderSettingsSectionProps) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Gestion des commandes</h2>
      </div>

      <div className="space-y-4">
        {/* Mode d'acceptation */}
        <EditableField
          label="Mode d'acceptation"
          field="auto_accept_orders"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <div className="flex items-center gap-2">
              {foodtruck?.auto_accept_orders ? (
                <>
                  <Zap className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Automatique</span>
                </>
              ) : (
                <>
                  <Hand className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Manuelle</span>
                </>
              )}
            </div>
          }
          editContent={
            <ToggleCards
              currentValue={editForm.auto_accept_orders}
              onChange={(value) => onUpdateForm('auto_accept_orders', value)}
              options={[
                { value: false, icon: Hand, title: 'Manuelle', description: 'Vous validez chaque commande reçue' },
                { value: true, icon: Zap, title: 'Automatique', description: 'Chaque commande est acceptée automatiquement' },
              ]}
            />
          }
        />

        {/* Popup nouvelle commande */}
        <EditableField
          label="Popup nouvelle commande"
          field="show_order_popup"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <p className="text-gray-900 font-medium">
              {foodtruck?.show_order_popup !== false ? 'Activé' : 'Désactivé'}
            </p>
          }
          editContent={
            <ToggleCards
              currentValue={editForm.show_order_popup}
              onChange={(value) => onUpdateForm('show_order_popup', value)}
              options={[
                { value: true, icon: Check, title: 'Activé', description: 'Une popup s\'affiche à chaque nouvelle commande' },
                { value: false, icon: X, title: 'Désactivé', description: 'Les commandes apparaissent dans la liste' },
              ]}
            />
          }
        />

        {/* Statut "Prêt" intermédiaire */}
        <EditableField
          label="Statut « Prêt »"
          field="use_ready_status"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <p className="text-gray-900 font-medium">
              {foodtruck?.use_ready_status ? 'Activé' : 'Désactivé'}
            </p>
          }
          editContent={
            <ToggleCards
              currentValue={editForm.use_ready_status}
              onChange={(value) => onUpdateForm('use_ready_status', value)}
              options={[
                { value: false, icon: X, title: 'Désactivé', description: 'Acceptée → Retirée (2 étapes)' },
                { value: true, icon: Bell, title: 'Activé', description: 'Acceptée → Prête → Retirée (3 étapes)' },
              ]}
            />
          }
        />

        {/* Intervalle des créneaux */}
        <EditableField
          label="Intervalle des créneaux"
          field="order_slot_interval"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <p className="text-gray-900 font-medium">{foodtruck?.order_slot_interval ?? 15} minutes</p>
          }
          editContent={
            <>
              <p className="text-sm text-gray-500">
                Durée des créneaux horaires pour la prise de commande.
                {editForm.order_slot_interval === 5 && ' Ex : 17h00, 17h05, 17h10...'}
                {editForm.order_slot_interval === 10 && ' Ex : 17h00, 17h10, 17h20...'}
                {editForm.order_slot_interval === 15 && ' Ex : 17h00, 17h15, 17h30...'}
              </p>
              <IntervalButtons
                currentValue={editForm.order_slot_interval}
                onChange={(value) => onUpdateForm('order_slot_interval', value)}
                intervals={[5, 10, 15]}
              />
            </>
          }
        />

        {/* Temps de préparation minimum */}
        <EditableField
          label="Temps de préparation minimum"
          field="min_preparation_time"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <p className="text-gray-900 font-medium">{foodtruck?.min_preparation_time ?? 15} minutes</p>
          }
          editContent={
            <>
              <p className="text-sm text-gray-500">
                Délai minimum avant qu'un client puisse récupérer sa commande. Nous ne recommandons pas un temps supérieur à 15 min.
              </p>
              <IntervalButtons
                currentValue={editForm.min_preparation_time}
                onChange={(value) => onUpdateForm('min_preparation_time', value)}
                intervals={[5, 10, 15]}
              />
            </>
          }
        />

        {/* Max commandes par créneau */}
        <EditableField
          label="Maximum de commandes par créneau"
          field="max_orders_per_slot"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          hasBorder={false}
          displayValue={
            <p className="text-gray-900 font-medium">
              {foodtruck?.max_orders_per_slot ? `${foodtruck.max_orders_per_slot} commandes` : 'Illimité'}
            </p>
          }
          editContent={
            <>
              <p className="text-sm text-gray-500">
                Limite le nombre de commandes sur un même créneau. Laissez vide pour illimité.
              </p>
              <input
                type="number"
                min="1"
                max="100"
                value={editForm.max_orders_per_slot || ''}
                onChange={(e) => onUpdateForm('max_orders_per_slot', e.target.value ? parseInt(e.target.value) : null)}
                onWheel={(e) => e.currentTarget.blur()}
                className="input w-32"
                placeholder="Illimité"
                autoFocus
              />
            </>
          }
        />

        {/* Commandes à l'avance */}
        <div className="border-t border-gray-100 pt-4">
          <EditableField
            label="Commandes à l'avance"
            field="allow_advance_orders"
            editingField={editingField}
            editLoading={editLoading}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            hasBorder={false}
            displayValue={
              <div className="flex items-center gap-2">
                {foodtruck?.allow_advance_orders !== false ? (
                  <>
                    <CalendarClock className="w-5 h-5 text-primary-500" />
                    <span className="text-gray-900 font-medium">Autorisé</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-primary-500" />
                    <span className="text-gray-900 font-medium">Heures d'ouverture uniquement</span>
                  </>
                )}
              </div>
            }
            editContent={
              <ToggleCards
                currentValue={editForm.allow_advance_orders}
                onChange={(value) => onUpdateForm('allow_advance_orders', value)}
                options={[
                  { value: true, icon: CalendarClock, title: 'Autorisé', description: 'Les clients peuvent commander le jour même avant l\'ouverture' },
                  { value: false, icon: Clock, title: 'Heures d\'ouverture', description: 'Les clients ne peuvent commander que si vous êtes ouvert' },
                ]}
              />
            }
          />
        </div>

        {/* Email de confirmation */}
        <div className="border-t border-gray-100 pt-4">
          <EditableField
            label="Email de confirmation"
            field="send_confirmation_email"
            editingField={editingField}
            editLoading={editLoading}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            hasBorder={false}
            displayValue={
              <div className="flex items-center gap-2">
                {foodtruck?.send_confirmation_email !== false ? (
                  <>
                    <Mail className="w-5 h-5 text-primary-500" />
                    <span className="text-gray-900 font-medium">Activé</span>
                  </>
                ) : (
                  <>
                    <MailX className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 font-medium">Désactivé</span>
                  </>
                )}
              </div>
            }
            editContent={
              <ToggleCards
                currentValue={editForm.send_confirmation_email}
                onChange={(value) => onUpdateForm('send_confirmation_email', value)}
                options={[
                  { value: true, icon: Mail, title: 'Activé', description: 'Un email est envoyé au client quand sa commande est confirmée' },
                  { value: false, icon: MailX, title: 'Désactivé', description: 'Aucun email de confirmation n\'est envoyé' },
                ]}
              />
            }
          />
        </div>

        {/* Email de rappel */}
        <EditableField
          label="Email de rappel"
          field="send_reminder_email"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          hasBorder={false}
          displayValue={
            <div className="flex items-center gap-2">
              {foodtruck?.send_reminder_email ? (
                <>
                  <BellRing className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Activé</span>
                </>
              ) : (
                <>
                  <BellOff className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">Désactivé</span>
                </>
              )}
            </div>
          }
          editContent={
            <>
              <p className="text-sm text-gray-500 mb-3">
                Envoie un rappel 30 min avant le retrait si la commande a été passée plus de 2h avant.
              </p>
              <ToggleCards
                currentValue={editForm.send_reminder_email}
                onChange={(value) => onUpdateForm('send_reminder_email', value)}
                options={[
                  { value: true, icon: BellRing, title: 'Activé', description: 'Un email de rappel est envoyé 30 min avant le retrait' },
                  { value: false, icon: BellOff, title: 'Désactivé', description: 'Aucun rappel n\'est envoyé' },
                ]}
              />
            </>
          }
        />
      </div>
    </section>
  );
}

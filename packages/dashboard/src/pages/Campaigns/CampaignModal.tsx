import {
  X,
  Mail,
  MessageSquare,
  Check,
  Users,
  MapPin,
  UserMinus,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import type { CampaignChannel, Location } from '@foodtruck/shared';
import type { CampaignForm, SegmentType } from './useCampaigns';
import { SEGMENT_OPTIONS } from './useCampaigns';

interface CampaignModalProps {
  form: CampaignForm;
  setForm: React.Dispatch<React.SetStateAction<CampaignForm>>;
  locations: Location[];
  recipientCount: number | null;
  isEditing: boolean;
  onSave: () => void;
  onClose: () => void;
}

const SEGMENT_ICONS: Record<SegmentType, React.ReactNode> = {
  all: <Users className="w-5 h-5" />,
  location: <MapPin className="w-5 h-5" />,
  inactive: <UserMinus className="w-5 h-5" />,
  loyal: <TrendingUp className="w-5 h-5" />,
  new: <UserPlus className="w-5 h-5" />,
};

export function CampaignModal({
  form,
  setForm,
  locations,
  recipientCount,
  isEditing,
  onSave,
  onClose,
}: CampaignModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full h-[95vh] sm:h-auto rounded-t-2xl sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-hidden flex flex-col safe-area-bottom">
        {/* Header sticky avec indicateur de glissement mobile */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          {/* Pill indicator mobile */}
          <div className="flex justify-center pt-2 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {isEditing ? 'Modifier la campagne' : 'Nouvelle campagne'}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4 pb-24 sm:pb-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la campagne
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Promo rentrée, Rappel jeudi..."
                className="w-full px-4 py-3 min-h-[48px] border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Canal</label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    key: 'email',
                    label: 'Email',
                    icon: <Mail className="w-4 h-4 sm:w-5 sm:h-5" />,
                  },
                  {
                    key: 'sms',
                    label: 'SMS',
                    icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />,
                  },
                  {
                    key: 'both',
                    label: 'Les deux',
                    icon: <Check className="w-4 h-4 sm:w-5 sm:h-5" />,
                  },
                ].map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setForm({ ...form, channel: ch.key as CampaignChannel })}
                    className={`p-2.5 sm:p-4 min-h-[64px] sm:min-h-[72px] rounded-xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all active:scale-[0.98] ${
                      form.channel === ch.key
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {ch.icon}
                    <span className="text-xs sm:text-sm font-medium">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Segment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                A qui envoyer ?
              </label>
              <div className="space-y-2">
                {SEGMENT_OPTIONS.map((seg) => (
                  <button
                    key={seg.key}
                    onClick={() => setForm({ ...form, segment: seg.key })}
                    className={`w-full p-3 sm:p-4 rounded-xl border-2 flex items-center gap-3 sm:gap-4 text-left transition-all active:scale-[0.99] ${
                      form.segment === seg.key
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${form.segment === seg.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {SEGMENT_ICONS[seg.key]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{seg.label}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate sm:whitespace-normal">
                        {seg.description}
                      </p>
                    </div>
                    {form.segment === seg.key && (
                      <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Segment-specific options */}
              {form.segment === 'location' && (
                <div className="mt-3 sm:mt-4">
                  <select
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                    className="w-full px-4 py-3 min-h-[48px] border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.segment === 'inactive' && (
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-sm sm:text-base text-gray-600">Inactifs depuis</span>
                  <select
                    value={form.inactiveDays}
                    onChange={(e) => setForm({ ...form, inactiveDays: parseInt(e.target.value) })}
                    className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={14}>14 jours</option>
                    <option value={30}>30 jours</option>
                    <option value={60}>60 jours</option>
                    <option value={90}>90 jours</option>
                  </select>
                </div>
              )}

              {/* Recipient count */}
              <div className="mt-3 sm:mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  {recipientCount !== null ? (
                    <>
                      <span className="font-semibold text-gray-900">{recipientCount}</span>{' '}
                      destinataire
                      {recipientCount !== 1 ? 's' : ''}
                    </>
                  ) : (
                    'Calcul en cours...'
                  )}
                </span>
              </div>
            </div>

            {/* Email Content */}
            {(form.channel === 'email' || form.channel === 'both') && (
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <Mail className="w-4 h-4" /> Contenu email
                </h3>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Objet</label>
                  <input
                    type="text"
                    value={form.emailSubject}
                    onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                    placeholder="Ex: On est a Fontevraud aujourd'hui !"
                    className="w-full px-4 py-3 min-h-[48px] border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Message</label>
                  <textarea
                    value={form.emailBody}
                    onChange={(e) => setForm({ ...form, emailBody: e.target.value })}
                    placeholder="Bonjour {name},&#10;&#10;Bonne nouvelle ! On est a {location} aujourd'hui jusqu'a 14h.&#10;&#10;A tout de suite !"
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Variables : {'{name}'}, {'{foodtruck}'}, {'{location}'}
                  </p>
                </div>
              </div>
            )}

            {/* SMS Content */}
            {(form.channel === 'sms' || form.channel === 'both') && (
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <MessageSquare className="w-4 h-4" /> Contenu SMS
                </h3>
                <div>
                  <textarea
                    value={form.smsBody}
                    onChange={(e) => setForm({ ...form, smsBody: e.target.value })}
                    placeholder="Ex: {foodtruck} est a {location} aujourd'hui ! Commandez sur {link}"
                    rows={3}
                    maxLength={160}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.smsBody.length}/160 caracteres</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-auto safe-area-bottom">
          <button
            onClick={onClose}
            className="px-4 py-3 min-h-[48px] text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors active:scale-[0.98]"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-6 py-3 min-h-[48px] bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors active:scale-[0.98] shadow-lg shadow-primary-500/25"
          >
            {isEditing ? 'Sauvegarder' : 'Creer la campagne'}
          </button>
        </div>
      </div>
    </div>
  );
}

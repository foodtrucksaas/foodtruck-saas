import { X, Mail, MessageSquare, Check, Users, MapPin, UserMinus, TrendingUp, UserPlus } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Canal</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'email', label: 'Email', icon: <Mail className="w-5 h-5" /> },
                { key: 'sms', label: 'SMS', icon: <MessageSquare className="w-5 h-5" /> },
                { key: 'both', label: 'Les deux', icon: <Check className="w-5 h-5" /> },
              ].map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => setForm({ ...form, channel: ch.key as CampaignChannel })}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    form.channel === ch.key
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {ch.icon}
                  <span className="text-sm font-medium">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Segment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              À qui envoyer ?
            </label>
            <div className="space-y-2">
              {SEGMENT_OPTIONS.map((seg) => (
                <button
                  key={seg.key}
                  onClick={() => setForm({ ...form, segment: seg.key })}
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 text-left transition-all ${
                    form.segment === seg.key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${form.segment === seg.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                    {SEGMENT_ICONS[seg.key]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{seg.label}</p>
                    <p className="text-sm text-gray-500">{seg.description}</p>
                  </div>
                  {form.segment === seg.key && (
                    <Check className="w-5 h-5 text-primary-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Segment-specific options */}
            {form.segment === 'location' && (
              <div className="mt-4">
                <select
                  value={form.locationId}
                  onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <div className="mt-4 flex items-center gap-3">
                <span className="text-gray-600">Inactifs depuis</span>
                <select
                  value={form.inactiveDays}
                  onChange={(e) => setForm({ ...form, inactiveDays: parseInt(e.target.value) })}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={60}>60 jours</option>
                  <option value={90}>90 jours</option>
                </select>
              </div>
            )}

            {/* Recipient count */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {recipientCount !== null ? (
                  <>
                    <span className="font-semibold text-gray-900">{recipientCount}</span> destinataire
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
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Contenu email
              </h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Objet</label>
                <input
                  type="text"
                  value={form.emailSubject}
                  onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                  placeholder="Ex: On est à Fontevraud aujourd'hui !"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Message</label>
                <textarea
                  value={form.emailBody}
                  onChange={(e) => setForm({ ...form, emailBody: e.target.value })}
                  placeholder="Bonjour {name},&#10;&#10;Bonne nouvelle ! On est à {location} aujourd'hui jusqu'à 14h.&#10;&#10;À tout de suite !"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables disponibles : {'{name}'}, {'{foodtruck}'}, {'{location}'}
                </p>
              </div>
            </div>
          )}

          {/* SMS Content */}
          {(form.channel === 'sms' || form.channel === 'both') && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Contenu SMS
              </h3>
              <div>
                <textarea
                  value={form.smsBody}
                  onChange={(e) => setForm({ ...form, smsBody: e.target.value })}
                  placeholder="Ex: {foodtruck} est à {location} aujourd'hui ! Commandez sur {link}"
                  rows={3}
                  maxLength={160}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.smsBody.length}/160 caractères
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            {isEditing ? 'Sauvegarder' : 'Créer la campagne'}
          </button>
        </div>
      </div>
    </div>
  );
}

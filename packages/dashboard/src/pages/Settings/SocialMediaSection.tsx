import { useState } from 'react';
import { Share2, Instagram, Facebook, Globe, Check, X } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import toast from 'react-hot-toast';

// TikTok icon component (not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

interface SocialMediaSectionProps {
  foodtruck: Foodtruck | null;
}

type SocialField = 'instagram_url' | 'facebook_url' | 'tiktok_url' | 'website_url';

export function SocialMediaSection({ foodtruck }: SocialMediaSectionProps) {
  const { updateFoodtruck } = useFoodtruck();
  const [editingField, setEditingField] = useState<SocialField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);

  const startEdit = (field: SocialField) => {
    setEditingField(field);
    setEditValue(foodtruck?.[field] || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingField) return;

    setLoading(true);
    try {
      // Basic URL validation
      let url = editValue.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      await updateFoodtruck({ [editingField]: url || null });
      toast.success('Lien mis à jour');
      setEditingField(null);
      setEditValue('');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
    setLoading(false);
  };

  const socialFields: { field: SocialField; label: string; icon: React.ReactNode; placeholder: string }[] = [
    { field: 'instagram_url', label: 'Instagram', icon: <Instagram className="w-5 h-5" />, placeholder: 'https://instagram.com/votre-compte' },
    { field: 'facebook_url', label: 'Facebook', icon: <Facebook className="w-5 h-5" />, placeholder: 'https://facebook.com/votre-page' },
    { field: 'tiktok_url', label: 'TikTok', icon: <TikTokIcon className="w-5 h-5" />, placeholder: 'https://tiktok.com/@votre-compte' },
    { field: 'website_url', label: 'Site web', icon: <Globe className="w-5 h-5" />, placeholder: 'https://votre-site.com' },
  ];

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Share2 className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Réseaux sociaux</h2>
      </div>

      <div className="space-y-3">
        {socialFields.map(({ field, label, icon, placeholder }) => (
          <div key={field} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
            <div className="text-gray-400">{icon}</div>

            {editingField === field ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="url"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={placeholder}
                  className="input flex-1 text-sm"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  disabled={loading}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  {foodtruck?.[field] ? (
                    <a
                      href={foodtruck[field]!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline truncate block"
                    >
                      {foodtruck[field]}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Non renseigné</p>
                  )}
                </div>
                <button
                  onClick={() => startEdit(field)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {foodtruck?.[field] ? 'Modifier' : 'Ajouter'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

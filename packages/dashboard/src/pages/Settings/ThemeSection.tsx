import { useState } from 'react';
import { Check, Palette, Loader2 } from 'lucide-react';
import { COLOR_THEMES, type ThemeId } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { supabase } from '../../lib/supabase';

export default function ThemeSection() {
  const { foodtruck, refresh } = useFoodtruck();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentTheme = (foodtruck?.theme as ThemeId) || 'coral';

  const handleSelectTheme = async (themeId: ThemeId) => {
    if (!foodtruck || themeId === currentTheme) return;

    setSaving(true);
    setSuccess(false);

    const { error } = await supabase
      .from('foodtrucks')
      .update({ theme: themeId })
      .eq('id', foodtruck.id);

    if (error) {
      console.error('Error updating theme:', error);
    } else {
      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 2000);
    }

    setSaving(false);
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Palette className="w-5 h-5 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-900">Thème de couleur</h2>
          <p className="text-sm text-gray-500">Personnalisez l'apparence de votre page client</p>
        </div>
        {saving && <Loader2 className="w-5 h-5 animate-spin text-primary-500 flex-shrink-0" />}
        {success && (
          <div className="flex items-center gap-1 text-green-600 text-sm flex-shrink-0">
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Enregistré</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {COLOR_THEMES.map((theme) => {
          const isSelected = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              disabled={saving}
              className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
                isSelected
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Color Preview */}
              <div
                className="w-full h-10 sm:h-12 rounded-lg mb-2 sm:mb-3"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors[400]} 0%, ${theme.colors[500]} 50%, ${theme.colors[600]} 100%)`,
                }}
              />

              <p className="font-semibold text-gray-900 text-sm sm:text-base">{theme.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{theme.description}</p>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gray-900 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Le thème s'applique à votre page de commande vue par les clients. Le dashboard conserve
        toujours le thème par défaut.
      </p>
    </div>
  );
}

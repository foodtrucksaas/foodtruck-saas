import { useState } from 'react';
import { Check, Palette, Loader2 } from 'lucide-react';
import { COLOR_THEMES, type ThemeId } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { supabase } from '../../lib/supabase';

export default function ThemeSection() {
  const { foodtruck, refresh } = useFoodtruck();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentTheme = (foodtruck?.theme as ThemeId) || 'corail';

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
          <h2 className="font-bold text-gray-900">Couleur d'accent</h2>
          <p className="text-sm text-gray-500">Choisis la couleur d'accent de ta page client</p>
        </div>
        {saving && <Loader2 className="w-5 h-5 animate-spin text-primary-500 flex-shrink-0" />}
        {success && (
          <div className="flex items-center gap-1 text-success-600 text-sm flex-shrink-0">
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Enregistré</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
        {COLOR_THEMES.map((theme) => {
          const isSelected = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              disabled={saving}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`relative w-12 h-12 rounded-full transition-all ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                    : 'hover:scale-105 hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                }`}
                style={{ backgroundColor: theme.preview }}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-5 h-5" style={{ color: theme.textOnAccent }} />
                  </div>
                )}
              </div>
              <span
                className={`text-sm ${
                  isSelected ? 'font-semibold text-gray-900' : 'text-gray-600'
                }`}
              >
                {theme.name}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-5">
        Le thème s'applique à ta page de commande vue par les clients. Le dashboard conserve
        toujours le thème par défaut.
      </p>
    </div>
  );
}

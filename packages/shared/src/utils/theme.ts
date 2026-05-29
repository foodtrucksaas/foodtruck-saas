import { COLOR_THEMES, type ThemeId } from '../constants';

/**
 * Get a theme by its ID
 */
export function getThemeById(themeId: ThemeId | string | null | undefined) {
  const id = themeId || 'corail';
  return COLOR_THEMES.find((t) => t.id === id) || COLOR_THEMES[0];
}

/**
 * Return the text color to use on the accent background.
 * Safran (#D4A04E) needs dark text for WCAG compliance; all others use white.
 */
export function getTextColorOnAccent(accentHexOrId: string): string {
  const LIGHT_ACCENTS = ['#D4A04E', 'safran'];
  return LIGHT_ACCENTS.includes(accentHexOrId) ? '#2D2D2D' : '#FFFFFF';
}

/** Convert hex to "R G B" space-separated string for Tailwind opacity support */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Generate CSS custom properties for a theme.
 * Sets both hex vars (for direct use) and RGB-channel vars (for Tailwind opacity).
 */
export function getThemeCSSVariables(
  themeId: ThemeId | string | null | undefined
): Record<string, string> {
  const theme = getThemeById(themeId);

  return {
    '--color-primary-50': theme.colors[50],
    '--color-primary-100': theme.colors[100],
    '--color-primary-200': theme.colors[200],
    '--color-primary-300': theme.colors[300],
    '--color-primary-400': theme.colors[400],
    '--color-primary-500': theme.colors[500],
    '--color-primary-600': theme.colors[600],
    '--color-primary-700': theme.colors[700],
    '--color-primary-on': theme.textOnAccent,
    // RGB-channel vars for Tailwind opacity modifiers (bg-primary-500/25 etc.)
    '--primary-50': hexToRgb(theme.colors[50]),
    '--primary-100': hexToRgb(theme.colors[100]),
    '--primary-200': hexToRgb(theme.colors[200]),
    '--primary-300': hexToRgb(theme.colors[300]),
    '--primary-400': hexToRgb(theme.colors[400]),
    '--primary-500': hexToRgb(theme.colors[500]),
    '--primary-600': hexToRgb(theme.colors[600]),
    '--primary-700': hexToRgb(theme.colors[700]),
  };
}

/**
 * Apply theme CSS variables to the document root
 * Call this when foodtruck data is loaded
 */
export function applyTheme(themeId: ThemeId | string | null | undefined): void {
  if (typeof document === 'undefined') return;

  const variables = getThemeCSSVariables(themeId);
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Reset theme to default (corail)
 */
export function resetTheme(): void {
  applyTheme('corail');
}

import { COLOR_THEMES, type ThemeId } from '../constants';

/**
 * Get a theme by its ID
 */
export function getThemeById(themeId: ThemeId | string | null | undefined) {
  const id = themeId || 'coral';
  return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0];
}

/**
 * Generate CSS custom properties for a theme
 */
export function getThemeCSSVariables(themeId: ThemeId | string | null | undefined): Record<string, string> {
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
 * Reset theme to default (coral)
 */
export function resetTheme(): void {
  applyTheme('coral');
}

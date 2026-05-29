import { describe, it, expect } from 'vitest';
import { COLOR_THEMES } from '../constants';
import { getThemeById, getTextColorOnAccent, getThemeCSSVariables } from './theme';

describe('COLOR_THEMES integrity', () => {
  it('has exactly 8 themes', () => {
    expect(COLOR_THEMES).toHaveLength(8);
  });

  it('has unique IDs', () => {
    const ids = COLOR_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('has unique preview hex values', () => {
    const previews = COLOR_THEMES.map((t) => t.preview);
    expect(new Set(previews).size).toBe(8);
  });

  it('each theme has colors 50-700 and a preview', () => {
    for (const theme of COLOR_THEMES) {
      expect(theme.colors[50]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[100]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[200]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[300]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[400]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[500]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[600]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors[700]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.preview).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('each theme has a valid textOnAccent color', () => {
    for (const theme of COLOR_THEMES) {
      expect(['#FFFFFF', '#2D2D2D']).toContain(theme.textOnAccent);
    }
  });
});

describe('getThemeById', () => {
  it('returns corail for null/undefined', () => {
    expect(getThemeById(null).id).toBe('corail');
    expect(getThemeById(undefined).id).toBe('corail');
  });

  it('returns corail for empty string', () => {
    expect(getThemeById('').id).toBe('corail');
  });

  it('returns the correct theme by ID', () => {
    expect(getThemeById('marine').id).toBe('marine');
    expect(getThemeById('safran').id).toBe('safran');
    expect(getThemeById('vertsapin').id).toBe('vertsapin');
  });

  it('falls back to corail for unknown ID', () => {
    expect(getThemeById('nonexistent').id).toBe('corail');
  });
});

describe('getTextColorOnAccent', () => {
  it('returns dark text for Safran hex', () => {
    expect(getTextColorOnAccent('#D4A04E')).toBe('#2D2D2D');
  });

  it('returns dark text for safran ID', () => {
    expect(getTextColorOnAccent('safran')).toBe('#2D2D2D');
  });

  it('returns white for other themes', () => {
    expect(getTextColorOnAccent('#F97066')).toBe('#FFFFFF');
    expect(getTextColorOnAccent('corail')).toBe('#FFFFFF');
    expect(getTextColorOnAccent('marine')).toBe('#FFFFFF');
    expect(getTextColorOnAccent('#1E3A5F')).toBe('#FFFFFF');
  });
});

describe('getThemeCSSVariables', () => {
  it('returns hex and RGB vars for corail', () => {
    const vars = getThemeCSSVariables('corail');

    expect(vars['--color-primary-500']).toBe('#F97066');
    expect(vars['--color-primary-on']).toBe('#FFFFFF');
    expect(vars['--primary-500']).toBe('249 112 102');
  });

  it('returns correct textOnAccent for safran', () => {
    const vars = getThemeCSSVariables('safran');

    expect(vars['--color-primary-500']).toBe('#D4A04E');
    expect(vars['--color-primary-on']).toBe('#2D2D2D');
    expect(vars['--primary-500']).toBe('212 160 78');
  });

  it('returns all expected keys', () => {
    const vars = getThemeCSSVariables('corail');
    const shades = [50, 100, 200, 300, 400, 500, 600, 700];

    for (const shade of shades) {
      expect(vars).toHaveProperty(`--color-primary-${shade}`);
      expect(vars).toHaveProperty(`--primary-${shade}`);
    }
    expect(vars).toHaveProperty('--color-primary-on');
  });
});

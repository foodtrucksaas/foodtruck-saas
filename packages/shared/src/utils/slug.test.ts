import { describe, it, expect } from 'vitest';
import { generateSlug, isValidSlug } from './slug';

describe('generateSlug', () => {
  it('should convert name to lowercase', () => {
    expect(generateSlug('Test Foodtruck')).toBe('test-foodtruck');
  });

  it('should remove accents', () => {
    expect(generateSlug('Café Étoilé')).toBe('cafe-etoile');
    expect(generateSlug('Le Gourmet Français')).toBe('le-gourmet-francais');
  });

  it('should replace non-alphanumeric characters with hyphens', () => {
    expect(generateSlug('Pizza & Burger')).toBe('pizza-burger');
    expect(generateSlug('Food@Truck!')).toBe('food-truck');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(generateSlug('---test---')).toBe('test');
    expect(generateSlug('  test  ')).toBe('test');
  });

  it('should handle multiple spaces and special chars', () => {
    expect(generateSlug('Le   Camion    à   Pizza')).toBe('le-camion-a-pizza');
  });

  it('should handle numbers', () => {
    expect(generateSlug('Burger 42')).toBe('burger-42');
    expect(generateSlug('3 Étoiles')).toBe('3-etoiles');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('isValidSlug', () => {
  it('should validate correct slugs', () => {
    expect(isValidSlug('test-foodtruck')).toBe(true);
    expect(isValidSlug('burger42')).toBe(true);
    expect(isValidSlug('le-gourmet-roulant')).toBe(true);
  });

  it('should reject slugs starting with hyphen', () => {
    expect(isValidSlug('-test')).toBe(false);
  });

  it('should reject slugs ending with hyphen', () => {
    expect(isValidSlug('test-')).toBe(false);
  });

  it('should reject slugs with uppercase', () => {
    expect(isValidSlug('Test')).toBe(false);
  });

  it('should reject slugs with special characters', () => {
    expect(isValidSlug('test@foodtruck')).toBe(false);
    expect(isValidSlug('test_foodtruck')).toBe(false);
  });

  it('should reject slugs shorter than 3 chars', () => {
    expect(isValidSlug('ab')).toBe(false);
    expect(isValidSlug('a')).toBe(false);
  });

  it('should reject slugs longer than 50 chars', () => {
    const longSlug = 'a'.repeat(51);
    expect(isValidSlug(longSlug)).toBe(false);
  });

  it('should accept slugs with exactly 3 chars', () => {
    expect(isValidSlug('abc')).toBe(true);
  });

  it('should accept slugs with exactly 50 chars', () => {
    const slug50 = 'a'.repeat(50);
    expect(isValidSlug(slug50)).toBe(true);
  });
});

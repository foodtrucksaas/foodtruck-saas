import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidPrice,
  isValidTime,
  isValidDate,
  sanitizeHtml,
  validateOrderItems,
  isValidUUID,
} from './validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.fr')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user@domain.c')).toBe(false); // TLD too short
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true);
      expect(isValidEmail('   ')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate French phone numbers', () => {
      expect(isValidPhone('0612345678')).toBe(true);
      expect(isValidPhone('06 12 34 56 78')).toBe(true);
      expect(isValidPhone('+33612345678')).toBe(true);
      expect(isValidPhone('0033612345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123456789')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidPhone(null)).toBe(false);
      expect(isValidPhone(undefined)).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    it('should validate non-negative integers', () => {
      expect(isValidPrice(0)).toBe(true); // Free items allowed
      expect(isValidPrice(100)).toBe(true);
      expect(isValidPrice(1)).toBe(true);
      expect(isValidPrice(99999)).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(isValidPrice(-1)).toBe(false);
      expect(isValidPrice(-100)).toBe(false);
      expect(isValidPrice(10.5)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidPrice(null)).toBe(false);
      expect(isValidPrice(undefined)).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('should validate HH:MM format', () => {
      expect(isValidTime('09:00')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
      expect(isValidTime('00:00')).toBe(true);
      expect(isValidTime('12:30')).toBe(true);
    });

    it('should reject invalid times', () => {
      expect(isValidTime('9:00')).toBe(false);
      expect(isValidTime('24:00')).toBe(false);
      expect(isValidTime('12:60')).toBe(false);
      expect(isValidTime('invalid')).toBe(false);
      expect(isValidTime('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidTime(null)).toBe(false);
      expect(isValidTime(undefined)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should validate correct dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('A123E567-E89B-12D3-A456-426614174000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHtml('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeHtml("'test'")).toBe('&#039;test&#039;');
      expect(sanitizeHtml('a & b')).toBe('a &amp; b');
    });

    it('should handle normal text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('validateOrderItems', () => {
    it('should validate correct order items', () => {
      const result = validateOrderItems([
        { menu_item_id: 'uuid-1', quantity: 2 },
        { menu_item_id: 'uuid-2', quantity: 1 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty cart', () => {
      const result = validateOrderItems([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Le panier est vide');
    });

    it('should reject items without menu_item_id', () => {
      const result = validateOrderItems([{ menu_item_id: '', quantity: 1 }]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Article invalide dans le panier');
    });

    it('should reject invalid quantities', () => {
      expect(validateOrderItems([{ menu_item_id: 'uuid-1', quantity: 0 }]).valid).toBe(false);
      expect(validateOrderItems([{ menu_item_id: 'uuid-1', quantity: -1 }]).valid).toBe(false);
      expect(validateOrderItems([{ menu_item_id: 'uuid-1', quantity: 100 }]).valid).toBe(false);
    });

    it('should accept maximum valid quantity (99)', () => {
      const result = validateOrderItems([{ menu_item_id: 'uuid-1', quantity: 99 }]);
      expect(result.valid).toBe(true);
    });

    it('should reject null items array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validateOrderItems(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Le panier est vide');
    });

    it('should validate single item cart', () => {
      const result = validateOrderItems([{ menu_item_id: 'uuid-1', quantity: 1 }]);
      expect(result.valid).toBe(true);
    });

    it('should validate large cart with multiple items', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        menu_item_id: `uuid-${i}`,
        quantity: Math.floor(Math.random() * 5) + 1,
      }));
      const result = validateOrderItems(items);
      expect(result.valid).toBe(true);
    });
  });
});

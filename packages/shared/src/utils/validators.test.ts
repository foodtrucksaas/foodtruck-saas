import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidPrice,
  isValidTime,
  isValidDate,
  sanitizeHtml,
  validateOrderItems,
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
      expect(isValidEmail('')).toBe(false);
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
  });

  describe('isValidPrice', () => {
    it('should validate positive integers', () => {
      expect(isValidPrice(100)).toBe(true);
      expect(isValidPrice(1)).toBe(true);
      expect(isValidPrice(99999)).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-100)).toBe(false);
      expect(isValidPrice(10.5)).toBe(false);
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
  });
});

import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDate,
  formatTime,
  formatDateTime,
  formatPhoneNumber,
  formatOrderId,
  slugify,
} from './formatters';

describe('formatters', () => {
  describe('formatPrice', () => {
    it('should format price in cents to EUR', () => {
      // Intl uses narrow no-break space (U+202F) in fr-FR locale
      expect(formatPrice(1000)).toMatch(/10,00.*€/);
      expect(formatPrice(1050)).toMatch(/10,50.*€/);
      expect(formatPrice(100)).toMatch(/1,00.*€/);
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toMatch(/0,00.*€/);
    });

    it('should handle large numbers', () => {
      expect(formatPrice(100000)).toMatch(/1.000,00.*€/);
    });

    it('should fallback to EUR for invalid currency', () => {
      expect(formatPrice(1000, 'INVALID')).toMatch(/10,00.*€/);
      expect(formatPrice(1000, '')).toMatch(/10,00.*€/);
    });

    it('should accept valid currencies', () => {
      expect(formatPrice(1000, 'USD')).toMatch(/10,00.*\$/);
      expect(formatPrice(1000, 'GBP')).toMatch(/10,00.*£/);
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      expect(formatDate('2024-01-15')).toContain('janvier');
      expect(formatDate('2024-01-15')).toContain('2024');
    });

    it('should handle null/undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should handle invalid date', () => {
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('formatTime', () => {
    it('should format time with h separator', () => {
      expect(formatTime('09:00')).toBe('09h00');
      expect(formatTime('14:30')).toBe('14h30');
      expect(formatTime('00:00')).toBe('00h00');
    });

    it('should handle null/undefined', () => {
      expect(formatTime(null)).toBe('');
      expect(formatTime(undefined)).toBe('');
    });

    it('should handle invalid format gracefully', () => {
      expect(formatTime('09')).toBe('09');
      expect(formatTime('')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      expect(result).toContain('janv.');
      expect(result).toContain('2024');
    });

    it('should handle null/undefined', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime(undefined)).toBe('');
    });

    it('should handle invalid date', () => {
      expect(formatDateTime('invalid')).toBe('');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10 digit French phone numbers', () => {
      expect(formatPhoneNumber('0612345678')).toBe('06 12 34 56 78');
      expect(formatPhoneNumber('0123456789')).toBe('01 23 45 67 89');
    });

    it('should return unchanged if not 10 digits', () => {
      expect(formatPhoneNumber('+33612345678')).toBe('+33612345678');
      expect(formatPhoneNumber('06 12 34')).toBe('06 12 34');
    });

    it('should handle null/undefined', () => {
      expect(formatPhoneNumber(null)).toBe('');
      expect(formatPhoneNumber(undefined)).toBe('');
    });
  });

  describe('formatOrderId', () => {
    it('should format UUID to short order id', () => {
      expect(formatOrderId('abc12345-6789-0000-0000-000000000000')).toBe('#ABC12345');
      expect(formatOrderId('xyz98765-abcd-efgh-ijkl-mnopqrstuvwx')).toBe('#XYZ98765');
    });

    it('should handle null/undefined', () => {
      expect(formatOrderId(null)).toBe('');
      expect(formatOrderId(undefined)).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Pizza Margherita')).toBe('pizza-margherita');
    });

    it('should handle accents', () => {
      expect(slugify('Café crème')).toBe('cafe-creme');
      expect(slugify('Bœuf bourguignon')).toBe('buf-bourguignon');
    });

    it('should remove special characters', () => {
      expect(slugify('Pizza 4 fromages!')).toBe('pizza-4-fromages');
      expect(slugify('Test @#$% test')).toBe('test-test');
    });

    it('should handle multiple spaces and dashes', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
      expect(slugify('Hello---World')).toBe('hello-world');
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });
  });
});

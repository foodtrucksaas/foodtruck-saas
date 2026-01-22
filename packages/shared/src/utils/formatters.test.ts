import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatTime,
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
  });

  describe('formatTime', () => {
    it('should format time with h separator', () => {
      expect(formatTime('09:00')).toBe('09h00');
      expect(formatTime('14:30')).toBe('14h30');
      expect(formatTime('00:00')).toBe('00h00');
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
  });

  describe('formatOrderId', () => {
    it('should format UUID to short order id', () => {
      expect(formatOrderId('abc12345-6789-0000-0000-000000000000')).toBe('#ABC12345');
      expect(formatOrderId('xyz98765-abcd-efgh-ijkl-mnopqrstuvwx')).toBe('#XYZ98765');
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

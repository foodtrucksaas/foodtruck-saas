import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
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
});

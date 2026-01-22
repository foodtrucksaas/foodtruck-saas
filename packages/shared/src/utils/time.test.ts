import { describe, it, expect } from 'vitest';
import {
  DAY_NAMES,
  formatLocalDate,
} from './time';

describe('time utilities', () => {
  describe('constants', () => {
    it('should have 7 day names', () => {
      expect(DAY_NAMES).toHaveLength(7);
    });

    it('should start with Dimanche (Sunday)', () => {
      expect(DAY_NAMES[0]).toBe('Dimanche');
    });
  });

  describe('formatLocalDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatLocalDate(date)).toBe('2024-01-15');
    });

    it('should pad single digit month and day', () => {
      const date = new Date(2024, 4, 5); // May 5, 2024
      expect(formatLocalDate(date)).toBe('2024-05-05');
    });
  });
});

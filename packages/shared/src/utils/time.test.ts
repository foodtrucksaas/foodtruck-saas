import { describe, it, expect } from 'vitest';
import {
  DAY_NAMES,
  DAY_NAMES_SHORT,
  getDayName,
  getDayNameShort,
  generateTimeSlots,
  isTimeInRange,
  addMinutesToTime,
} from './time';

describe('time utilities', () => {
  describe('constants', () => {
    it('should have 7 day names', () => {
      expect(DAY_NAMES).toHaveLength(7);
      expect(DAY_NAMES_SHORT).toHaveLength(7);
    });

    it('should start with Dimanche (Sunday)', () => {
      expect(DAY_NAMES[0]).toBe('Dimanche');
      expect(DAY_NAMES_SHORT[0]).toBe('Dim');
    });
  });

  describe('getDayName', () => {
    it('should return day name for valid index', () => {
      expect(getDayName(0)).toBe('Dimanche');
      expect(getDayName(1)).toBe('Lundi');
      expect(getDayName(6)).toBe('Samedi');
    });

    it('should return empty string for invalid index', () => {
      expect(getDayName(7)).toBe('');
      expect(getDayName(-1)).toBe('');
    });
  });

  describe('getDayNameShort', () => {
    it('should return short day name for valid index', () => {
      expect(getDayNameShort(0)).toBe('Dim');
      expect(getDayNameShort(1)).toBe('Lun');
      expect(getDayNameShort(6)).toBe('Sam');
    });

    it('should return empty string for invalid index', () => {
      expect(getDayNameShort(7)).toBe('');
      expect(getDayNameShort(-1)).toBe('');
    });
  });

  describe('generateTimeSlots', () => {
    it('should generate time slots with default 15 min interval', () => {
      const slots = generateTimeSlots('09:00', '10:00');
      expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45']);
    });

    it('should generate time slots with custom interval', () => {
      const slots = generateTimeSlots('09:00', '10:00', 30);
      expect(slots).toEqual(['09:00', '09:30']);
    });

    it('should handle longer ranges', () => {
      const slots = generateTimeSlots('11:00', '14:00', 60);
      expect(slots).toEqual(['11:00', '12:00', '13:00']);
    });

    it('should return empty array if start >= end', () => {
      const slots = generateTimeSlots('10:00', '09:00');
      expect(slots).toEqual([]);
    });
  });

  describe('isTimeInRange', () => {
    it('should return true for time within range', () => {
      expect(isTimeInRange('10:00', '09:00', '12:00')).toBe(true);
      expect(isTimeInRange('09:00', '09:00', '12:00')).toBe(true);
      expect(isTimeInRange('11:59', '09:00', '12:00')).toBe(true);
    });

    it('should return false for time outside range', () => {
      expect(isTimeInRange('08:00', '09:00', '12:00')).toBe(false);
      expect(isTimeInRange('12:00', '09:00', '12:00')).toBe(false);
      expect(isTimeInRange('15:00', '09:00', '12:00')).toBe(false);
    });
  });

  describe('addMinutesToTime', () => {
    it('should add minutes to time', () => {
      expect(addMinutesToTime('09:00', 30)).toBe('09:30');
      expect(addMinutesToTime('09:45', 30)).toBe('10:15');
      expect(addMinutesToTime('23:30', 60)).toBe('00:30');
    });

    it('should handle negative minutes', () => {
      expect(addMinutesToTime('10:00', -30)).toBe('09:30');
    });

    it('should handle midnight wraparound', () => {
      expect(addMinutesToTime('23:00', 120)).toBe('01:00');
    });
  });
});

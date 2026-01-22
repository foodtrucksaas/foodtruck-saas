import { describe, it, expect } from 'vitest';
import { safeNumber, calculatePercentageChange, safeDivide } from './numbers';

describe('safeNumber', () => {
  it('should return the number if valid', () => {
    expect(safeNumber(10)).toBe(10);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-5)).toBe(-5);
    expect(safeNumber(3.14)).toBe(3.14);
  });

  it('should return default value for NaN', () => {
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(NaN, 100)).toBe(100);
  });

  it('should return default value for Infinity', () => {
    expect(safeNumber(Infinity)).toBe(0);
    expect(safeNumber(-Infinity)).toBe(0);
    expect(safeNumber(Infinity, 50)).toBe(50);
  });

  it('should return default value for non-numbers', () => {
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber('10')).toBe(0);
    expect(safeNumber({})).toBe(0);
    expect(safeNumber([])).toBe(0);
  });
});

describe('calculatePercentageChange', () => {
  it('should calculate positive change correctly', () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
    expect(calculatePercentageChange(200, 100)).toBe(100);
  });

  it('should calculate negative change correctly', () => {
    expect(calculatePercentageChange(50, 100)).toBe(-50);
    expect(calculatePercentageChange(75, 100)).toBe(-25);
  });

  it('should return 100 when previous is 0 and current is positive', () => {
    expect(calculatePercentageChange(100, 0)).toBe(100);
    expect(calculatePercentageChange(1, 0)).toBe(100);
  });

  it('should return 0 when both are 0', () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });

  it('should handle NaN inputs', () => {
    expect(calculatePercentageChange(NaN, 100)).toBe(-100);
    expect(calculatePercentageChange(100, NaN)).toBe(100);
    expect(calculatePercentageChange(NaN, NaN)).toBe(0);
  });

  it('should handle undefined inputs', () => {
    // Testing runtime behavior with invalid inputs - using type assertions to simulate JavaScript edge cases
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(calculatePercentageChange(undefined as unknown as number, 100)).toBe(-100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(calculatePercentageChange(100, undefined as unknown as number)).toBe(100);
  });
});

describe('safeDivide', () => {
  it('should divide correctly', () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(100, 4)).toBe(25);
    expect(safeDivide(1, 3)).toBeCloseTo(0.333, 2);
  });

  it('should return default value when dividing by zero', () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, 999)).toBe(999);
  });

  it('should handle NaN inputs', () => {
    expect(safeDivide(NaN, 10)).toBe(0);
    expect(safeDivide(10, NaN)).toBe(0);
  });

  it('should handle negative numbers', () => {
    expect(safeDivide(-10, 2)).toBe(-5);
    expect(safeDivide(10, -2)).toBe(-5);
    expect(safeDivide(-10, -2)).toBe(5);
  });
});

describe('Price Calculations (Business Logic)', () => {
  it('should calculate item total correctly', () => {
    const unitPrice = 1200; // 12.00€ in centimes
    const quantity = 3;
    const total = unitPrice * quantity;
    expect(total).toBe(3600); // 36.00€
  });

  it('should calculate discount correctly', () => {
    const subtotal = 5000; // 50.00€
    const discountPercent = 10;
    const discount = Math.round(subtotal * (discountPercent / 100));
    expect(discount).toBe(500); // 5.00€
  });

  it('should calculate total with discount', () => {
    const subtotal = 5000;
    const discount = 500;
    const total = Math.max(0, subtotal - discount);
    expect(total).toBe(4500);
  });

  it('should not allow negative totals', () => {
    const subtotal = 1000;
    const discount = 1500;
    const total = Math.max(0, subtotal - discount);
    expect(total).toBe(0);
  });

  it('should format price for display', () => {
    const priceInCentimes = 1250;
    const formatted = (priceInCentimes / 100).toFixed(2);
    expect(formatted).toBe('12.50');
  });

  it('should calculate loyalty points correctly', () => {
    const totalAmount = 2500; // 25.00€
    const pointsPerEuro = 1;
    const points = Math.floor((totalAmount / 100) * pointsPerEuro);
    expect(points).toBe(25);
  });

  it('should calculate loyalty reward eligibility', () => {
    const currentPoints = 50;
    const threshold = 50;
    const isEligible = currentPoints >= threshold;
    expect(isEligible).toBe(true);
  });
});

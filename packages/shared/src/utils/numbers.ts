/**
 * Utility functions for safe number operations
 * Prevents NaN and Infinity values in analytics and calculations
 */

/**
 * Safely get a finite number, defaulting to provided value if invalid
 */
export function safeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Calculate percentage change between two periods
 * Returns 0 if comparison is not meaningful (previous is 0 or invalid)
 */
export function calculatePercentageChange(current: number, previous: number): number {
  const safeCurrent = safeNumber(current);
  const safePrevious = safeNumber(previous);

  if (safePrevious === 0) {
    return safeCurrent > 0 ? 100 : 0;
  }

  const change = ((safeCurrent - safePrevious) / safePrevious) * 100;
  return Number.isFinite(change) ? change : 0;
}

/**
 * Safe division avoiding NaN/Infinity
 */
export function safeDivide(numerator: number, denominator: number, defaultValue = 0): number {
  const safeNum = safeNumber(numerator);
  const safeDenom = safeNumber(denominator);

  if (safeDenom === 0) return defaultValue;

  const result = safeNum / safeDenom;
  return Number.isFinite(result) ? result : defaultValue;
}

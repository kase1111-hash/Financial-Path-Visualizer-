/**
 * Common Types
 *
 * Base type definitions used throughout the application.
 */

/**
 * Unique identifier for entities.
 */
export type ID = string;

/**
 * Currency values stored in cents to avoid floating point issues.
 * $100.00 = 10000 cents
 */
export type Cents = number;

/**
 * Percentage rates stored as decimals.
 * 7% = 0.07
 */
export type Rate = number;

/**
 * Month and year combination for dates that don't need day precision.
 */
export interface MonthYear {
  month: number; // 1-12
  year: number; // Full year (e.g., 2024)
}

/**
 * Generate a unique identifier.
 */
export function generateId(): ID {
  return crypto.randomUUID();
}

/**
 * Convert dollars to cents.
 */
export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars.
 */
export function centsToDollars(cents: Cents): number {
  return cents / 100;
}

/**
 * Convert a percentage (e.g., 7) to a rate (e.g., 0.07).
 */
export function percentToRate(percent: number): Rate {
  return percent / 100;
}

/**
 * Convert a rate (e.g., 0.07) to a percentage (e.g., 7).
 */
export function rateToPercent(rate: Rate): number {
  return rate * 100;
}

/**
 * Get the current month and year.
 */
export function getCurrentMonthYear(): MonthYear {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

/**
 * Compare two MonthYear values.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export function compareMonthYear(a: MonthYear, b: MonthYear): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  return a.month - b.month;
}

/**
 * Check if a MonthYear is in the past relative to another.
 */
export function isMonthYearBefore(date: MonthYear, reference: MonthYear): boolean {
  return compareMonthYear(date, reference) < 0;
}

/**
 * Check if a MonthYear is in the future relative to another.
 */
export function isMonthYearAfter(date: MonthYear, reference: MonthYear): boolean {
  return compareMonthYear(date, reference) > 0;
}

/**
 * Calculate months between two MonthYear values.
 */
export function monthsBetween(start: MonthYear, end: MonthYear): number {
  return (end.year - start.year) * 12 + (end.month - start.month);
}

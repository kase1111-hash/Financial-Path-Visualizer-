import { describe, it, expect } from 'vitest';
import {
  generateId,
  dollarsToCents,
  centsToDollars,
  percentToRate,
  rateToPercent,
  getCurrentMonthYear,
  compareMonthYear,
  isMonthYearBefore,
  isMonthYearAfter,
  monthsBetween,
} from '@models/common';

describe('common', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid UUID format', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('dollarsToCents', () => {
    it('should convert whole dollars', () => {
      expect(dollarsToCents(100)).toBe(10000);
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(0)).toBe(0);
    });

    it('should convert dollars with cents', () => {
      expect(dollarsToCents(100.50)).toBe(10050);
      expect(dollarsToCents(99.99)).toBe(9999);
    });

    it('should round to nearest cent', () => {
      expect(dollarsToCents(100.555)).toBe(10056);
      expect(dollarsToCents(100.554)).toBe(10055);
    });
  });

  describe('centsToDollars', () => {
    it('should convert cents to dollars', () => {
      expect(centsToDollars(10000)).toBe(100);
      expect(centsToDollars(10050)).toBe(100.5);
      expect(centsToDollars(0)).toBe(0);
    });
  });

  describe('percentToRate', () => {
    it('should convert percentage to rate', () => {
      expect(percentToRate(7)).toBe(0.07);
      expect(percentToRate(100)).toBe(1);
      expect(percentToRate(0)).toBe(0);
      expect(percentToRate(3.5)).toBe(0.035);
    });
  });

  describe('rateToPercent', () => {
    it('should convert rate to percentage', () => {
      expect(rateToPercent(0.07)).toBeCloseTo(7);
      expect(rateToPercent(1)).toBe(100);
      expect(rateToPercent(0)).toBe(0);
      expect(rateToPercent(0.035)).toBeCloseTo(3.5);
    });
  });

  describe('getCurrentMonthYear', () => {
    it('should return current month and year', () => {
      const result = getCurrentMonthYear();
      const now = new Date();
      expect(result.month).toBe(now.getMonth() + 1);
      expect(result.year).toBe(now.getFullYear());
    });
  });

  describe('compareMonthYear', () => {
    it('should return negative when first date is earlier', () => {
      expect(compareMonthYear({ month: 1, year: 2024 }, { month: 6, year: 2024 })).toBeLessThan(0);
      expect(compareMonthYear({ month: 12, year: 2023 }, { month: 1, year: 2024 })).toBeLessThan(0);
    });

    it('should return positive when first date is later', () => {
      expect(compareMonthYear({ month: 6, year: 2024 }, { month: 1, year: 2024 })).toBeGreaterThan(0);
      expect(compareMonthYear({ month: 1, year: 2025 }, { month: 12, year: 2024 })).toBeGreaterThan(0);
    });

    it('should return zero when dates are equal', () => {
      expect(compareMonthYear({ month: 6, year: 2024 }, { month: 6, year: 2024 })).toBe(0);
    });
  });

  describe('isMonthYearBefore', () => {
    it('should return true when date is before reference', () => {
      expect(isMonthYearBefore({ month: 1, year: 2024 }, { month: 6, year: 2024 })).toBe(true);
    });

    it('should return false when date is after or equal to reference', () => {
      expect(isMonthYearBefore({ month: 6, year: 2024 }, { month: 1, year: 2024 })).toBe(false);
      expect(isMonthYearBefore({ month: 6, year: 2024 }, { month: 6, year: 2024 })).toBe(false);
    });
  });

  describe('isMonthYearAfter', () => {
    it('should return true when date is after reference', () => {
      expect(isMonthYearAfter({ month: 6, year: 2024 }, { month: 1, year: 2024 })).toBe(true);
    });

    it('should return false when date is before or equal to reference', () => {
      expect(isMonthYearAfter({ month: 1, year: 2024 }, { month: 6, year: 2024 })).toBe(false);
      expect(isMonthYearAfter({ month: 6, year: 2024 }, { month: 6, year: 2024 })).toBe(false);
    });
  });

  describe('monthsBetween', () => {
    it('should calculate months between dates', () => {
      expect(monthsBetween({ month: 1, year: 2024 }, { month: 6, year: 2024 })).toBe(5);
      expect(monthsBetween({ month: 1, year: 2024 }, { month: 1, year: 2025 })).toBe(12);
      expect(monthsBetween({ month: 6, year: 2024 }, { month: 1, year: 2024 })).toBe(-5);
    });

    it('should return zero for same date', () => {
      expect(monthsBetween({ month: 6, year: 2024 }, { month: 6, year: 2024 })).toBe(0);
    });
  });
});

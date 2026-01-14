import { describe, it, expect } from 'vitest';
import {
  createEmptyComparisonSummary,
  createEmptyYearDelta,
  calculateYearDelta,
  formatRetirementDelta,
  formatCurrencyDelta,
  formatWorkHoursDelta,
  getMostSignificantChange,
} from '@models/comparison';
import { dollarsToCents } from '@models/common';

describe('comparison model', () => {
  describe('createEmptyComparisonSummary', () => {
    it('should create summary with zero values', () => {
      const summary = createEmptyComparisonSummary();

      expect(summary.retirementDateDelta).toBe(0);
      expect(summary.lifetimeInterestDelta).toBe(0);
      expect(summary.netWorthAtRetirementDelta).toBe(0);
      expect(summary.totalWorkHoursDelta).toBe(0);
      expect(summary.netWorthAtEndDelta).toBe(0);
      expect(summary.keyInsight).toBe('');
    });
  });

  describe('createEmptyYearDelta', () => {
    it('should create year delta with specified year and zero values', () => {
      const delta = createEmptyYearDelta(2024);

      expect(delta.year).toBe(2024);
      expect(delta.netWorthDelta).toBe(0);
      expect(delta.incomeDelta).toBe(0);
      expect(delta.debtDelta).toBe(0);
      expect(delta.assetsDelta).toBe(0);
      expect(delta.taxesDelta).toBe(0);
      expect(delta.savingsRateDelta).toBe(0);
    });
  });

  describe('calculateYearDelta', () => {
    it('should calculate differences between two trajectory years', () => {
      const baseline = {
        year: 2024,
        netWorth: dollarsToCents(100000),
        grossIncome: dollarsToCents(80000),
        totalDebt: dollarsToCents(50000),
        totalAssets: dollarsToCents(150000),
        taxFederal: dollarsToCents(12000),
        taxState: dollarsToCents(3000),
        taxFica: dollarsToCents(6000),
        savingsRate: 0.15,
      };

      const alternate = {
        netWorth: dollarsToCents(120000),
        grossIncome: dollarsToCents(90000),
        totalDebt: dollarsToCents(40000),
        totalAssets: dollarsToCents(160000),
        taxFederal: dollarsToCents(14000),
        taxState: dollarsToCents(3500),
        taxFica: dollarsToCents(6900),
        savingsRate: 0.20,
      };

      const delta = calculateYearDelta(baseline, alternate);

      expect(delta.year).toBe(2024);
      expect(delta.netWorthDelta).toBe(dollarsToCents(20000)); // 120k - 100k
      expect(delta.incomeDelta).toBe(dollarsToCents(10000)); // 90k - 80k
      expect(delta.debtDelta).toBe(dollarsToCents(-10000)); // 40k - 50k
      expect(delta.assetsDelta).toBe(dollarsToCents(10000)); // 160k - 150k
      expect(delta.savingsRateDelta).toBeCloseTo(0.05); // 0.20 - 0.15
    });

    it('should calculate tax delta correctly', () => {
      const baseline = {
        year: 2024,
        netWorth: 0,
        grossIncome: 0,
        totalDebt: 0,
        totalAssets: 0,
        taxFederal: dollarsToCents(10000),
        taxState: dollarsToCents(2000),
        taxFica: dollarsToCents(5000),
        savingsRate: 0,
      };

      const alternate = {
        netWorth: 0,
        grossIncome: 0,
        totalDebt: 0,
        totalAssets: 0,
        taxFederal: dollarsToCents(8000),
        taxState: dollarsToCents(1500),
        taxFica: dollarsToCents(5000),
        savingsRate: 0,
      };

      const delta = calculateYearDelta(baseline, alternate);

      // Baseline total tax: 17000, Alternate: 14500
      expect(delta.taxesDelta).toBe(dollarsToCents(-2500));
    });
  });

  describe('formatRetirementDelta', () => {
    it('should format zero delta', () => {
      expect(formatRetirementDelta(0)).toBe('Same retirement date');
    });

    it('should format months earlier', () => {
      expect(formatRetirementDelta(-6)).toBe('6 months earlier');
    });

    it('should format months later', () => {
      expect(formatRetirementDelta(9)).toBe('9 months later');
    });

    it('should format years earlier', () => {
      expect(formatRetirementDelta(-24)).toBe('2.0 years earlier');
    });

    it('should format years later', () => {
      expect(formatRetirementDelta(36)).toBe('3.0 years later');
    });
  });

  describe('formatCurrencyDelta', () => {
    it('should format positive small amounts', () => {
      expect(formatCurrencyDelta(dollarsToCents(500))).toBe('+$500');
    });

    it('should format negative small amounts', () => {
      expect(formatCurrencyDelta(dollarsToCents(-500))).toBe('-$500');
    });

    it('should format thousands', () => {
      expect(formatCurrencyDelta(dollarsToCents(5000))).toBe('+$5K');
    });

    it('should format millions', () => {
      expect(formatCurrencyDelta(dollarsToCents(1500000))).toBe('+$1.50M');
    });

    it('should format negative millions', () => {
      expect(formatCurrencyDelta(dollarsToCents(-2000000))).toBe('-$2.00M');
    });
  });

  describe('formatWorkHoursDelta', () => {
    it('should format zero delta', () => {
      expect(formatWorkHoursDelta(0)).toBe('Same work hours');
    });

    it('should format hours', () => {
      expect(formatWorkHoursDelta(-20)).toBe('20 hours fewer');
      expect(formatWorkHoursDelta(30)).toBe('30 hours more');
    });

    it('should format weeks', () => {
      expect(formatWorkHoursDelta(-200)).toBe('5 weeks fewer of work');
      expect(formatWorkHoursDelta(400)).toBe('10 weeks more of work');
    });

    it('should format years', () => {
      expect(formatWorkHoursDelta(-4160)).toBe('2.0 years fewer of work');
      expect(formatWorkHoursDelta(6240)).toBe('3.0 years more of work');
    });
  });

  describe('getMostSignificantChange', () => {
    it('should return minimal difference for empty summary', () => {
      const summary = createEmptyComparisonSummary();
      expect(getMostSignificantChange(summary)).toBe('Minimal difference between scenarios');
    });

    it('should identify retirement as most significant', () => {
      const summary = createEmptyComparisonSummary();
      summary.retirementDateDelta = -24; // 2 years earlier

      const result = getMostSignificantChange(summary);
      expect(result).toContain('2.0 years earlier');
    });

    it('should identify net worth as most significant when larger', () => {
      const summary = createEmptyComparisonSummary();
      summary.retirementDateDelta = -3; // small
      summary.netWorthAtEndDelta = dollarsToCents(500000); // large

      const result = getMostSignificantChange(summary);
      expect(result).toContain('net worth');
    });

    it('should identify work hours when significant', () => {
      const summary = createEmptyComparisonSummary();
      summary.totalWorkHoursDelta = -4160; // 2 years less

      const result = getMostSignificantChange(summary);
      expect(result).toContain('years');
      expect(result).toContain('fewer');
    });
  });
});

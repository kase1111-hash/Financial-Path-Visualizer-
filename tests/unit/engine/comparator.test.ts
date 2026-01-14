import { describe, it, expect } from 'vitest';
import {
  compareTrajectories,
  findMaxDivergenceYear,
  findCrossoverYear,
  calculateCumulativeImpact,
  getComparisonAtYear,
  findBreakEvenYear,
} from '@engine/comparator';
import type { Trajectory } from '@models/trajectory';
import type { YearDelta } from '@models/comparison';
import { dollarsToCents } from '@models/common';

// Helper to create a minimal trajectory year
function createTrajectoryYear(year: number, netWorth: number) {
  return {
    year,
    netWorth: dollarsToCents(netWorth),
    grossIncome: dollarsToCents(80000),
    totalDebt: dollarsToCents(50000),
    totalAssets: dollarsToCents(netWorth + 50000),
    taxFederal: dollarsToCents(12000),
    taxState: dollarsToCents(3000),
    taxFica: dollarsToCents(6000),
    savingsRate: 0.15,
    totalObligations: dollarsToCents(20000),
    assets: [],
    debts: [],
    income: [],
    workHours: 2080,
  };
}

// Helper to create a minimal trajectory
function createTrajectory(years: Array<{ year: number; netWorth: number }>): Trajectory {
  return {
    profileId: 'test-profile',
    years: years.map((y) => createTrajectoryYear(y.year, y.netWorth)),
    summary: {
      retirementYear: 2050,
      totalLifetimeInterest: dollarsToCents(100000),
      netWorthAtRetirement: dollarsToCents(1000000),
      totalLifetimeWorkHours: 50000,
      netWorthAtEnd: dollarsToCents(2000000),
      fiDate: null,
      coastFiDate: null,
    },
    generatedAt: new Date(),
  };
}

describe('comparator', () => {
  describe('compareTrajectories', () => {
    it('should create comparison with deltas', () => {
      const baseline = createTrajectory([
        { year: 2024, netWorth: 100000 },
        { year: 2025, netWorth: 120000 },
        { year: 2026, netWorth: 145000 },
      ]);

      const alternate = createTrajectory([
        { year: 2024, netWorth: 100000 },
        { year: 2025, netWorth: 130000 },
        { year: 2026, netWorth: 165000 },
      ]);

      const comparison = compareTrajectories(baseline, alternate, [], 'Test Comparison');

      expect(comparison.name).toBe('Test Comparison');
      expect(comparison.deltas).toHaveLength(3);
      expect(comparison.deltas[0]?.netWorthDelta).toBe(0); // Same starting point
      expect(comparison.deltas[1]?.netWorthDelta).toBe(dollarsToCents(10000)); // 130k - 120k
      expect(comparison.deltas[2]?.netWorthDelta).toBe(dollarsToCents(20000)); // 165k - 145k
    });

    it('should generate summary with key metrics', () => {
      const baseline = createTrajectory([
        { year: 2024, netWorth: 100000 },
      ]);

      const alternate = createTrajectory([
        { year: 2024, netWorth: 120000 },
      ]);
      alternate.summary.retirementYear = 2048; // 2 years earlier
      alternate.summary.totalLifetimeInterest = dollarsToCents(80000); // 20k less
      alternate.summary.netWorthAtEnd = dollarsToCents(2200000); // 200k more

      const comparison = compareTrajectories(baseline, alternate, []);

      expect(comparison.summary.retirementDateDelta).toBeLessThan(0); // Earlier
      expect(comparison.summary.lifetimeInterestDelta).toBeLessThan(0); // Saved interest
      expect(comparison.summary.netWorthAtEndDelta).toBeGreaterThan(0); // More wealth
    });

    it('should preserve changes array', () => {
      const baseline = createTrajectory([{ year: 2024, netWorth: 100000 }]);
      const alternate = createTrajectory([{ year: 2024, netWorth: 100000 }]);
      const changes = [
        { field: 'income[0].amount', originalValue: 80000, newValue: 90000, description: 'Increased salary' },
      ];

      const comparison = compareTrajectories(baseline, alternate, changes);

      expect(comparison.changes).toHaveLength(1);
      expect(comparison.changes[0]?.description).toBe('Increased salary');
    });
  });

  describe('findMaxDivergenceYear', () => {
    it('should find year with largest net worth difference', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(1000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(3000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      const maxYear = findMaxDivergenceYear(deltas);

      expect(maxYear?.year).toBe(2025);
      expect(maxYear?.netWorthDelta).toBe(dollarsToCents(5000));
    });

    it('should consider absolute value for negative deltas', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(-10000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      const maxYear = findMaxDivergenceYear(deltas);

      expect(maxYear?.year).toBe(2024); // -10000 has larger absolute value than 5000
    });

    it('should return null for empty array', () => {
      expect(findMaxDivergenceYear([])).toBeNull();
    });
  });

  describe('findCrossoverYear', () => {
    it('should find year where alternate becomes better', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(-5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(-2000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(3000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      expect(findCrossoverYear(deltas)).toBe(2026);
    });

    it('should find year where alternate becomes worse', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(2000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(-1000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      expect(findCrossoverYear(deltas)).toBe(2026);
    });

    it('should return null if no crossover', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(1000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(2000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(3000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      expect(findCrossoverYear(deltas)).toBeNull();
    });
  });

  describe('calculateCumulativeImpact', () => {
    it('should calculate cumulative impact over range', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(5000), incomeDelta: dollarsToCents(1000), debtDelta: 0, assetsDelta: 0, taxesDelta: dollarsToCents(-500), savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(10000), incomeDelta: dollarsToCents(1000), debtDelta: 0, assetsDelta: 0, taxesDelta: dollarsToCents(-500), savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(15000), incomeDelta: dollarsToCents(1000), debtDelta: 0, assetsDelta: 0, taxesDelta: dollarsToCents(-500), savingsRateDelta: 0 },
      ];

      const impact = calculateCumulativeImpact(deltas, 2024, 2026);

      expect(impact.totalNetWorthDelta).toBe(dollarsToCents(15000)); // Final delta, not sum
      expect(impact.totalIncomeDelta).toBe(dollarsToCents(3000)); // Sum of income deltas
      expect(impact.totalTaxesDelta).toBe(dollarsToCents(-1500)); // Sum of tax deltas
      expect(impact.averageYearlyBenefit).toBe(dollarsToCents(5000)); // 15000 / 3
    });

    it('should filter by year range', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(5000), incomeDelta: dollarsToCents(1000), debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(10000), incomeDelta: dollarsToCents(2000), debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(15000), incomeDelta: dollarsToCents(3000), debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      const impact = calculateCumulativeImpact(deltas, 2025, 2026);

      expect(impact.totalNetWorthDelta).toBe(dollarsToCents(15000));
      expect(impact.totalIncomeDelta).toBe(dollarsToCents(5000)); // 2000 + 3000
    });

    it('should return zeros for no matching years', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      const impact = calculateCumulativeImpact(deltas, 2030, 2035);

      expect(impact.totalNetWorthDelta).toBe(0);
      expect(impact.totalIncomeDelta).toBe(0);
      expect(impact.averageYearlyBenefit).toBe(0);
    });
  });

  describe('getComparisonAtYear', () => {
    it('should return data for specific year', () => {
      const baseline = createTrajectory([
        { year: 2024, netWorth: 100000 },
        { year: 2025, netWorth: 120000 },
      ]);

      const alternate = createTrajectory([
        { year: 2024, netWorth: 100000 },
        { year: 2025, netWorth: 130000 },
      ]);

      const comparison = compareTrajectories(baseline, alternate, []);
      const yearData = getComparisonAtYear(comparison, 2025);

      expect(yearData.baselineYear?.netWorth).toBe(dollarsToCents(120000));
      expect(yearData.alternateYear?.netWorth).toBe(dollarsToCents(130000));
      expect(yearData.delta?.netWorthDelta).toBe(dollarsToCents(10000));
    });

    it('should return undefined for non-existent year', () => {
      const baseline = createTrajectory([{ year: 2024, netWorth: 100000 }]);
      const alternate = createTrajectory([{ year: 2024, netWorth: 100000 }]);

      const comparison = compareTrajectories(baseline, alternate, []);
      const yearData = getComparisonAtYear(comparison, 2030);

      expect(yearData.baselineYear).toBeUndefined();
      expect(yearData.alternateYear).toBeUndefined();
      expect(yearData.delta).toBeUndefined();
    });
  });

  describe('findBreakEvenYear', () => {
    it('should find year where cumulative benefit becomes positive', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(-5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(-3000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(2000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2027, netWorthDelta: dollarsToCents(8000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];
      // Cumulative: -5000, -8000, -6000, +2000

      expect(findBreakEvenYear(deltas)).toBe(2027);
    });

    it('should return null if never breaks even', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(-5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2025, netWorthDelta: dollarsToCents(-3000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
        { year: 2026, netWorthDelta: dollarsToCents(-1000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      expect(findBreakEvenYear(deltas)).toBeNull();
    });

    it('should return first year if immediately positive', () => {
      const deltas: YearDelta[] = [
        { year: 2024, netWorthDelta: dollarsToCents(5000), incomeDelta: 0, debtDelta: 0, assetsDelta: 0, taxesDelta: 0, savingsRateDelta: 0 },
      ];

      expect(findBreakEvenYear(deltas)).toBe(2024);
    });
  });
});

/**
 * Comparison Model
 *
 * Types for comparing financial trajectories (what-if scenarios).
 */

import { Cents, ID } from './common';
import { Trajectory } from './trajectory';

/**
 * A change made between baseline and alternate scenario.
 */
export interface Change {
  /**
   * Field path that was changed (e.g., "income[0].amount").
   */
  field: string;
  /**
   * Original value.
   */
  originalValue: unknown;
  /**
   * New value.
   */
  newValue: unknown;
  /**
   * Human-readable description of the change.
   */
  description: string;
}

/**
 * Year-by-year difference between two trajectories.
 */
export interface YearDelta {
  year: number;
  netWorthDelta: Cents;
  incomeDelta: Cents;
  debtDelta: Cents;
  assetsDelta: Cents;
  taxesDelta: Cents;
  savingsRateDelta: number;
}

/**
 * Summary of key differences between trajectories.
 */
export interface ComparisonSummary {
  /**
   * Difference in retirement date (months, negative = earlier).
   */
  retirementDateDelta: number;
  /**
   * Difference in total lifetime interest paid.
   */
  lifetimeInterestDelta: Cents;
  /**
   * Difference in net worth at retirement.
   */
  netWorthAtRetirementDelta: Cents;
  /**
   * Difference in total lifetime work hours.
   */
  totalWorkHoursDelta: number;
  /**
   * Difference in net worth at end of projection.
   */
  netWorthAtEndDelta: Cents;
  /**
   * One-sentence summary of the key trade-off.
   */
  keyInsight: string;
}

/**
 * Complete comparison between two trajectories.
 */
export interface Comparison {
  id: ID;
  /**
   * Name for this comparison.
   */
  name: string;
  /**
   * The original trajectory.
   */
  baseline: Trajectory;
  /**
   * The modified trajectory.
   */
  alternate: Trajectory;
  /**
   * What was changed between baseline and alternate.
   */
  changes: Change[];
  /**
   * Year-by-year differences.
   */
  deltas: YearDelta[];
  /**
   * Summary of key differences.
   */
  summary: ComparisonSummary;
  /**
   * When this comparison was created.
   */
  createdAt: Date;
}

/**
 * Create an empty comparison summary.
 */
export function createEmptyComparisonSummary(): ComparisonSummary {
  return {
    retirementDateDelta: 0,
    lifetimeInterestDelta: 0,
    netWorthAtRetirementDelta: 0,
    totalWorkHoursDelta: 0,
    netWorthAtEndDelta: 0,
    keyInsight: '',
  };
}

/**
 * Create an empty year delta.
 */
export function createEmptyYearDelta(year: number): YearDelta {
  return {
    year,
    netWorthDelta: 0,
    incomeDelta: 0,
    debtDelta: 0,
    assetsDelta: 0,
    taxesDelta: 0,
    savingsRateDelta: 0,
  };
}

/**
 * Calculate delta between two trajectory years.
 */
export function calculateYearDelta(
  baselineYear: { year: number; netWorth: Cents; grossIncome: Cents; totalDebt: Cents; totalAssets: Cents; taxFederal: Cents; taxState: Cents; taxFica: Cents; savingsRate: number },
  alternateYear: { netWorth: Cents; grossIncome: Cents; totalDebt: Cents; totalAssets: Cents; taxFederal: Cents; taxState: Cents; taxFica: Cents; savingsRate: number }
): YearDelta {
  const totalTaxesBaseline = baselineYear.taxFederal + baselineYear.taxState + baselineYear.taxFica;
  const totalTaxesAlternate = alternateYear.taxFederal + alternateYear.taxState + alternateYear.taxFica;

  return {
    year: baselineYear.year,
    netWorthDelta: alternateYear.netWorth - baselineYear.netWorth,
    incomeDelta: alternateYear.grossIncome - baselineYear.grossIncome,
    debtDelta: alternateYear.totalDebt - baselineYear.totalDebt,
    assetsDelta: alternateYear.totalAssets - baselineYear.totalAssets,
    taxesDelta: totalTaxesAlternate - totalTaxesBaseline,
    savingsRateDelta: alternateYear.savingsRate - baselineYear.savingsRate,
  };
}

/**
 * Format retirement date delta for display.
 */
export function formatRetirementDelta(monthsDelta: number): string {
  if (monthsDelta === 0) return 'Same retirement date';

  const years = Math.abs(monthsDelta) / 12;
  const direction = monthsDelta < 0 ? 'earlier' : 'later';

  if (years < 1) {
    return `${Math.abs(monthsDelta)} months ${direction}`;
  }

  return `${years.toFixed(1)} years ${direction}`;
}

/**
 * Format currency delta for display.
 */
export function formatCurrencyDelta(cents: Cents): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents >= 0 ? '+' : '-';

  if (dollars >= 1000000) {
    return `${sign}$${(dollars / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    return `${sign}$${(dollars / 1000).toFixed(0)}K`;
  }
  return `${sign}$${dollars.toFixed(0)}`;
}

/**
 * Format work hours delta for display.
 */
export function formatWorkHoursDelta(hoursDelta: number): string {
  if (hoursDelta === 0) return 'Same work hours';

  const direction = hoursDelta < 0 ? 'fewer' : 'more';
  const absHours = Math.abs(hoursDelta);

  // Convert to work weeks (40 hours)
  if (absHours >= 2000) {
    const years = absHours / 2080; // Standard work year
    return `${years.toFixed(1)} years ${direction} of work`;
  }

  if (absHours >= 40) {
    const weeks = absHours / 40;
    return `${weeks.toFixed(0)} weeks ${direction} of work`;
  }

  return `${absHours.toFixed(0)} hours ${direction}`;
}

/**
 * Determine the most significant change in a comparison.
 */
export function getMostSignificantChange(summary: ComparisonSummary): string {
  const changes: Array<{ key: string; magnitude: number; description: string }> = [];

  if (summary.retirementDateDelta !== 0) {
    changes.push({
      key: 'retirement',
      magnitude: Math.abs(summary.retirementDateDelta),
      description: formatRetirementDelta(summary.retirementDateDelta),
    });
  }

  if (summary.netWorthAtEndDelta !== 0) {
    changes.push({
      key: 'netWorth',
      magnitude: Math.abs(summary.netWorthAtEndDelta) / 100000, // Scale for comparison
      description: `${formatCurrencyDelta(summary.netWorthAtEndDelta)} net worth`,
    });
  }

  if (summary.totalWorkHoursDelta !== 0) {
    changes.push({
      key: 'workHours',
      magnitude: Math.abs(summary.totalWorkHoursDelta) / 100,
      description: formatWorkHoursDelta(summary.totalWorkHoursDelta),
    });
  }

  if (changes.length === 0) return 'Minimal difference between scenarios';

  // Sort by magnitude and return the most significant
  changes.sort((a, b) => b.magnitude - a.magnitude);
  return changes[0]?.description ?? 'Minimal difference';
}

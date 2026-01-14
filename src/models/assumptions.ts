/**
 * Assumptions Model
 *
 * System-wide assumptions that affect financial projections.
 */

import { Rate } from './common';

/**
 * Tax filing status options.
 */
export type FilingStatus =
  | 'single'
  | 'married_joint'
  | 'married_separate'
  | 'head_of_household';

/**
 * System assumptions for projections.
 */
export interface Assumptions {
  /**
   * Annual inflation rate (default 3% = 0.03).
   */
  inflationRate: Rate;
  /**
   * Expected market return for investments (default 7% = 0.07).
   * This is nominal return, not inflation-adjusted.
   */
  marketReturn: Rate;
  /**
   * Expected home appreciation rate (default 3% = 0.03).
   */
  homeAppreciation: Rate;
  /**
   * Default salary growth rate (default 2% = 0.02).
   * Used when income doesn't specify its own growth rate.
   */
  salaryGrowth: Rate;
  /**
   * Safe withdrawal rate for retirement (default 4% = 0.04).
   */
  retirementWithdrawalRate: Rate;
  /**
   * Life expectancy for projection endpoint (default 85).
   */
  lifeExpectancy: number;
  /**
   * User's current age.
   */
  currentAge: number;
  /**
   * Tax filing status.
   */
  taxFilingStatus: FilingStatus;
  /**
   * State for tax calculations (two-letter code).
   */
  state: string;
}

/**
 * Default assumptions.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflationRate: 0.03,
  marketReturn: 0.07,
  homeAppreciation: 0.03,
  salaryGrowth: 0.02,
  retirementWithdrawalRate: 0.04,
  lifeExpectancy: 85,
  currentAge: 30,
  taxFilingStatus: 'single',
  state: 'CA',
};

/**
 * Create assumptions with defaults.
 */
export function createAssumptions(partial: Partial<Assumptions> = {}): Assumptions {
  return {
    ...DEFAULT_ASSUMPTIONS,
    ...partial,
  };
}

/**
 * Calculate years to project (from current age to life expectancy).
 */
export function calculateProjectionYears(assumptions: Assumptions): number {
  return Math.max(0, assumptions.lifeExpectancy - assumptions.currentAge);
}

/**
 * Calculate real (inflation-adjusted) return.
 */
export function calculateRealReturn(assumptions: Assumptions): Rate {
  // Real return ≈ nominal return - inflation
  // More precisely: (1 + nominal) / (1 + inflation) - 1
  return (1 + assumptions.marketReturn) / (1 + assumptions.inflationRate) - 1;
}

/**
 * Calculate future value adjusted for inflation.
 */
export function adjustForInflation(
  amount: number,
  years: number,
  inflationRate: Rate
): number {
  return amount / Math.pow(1 + inflationRate, years);
}

/**
 * Calculate required retirement nest egg for desired annual income.
 */
export function calculateRequiredNestEgg(
  annualIncome: number,
  withdrawalRate: Rate
): number {
  if (withdrawalRate === 0) return Infinity;
  return annualIncome / withdrawalRate;
}

/**
 * Calculate sustainable annual withdrawal from nest egg.
 */
export function calculateSafeWithdrawal(
  nestEgg: number,
  withdrawalRate: Rate
): number {
  return nestEgg * withdrawalRate;
}

/**
 * Get filing status display name.
 */
export function getFilingStatusDisplayName(status: FilingStatus): string {
  const names: Record<FilingStatus, string> = {
    single: 'Single',
    married_joint: 'Married Filing Jointly',
    married_separate: 'Married Filing Separately',
    head_of_household: 'Head of Household',
  };
  return names[status];
}

/**
 * List of all US states (two-letter codes).
 */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
] as const;

/**
 * States with no income tax.
 */
export const NO_INCOME_TAX_STATES = [
  'AK', 'FL', 'NV', 'SD', 'TX', 'WA', 'WY',
] as const;

/**
 * States with flat income tax (as of 2024).
 */
export const FLAT_TAX_STATES = [
  'CO', 'IL', 'IN', 'KY', 'MA', 'MI', 'NC', 'NH', 'PA', 'UT',
] as const;

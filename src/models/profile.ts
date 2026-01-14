/**
 * Profile Model
 *
 * The complete financial profile containing all user financial data.
 */

import { ID, generateId } from './common';
import { Income } from './income';
import { Debt } from './debt';
import { Obligation } from './obligation';
import { Asset } from './asset';
import { Goal } from './goal';
import { Assumptions, DEFAULT_ASSUMPTIONS } from './assumptions';

/**
 * Complete financial profile for a user.
 */
export interface FinancialProfile {
  id: ID;
  /**
   * User-defined name for this profile.
   */
  name: string;
  /**
   * When the profile was created.
   */
  createdAt: Date;
  /**
   * When the profile was last modified.
   */
  updatedAt: Date;
  /**
   * All income sources.
   */
  income: Income[];
  /**
   * All debts.
   */
  debts: Debt[];
  /**
   * All recurring obligations.
   */
  obligations: Obligation[];
  /**
   * All assets.
   */
  assets: Asset[];
  /**
   * Financial goals.
   */
  goals: Goal[];
  /**
   * Projection assumptions.
   */
  assumptions: Assumptions;
}

/**
 * Create a new financial profile with defaults.
 */
export function createProfile(partial: Partial<FinancialProfile> = {}): FinancialProfile {
  const now = new Date();
  return {
    id: generateId(),
    name: 'My Financial Plan',
    createdAt: now,
    updatedAt: now,
    income: [],
    debts: [],
    obligations: [],
    assets: [],
    goals: [],
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    ...partial,
  };
}

/**
 * Update a profile, setting the updatedAt timestamp.
 */
export function updateProfile(
  profile: FinancialProfile,
  updates: Partial<Omit<FinancialProfile, 'id' | 'createdAt' | 'updatedAt'>>
): FinancialProfile {
  return {
    ...profile,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * Clone a profile with a new ID.
 */
export function cloneProfile(
  profile: FinancialProfile,
  newName?: string
): FinancialProfile {
  const now = new Date();
  return {
    ...profile,
    id: generateId(),
    name: newName ?? `${profile.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculate total annual income from all sources.
 */
export function calculateTotalAnnualIncome(profile: FinancialProfile): number {
  return profile.income.reduce((sum, inc) => {
    if (inc.type === 'hourly') {
      return sum + inc.amount * inc.hoursPerWeek * 52;
    }
    return sum + inc.amount;
  }, 0);
}

/**
 * Calculate total debt balance.
 */
export function calculateTotalDebt(profile: FinancialProfile): number {
  return profile.debts.reduce((sum, debt) => sum + debt.principal, 0);
}

/**
 * Calculate total monthly debt payments.
 */
export function calculateTotalMonthlyDebtPayments(profile: FinancialProfile): number {
  return profile.debts.reduce((sum, debt) => sum + debt.actualPayment, 0);
}

/**
 * Calculate total asset balance from a profile.
 */
export function getProfileTotalAssets(profile: FinancialProfile): number {
  return profile.assets.reduce((sum, asset) => sum + asset.balance, 0);
}

/**
 * Calculate net worth (assets - debts).
 */
export function calculateNetWorth(profile: FinancialProfile): number {
  return getProfileTotalAssets(profile) - calculateTotalDebt(profile);
}

/**
 * Calculate total monthly obligations from a profile.
 */
export function getProfileMonthlyObligations(profile: FinancialProfile): number {
  return profile.obligations.reduce((sum, obl) => sum + obl.amount, 0);
}

/**
 * Calculate total monthly expenses (debts + obligations).
 */
export function getProfileMonthlyExpenses(profile: FinancialProfile): number {
  return calculateTotalMonthlyDebtPayments(profile) + getProfileMonthlyObligations(profile);
}

/**
 * Calculate total monthly asset contributions from a profile.
 */
export function getProfileMonthlyContributions(profile: FinancialProfile): number {
  return profile.assets.reduce((sum, asset) => sum + asset.monthlyContribution, 0);
}

/**
 * Calculate savings rate (contributions / net income).
 */
export function calculateSavingsRate(profile: FinancialProfile, monthlyNetIncome: number): number {
  if (monthlyNetIncome === 0) return 0;
  const monthlyContributions = getProfileMonthlyContributions(profile);
  return monthlyContributions / monthlyNetIncome;
}

/**
 * Check if profile has any income.
 */
export function hasIncome(profile: FinancialProfile): boolean {
  return profile.income.length > 0;
}

/**
 * Check if profile has any debts.
 */
export function hasDebts(profile: FinancialProfile): boolean {
  return profile.debts.length > 0;
}

/**
 * Check if profile has any assets.
 */
export function hasAssets(profile: FinancialProfile): boolean {
  return profile.assets.length > 0;
}

/**
 * Check if profile has sufficient data for projection.
 */
export function isProfileComplete(profile: FinancialProfile): boolean {
  return hasIncome(profile);
}

/**
 * Get profile summary statistics.
 */
export interface ProfileSummary {
  totalAnnualIncome: number;
  totalMonthlyIncome: number;
  totalDebt: number;
  totalAssets: number;
  netWorth: number;
  totalMonthlyExpenses: number;
  totalMonthlyContributions: number;
  incomeSourceCount: number;
  debtCount: number;
  assetCount: number;
  goalCount: number;
}

export function getProfileSummary(profile: FinancialProfile): ProfileSummary {
  const totalAnnualIncome = calculateTotalAnnualIncome(profile);
  return {
    totalAnnualIncome,
    totalMonthlyIncome: Math.round(totalAnnualIncome / 12),
    totalDebt: calculateTotalDebt(profile),
    totalAssets: getProfileTotalAssets(profile),
    netWorth: calculateNetWorth(profile),
    totalMonthlyExpenses: getProfileMonthlyExpenses(profile),
    totalMonthlyContributions: getProfileMonthlyContributions(profile),
    incomeSourceCount: profile.income.length,
    debtCount: profile.debts.length,
    assetCount: profile.assets.length,
    goalCount: profile.goals.length,
  };
}

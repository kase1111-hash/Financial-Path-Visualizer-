/**
 * Trajectory Model
 *
 * Types for financial projections over time.
 */

import { ID, Cents, Rate } from './common';

/**
 * State of a single debt in a given year.
 */
export interface DebtState {
  debtId: ID;
  /**
   * Remaining principal at end of year.
   */
  remainingPrincipal: Cents;
  /**
   * Interest paid during this year.
   */
  interestPaidThisYear: Cents;
  /**
   * Principal paid during this year.
   */
  principalPaidThisYear: Cents;
  /**
   * Whether debt was fully paid off.
   */
  isPaidOff: boolean;
  /**
   * Month in which debt was paid off (1-12), or null if not paid off this year.
   */
  payoffMonth: number | null;
}

/**
 * State of a single asset in a given year.
 */
export interface AssetState {
  assetId: ID;
  /**
   * Balance at end of year.
   */
  balance: Cents;
  /**
   * Total contributions during this year.
   */
  contributionsThisYear: Cents;
  /**
   * Growth from returns during this year.
   */
  growthThisYear: Cents;
  /**
   * Employer match received during this year.
   */
  employerMatchThisYear: Cents;
}

/**
 * Financial state for a single year in the trajectory.
 */
export interface TrajectoryYear {
  /**
   * Calendar year.
   */
  year: number;
  /**
   * User's age in this year.
   */
  age: number;

  // Income
  /**
   * Total gross income before taxes.
   */
  grossIncome: Cents;
  /**
   * Federal income tax.
   */
  taxFederal: Cents;
  /**
   * State income tax.
   */
  taxState: Cents;
  /**
   * FICA taxes (Social Security + Medicare).
   */
  taxFica: Cents;
  /**
   * Net income after all taxes.
   */
  netIncome: Cents;
  /**
   * Effective tax rate (total taxes / gross income).
   */
  effectiveTaxRate: Rate;

  // Work
  /**
   * Total hours worked during the year.
   */
  totalWorkHours: number;
  /**
   * Effective hourly rate (net income / hours worked).
   */
  effectiveHourlyRate: Cents;

  // Debts
  /**
   * State of each debt at end of year.
   */
  debts: DebtState[];
  /**
   * Total remaining debt at end of year.
   */
  totalDebt: Cents;
  /**
   * Total debt payments made during year.
   */
  totalDebtPayment: Cents;
  /**
   * Total interest paid during year.
   */
  totalInterestPaid: Cents;

  // Assets
  /**
   * State of each asset at end of year.
   */
  assets: AssetState[];
  /**
   * Total assets at end of year.
   */
  totalAssets: Cents;
  /**
   * Net worth at end of year (assets - debts).
   */
  netWorth: Cents;

  // Cash flow
  /**
   * Total obligations paid during year.
   */
  totalObligations: Cents;
  /**
   * Discretionary income after debts and obligations.
   */
  discretionaryIncome: Cents;
  /**
   * Savings rate (savings / net income).
   */
  savingsRate: Rate;

  // Housing (for mortgage holders)
  /**
   * Home equity (property value - mortgage balance).
   */
  homeEquity: Cents;
  /**
   * Loan-to-value ratio.
   */
  ltvRatio: Rate;
  /**
   * Whether PMI is being paid.
   */
  payingPmi: boolean;
}

/**
 * Types of milestones.
 */
export type MilestoneType =
  | 'debt_payoff'
  | 'goal_achieved'
  | 'goal_missed'
  | 'retirement_ready'
  | 'pmi_removed'
  | 'net_worth_milestone';

/**
 * A significant event in the trajectory.
 */
export interface Milestone {
  year: number;
  month: number;
  type: MilestoneType;
  description: string;
  /**
   * Related entity ID (goal ID, debt ID, etc.).
   */
  relatedId: ID | null;
}

/**
 * Summary statistics for the entire trajectory.
 */
export interface TrajectorySummary {
  /**
   * Total years in projection.
   */
  totalYears: number;
  /**
   * Year when retirement is possible (null if never).
   */
  retirementYear: number | null;
  /**
   * Age at retirement (null if never).
   */
  retirementAge: number | null;
  /**
   * Total lifetime gross income.
   */
  totalLifetimeIncome: Cents;
  /**
   * Total lifetime taxes paid.
   */
  totalLifetimeTaxes: Cents;
  /**
   * Total lifetime interest paid on debts.
   */
  totalLifetimeInterest: Cents;
  /**
   * Net worth at retirement (or end if no retirement).
   */
  netWorthAtRetirement: Cents;
  /**
   * Net worth at end of projection.
   */
  netWorthAtEnd: Cents;
  /**
   * Number of goals achieved.
   */
  goalsAchieved: number;
  /**
   * Number of goals missed.
   */
  goalsMissed: number;
  /**
   * Total lifetime work hours.
   */
  totalLifetimeWorkHours: number;
  /**
   * Average effective hourly rate over career.
   */
  averageEffectiveHourlyRate: Cents;
}

/**
 * Complete trajectory projection.
 */
export interface Trajectory {
  /**
   * ID of the profile this trajectory was generated from.
   */
  profileId: ID;
  /**
   * When this trajectory was generated.
   */
  generatedAt: Date;
  /**
   * Year-by-year projection data.
   */
  years: TrajectoryYear[];
  /**
   * Significant events in the trajectory.
   */
  milestones: Milestone[];
  /**
   * Summary statistics.
   */
  summary: TrajectorySummary;
}

/**
 * Create an empty trajectory year (for initialization).
 */
export function createEmptyTrajectoryYear(year: number, age: number): TrajectoryYear {
  return {
    year,
    age,
    grossIncome: 0,
    taxFederal: 0,
    taxState: 0,
    taxFica: 0,
    netIncome: 0,
    effectiveTaxRate: 0,
    totalWorkHours: 0,
    effectiveHourlyRate: 0,
    debts: [],
    totalDebt: 0,
    totalDebtPayment: 0,
    totalInterestPaid: 0,
    assets: [],
    totalAssets: 0,
    netWorth: 0,
    totalObligations: 0,
    discretionaryIncome: 0,
    savingsRate: 0,
    homeEquity: 0,
    ltvRatio: 0,
    payingPmi: false,
  };
}

/**
 * Create an empty trajectory summary.
 */
export function createEmptyTrajectorySummary(): TrajectorySummary {
  return {
    totalYears: 0,
    retirementYear: null,
    retirementAge: null,
    totalLifetimeIncome: 0,
    totalLifetimeTaxes: 0,
    totalLifetimeInterest: 0,
    netWorthAtRetirement: 0,
    netWorthAtEnd: 0,
    goalsAchieved: 0,
    goalsMissed: 0,
    totalLifetimeWorkHours: 0,
    averageEffectiveHourlyRate: 0,
  };
}

/**
 * Get a specific year from a trajectory.
 */
export function getTrajectoryYear(trajectory: Trajectory, year: number): TrajectoryYear | undefined {
  return trajectory.years.find((y) => y.year === year);
}

/**
 * Get milestones for a specific year.
 */
export function getMilestonesForYear(trajectory: Trajectory, year: number): Milestone[] {
  return trajectory.milestones.filter((m) => m.year === year);
}

/**
 * Get milestones by type.
 */
export function getMilestonesByType(trajectory: Trajectory, type: MilestoneType): Milestone[] {
  return trajectory.milestones.filter((m) => m.type === type);
}

/**
 * Find the year when net worth reaches a target.
 */
export function findNetWorthMilestoneYear(
  trajectory: Trajectory,
  targetNetWorth: Cents
): number | null {
  const year = trajectory.years.find((y) => y.netWorth >= targetNetWorth);
  return year?.year ?? null;
}

/**
 * Find the year when all debts are paid off.
 */
export function findDebtFreeYear(trajectory: Trajectory): number | null {
  const year = trajectory.years.find((y) => y.totalDebt === 0);
  return year?.year ?? null;
}

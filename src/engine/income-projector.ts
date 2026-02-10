/**
 * Income Projector
 *
 * Projects income over time with growth and end dates.
 */

import type { Cents, Rate, MonthYear } from '@models/common';
import type { Income } from '@models/income';
import { calculateAnnualIncome, isIncomeActive, calculateAnnualHours } from '@models/income';

/**
 * Result of projecting income for a single year.
 */
export interface IncomeProjection {
  /** ID of the income source */
  incomeId: string;
  /** Projected annual amount */
  amount: Cents;
  /** Hours worked during the year */
  hoursWorked: number;
  /** Whether this income is active for the full year */
  isActive: boolean;
  /** If partially active, the number of months active */
  monthsActive: number;
}

/**
 * Aggregate income projection for a year.
 */
export interface YearlyIncomeProjection {
  /** Calendar year */
  year: number;
  /** Total gross income */
  totalIncome: Cents;
  /** Total hours worked */
  totalHours: number;
  /** Individual income projections */
  incomes: IncomeProjection[];
  /** IDs of income sources that ended this year */
  endedThisYear: string[];
}

/**
 * Project a single income source to a future year.
 */
export function projectIncome(
  income: Income,
  targetYear: number,
  currentYear: number,
  defaultGrowthRate: Rate
): IncomeProjection {
  const yearsElapsed = targetYear - currentYear;
  const targetDate: MonthYear = { month: 12, year: targetYear };

  // Check if income is active
  const active = isIncomeActive(income, targetDate);

  if (!active) {
    return {
      incomeId: income.id,
      amount: 0,
      hoursWorked: 0,
      isActive: false,
      monthsActive: 0,
    };
  }

  // Calculate months active in the target year
  let monthsActive = 12;
  if (income.endDate !== null && income.endDate.year === targetYear) {
    monthsActive = income.endDate.month;
  }

  // Calculate base annual amount
  const baseAnnual = calculateAnnualIncome(income);

  // Apply growth
  const growthRate = income.expectedGrowth > 0 ? income.expectedGrowth : defaultGrowthRate;
  const growthMultiplier = yearsElapsed > 0 ? Math.pow(1 + growthRate, yearsElapsed) : 1;
  const projectedAnnual = Math.round(baseAnnual * growthMultiplier);

  // Prorate for partial year
  const amount = Math.round(projectedAnnual * (monthsActive / 12));

  // Calculate hours
  const annualHours = calculateAnnualHours(income);
  const hoursWorked = Math.round(annualHours * (monthsActive / 12));

  return {
    incomeId: income.id,
    amount,
    hoursWorked,
    isActive: true,
    monthsActive,
  };
}

/**
 * Project all income sources for a specific year.
 */
export function projectAllIncome(
  incomes: Income[],
  targetYear: number,
  currentYear: number,
  defaultGrowthRate: Rate
): YearlyIncomeProjection {
  const projections = incomes.map((income) =>
    projectIncome(income, targetYear, currentYear, defaultGrowthRate)
  );

  const endedThisYear = incomes
    .filter((inc) => inc.endDate !== null && inc.endDate.year === targetYear)
    .map((inc) => inc.id);

  return {
    year: targetYear,
    totalIncome: projections.reduce((sum, p) => sum + p.amount, 0),
    totalHours: projections.reduce((sum, p) => sum + p.hoursWorked, 0),
    incomes: projections,
    endedThisYear,
  };
}

/**
 * Project income over multiple years.
 */
export function projectIncomeOverYears(
  incomes: Income[],
  startYear: number,
  years: number,
  defaultGrowthRate: Rate
): YearlyIncomeProjection[] {
  const projections: YearlyIncomeProjection[] = [];

  for (let i = 0; i < years; i++) {
    const targetYear = startYear + i;
    projections.push(
      projectAllIncome(incomes, targetYear, startYear, defaultGrowthRate)
    );
  }

  return projections;
}

/**
 * Find the year when all income stops.
 */
export function findLastIncomeYear(
  incomes: Income[],
  startYear: number,
  defaultGrowthRate: Rate = 0.02,
  maxYears: number = 100
): number {
  for (let i = maxYears - 1; i >= 0; i--) {
    const year = startYear + i;
    const projection = projectAllIncome(incomes, year, startYear, defaultGrowthRate);
    if (projection.totalIncome > 0) {
      return year;
    }
  }
  return startYear;
}

/**
 * Calculate effective hourly rate for a year.
 */
export function calculateEffectiveHourlyRate(
  netIncome: Cents,
  hoursWorked: number
): Cents {
  if (hoursWorked === 0) return 0;
  return Math.round(netIncome / hoursWorked);
}

/**
 * Calculate lifetime income projection.
 */
export function calculateLifetimeIncome(
  incomes: Income[],
  startYear: number,
  years: number,
  defaultGrowthRate: Rate
): { totalIncome: Cents; totalHours: number; averageAnnual: Cents } {
  const projections = projectIncomeOverYears(incomes, startYear, years, defaultGrowthRate);

  const totalIncome = projections.reduce((sum, p) => sum + p.totalIncome, 0);
  const totalHours = projections.reduce((sum, p) => sum + p.totalHours, 0);
  const yearsWithIncome = projections.filter((p) => p.totalIncome > 0).length;
  const averageAnnual = yearsWithIncome > 0 ? Math.round(totalIncome / yearsWithIncome) : 0;

  return { totalIncome, totalHours, averageAnnual };
}

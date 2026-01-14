/**
 * Income Model
 *
 * Represents sources of income (salary, hourly, passive, etc.)
 */

import { ID, Cents, Rate, MonthYear, generateId } from './common';

/**
 * Types of income sources.
 */
export type IncomeType = 'salary' | 'hourly' | 'variable' | 'passive';

/**
 * An income source.
 */
export interface Income {
  id: ID;
  name: string;
  type: IncomeType;
  /**
   * Annual amount for salary/passive, hourly rate for hourly.
   * Stored in cents.
   */
  amount: Cents;
  /**
   * Hours worked per week. Used to calculate true hourly rate.
   */
  hoursPerWeek: number;
  /**
   * Variability factor (0-1) for variable income.
   * 0 = completely stable, 1 = highly variable
   */
  variability: Rate;
  /**
   * Expected annual growth rate.
   * 0.02 = 2% per year
   */
  expectedGrowth: Rate;
  /**
   * When this income stops (retirement, contract end, etc.)
   * null = no end date
   */
  endDate: MonthYear | null;
}

/**
 * Create a new income with default values.
 */
export function createIncome(partial: Partial<Income> = {}): Income {
  return {
    id: generateId(),
    name: 'Primary Income',
    type: 'salary',
    amount: 0,
    hoursPerWeek: 40,
    variability: 0,
    expectedGrowth: 0.02,
    endDate: null,
    ...partial,
  };
}

/**
 * Calculate annual income from an income source.
 * For hourly workers: hourlyRate * hoursPerWeek * 52 weeks
 */
export function calculateAnnualIncome(income: Income): Cents {
  if (income.type === 'hourly') {
    return Math.round(income.amount * income.hoursPerWeek * 52);
  }
  return income.amount;
}

/**
 * Calculate the effective hourly rate for any income type.
 * Net income divided by hours worked.
 */
export function calculateHourlyRate(income: Income): Cents {
  const annualIncome = calculateAnnualIncome(income);
  const annualHours = income.hoursPerWeek * 52;
  if (annualHours === 0) return 0;
  return Math.round(annualIncome / annualHours);
}

/**
 * Calculate annual hours worked.
 */
export function calculateAnnualHours(income: Income): number {
  return income.hoursPerWeek * 52;
}

/**
 * Check if income is active at a given date.
 */
export function isIncomeActive(income: Income, date: MonthYear): boolean {
  if (income.endDate === null) return true;
  return (
    date.year < income.endDate.year ||
    (date.year === income.endDate.year && date.month <= income.endDate.month)
  );
}

/**
 * Project income to a future year with growth.
 */
export function projectIncomeToYear(income: Income, currentYear: number, targetYear: number): Cents {
  const yearsElapsed = targetYear - currentYear;
  if (yearsElapsed <= 0) return calculateAnnualIncome(income);

  const growthMultiplier = Math.pow(1 + income.expectedGrowth, yearsElapsed);
  return Math.round(calculateAnnualIncome(income) * growthMultiplier);
}

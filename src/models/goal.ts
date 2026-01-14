/**
 * Goal Model
 *
 * Represents financial goals (retirement, purchases, savings targets, etc.)
 */

import { ID, Cents, MonthYear, generateId, compareMonthYear } from './common';

/**
 * Types of financial goals.
 */
export type GoalType =
  | 'purchase' // Major purchase (house, car, etc.)
  | 'retirement' // Retirement date
  | 'education' // Education funding
  | 'debt_free' // Pay off all/specific debt
  | 'savings_target' // Specific savings amount
  | 'emergency_fund' // Emergency fund target
  | 'other';

/**
 * Status of a goal.
 */
export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'missed';

/**
 * A financial goal.
 */
export interface Goal {
  id: ID;
  name: string;
  type: GoalType;
  /**
   * Target amount in cents (for purchases, savings targets).
   * null for date-based goals like retirement.
   */
  targetAmount: Cents | null;
  /**
   * Target date for achieving the goal.
   * null for amount-only goals.
   */
  targetDate: MonthYear | null;
  /**
   * Priority level (1-10, where 10 is highest priority).
   */
  priority: number;
  /**
   * Can this goal's date move if needed?
   */
  flexible: boolean;
}

/**
 * Create a new goal with default values.
 */
export function createGoal(partial: Partial<Goal> = {}): Goal {
  return {
    id: generateId(),
    name: '',
    type: 'savings_target',
    targetAmount: null,
    targetDate: null,
    priority: 5,
    flexible: true,
    ...partial,
  };
}

/**
 * Create a retirement goal.
 */
export function createRetirementGoal(targetDate: MonthYear, partial: Partial<Goal> = {}): Goal {
  return createGoal({
    name: 'Retirement',
    type: 'retirement',
    targetDate,
    priority: 10,
    flexible: true,
    ...partial,
  });
}

/**
 * Create an emergency fund goal.
 */
export function createEmergencyFundGoal(targetAmount: Cents, partial: Partial<Goal> = {}): Goal {
  return createGoal({
    name: 'Emergency Fund',
    type: 'emergency_fund',
    targetAmount,
    priority: 9,
    flexible: false,
    ...partial,
  });
}

/**
 * Create a debt-free goal.
 */
export function createDebtFreeGoal(partial: Partial<Goal> = {}): Goal {
  return createGoal({
    name: 'Become Debt Free',
    type: 'debt_free',
    priority: 8,
    flexible: true,
    ...partial,
  });
}

/**
 * Sort goals by priority (highest first).
 */
export function sortGoalsByPriority(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => b.priority - a.priority);
}

/**
 * Sort goals by target date (soonest first).
 */
export function sortGoalsByDate(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (a.targetDate === null && b.targetDate === null) return 0;
    if (a.targetDate === null) return 1;
    if (b.targetDate === null) return -1;
    return compareMonthYear(a.targetDate, b.targetDate);
  });
}

/**
 * Check if a goal has a specific target amount.
 */
export function hasTargetAmount(goal: Goal): boolean {
  return goal.targetAmount !== null && goal.targetAmount > 0;
}

/**
 * Check if a goal has a target date.
 */
export function hasTargetDate(goal: Goal): boolean {
  return goal.targetDate !== null;
}

/**
 * Calculate months until goal target date.
 */
export function monthsUntilGoal(goal: Goal, currentDate: MonthYear): number | null {
  if (goal.targetDate === null) return null;

  const monthsDiff =
    (goal.targetDate.year - currentDate.year) * 12 +
    (goal.targetDate.month - currentDate.month);

  return Math.max(0, monthsDiff);
}

/**
 * Calculate required monthly savings to reach goal.
 */
export function calculateRequiredMonthlySavings(
  goal: Goal,
  currentSavings: Cents,
  currentDate: MonthYear
): Cents | null {
  if (goal.targetAmount === null) return null;

  const remaining = goal.targetAmount - currentSavings;
  if (remaining <= 0) return 0;

  const months = monthsUntilGoal(goal, currentDate);
  if (months === null || months === 0) return remaining; // Need it all now

  return Math.ceil(remaining / months);
}

/**
 * Get display name for goal type.
 */
export function getGoalTypeDisplayName(type: GoalType): string {
  const names: Record<GoalType, string> = {
    purchase: 'Major Purchase',
    retirement: 'Retirement',
    education: 'Education',
    debt_free: 'Debt Free',
    savings_target: 'Savings Target',
    emergency_fund: 'Emergency Fund',
    other: 'Other',
  };
  return names[type];
}

/**
 * Get status display info.
 */
export function getGoalStatusInfo(status: GoalStatus): { label: string; color: string } {
  const info: Record<GoalStatus, { label: string; color: string }> = {
    on_track: { label: 'On Track', color: 'green' },
    at_risk: { label: 'At Risk', color: 'yellow' },
    behind: { label: 'Behind', color: 'orange' },
    achieved: { label: 'Achieved', color: 'blue' },
    missed: { label: 'Missed', color: 'red' },
  };
  return info[status];
}

/**
 * Impact Calculator
 *
 * Computes real lifetime impact of optimizations by comparing trajectories
 * or using compound growth formulas with the user's actual assumptions.
 */

import type { FinancialProfile } from '@models/profile';
import type { Trajectory } from '@models/trajectory';
import type { Cents, Rate } from '@models/common';
import { generateTrajectory } from '@engine/projector';

export interface OptimizationImpactResult {
  /** Net worth difference at end of projection (positive = better). */
  lifetimeChange: Cents;
  /** Retirement date change in months (negative = earlier retirement). */
  retirementDateChange: number;
}

/**
 * Calculate the real lifetime impact of a profile modification
 * by generating a modified trajectory and comparing it to the original.
 *
 * @param originalProfile - The user's current profile
 * @param originalTrajectory - The trajectory generated from the current profile
 * @param modifyProfile - A function that mutates the cloned profile to apply the optimization
 * @returns The difference in lifetime net worth and retirement timing
 */
export function calculateOptimizationImpact(
  originalProfile: FinancialProfile,
  originalTrajectory: Trajectory,
  modifyProfile: (profile: FinancialProfile) => void
): OptimizationImpactResult {
  const modifiedProfile = structuredClone(originalProfile);
  modifyProfile(modifiedProfile);

  const modifiedTrajectory = generateTrajectory(modifiedProfile);

  const lifetimeChange =
    modifiedTrajectory.summary.netWorthAtEnd - originalTrajectory.summary.netWorthAtEnd;

  let retirementDateChange = 0;
  const origRetirement = originalTrajectory.summary.retirementYear;
  const modRetirement = modifiedTrajectory.summary.retirementYear;

  if (origRetirement !== null && modRetirement !== null) {
    retirementDateChange = (modRetirement - origRetirement) * 12;
  } else if (origRetirement === null && modRetirement !== null) {
    // Optimization enabled retirement that wasn't possible before
    const projectionEnd =
      new Date().getFullYear() +
      (originalProfile.assumptions.lifeExpectancy - originalProfile.assumptions.currentAge);
    retirementDateChange = (modRetirement - projectionEnd) * 12;
  }

  return { lifetimeChange, retirementDateChange };
}

/**
 * Estimate the lifetime value of recurring annual savings using the
 * future value of annuity formula with the user's actual assumptions.
 *
 * Use this for advisory rules where a direct profile modification
 * isn't applicable (e.g., "your housing costs are too high").
 *
 * @param annualSavings - The annual amount saved by the optimization (in cents)
 * @param rate - The expected annual return rate
 * @param yearsRemaining - Number of years in the projection
 * @returns The compounded lifetime value (in cents)
 */
export function estimateLifetimeValue(
  annualSavings: Cents,
  rate: Rate,
  yearsRemaining: number
): Cents {
  if (yearsRemaining <= 0) return annualSavings;
  if (rate === 0) return annualSavings * yearsRemaining;
  return Math.round(annualSavings * ((Math.pow(1 + rate, yearsRemaining) - 1) / rate));
}

/**
 * Estimate the compounded future value of a one-time amount.
 *
 * @param amount - The one-time amount (in cents)
 * @param rate - The expected annual return rate
 * @param years - Number of years to compound
 * @returns The future value (in cents)
 */
export function estimateOneTimeImpact(
  amount: Cents,
  rate: Rate,
  years: number
): Cents {
  if (years <= 0) return amount;
  return Math.round(amount * Math.pow(1 + rate, years));
}

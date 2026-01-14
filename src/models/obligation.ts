/**
 * Obligation Model
 *
 * Represents recurring monthly obligations (bills, utilities, subscriptions, etc.)
 */

import { ID, Cents, generateId } from './common';

/**
 * Categories of obligations.
 */
export type ObligationCategory =
  | 'housing'
  | 'utilities'
  | 'transport'
  | 'food'
  | 'insurance'
  | 'subscription'
  | 'healthcare'
  | 'childcare'
  | 'other';

/**
 * Factors that an obligation might scale with.
 */
export type ScalingFactor = 'housing_size' | 'income' | 'inflation' | null;

/**
 * A recurring monthly obligation.
 */
export interface Obligation {
  id: ID;
  name: string;
  category: ObligationCategory;
  /**
   * Monthly cost in cents.
   */
  amount: Cents;
  /**
   * Is this a fixed cost or does it scale?
   */
  isFixed: boolean;
  /**
   * What factor this obligation scales with (if not fixed).
   */
  scalingFactor: ScalingFactor;
}

/**
 * Create a new obligation with default values.
 */
export function createObligation(partial: Partial<Obligation> = {}): Obligation {
  return {
    id: generateId(),
    name: '',
    category: 'other',
    amount: 0,
    isFixed: true,
    scalingFactor: null,
    ...partial,
  };
}

/**
 * Calculate annual cost of an obligation.
 */
export function calculateAnnualCost(obligation: Obligation): Cents {
  return obligation.amount * 12;
}

/**
 * Calculate total monthly obligations from a list.
 */
export function calculateTotalMonthlyObligations(obligations: Obligation[]): Cents {
  return obligations.reduce((sum, o) => sum + o.amount, 0);
}

/**
 * Calculate total annual obligations from a list.
 */
export function calculateTotalAnnualObligations(obligations: Obligation[]): Cents {
  return calculateTotalMonthlyObligations(obligations) * 12;
}

/**
 * Group obligations by category.
 */
export function groupObligationsByCategory(
  obligations: Obligation[]
): Map<ObligationCategory, Obligation[]> {
  const groups = new Map<ObligationCategory, Obligation[]>();

  for (const obligation of obligations) {
    const existing = groups.get(obligation.category) ?? [];
    existing.push(obligation);
    groups.set(obligation.category, existing);
  }

  return groups;
}

/**
 * Calculate total by category.
 */
export function calculateCategoryTotals(
  obligations: Obligation[]
): Map<ObligationCategory, Cents> {
  const totals = new Map<ObligationCategory, Cents>();

  for (const obligation of obligations) {
    const existing = totals.get(obligation.category) ?? 0;
    totals.set(obligation.category, existing + obligation.amount);
  }

  return totals;
}

/**
 * Get human-readable category name.
 */
export function getCategoryDisplayName(category: ObligationCategory): string {
  const names: Record<ObligationCategory, string> = {
    housing: 'Housing',
    utilities: 'Utilities',
    transport: 'Transportation',
    food: 'Food & Groceries',
    insurance: 'Insurance',
    subscription: 'Subscriptions',
    healthcare: 'Healthcare',
    childcare: 'Childcare',
    other: 'Other',
  };
  return names[category];
}

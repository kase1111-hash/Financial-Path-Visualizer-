/**
 * Debt Model
 *
 * Represents debts (mortgage, auto, student loans, credit cards, etc.)
 */

import { ID, Cents, Rate, generateId } from './common';

/**
 * Types of debt.
 */
export type DebtType = 'mortgage' | 'auto' | 'student' | 'credit' | 'personal' | 'other';

/**
 * A debt obligation.
 */
export interface Debt {
  id: ID;
  name: string;
  type: DebtType;
  /**
   * Current outstanding balance in cents.
   */
  principal: Cents;
  /**
   * Annual interest rate as decimal (0.065 = 6.5%)
   */
  interestRate: Rate;
  /**
   * Required minimum monthly payment in cents.
   */
  minimumPayment: Cents;
  /**
   * What user actually pays monthly in cents.
   * May be higher than minimum for accelerated payoff.
   */
  actualPayment: Cents;
  /**
   * Original loan term in months.
   */
  termMonths: number;
  /**
   * Months remaining on the loan.
   */
  monthsRemaining: number;

  // Mortgage-specific fields
  /**
   * Current estimated property value (for mortgages).
   */
  propertyValue: Cents | null;
  /**
   * LTV ratio at which PMI drops (typically 0.80 = 80%).
   */
  pmiThreshold: Rate | null;
  /**
   * Monthly PMI cost in cents.
   */
  pmiAmount: Cents | null;
  /**
   * Monthly property tax in escrow.
   */
  escrowTaxes: Cents | null;
  /**
   * Monthly insurance in escrow.
   */
  escrowInsurance: Cents | null;
}

/**
 * Create a new debt with default values.
 */
export function createDebt(partial: Partial<Debt> = {}): Debt {
  return {
    id: generateId(),
    name: '',
    type: 'other',
    principal: 0,
    interestRate: 0,
    minimumPayment: 0,
    actualPayment: 0,
    termMonths: 0,
    monthsRemaining: 0,
    propertyValue: null,
    pmiThreshold: null,
    pmiAmount: null,
    escrowTaxes: null,
    escrowInsurance: null,
    ...partial,
  };
}

/**
 * Create a mortgage debt with sensible defaults.
 */
export function createMortgage(partial: Partial<Debt> = {}): Debt {
  return createDebt({
    name: 'Mortgage',
    type: 'mortgage',
    pmiThreshold: 0.8,
    ...partial,
  });
}

/**
 * Calculate the loan-to-value ratio for a mortgage.
 */
export function calculateLTV(debt: Debt): Rate | null {
  if (debt.type !== 'mortgage' || debt.propertyValue === null || debt.propertyValue === 0) {
    return null;
  }
  return debt.principal / debt.propertyValue;
}

/**
 * Check if PMI should be paid based on current LTV.
 */
export function shouldPayPMI(debt: Debt): boolean {
  if (debt.type !== 'mortgage' || debt.pmiThreshold === null || debt.pmiAmount === null) {
    return false;
  }
  const ltv = calculateLTV(debt);
  if (ltv === null) return false;
  return ltv > debt.pmiThreshold;
}

/**
 * Calculate total monthly payment including escrow and PMI.
 */
export function calculateTotalMonthlyPayment(debt: Debt): Cents {
  let total = debt.actualPayment;

  if (debt.type === 'mortgage') {
    if (debt.escrowTaxes !== null) total += debt.escrowTaxes;
    if (debt.escrowInsurance !== null) total += debt.escrowInsurance;
    if (shouldPayPMI(debt) && debt.pmiAmount !== null) total += debt.pmiAmount;
  }

  return total;
}

/**
 * Calculate home equity for a mortgage.
 */
export function calculateHomeEquity(debt: Debt): Cents | null {
  if (debt.type !== 'mortgage' || debt.propertyValue === null) {
    return null;
  }
  return debt.propertyValue - debt.principal;
}

/**
 * Check if debt is high-interest (typically > 10%).
 */
export function isHighInterestDebt(debt: Debt): boolean {
  return debt.interestRate > 0.10;
}

/**
 * Validation error for a debt field.
 */
export interface DebtValidationError {
  field: keyof Debt;
  message: string;
}

/**
 * Validate a debt object for correctness.
 * Returns an array of validation errors (empty if valid).
 */
export function validateDebt(debt: Debt): DebtValidationError[] {
  const errors: DebtValidationError[] = [];

  if (debt.principal < 0) {
    errors.push({ field: 'principal', message: 'Principal cannot be negative' });
  }

  if (debt.interestRate < 0) {
    errors.push({ field: 'interestRate', message: 'Interest rate cannot be negative' });
  }

  if (debt.interestRate > 1) {
    errors.push({ field: 'interestRate', message: 'Interest rate should be a decimal (e.g., 0.065 for 6.5%)' });
  }

  if (debt.minimumPayment < 0) {
    errors.push({ field: 'minimumPayment', message: 'Minimum payment cannot be negative' });
  }

  if (debt.actualPayment < 0) {
    errors.push({ field: 'actualPayment', message: 'Actual payment cannot be negative' });
  }

  if (debt.termMonths < 0) {
    errors.push({ field: 'termMonths', message: 'Term months cannot be negative' });
  }

  if (debt.monthsRemaining < 0) {
    errors.push({ field: 'monthsRemaining', message: 'Months remaining cannot be negative' });
  }

  if (debt.type === 'mortgage') {
    if (debt.propertyValue !== null && debt.propertyValue < 0) {
      errors.push({ field: 'propertyValue', message: 'Property value cannot be negative' });
    }

    if (debt.pmiThreshold !== null && (debt.pmiThreshold < 0 || debt.pmiThreshold > 1)) {
      errors.push({ field: 'pmiThreshold', message: 'PMI threshold must be between 0 and 1' });
    }

    if (debt.pmiAmount !== null && debt.pmiAmount < 0) {
      errors.push({ field: 'pmiAmount', message: 'PMI amount cannot be negative' });
    }

    if (debt.escrowTaxes !== null && debt.escrowTaxes < 0) {
      errors.push({ field: 'escrowTaxes', message: 'Escrow taxes cannot be negative' });
    }

    if (debt.escrowInsurance !== null && debt.escrowInsurance < 0) {
      errors.push({ field: 'escrowInsurance', message: 'Escrow insurance cannot be negative' });
    }
  }

  return errors;
}

/**
 * Check if a debt is valid.
 */
export function isValidDebt(debt: Debt): boolean {
  return validateDebt(debt).length === 0;
}

/**
 * Calculate annual interest paid (approximate, assuming balance stays constant).
 * For precise calculations, use the amortization engine.
 */
export function estimateAnnualInterest(debt: Debt): Cents {
  return Math.round(debt.principal * debt.interestRate);
}

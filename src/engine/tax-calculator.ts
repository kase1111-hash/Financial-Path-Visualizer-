/**
 * Tax Calculator
 *
 * Calculates federal, state, and FICA taxes.
 */

import type { FilingStatus } from '@models/assumptions';
import type { Cents, Rate } from '@models/common';
import {
  FEDERAL_TAX_BRACKETS,
  STANDARD_DEDUCTION,
  FICA_RATES,
  getAdditionalMedicareThreshold,
} from '@data/federal-tax-brackets';
import { getStateTaxConfig } from '@data/state-taxes';

/**
 * Breakdown of all taxes.
 */
export interface TaxBreakdown {
  grossIncome: Cents;
  federalTax: Cents;
  stateTax: Cents;
  socialSecurityTax: Cents;
  medicareTax: Cents;
  totalFica: Cents;
  totalTax: Cents;
  netIncome: Cents;
  effectiveRate: Rate;
  marginalRate: Rate;
}

/**
 * Federal tax calculation result.
 */
export interface FederalTaxResult {
  tax: Cents;
  taxableIncome: Cents;
  effectiveRate: Rate;
  marginalRate: Rate;
}

/**
 * State tax calculation result.
 */
export interface StateTaxResult {
  tax: Cents;
  effectiveRate: Rate;
}

/**
 * FICA tax calculation result.
 */
export interface FicaResult {
  socialSecurity: Cents;
  medicare: Cents;
  total: Cents;
}

/**
 * Calculate federal income tax using progressive brackets.
 */
export function calculateFederalTax(
  grossIncome: Cents,
  filingStatus: FilingStatus,
  preRetirementContributions: Cents = 0
): FederalTaxResult {
  // Calculate taxable income
  const standardDeduction = STANDARD_DEDUCTION[filingStatus];
  const adjustedGross = Math.max(0, grossIncome - preRetirementContributions);
  const taxableIncome = Math.max(0, adjustedGross - standardDeduction);

  if (taxableIncome === 0) {
    return {
      tax: 0,
      taxableIncome: 0,
      effectiveRate: 0,
      marginalRate: 0.10,
    };
  }

  // Calculate tax using progressive brackets
  const brackets = FEDERAL_TAX_BRACKETS[filingStatus];
  let tax = 0;
  let marginalRate = 0.10;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;

    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += Math.round(taxableInBracket * bracket.rate);
    marginalRate = bracket.rate;
  }

  const effectiveRate = grossIncome > 0 ? tax / grossIncome : 0;

  return {
    tax,
    taxableIncome,
    effectiveRate,
    marginalRate,
  };
}

/**
 * Calculate state income tax.
 * Uses progressive brackets for states that have them, flat rate otherwise.
 */
export function calculateStateTax(
  grossIncome: Cents,
  state: string,
  preRetirementContributions: Cents = 0
): StateTaxResult {
  const config = getStateTaxConfig(state);

  if (!config || !config.hasIncomeTax) {
    return { tax: 0, effectiveRate: 0 };
  }

  const adjustedGross = Math.max(0, grossIncome - preRetirementContributions);
  const taxableIncome = Math.max(0, adjustedGross - config.standardDeduction);

  if (taxableIncome === 0) {
    return { tax: 0, effectiveRate: 0 };
  }

  let tax: Cents;

  if (config.type === 'progressive' && config.brackets !== null) {
    // Calculate using progressive brackets
    tax = 0;
    for (const bracket of config.brackets) {
      if (taxableIncome <= bracket.min) break;
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += Math.round(taxableInBracket * bracket.rate);
    }
  } else {
    // Flat rate
    tax = Math.round(taxableIncome * config.rate);
  }

  const effectiveRate = grossIncome > 0 ? tax / grossIncome : 0;

  return { tax, effectiveRate };
}

/**
 * Calculate FICA taxes (Social Security and Medicare).
 */
export function calculateFica(
  grossIncome: Cents,
  filingStatus: FilingStatus
): FicaResult {
  // Social Security tax (capped at wage base)
  const socialSecurityWages = Math.min(grossIncome, FICA_RATES.socialSecurityWageBase);
  const socialSecurity = Math.round(socialSecurityWages * FICA_RATES.socialSecurity);

  // Medicare tax (no cap, but additional tax for high earners)
  let medicare = Math.round(grossIncome * FICA_RATES.medicare);

  // Additional Medicare tax for high earners
  const additionalMedicareThreshold = getAdditionalMedicareThreshold(filingStatus);
  if (grossIncome > additionalMedicareThreshold) {
    const additionalWages = grossIncome - additionalMedicareThreshold;
    medicare += Math.round(additionalWages * FICA_RATES.additionalMedicare);
  }

  return {
    socialSecurity,
    medicare,
    total: socialSecurity + medicare,
  };
}

/**
 * Calculate all taxes and return complete breakdown.
 */
export function calculateTotalTax(
  grossIncome: Cents,
  filingStatus: FilingStatus,
  state: string,
  preRetirementContributions: Cents = 0
): TaxBreakdown {
  const federal = calculateFederalTax(grossIncome, filingStatus, preRetirementContributions);
  const stateTax = calculateStateTax(grossIncome, state, preRetirementContributions);
  const fica = calculateFica(grossIncome, filingStatus);

  const totalTax = federal.tax + stateTax.tax + fica.total;
  const netIncome = grossIncome - totalTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return {
    grossIncome,
    federalTax: federal.tax,
    stateTax: stateTax.tax,
    socialSecurityTax: fica.socialSecurity,
    medicareTax: fica.medicare,
    totalFica: fica.total,
    totalTax,
    netIncome,
    effectiveRate,
    marginalRate: federal.marginalRate,
  };
}

/**
 * Calculate tax savings from retirement contribution.
 */
export function calculateRetirementTaxSavings(
  grossIncome: Cents,
  contribution: Cents,
  filingStatus: FilingStatus,
  state: string
): Cents {
  const taxWithout = calculateTotalTax(grossIncome, filingStatus, state, 0);
  const taxWith = calculateTotalTax(grossIncome, filingStatus, state, contribution);
  return taxWithout.totalTax - taxWith.totalTax;
}

/**
 * Calculate optimal retirement contribution to stay in current bracket.
 */
export function calculateOptimalContribution(
  grossIncome: Cents,
  filingStatus: FilingStatus,
  currentContribution: Cents
): { optimalContribution: Cents; taxSavings: Cents } | null {
  const standardDeduction = STANDARD_DEDUCTION[filingStatus];
  const taxableIncome = Math.max(0, grossIncome - currentContribution - standardDeduction);

  // Find current bracket
  const brackets = FEDERAL_TAX_BRACKETS[filingStatus];
  const currentBracketIndex = brackets.findIndex(
    (b) => taxableIncome >= b.min && taxableIncome < b.max
  );

  if (currentBracketIndex <= 0) {
    return null; // Already in lowest bracket or no optimization possible
  }

  // Calculate amount to contribute to drop to previous bracket
  const currentBracket = brackets[currentBracketIndex];
  if (!currentBracket) return null;

  const amountAboveBracket = taxableIncome - currentBracket.min;
  const additionalContribution = amountAboveBracket;
  const optimalContribution = currentContribution + additionalContribution;

  // Calculate tax savings
  const previousBracket = brackets[currentBracketIndex - 1];
  if (!previousBracket) return null;

  const rateDifference = currentBracket.rate - previousBracket.rate;
  const taxSavings = Math.round(additionalContribution * rateDifference);

  return { optimalContribution, taxSavings };
}

/**
 * Estimate taxes for a future year (applies inflation adjustment to brackets).
 * This is a simplified projection - actual brackets may differ.
 */
export function estimateFutureTax(
  futureGrossIncome: Cents,
  yearsInFuture: number,
  inflationRate: Rate,
  filingStatus: FilingStatus,
  state: string,
  preRetirementContributions: Cents = 0
): TaxBreakdown {
  // For simplicity, we assume brackets inflate with inflation
  // In reality, IRS adjusts brackets annually which may differ
  // This is an approximation for long-term projections

  // Deflate future income to present-day dollars for bracket calculation
  const deflator = Math.pow(1 + inflationRate, yearsInFuture);
  const presentValueIncome = Math.round(futureGrossIncome / deflator);
  const presentValueContributions = Math.round(preRetirementContributions / deflator);

  // Calculate tax in present-day terms
  const presentTax = calculateTotalTax(
    presentValueIncome,
    filingStatus,
    state,
    presentValueContributions
  );

  // Scale tax back to future dollars
  return {
    ...presentTax,
    grossIncome: futureGrossIncome,
    federalTax: Math.round(presentTax.federalTax * deflator),
    stateTax: Math.round(presentTax.stateTax * deflator),
    socialSecurityTax: Math.round(presentTax.socialSecurityTax * deflator),
    medicareTax: Math.round(presentTax.medicareTax * deflator),
    totalFica: Math.round(presentTax.totalFica * deflator),
    totalTax: Math.round(presentTax.totalTax * deflator),
    netIncome: futureGrossIncome - Math.round(presentTax.totalTax * deflator),
  };
}

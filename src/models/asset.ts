/**
 * Asset Model
 *
 * Represents assets (retirement accounts, savings, investments, property, etc.)
 */

import { ID, Cents, Rate, generateId } from './common';

/**
 * Types of assets.
 */
export type AssetType =
  | 'retirement_pretax' // 401k, Traditional IRA
  | 'retirement_roth' // Roth 401k, Roth IRA
  | 'savings' // Savings account, CD, Money Market
  | 'investment' // Brokerage account
  | 'property' // Real estate (non-primary residence)
  | 'hsa' // Health Savings Account
  | 'other';

/**
 * An asset.
 */
export interface Asset {
  id: ID;
  name: string;
  type: AssetType;
  /**
   * Current balance in cents.
   */
  balance: Cents;
  /**
   * Monthly contribution in cents.
   */
  monthlyContribution: Cents;
  /**
   * Expected annual return rate (0.07 = 7%).
   */
  expectedReturn: Rate;
  /**
   * Employer match percentage (for retirement accounts).
   * 0.50 = 50% match
   */
  employerMatch: Rate | null;
  /**
   * Maximum salary percentage that employer matches.
   * 0.06 = matches up to 6% of salary
   */
  matchLimit: Rate | null;
}

/**
 * Create a new asset with default values.
 */
export function createAsset(partial: Partial<Asset> = {}): Asset {
  return {
    id: generateId(),
    name: '',
    type: 'savings',
    balance: 0,
    monthlyContribution: 0,
    expectedReturn: 0.05,
    employerMatch: null,
    matchLimit: null,
    ...partial,
  };
}

/**
 * Create a 401k with typical defaults.
 */
export function create401k(partial: Partial<Asset> = {}): Asset {
  return createAsset({
    name: '401(k)',
    type: 'retirement_pretax',
    expectedReturn: 0.07,
    employerMatch: 0.5, // 50% match
    matchLimit: 0.06, // up to 6% of salary
    ...partial,
  });
}

/**
 * Create a Roth IRA with typical defaults.
 */
export function createRothIRA(partial: Partial<Asset> = {}): Asset {
  return createAsset({
    name: 'Roth IRA',
    type: 'retirement_roth',
    expectedReturn: 0.07,
    ...partial,
  });
}

/**
 * Calculate annual contribution.
 */
export function calculateAnnualContribution(asset: Asset): Cents {
  return asset.monthlyContribution * 12;
}

/**
 * Calculate employer match for a given salary.
 */
export function calculateEmployerMatch(asset: Asset, annualSalary: Cents): Cents {
  if (asset.employerMatch === null || asset.matchLimit === null) {
    return 0;
  }

  const annualContribution = calculateAnnualContribution(asset);
  const maxMatchableContribution = Math.round(annualSalary * asset.matchLimit);
  const matchableAmount = Math.min(annualContribution, maxMatchableContribution);

  return Math.round(matchableAmount * asset.employerMatch);
}

/**
 * Calculate total annual contribution including employer match.
 */
export function calculateTotalAnnualContribution(asset: Asset, annualSalary: Cents): Cents {
  return calculateAnnualContribution(asset) + calculateEmployerMatch(asset, annualSalary);
}

/**
 * Check if asset is a retirement account.
 */
export function isRetirementAccount(asset: Asset): boolean {
  return asset.type === 'retirement_pretax' || asset.type === 'retirement_roth';
}

/**
 * Check if asset is tax-advantaged.
 */
export function isTaxAdvantaged(asset: Asset): boolean {
  return (
    asset.type === 'retirement_pretax' ||
    asset.type === 'retirement_roth' ||
    asset.type === 'hsa'
  );
}

/**
 * Calculate total assets from a list.
 */
export function calculateTotalAssets(assets: Asset[]): Cents {
  return assets.reduce((sum, a) => sum + a.balance, 0);
}

/**
 * Calculate total monthly contributions from a list.
 */
export function calculateTotalMonthlyContributions(assets: Asset[]): Cents {
  return assets.reduce((sum, a) => sum + a.monthlyContribution, 0);
}

/**
 * Project asset value after one year of growth and contributions.
 */
export function projectAssetOneYear(asset: Asset, annualSalary: Cents): Cents {
  const totalContribution = calculateTotalAnnualContribution(asset, annualSalary);
  // Simple approximation: apply return to starting balance + half of contributions
  const averageBalance = asset.balance + totalContribution / 2;
  const growth = Math.round(averageBalance * asset.expectedReturn);
  return asset.balance + totalContribution + growth;
}

/**
 * Validation error for an asset field.
 */
export interface AssetValidationError {
  field: keyof Asset;
  message: string;
}

/**
 * Validate an asset object for correctness.
 * Returns an array of validation errors (empty if valid).
 */
export function validateAsset(asset: Asset): AssetValidationError[] {
  const errors: AssetValidationError[] = [];

  if (asset.balance < 0) {
    errors.push({ field: 'balance', message: 'Balance cannot be negative' });
  }

  if (asset.monthlyContribution < 0) {
    errors.push({ field: 'monthlyContribution', message: 'Monthly contribution cannot be negative' });
  }

  if (asset.expectedReturn < -1) {
    errors.push({ field: 'expectedReturn', message: 'Expected return cannot be less than -100%' });
  }

  if (asset.expectedReturn > 1) {
    errors.push({ field: 'expectedReturn', message: 'Expected return should be a decimal (e.g., 0.07 for 7%)' });
  }

  if (asset.employerMatch !== null) {
    if (asset.employerMatch < 0) {
      errors.push({ field: 'employerMatch', message: 'Employer match cannot be negative' });
    }
    if (asset.employerMatch > 10) {
      errors.push({ field: 'employerMatch', message: 'Employer match seems too high (>1000%)' });
    }
  }

  if (asset.matchLimit !== null) {
    if (asset.matchLimit < 0) {
      errors.push({ field: 'matchLimit', message: 'Match limit cannot be negative' });
    }
    if (asset.matchLimit > 1) {
      errors.push({ field: 'matchLimit', message: 'Match limit should be a decimal (e.g., 0.06 for 6%)' });
    }
  }

  return errors;
}

/**
 * Check if an asset is valid.
 */
export function isValidAsset(asset: Asset): boolean {
  return validateAsset(asset).length === 0;
}

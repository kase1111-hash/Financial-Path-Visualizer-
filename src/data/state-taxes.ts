/**
 * State Tax Data (2024)
 *
 * State income tax rates and brackets.
 * Progressive states include full bracket data for accurate calculation.
 */

import type { Cents, Rate } from '@models/common';
import type { TaxBracket } from '@data/federal-tax-brackets';

/**
 * State tax configuration.
 */
export interface StateTaxConfig {
  /** State name */
  name: string;
  /** Whether the state has income tax */
  hasIncomeTax: boolean;
  /** Tax type: none, flat, or progressive */
  type: 'none' | 'flat' | 'progressive';
  /** Flat rate (for flat tax states) or top marginal rate (for progressive) */
  rate: Rate;
  /** Standard deduction (if applicable), in cents */
  standardDeduction: Cents;
  /** Tax brackets for progressive states (null for flat/none) */
  brackets: TaxBracket[] | null;
}

/**
 * State tax data by state code.
 * Progressive states include full bracket arrays for accurate calculation.
 * All bracket amounts are in cents (2024 single filer values).
 */
export const STATE_TAX_DATA: Record<string, StateTaxConfig> = {
  // No income tax states
  AK: { name: 'Alaska', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  FL: { name: 'Florida', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  NV: { name: 'Nevada', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  SD: { name: 'South Dakota', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  TX: { name: 'Texas', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  WA: { name: 'Washington', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  WY: { name: 'Wyoming', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  TN: { name: 'Tennessee', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },
  NH: { name: 'New Hampshire', hasIncomeTax: false, type: 'none', rate: 0, standardDeduction: 0, brackets: null },

  // Flat tax states
  CO: { name: 'Colorado', hasIncomeTax: true, type: 'flat', rate: 0.044, standardDeduction: 0, brackets: null },
  IL: { name: 'Illinois', hasIncomeTax: true, type: 'flat', rate: 0.0495, standardDeduction: 0, brackets: null },
  IN: { name: 'Indiana', hasIncomeTax: true, type: 'flat', rate: 0.0305, standardDeduction: 0, brackets: null },
  KY: { name: 'Kentucky', hasIncomeTax: true, type: 'flat', rate: 0.04, standardDeduction: 296000, brackets: null },
  MA: { name: 'Massachusetts', hasIncomeTax: true, type: 'flat', rate: 0.05, standardDeduction: 0, brackets: null },
  MI: { name: 'Michigan', hasIncomeTax: true, type: 'flat', rate: 0.0425, standardDeduction: 0, brackets: null },
  NC: { name: 'North Carolina', hasIncomeTax: true, type: 'flat', rate: 0.0525, standardDeduction: 1275000, brackets: null },
  PA: { name: 'Pennsylvania', hasIncomeTax: true, type: 'flat', rate: 0.0307, standardDeduction: 0, brackets: null },
  UT: { name: 'Utah', hasIncomeTax: true, type: 'flat', rate: 0.0465, standardDeduction: 0, brackets: null },

  // Progressive tax states with full bracket data (2024 single filer)
  AL: { name: 'Alabama', hasIncomeTax: true, type: 'progressive', rate: 0.05, standardDeduction: 300000, brackets: [
    { min: 0, max: 50000, rate: 0.02 },
    { min: 50000, max: 300000, rate: 0.04 },
    { min: 300000, max: Infinity, rate: 0.05 },
  ]},
  AZ: { name: 'Arizona', hasIncomeTax: true, type: 'progressive', rate: 0.025, standardDeduction: 1413600, brackets: [
    { min: 0, max: Infinity, rate: 0.025 },
  ]},
  AR: { name: 'Arkansas', hasIncomeTax: true, type: 'progressive', rate: 0.044, standardDeduction: 246000, brackets: [
    { min: 0, max: 490200, rate: 0.02 },
    { min: 490200, max: 980300, rate: 0.04 },
    { min: 980300, max: Infinity, rate: 0.044 },
  ]},
  CA: { name: 'California', hasIncomeTax: true, type: 'progressive', rate: 0.133, standardDeduction: 545600, brackets: [
    { min: 0, max: 1010200, rate: 0.01 },
    { min: 1010200, max: 2396800, rate: 0.02 },
    { min: 2396800, max: 3783300, rate: 0.04 },
    { min: 3783300, max: 5247900, rate: 0.06 },
    { min: 5247900, max: 6636200, rate: 0.08 },
    { min: 6636200, max: 33878200, rate: 0.093 },
    { min: 33878200, max: 40653900, rate: 0.103 },
    { min: 40653900, max: 67756400, rate: 0.113 },
    { min: 67756400, max: 100000000, rate: 0.123 },
    { min: 100000000, max: Infinity, rate: 0.133 },
  ]},
  CT: { name: 'Connecticut', hasIncomeTax: true, type: 'progressive', rate: 0.0699, standardDeduction: 0, brackets: [
    { min: 0, max: 1000000, rate: 0.03 },
    { min: 1000000, max: 500000, rate: 0.05 },
    { min: 500000, max: 1000000, rate: 0.055 },
    { min: 1000000, max: 25000000, rate: 0.06 },
    { min: 25000000, max: 50000000, rate: 0.065 },
    { min: 50000000, max: Infinity, rate: 0.0699 },
  ]},
  DE: { name: 'Delaware', hasIncomeTax: true, type: 'progressive', rate: 0.066, standardDeduction: 330000, brackets: [
    { min: 0, max: 200000, rate: 0.022 },
    { min: 200000, max: 500000, rate: 0.039 },
    { min: 500000, max: 1000000, rate: 0.048 },
    { min: 1000000, max: 2500000, rate: 0.052 },
    { min: 2500000, max: 6000000, rate: 0.0555 },
    { min: 6000000, max: Infinity, rate: 0.066 },
  ]},
  DC: { name: 'District of Columbia', hasIncomeTax: true, type: 'progressive', rate: 0.1075, standardDeduction: 0, brackets: [
    { min: 0, max: 1000000, rate: 0.04 },
    { min: 1000000, max: 4000000, rate: 0.06 },
    { min: 4000000, max: 6000000, rate: 0.065 },
    { min: 6000000, max: 35000000, rate: 0.085 },
    { min: 35000000, max: 100000000, rate: 0.0925 },
    { min: 100000000, max: Infinity, rate: 0.1075 },
  ]},
  GA: { name: 'Georgia', hasIncomeTax: true, type: 'progressive', rate: 0.0549, standardDeduction: 1240000, brackets: [
    { min: 0, max: 75000, rate: 0.01 },
    { min: 75000, max: 225000, rate: 0.02 },
    { min: 225000, max: 375000, rate: 0.03 },
    { min: 375000, max: 525000, rate: 0.04 },
    { min: 525000, max: 700000, rate: 0.05 },
    { min: 700000, max: Infinity, rate: 0.0549 },
  ]},
  HI: { name: 'Hawaii', hasIncomeTax: true, type: 'progressive', rate: 0.11, standardDeduction: 248000, brackets: [
    { min: 0, max: 240000, rate: 0.014 },
    { min: 240000, max: 480000, rate: 0.032 },
    { min: 480000, max: 960000, rate: 0.055 },
    { min: 960000, max: 1680000, rate: 0.064 },
    { min: 1680000, max: 2400000, rate: 0.068 },
    { min: 2400000, max: 3600000, rate: 0.072 },
    { min: 3600000, max: 4800000, rate: 0.076 },
    { min: 4800000, max: 15000000, rate: 0.079 },
    { min: 15000000, max: 17500000, rate: 0.0825 },
    { min: 17500000, max: 20000000, rate: 0.09 },
    { min: 20000000, max: Infinity, rate: 0.11 },
  ]},
  ID: { name: 'Idaho', hasIncomeTax: true, type: 'progressive', rate: 0.058, standardDeduction: 1460000, brackets: [
    { min: 0, max: Infinity, rate: 0.058 },
  ]},
  IA: { name: 'Iowa', hasIncomeTax: true, type: 'progressive', rate: 0.057, standardDeduction: 0, brackets: [
    { min: 0, max: 600000, rate: 0.044 },
    { min: 600000, max: Infinity, rate: 0.057 },
  ]},
  KS: { name: 'Kansas', hasIncomeTax: true, type: 'progressive', rate: 0.057, standardDeduction: 300000, brackets: [
    { min: 0, max: 1500000, rate: 0.031 },
    { min: 1500000, max: 3000000, rate: 0.0525 },
    { min: 3000000, max: Infinity, rate: 0.057 },
  ]},
  LA: { name: 'Louisiana', hasIncomeTax: true, type: 'progressive', rate: 0.0425, standardDeduction: 0, brackets: [
    { min: 0, max: 1250000, rate: 0.0185 },
    { min: 1250000, max: 5000000, rate: 0.035 },
    { min: 5000000, max: Infinity, rate: 0.0425 },
  ]},
  ME: { name: 'Maine', hasIncomeTax: true, type: 'progressive', rate: 0.0715, standardDeduction: 1410000, brackets: [
    { min: 0, max: 2495000, rate: 0.058 },
    { min: 2495000, max: 5890000, rate: 0.0675 },
    { min: 5890000, max: Infinity, rate: 0.0715 },
  ]},
  MD: { name: 'Maryland', hasIncomeTax: true, type: 'progressive', rate: 0.0575, standardDeduction: 265000, brackets: [
    { min: 0, max: 100000, rate: 0.02 },
    { min: 100000, max: 300000, rate: 0.03 },
    { min: 300000, max: 400000, rate: 0.04 },
    { min: 400000, max: 15000000, rate: 0.0475 },
    { min: 15000000, max: 17500000, rate: 0.05 },
    { min: 17500000, max: 25000000, rate: 0.0525 },
    { min: 25000000, max: Infinity, rate: 0.0575 },
  ]},
  MN: { name: 'Minnesota', hasIncomeTax: true, type: 'progressive', rate: 0.0985, standardDeduction: 1460000, brackets: [
    { min: 0, max: 3123000, rate: 0.0535 },
    { min: 3123000, max: 10260200, rate: 0.068 },
    { min: 10260200, max: 18371400, rate: 0.0785 },
    { min: 18371400, max: Infinity, rate: 0.0985 },
  ]},
  MS: { name: 'Mississippi', hasIncomeTax: true, type: 'progressive', rate: 0.05, standardDeduction: 0, brackets: [
    { min: 0, max: 1000000, rate: 0.047 },
    { min: 1000000, max: Infinity, rate: 0.05 },
  ]},
  MO: { name: 'Missouri', hasIncomeTax: true, type: 'progressive', rate: 0.048, standardDeduction: 0, brackets: [
    { min: 0, max: 100000, rate: 0.02 },
    { min: 100000, max: 200000, rate: 0.025 },
    { min: 200000, max: 300000, rate: 0.03 },
    { min: 300000, max: 400000, rate: 0.035 },
    { min: 400000, max: 500000, rate: 0.04 },
    { min: 500000, max: 600000, rate: 0.045 },
    { min: 600000, max: Infinity, rate: 0.048 },
  ]},
  MT: { name: 'Montana', hasIncomeTax: true, type: 'progressive', rate: 0.059, standardDeduction: 565000, brackets: [
    { min: 0, max: 2000000, rate: 0.047 },
    { min: 2000000, max: Infinity, rate: 0.059 },
  ]},
  NE: { name: 'Nebraska', hasIncomeTax: true, type: 'progressive', rate: 0.0584, standardDeduction: 0, brackets: [
    { min: 0, max: 379200, rate: 0.0246 },
    { min: 379200, max: 2274800, rate: 0.0351 },
    { min: 2274800, max: 3637600, rate: 0.0501 },
    { min: 3637600, max: Infinity, rate: 0.0584 },
  ]},
  NJ: { name: 'New Jersey', hasIncomeTax: true, type: 'progressive', rate: 0.1075, standardDeduction: 0, brackets: [
    { min: 0, max: 2000000, rate: 0.014 },
    { min: 2000000, max: 3500000, rate: 0.0175 },
    { min: 3500000, max: 4000000, rate: 0.035 },
    { min: 4000000, max: 7500000, rate: 0.05525 },
    { min: 7500000, max: 50000000, rate: 0.0637 },
    { min: 50000000, max: 100000000, rate: 0.0897 },
    { min: 100000000, max: Infinity, rate: 0.1075 },
  ]},
  NM: { name: 'New Mexico', hasIncomeTax: true, type: 'progressive', rate: 0.059, standardDeduction: 0, brackets: [
    { min: 0, max: 550000, rate: 0.017 },
    { min: 550000, max: 1100000, rate: 0.032 },
    { min: 1100000, max: 1600000, rate: 0.047 },
    { min: 1600000, max: 21000000, rate: 0.049 },
    { min: 21000000, max: Infinity, rate: 0.059 },
  ]},
  NY: { name: 'New York', hasIncomeTax: true, type: 'progressive', rate: 0.109, standardDeduction: 800000, brackets: [
    { min: 0, max: 852500, rate: 0.04 },
    { min: 852500, max: 1172500, rate: 0.045 },
    { min: 1172500, max: 1372500, rate: 0.0525 },
    { min: 1372500, max: 2157150, rate: 0.055 },
    { min: 2157150, max: 500000000, rate: 0.06 },
    { min: 500000000, max: 2500000000, rate: 0.0685 },
    { min: 2500000000, max: Infinity, rate: 0.109 },
  ]},
  ND: { name: 'North Dakota', hasIncomeTax: true, type: 'progressive', rate: 0.029, standardDeduction: 0, brackets: [
    { min: 0, max: Infinity, rate: 0.0195 },
  ]},
  OH: { name: 'Ohio', hasIncomeTax: true, type: 'progressive', rate: 0.035, standardDeduction: 0, brackets: [
    { min: 0, max: 2600000, rate: 0 },
    { min: 2600000, max: 4600000, rate: 0.0275 },
    { min: 4600000, max: 9200000, rate: 0.03 },
    { min: 9200000, max: Infinity, rate: 0.035 },
  ]},
  OK: { name: 'Oklahoma', hasIncomeTax: true, type: 'progressive', rate: 0.0475, standardDeduction: 0, brackets: [
    { min: 0, max: 100000, rate: 0.0025 },
    { min: 100000, max: 250000, rate: 0.0075 },
    { min: 250000, max: 375000, rate: 0.0175 },
    { min: 375000, max: 475000, rate: 0.0275 },
    { min: 475000, max: 750000, rate: 0.0375 },
    { min: 750000, max: Infinity, rate: 0.0475 },
  ]},
  OR: { name: 'Oregon', hasIncomeTax: true, type: 'progressive', rate: 0.099, standardDeduction: 260000, brackets: [
    { min: 0, max: 410000, rate: 0.0475 },
    { min: 410000, max: 1030000, rate: 0.0675 },
    { min: 1030000, max: 12500000, rate: 0.0875 },
    { min: 12500000, max: Infinity, rate: 0.099 },
  ]},
  RI: { name: 'Rhode Island', hasIncomeTax: true, type: 'progressive', rate: 0.0599, standardDeduction: 1025000, brackets: [
    { min: 0, max: 7315000, rate: 0.0375 },
    { min: 7315000, max: 16645000, rate: 0.0475 },
    { min: 16645000, max: Infinity, rate: 0.0599 },
  ]},
  SC: { name: 'South Carolina', hasIncomeTax: true, type: 'progressive', rate: 0.064, standardDeduction: 0, brackets: [
    { min: 0, max: 322000, rate: 0 },
    { min: 322000, max: 1631000, rate: 0.03 },
    { min: 1631000, max: Infinity, rate: 0.064 },
  ]},
  VT: { name: 'Vermont', hasIncomeTax: true, type: 'progressive', rate: 0.0875, standardDeduction: 699000, brackets: [
    { min: 0, max: 4525000, rate: 0.0335 },
    { min: 4525000, max: 10975000, rate: 0.066 },
    { min: 10975000, max: 22900000, rate: 0.076 },
    { min: 22900000, max: Infinity, rate: 0.0875 },
  ]},
  VA: { name: 'Virginia', hasIncomeTax: true, type: 'progressive', rate: 0.0575, standardDeduction: 800000, brackets: [
    { min: 0, max: 300000, rate: 0.02 },
    { min: 300000, max: 500000, rate: 0.03 },
    { min: 500000, max: 1700000, rate: 0.05 },
    { min: 1700000, max: Infinity, rate: 0.0575 },
  ]},
  WV: { name: 'West Virginia', hasIncomeTax: true, type: 'progressive', rate: 0.055, standardDeduction: 0, brackets: [
    { min: 0, max: 1000000, rate: 0.0236 },
    { min: 1000000, max: 2500000, rate: 0.0315 },
    { min: 2500000, max: 4000000, rate: 0.0354 },
    { min: 4000000, max: 6000000, rate: 0.0472 },
    { min: 6000000, max: Infinity, rate: 0.055 },
  ]},
  WI: { name: 'Wisconsin', hasIncomeTax: true, type: 'progressive', rate: 0.0765, standardDeduction: 1324000, brackets: [
    { min: 0, max: 1398000, rate: 0.035 },
    { min: 1398000, max: 2796000, rate: 0.044 },
    { min: 2796000, max: 30906000, rate: 0.053 },
    { min: 30906000, max: Infinity, rate: 0.0765 },
  ]},
};

/**
 * Get state tax configuration.
 */
export function getStateTaxConfig(stateCode: string): StateTaxConfig | undefined {
  return STATE_TAX_DATA[stateCode.toUpperCase()];
}

/**
 * Check if a state has income tax.
 */
export function stateHasIncomeTax(stateCode: string): boolean {
  const config = getStateTaxConfig(stateCode);
  return config?.hasIncomeTax ?? false;
}

/**
 * Get list of states with no income tax.
 */
export function getNoIncomeTaxStates(): string[] {
  return Object.entries(STATE_TAX_DATA)
    .filter(([_, config]) => !config.hasIncomeTax)
    .map(([code, _]) => code);
}

/**
 * Get list of flat tax states.
 */
export function getFlatTaxStates(): string[] {
  return Object.entries(STATE_TAX_DATA)
    .filter(([_, config]) => config.type === 'flat')
    .map(([code, _]) => code);
}

/**
 * Get all state codes.
 */
export function getAllStateCodes(): string[] {
  return Object.keys(STATE_TAX_DATA);
}

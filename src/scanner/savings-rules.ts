/**
 * Savings Optimization Rules
 *
 * Scanners for savings-related optimization opportunities.
 */

import type { Optimization } from '@models/optimization';
import { createOptimization } from '@models/optimization';
import type { ScannerRule } from './index';
import { calculateOptimizationImpact, estimateLifetimeValue } from './impact-calculator';

/**
 * Detect inadequate emergency fund.
 */
const emergencyFundRule: ScannerRule = {
  id: 'emergency-fund',
  name: 'Emergency Fund Alert',
  type: 'savings',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Calculate liquid savings (savings accounts)
    const liquidAssets = profile.assets.filter(
      (a) => a.type === 'savings'
    );

    const totalLiquid = liquidAssets.reduce((sum, a) => {
      const state = year.assets.find((s) => s.assetId === a.id);
      return sum + (state?.balance ?? 0);
    }, 0);

    // Target: 3-6 months of expenses (using total obligations as proxy)
    const monthlyExpenses = year.totalObligations / 12;
    const minimumEmergencyFund = monthlyExpenses * 3;
    const targetEmergencyFund = monthlyExpenses * 6;

    if (totalLiquid >= minimumEmergencyFund) return null;

    const deficit = minimumEmergencyFund - totalLiquid;
    const monthsToSave = Math.ceil(deficit / (year.discretionaryIncome / 12));

    return createOptimization({
      type: 'savings',
      title: 'Build Emergency Fund',
      explanation: `Your liquid savings of $${Math.round(totalLiquid / 100).toLocaleString()} covers only ${(totalLiquid / monthlyExpenses).toFixed(1)} months of expenses. Financial experts recommend 3-6 months of expenses in easily accessible savings.`,
      action: `Build your emergency fund to at least $${Math.round(minimumEmergencyFund / 100).toLocaleString()} (3 months) or ideally $${Math.round(targetEmergencyFund / 100).toLocaleString()} (6 months). At your current discretionary income, this would take approximately ${monthsToSave} months.`,
      impact: {
        monthlyChange: 0,
        annualChange: 0,
        lifetimeChange: 0,
        retirementDateChange: 0,
        metricAffected: 'Financial Security',
      },
      confidence: 'high',
      prerequisites: ['Have positive discretionary income'],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect low savings rate compared to income.
 */
const savingsRateAlertRule: ScannerRule = {
  id: 'savings-rate-alert',
  name: 'Savings Rate Alert',
  type: 'savings',
  scan: (profile, trajectory, year): Optimization | null => {
    // Target savings rate: 20% of gross income
    const TARGET_SAVINGS_RATE = 0.2;

    if (year.savingsRate >= TARGET_SAVINGS_RATE) return null;
    if (year.savingsRate < 0) return null; // Negative savings rate is a different problem

    const currentSavingsAmount = Math.round(year.grossIncome * year.savingsRate);
    const targetSavingsAmount = Math.round(year.grossIncome * TARGET_SAVINGS_RATE);
    const increaseNeeded = targetSavingsAmount - currentSavingsAmount;

    if (increaseNeeded < 100000) return null; // Less than $1k difference

    // Calculate real lifetime impact via trajectory comparison
    const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
      // Add savings contribution to an investment or savings account
      const investmentAsset = modified.assets.find(
        (a) => a.type === 'investment' || a.type === 'savings'
      );
      if (investmentAsset) {
        investmentAsset.monthlyContribution += Math.round(increaseNeeded / 12);
      }
    });

    return createOptimization({
      type: 'savings',
      title: 'Increase Savings Rate',
      explanation: `Your current savings rate is ${(year.savingsRate * 100).toFixed(1)}%, below the recommended 20%. You're saving $${Math.round(currentSavingsAmount / 100).toLocaleString()}/year when you could target $${Math.round(targetSavingsAmount / 100).toLocaleString()}/year.`,
      action: `Increase your savings by $${Math.round(increaseNeeded / 1200).toLocaleString()}/month to reach a 20% savings rate. Look for expenses to cut or consider automating additional savings.`,
      impact: {
        monthlyChange: 0,
        annualChange: increaseNeeded,
        lifetimeChange: impact.lifetimeChange,
        retirementDateChange: impact.retirementDateChange,
        metricAffected: 'Savings Rate',
      },
      confidence: 'medium',
      prerequisites: ['Have room in budget for increased savings'],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect cash sitting in low-yield accounts that could be invested.
 * Uses the profile's marketReturn assumption instead of a hardcoded rate.
 */
const investmentOpportunityRule: ScannerRule = {
  id: 'investment-opportunity',
  name: 'Investment Opportunity',
  type: 'savings',
  scan: (profile, trajectory, year): Optimization | null => {
    // Find low-yield savings beyond emergency fund
    const savingsAssets = profile.assets.filter(
      (a) => a.type === 'savings' && a.expectedReturn < 0.05
    );

    const totalSavings = savingsAssets.reduce((sum, a) => {
      const state = year.assets.find((s) => s.assetId === a.id);
      return sum + (state?.balance ?? 0);
    }, 0);

    // Keep 6 months expenses as emergency fund (using total obligations as proxy)
    const monthlyExpenses = year.totalObligations / 12;
    const emergencyFund = monthlyExpenses * 6;
    const excessCash = totalSavings - emergencyFund;

    if (excessCash < 500000) return null; // Less than $5k excess

    // No high-interest debt (this would be caught by debt rules)
    const hasHighInterestDebt = profile.debts.some(
      (d) => d.interestRate > 0.1 && d.principal > 0
    );
    if (hasHighInterestDebt) return null;

    // Use the profile's market return and the average savings return
    const expectedInvestmentReturn = profile.assumptions.marketReturn;
    const avgSavingsReturn = savingsAssets.length > 0
      ? savingsAssets.reduce((sum, a) => sum + a.expectedReturn, 0) / savingsAssets.length
      : 0.02;
    const additionalReturn = Math.round(excessCash * (expectedInvestmentReturn - avgSavingsReturn));
    const yearsRemaining = profile.assumptions.lifeExpectancy - profile.assumptions.currentAge;
    const futureValue = Math.round(excessCash * Math.pow(1 + expectedInvestmentReturn, Math.min(20, yearsRemaining)));

    // Calculate real lifetime impact via trajectory comparison
    const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
      // Move excess cash from savings to investment
      const savings = modified.assets.find((a) => a.type === 'savings');
      if (savings) {
        savings.balance = Math.max(0, savings.balance - excessCash);
      }
      const investment = modified.assets.find((a) => a.type === 'investment');
      if (investment) {
        investment.balance += excessCash;
      }
    });

    return createOptimization({
      type: 'savings',
      title: 'Put Cash to Work',
      explanation: `You have $${Math.round(excessCash / 100).toLocaleString()} in savings beyond your 6-month emergency fund. This cash is likely earning minimal interest when it could be invested for long-term growth.`,
      action: `Consider investing $${Math.round(excessCash / 100).toLocaleString()} in a diversified portfolio. At your assumed ${(expectedInvestmentReturn * 100).toFixed(0)}% market return, this could grow to approximately $${Math.round(futureValue / 100).toLocaleString()} in ${Math.min(20, yearsRemaining)} years.`,
      impact: {
        monthlyChange: 0,
        annualChange: additionalReturn,
        lifetimeChange: impact.lifetimeChange,
        retirementDateChange: impact.retirementDateChange,
        metricAffected: 'Investment Returns',
      },
      confidence: year.discretionaryIncome > 0 ? 'medium' : 'low',
      prerequisites: [
        'Have adequate emergency fund',
        'No high-interest debt',
        'Long investment time horizon (10+ years)',
        'Comfortable with market risk',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect if HSA could be used more effectively.
 */
const hsaOptimizationRule: ScannerRule = {
  id: 'hsa-optimization',
  name: 'HSA Optimization',
  type: 'savings',
  scan: (profile, trajectory, year): Optimization | null => {
    // 2024 HSA limits
    const HSA_INDIVIDUAL_LIMIT = 415000; // $4,150

    // Check if user has an HSA
    const hsaAccounts = profile.assets.filter((a) => a.type === 'hsa');

    if (hsaAccounts.length === 0) {
      // Could suggest opening HSA if they have HDHP, but we don't have that info
      return null;
    }

    // Calculate total HSA contributions
    const totalHSAContribution = hsaAccounts.reduce(
      (sum, a) => sum + a.monthlyContribution * 12,
      0
    );

    // Assume individual limit (could be enhanced to detect family coverage)
    const limit = HSA_INDIVIDUAL_LIMIT;
    const unusedSpace = limit - totalHSAContribution;

    if (unusedSpace < 50000) return null; // Less than $500 unused

    const taxSavings = Math.round(unusedSpace * year.effectiveTaxRate);

    // Calculate real lifetime impact via trajectory comparison
    const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
      const hsa = modified.assets.find((a) => a.type === 'hsa');
      if (hsa) {
        hsa.monthlyContribution += Math.round(unusedSpace / 12);
      }
    });

    return createOptimization({
      type: 'savings',
      title: 'Maximize HSA Contributions',
      explanation: `You're contributing $${Math.round(totalHSAContribution / 100).toLocaleString()}/year to your HSA, leaving $${Math.round(unusedSpace / 100).toLocaleString()} of tax-free contribution space unused. HSAs offer triple tax advantages: tax-deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses.`,
      action: `Increase HSA contributions by $${Math.round(unusedSpace / 1200).toLocaleString()}/month to maximize this tax-advantaged account. After age 65, HSA funds can be used for any purpose (taxed as income like a traditional IRA).`,
      impact: {
        monthlyChange: Math.round(taxSavings / 12),
        annualChange: taxSavings,
        lifetimeChange: impact.lifetimeChange,
        retirementDateChange: impact.retirementDateChange,
        metricAffected: 'Tax-Advantaged Savings',
      },
      confidence: 'high',
      prerequisites: [
        'Have high-deductible health plan (HDHP)',
        'Have cash flow to increase contributions',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect opportunity for automated savings.
 */
const automateSavingsRule: ScannerRule = {
  id: 'automate-savings',
  name: 'Automate Savings',
  type: 'savings',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Check if they have significant discretionary income but low savings contributions
    const totalMonthlyContributions = profile.assets.reduce(
      (sum, a) => sum + a.monthlyContribution,
      0
    );

    const monthlyDiscretionary = year.discretionaryIncome / 12;

    // If discretionary is high but contributions are low
    if (monthlyDiscretionary < 50000) return null; // Less than $500/month discretionary
    if (totalMonthlyContributions > monthlyDiscretionary * 0.5) return null; // Already saving >50%

    const suggestedIncrease = Math.round(monthlyDiscretionary * 0.2); // Suggest 20% of discretionary
    const annualIncrease = suggestedIncrease * 12;

    // Check if they'd benefit from automated increases
    const savingsRatio = totalMonthlyContributions / monthlyDiscretionary;
    if (savingsRatio > 0.3) return null; // Already saving 30%+ of discretionary

    // Use annuity formula with the user's market return assumption
    const yearsRemaining = profile.assumptions.lifeExpectancy - profile.assumptions.currentAge;
    const lifetimeChange = estimateLifetimeValue(
      annualIncrease,
      profile.assumptions.marketReturn,
      yearsRemaining
    );

    return createOptimization({
      type: 'savings',
      title: 'Automate Additional Savings',
      explanation: `You have $${Math.round(monthlyDiscretionary / 100).toLocaleString()}/month in discretionary income but are only directing $${Math.round(totalMonthlyContributions / 100).toLocaleString()} to savings/investments. Automating savings helps build wealth consistently.`,
      action: `Set up automatic transfers of $${Math.round(suggestedIncrease / 100).toLocaleString()}/month to savings or investment accounts. "Pay yourself first" by scheduling transfers right after payday.`,
      impact: {
        monthlyChange: 0,
        annualChange: annualIncrease,
        lifetimeChange,
        retirementDateChange: -Math.round((annualIncrease * 12) / year.grossIncome),
        metricAffected: 'Wealth Accumulation',
      },
      confidence: 'medium',
      prerequisites: ['Have positive discretionary income'],
      yearApplicable: year.year,
    });
  },
};

/**
 * All savings optimization rules.
 */
export const SAVINGS_RULES: ScannerRule[] = [
  emergencyFundRule,
  savingsRateAlertRule,
  investmentOpportunityRule,
  hsaOptimizationRule,
  automateSavingsRule,
];

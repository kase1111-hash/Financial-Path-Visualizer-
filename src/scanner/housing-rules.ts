/**
 * Housing Optimization Rules
 *
 * Scanners for housing-related optimization opportunities.
 */

import type { Optimization } from '@models/optimization';
import { createOptimization } from '@models/optimization';
import { calculateTotalMonthlyPayment } from '@models/debt';
import type { ScannerRule } from './index';
import { calculateOptimizationImpact, estimateLifetimeValue } from './impact-calculator';

/**
 * Detect when housing costs are too high relative to income.
 * The general rule is housing shouldn't exceed 28-30% of gross income.
 */
const housingCostRatioRule: ScannerRule = {
  id: 'housing-cost-ratio',
  name: 'Housing Cost Ratio',
  type: 'housing',
  scan: (profile, _trajectory, year): Optimization | null => {
    const MAX_HOUSING_RATIO = 0.28; // 28% rule
    const WARNING_RATIO = 0.35; // Above this is concerning

    // Calculate total housing cost
    const mortgage = profile.debts.find((d) => d.type === 'mortgage');

    if (!mortgage) {
      // No mortgage data available for renters in this model
      return null;
    }

    // For homeowners with mortgage
    const totalHousingCost = calculateTotalMonthlyPayment(mortgage) * 12;
    const housingRatio = totalHousingCost / year.grossIncome;

    if (housingRatio <= MAX_HOUSING_RATIO) return null;

    const targetHousingCost = Math.round(year.grossIncome * MAX_HOUSING_RATIO);
    const annualExcess = totalHousingCost - targetHousingCost;

    if (annualExcess < 100000) return null; // Less than $1k annually

    // Use annuity formula — advisory rule, no direct profile modification
    const yearsRemaining = profile.assumptions.lifeExpectancy - profile.assumptions.currentAge;
    const lifetimeChange = estimateLifetimeValue(
      annualExcess,
      profile.assumptions.marketReturn,
      yearsRemaining
    );

    return createOptimization({
      type: 'housing',
      title: 'Housing Cost Alert',
      explanation: `Your total housing payment (mortgage, taxes, insurance, PMI) is ${(housingRatio * 100).toFixed(1)}% of your gross income. Financial guidelines suggest keeping housing under 28% to maintain flexibility.`,
      action: housingRatio > WARNING_RATIO
        ? `Your housing costs are significantly high. Consider refinancing, removing PMI, appealing property taxes, or in extreme cases, downsizing.`
        : `Look for ways to reduce housing costs: refinance to a lower rate, remove PMI, shop for better insurance, or appeal property tax assessment.`,
      impact: {
        monthlyChange: Math.round(annualExcess / 12),
        annualChange: annualExcess,
        lifetimeChange,
        retirementDateChange: Math.round((annualExcess * 12) / year.grossIncome),
        metricAffected: 'Housing Cost',
      },
      confidence: housingRatio > WARNING_RATIO ? 'high' : 'medium',
      prerequisites: [],
      yearApplicable: year.year,
    });
  },
};

/**
 * Compare mortgage prepayment vs investing the extra money.
 * Uses the profile's marketReturn assumption instead of a hardcoded rate.
 */
const prepaymentVsInvestRule: ScannerRule = {
  id: 'prepayment-vs-invest',
  name: 'Prepayment vs Investment',
  type: 'housing',
  scan: (profile, trajectory, year): Optimization | null => {
    const mortgage = profile.debts.find((d) => d.type === 'mortgage');
    if (!mortgage) return null;

    // Check if making extra payments
    const extraPayment = mortgage.actualPayment - mortgage.minimumPayment;
    if (extraPayment < 10000) return null; // Less than $100 extra

    // Use the profile's market return assumption
    const expectedReturn = profile.assumptions.marketReturn;
    const mortgageRate = mortgage.interestRate;

    // If mortgage rate is lower than expected returns, suggest investing
    if (mortgageRate >= expectedReturn - 0.01) return null; // Within 1%, preference is fine

    const annualExtraPayment = extraPayment * 12;
    const rateDifference = expectedReturn - mortgageRate;
    const opportunityCost = Math.round(annualExtraPayment * rateDifference);

    // Calculate future value difference using the user's assumptions
    const yearsRemaining = Math.min(20, Math.ceil(mortgage.monthsRemaining / 12));
    const investmentFutureValue = annualExtraPayment * ((Math.pow(1 + expectedReturn, yearsRemaining) - 1) / expectedReturn);
    const mortgageSavings = annualExtraPayment * yearsRemaining; // Simplified

    const lifetimeDifference = Math.round(investmentFutureValue - mortgageSavings);

    if (lifetimeDifference < 1000000) return null; // Less than $10k lifetime difference

    // Calculate real lifetime impact via trajectory comparison
    const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
      const modMortgage = modified.debts.find((d) => d.id === mortgage.id);
      if (modMortgage) {
        modMortgage.actualPayment = modMortgage.minimumPayment;
      }
      const investment = modified.assets.find((a) => a.type === 'investment');
      if (investment) {
        investment.monthlyContribution += extraPayment;
      }
    });

    return createOptimization({
      type: 'housing',
      title: 'Consider Investing vs Prepaying',
      explanation: `You're making $${Math.round(extraPayment / 100).toLocaleString()}/month in extra mortgage payments at ${(mortgageRate * 100).toFixed(2)}% interest. Your assumed market return is ${(expectedReturn * 100).toFixed(0)}%. You might build more wealth by investing the extra instead.`,
      action: `Consider redirecting $${Math.round(extraPayment / 100).toLocaleString()}/month from mortgage prepayment to tax-advantaged investments. Over ${yearsRemaining} years, this could result in approximately $${Math.round(lifetimeDifference / 100).toLocaleString()} more wealth (assuming ${(expectedReturn * 100).toFixed(0)}% returns).`,
      impact: {
        monthlyChange: 0,
        annualChange: opportunityCost,
        lifetimeChange: impact.lifetimeChange,
        retirementDateChange: impact.retirementDateChange,
        metricAffected: 'Net Worth',
      },
      confidence: 'medium',
      prerequisites: [
        'Comfortable with market volatility',
        'Have long investment horizon',
        'Maxed tax-advantaged accounts first',
        'Have adequate emergency fund',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect opportunity to consolidate high-interest debt using home equity.
 */
const homeEquityRule: ScannerRule = {
  id: 'home-equity-building',
  name: 'Home Equity Building',
  type: 'housing',
  scan: (profile, trajectory, year): Optimization | null => {
    const mortgage = profile.debts.find((d) => d.type === 'mortgage');
    if (mortgage?.propertyValue == null) return null;

    const equity = mortgage.propertyValue - mortgage.principal;
    const equityRatio = equity / mortgage.propertyValue;

    // Suggest HELOC for investment if significant equity
    if (equityRatio < 0.3) return null; // Less than 30% equity

    // Check if they have high-interest debt that could be consolidated
    const highInterestDebt = profile.debts.filter(
      (d) => d.type !== 'mortgage' && d.interestRate > mortgage.interestRate + 0.02 && d.principal > 0
    );

    if (highInterestDebt.length === 0) return null;

    const totalHighInterestDebt = highInterestDebt.reduce((sum, d) => sum + d.principal, 0);
    const avgHighRate = highInterestDebt.reduce((sum, d) => sum + d.interestRate * d.principal, 0) / totalHighInterestDebt;

    // Assume HELOC rate is mortgage rate + 1%
    const helocRate = mortgage.interestRate + 0.01;
    const rateSavings = avgHighRate - helocRate;
    const annualSavings = Math.round(totalHighInterestDebt * rateSavings);

    if (annualSavings < 50000) return null; // Less than $500/year savings

    // Calculate real lifetime impact via trajectory comparison
    const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
      // Simulate consolidation: reduce interest rates on high-interest debts to HELOC rate
      for (const debt of highInterestDebt) {
        const modDebt = modified.debts.find((d) => d.id === debt.id);
        if (modDebt) {
          modDebt.interestRate = helocRate;
        }
      }
    });

    return createOptimization({
      type: 'housing',
      title: 'Consolidate Debt with Home Equity',
      explanation: `You have ${(equityRatio * 100).toFixed(0)}% equity in your home and $${Math.round(totalHighInterestDebt / 100).toLocaleString()} in high-interest debt at an average rate of ${(avgHighRate * 100).toFixed(1)}%. A HELOC at approximately ${(helocRate * 100).toFixed(1)}% could significantly reduce interest costs.`,
      action: `Consider a HELOC or cash-out refinance to consolidate high-interest debt. Potential annual savings: $${Math.round(annualSavings / 100).toLocaleString()}. WARNING: This converts unsecured debt to debt secured by your home.`,
      impact: {
        monthlyChange: Math.round(annualSavings / 12),
        annualChange: annualSavings,
        lifetimeChange: impact.lifetimeChange,
        retirementDateChange: impact.retirementDateChange,
        metricAffected: 'Interest Expense',
      },
      confidence: 'low', // Low because of risk of securing debt with home
      prerequisites: [
        'Good credit score',
        'Stable income',
        'Discipline not to accumulate more unsecured debt',
        'Understand risk of home as collateral',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect opportunity to reduce property taxes through appeal.
 */
const propertyTaxRule: ScannerRule = {
  id: 'property-tax-appeal',
  name: 'Property Tax Appeal',
  type: 'housing',
  scan: (profile, _trajectory, year): Optimization | null => {
    const mortgage = profile.debts.find((d) => d.type === 'mortgage');
    if (mortgage?.escrowTaxes == null || mortgage.propertyValue === null) return null;

    // Calculate effective property tax rate
    const annualPropertyTax = mortgage.escrowTaxes * 12;
    const effectiveTaxRate = annualPropertyTax / mortgage.propertyValue;

    // Average property tax rate in US is about 1.1%
    const AVERAGE_RATE = 0.011;

    if (effectiveTaxRate <= AVERAGE_RATE * 1.2) return null; // Within 20% of average

    // Suggest appeal if rate seems high
    const targetTax = Math.round(mortgage.propertyValue * AVERAGE_RATE);
    const potentialSavings = annualPropertyTax - targetTax;

    if (potentialSavings < 50000) return null; // Less than $500 potential savings

    // Use annuity formula — advisory rule, no direct profile modification
    const yearsRemaining = profile.assumptions.lifeExpectancy - profile.assumptions.currentAge;
    const lifetimeChange = estimateLifetimeValue(
      potentialSavings,
      profile.assumptions.marketReturn,
      yearsRemaining
    );

    return createOptimization({
      type: 'housing',
      title: 'Appeal Property Tax Assessment',
      explanation: `Your effective property tax rate is ${(effectiveTaxRate * 100).toFixed(2)}%, which is above the national average of ~1.1%. Your property may be over-assessed relative to market value.`,
      action: `Consider appealing your property tax assessment. Research comparable home values and recent sales in your area. Potential annual savings: $${Math.round(potentialSavings / 100).toLocaleString()}.`,
      impact: {
        monthlyChange: Math.round(potentialSavings / 12),
        annualChange: potentialSavings,
        lifetimeChange,
        retirementDateChange: -Math.round((potentialSavings * 6) / year.grossIncome),
        metricAffected: 'Property Taxes',
      },
      confidence: 'low', // Low because success varies greatly
      prerequisites: [
        'Evidence of over-assessment',
        'Time to research comparable properties',
        'Meet local appeal deadlines',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * All housing optimization rules.
 */
export const HOUSING_RULES: ScannerRule[] = [
  housingCostRatioRule,
  prepaymentVsInvestRule,
  homeEquityRule,
  propertyTaxRule,
];

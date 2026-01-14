/**
 * Debt Optimization Rules
 *
 * Scanners for debt-related optimization opportunities.
 */

import type { Optimization } from '@models/optimization';
import { createOptimization } from '@models/optimization';
import { isHighInterestDebt, calculateLTV } from '@models/debt';
import type { ScannerRule } from './index';

/**
 * Detect high-interest debt when user has low-yield savings.
 * Suggests paying down high-interest debt with excess savings.
 */
const highInterestVsSavingsRule: ScannerRule = {
  id: 'high-interest-vs-savings',
  name: 'High-Interest Debt vs Savings',
  type: 'debt',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Find high-interest debts
    const highInterestDebts = profile.debts.filter((d) => isHighInterestDebt(d) && d.principal > 0);
    if (highInterestDebts.length === 0) return null;

    // Find low-yield savings accounts
    const savingsAssets = profile.assets.filter(
      (a) => a.type === 'savings' && a.expectedReturn < 0.05
    );

    const totalSavings = savingsAssets.reduce((sum, a) => {
      const state = year.assets.find((s) => s.assetId === a.id);
      return sum + (state?.balance ?? 0);
    }, 0);

    // Keep 3 months obligations as emergency fund
    const monthlyExpenses = year.totalObligations / 12;
    const emergencyFund = monthlyExpenses * 3;
    const excessSavings = totalSavings - emergencyFund;

    if (excessSavings < 100000) return null; // Less than $1k excess

    // Find highest interest debt
    const highestDebt = highInterestDebts.reduce((max, d) =>
      d.interestRate > max.interestRate ? d : max
    );

    const amountToApply = Math.min(excessSavings, highestDebt.principal);
    const interestSaved = Math.round(amountToApply * highestDebt.interestRate);

    return createOptimization({
      type: 'debt',
      title: 'Pay Down High-Interest Debt',
      explanation: `You have $${Math.round(excessSavings / 100).toLocaleString()} in low-yield savings beyond your emergency fund, while carrying ${highestDebt.name} at ${(highestDebt.interestRate * 100).toFixed(1)}% interest. Paying down this debt provides a guaranteed return equal to the interest rate.`,
      action: `Apply $${Math.round(amountToApply / 100).toLocaleString()} from savings to ${highestDebt.name} to save approximately $${Math.round(interestSaved / 100).toLocaleString()}/year in interest.`,
      impact: {
        monthlyChange: Math.round(interestSaved / 12),
        annualChange: interestSaved,
        lifetimeChange: interestSaved * 5, // Rough estimate
        retirementDateChange: -Math.round((interestSaved * 6) / year.grossIncome),
        metricAffected: 'Interest Expense',
      },
      confidence: 'high',
      prerequisites: [
        'Maintain adequate emergency fund',
        'No early withdrawal penalties',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect PMI removal opportunity for mortgages.
 */
const pmiRemovalRule: ScannerRule = {
  id: 'pmi-removal',
  name: 'PMI Removal Opportunity',
  type: 'debt',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Find mortgages with PMI
    const mortgagesWithPMI = profile.debts.filter(
      (d) =>
        d.type === 'mortgage' &&
        d.pmiAmount !== null &&
        d.pmiAmount > 0 &&
        d.pmiThreshold !== null &&
        d.propertyValue !== null
    );

    for (const mortgage of mortgagesWithPMI) {
      const ltv = calculateLTV(mortgage);
      if (ltv === null || mortgage.pmiThreshold === null || mortgage.propertyValue === null) continue;

      // Only trigger if LTV is within 10% of threshold
      if (ltv <= mortgage.pmiThreshold) continue; // Already below threshold
      if (ltv > mortgage.pmiThreshold + 0.1) continue; // Too far from threshold

      const amountToPayDown = Math.round(
        mortgage.principal - mortgage.propertyValue * mortgage.pmiThreshold
      );

      if (amountToPayDown < 0 || mortgage.pmiAmount === null) continue;

      const annualPMISavings = mortgage.pmiAmount * 12;
      const paybackMonths = Math.round(amountToPayDown / (annualPMISavings / 12));

      return createOptimization({
        type: 'debt',
        title: 'Remove PMI',
        explanation: `Your mortgage LTV is ${(ltv * 100).toFixed(1)}%, just above the ${(mortgage.pmiThreshold * 100).toFixed(0)}% threshold for PMI removal. You're paying $${Math.round(mortgage.pmiAmount / 100).toLocaleString()}/month in PMI.`,
        action: `Make an extra principal payment of $${Math.round(amountToPayDown / 100).toLocaleString()} to reach ${(mortgage.pmiThreshold * 100).toFixed(0)}% LTV and eliminate PMI. Payback period: ${paybackMonths} months.`,
        impact: {
          monthlyChange: mortgage.pmiAmount,
          annualChange: annualPMISavings,
          lifetimeChange: annualPMISavings * Math.ceil(mortgage.monthsRemaining / 12),
          retirementDateChange: -Math.round((annualPMISavings * 12) / year.grossIncome),
          metricAffected: 'Housing Cost',
        },
        confidence: 'high',
        prerequisites: [
          'Have funds available for extra payment',
          'Lender allows PMI removal at 80% LTV',
        ],
        yearApplicable: year.year,
      });
    }

    return null;
  },
};

/**
 * Suggest debt avalanche strategy if not already using it.
 * Avalanche = pay highest interest rate first.
 */
const debtAvalancheRule: ScannerRule = {
  id: 'debt-avalanche',
  name: 'Debt Avalanche Strategy',
  type: 'debt',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Get debts with balances, sorted by interest rate (highest first)
    const debtsWithBalance = profile.debts
      .filter((d) => d.principal > 0)
      .sort((a, b) => b.interestRate - a.interestRate);

    if (debtsWithBalance.length < 2) return null; // Need multiple debts

    // Check if user is paying extra on a lower-interest debt
    // while paying minimum on a higher-interest debt
    const highestRateDebt = debtsWithBalance[0]!;
    const extraPaymentOnOtherDebt = debtsWithBalance.slice(1).find(
      (d) => d.actualPayment > d.minimumPayment && d.interestRate < highestRateDebt.interestRate
    );

    if (!extraPaymentOnOtherDebt) return null;

    // They're paying extra on a lower-rate debt
    const extraBeingPaid = extraPaymentOnOtherDebt.actualPayment - extraPaymentOnOtherDebt.minimumPayment;
    const rateDifference = highestRateDebt.interestRate - extraPaymentOnOtherDebt.interestRate;
    const annualSavings = Math.round(extraBeingPaid * 12 * rateDifference);

    if (annualSavings < 5000) return null; // Less than $50/year

    return createOptimization({
      type: 'debt',
      title: 'Optimize Debt Payoff Order',
      explanation: `You're making extra payments on ${extraPaymentOnOtherDebt.name} (${(extraPaymentOnOtherDebt.interestRate * 100).toFixed(1)}%) while ${highestRateDebt.name} has a higher rate of ${(highestRateDebt.interestRate * 100).toFixed(1)}%. The debt avalanche method targets highest interest first.`,
      action: `Redirect the $${Math.round(extraBeingPaid / 100).toLocaleString()}/month extra payment from ${extraPaymentOnOtherDebt.name} to ${highestRateDebt.name} to minimize total interest paid.`,
      impact: {
        monthlyChange: Math.round(annualSavings / 12),
        annualChange: annualSavings,
        lifetimeChange: annualSavings * 10, // Rough estimate
        retirementDateChange: -Math.round((annualSavings * 6) / year.grossIncome),
        metricAffected: 'Interest Expense',
      },
      confidence: 'high',
      prerequisites: ['Flexibility to redirect payments'],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect refinance opportunities based on current rates vs debt rates.
 */
const refinanceOpportunityRule: ScannerRule = {
  id: 'refinance-opportunity',
  name: 'Refinance Opportunity',
  type: 'debt',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Assumed current market rates (in real app, would be fetched)
    const CURRENT_MORTGAGE_RATE = 0.065; // 6.5%
    const CURRENT_AUTO_RATE = 0.07; // 7%
    const CURRENT_STUDENT_RATE = 0.055; // 5.5%

    const currentRates: Record<string, number> = {
      mortgage: CURRENT_MORTGAGE_RATE,
      auto: CURRENT_AUTO_RATE,
      student: CURRENT_STUDENT_RATE,
    };

    // Find debts where current rate is significantly higher than market
    const refinanceCandidates = profile.debts.filter((d) => {
      const marketRate = currentRates[d.type];
      if (!marketRate) return false;
      if (d.principal < 1000000) return false; // Less than $10k
      if (d.monthsRemaining < 24) return false; // Less than 2 years left

      // At least 1% rate difference
      return d.interestRate > marketRate + 0.01;
    });

    if (refinanceCandidates.length === 0) return null;

    // Find the one with highest savings potential
    let bestCandidate = refinanceCandidates[0]!;
    let bestSavings = 0;

    for (const debt of refinanceCandidates) {
      const marketRate = currentRates[debt.type]!;
      const rateSavings = debt.interestRate - marketRate;
      const annualSavings = Math.round(debt.principal * rateSavings);
      if (annualSavings > bestSavings) {
        bestSavings = annualSavings;
        bestCandidate = debt;
      }
    }

    const marketRate = currentRates[bestCandidate.type]!;
    const yearsRemaining = Math.ceil(bestCandidate.monthsRemaining / 12);
    const totalSavings = bestSavings * yearsRemaining;

    // Estimate closing costs
    const closingCosts = bestCandidate.type === 'mortgage'
      ? Math.round(bestCandidate.principal * 0.02) // 2% for mortgage
      : Math.round(bestCandidate.principal * 0.01); // 1% for other

    const netSavings = totalSavings - closingCosts;

    if (netSavings < 50000) return null; // Less than $500 net savings

    return createOptimization({
      type: 'debt',
      title: `Refinance ${bestCandidate.name}`,
      explanation: `Your ${bestCandidate.name} has a ${(bestCandidate.interestRate * 100).toFixed(2)}% rate while current market rates are around ${(marketRate * 100).toFixed(2)}%. With ${yearsRemaining} years remaining, refinancing could save significant interest.`,
      action: `Refinance ${bestCandidate.name} from ${(bestCandidate.interestRate * 100).toFixed(2)}% to approximately ${(marketRate * 100).toFixed(2)}%. Estimated savings: $${Math.round(totalSavings / 100).toLocaleString()} over the loan term, minus ~$${Math.round(closingCosts / 100).toLocaleString()} closing costs.`,
      impact: {
        monthlyChange: Math.round(bestSavings / 12),
        annualChange: bestSavings,
        lifetimeChange: netSavings,
        retirementDateChange: -Math.round((netSavings * 2) / year.grossIncome),
        metricAffected: 'Interest Expense',
      },
      confidence: 'medium',
      prerequisites: [
        'Qualify for new loan',
        'Current market rates are favorable',
        'Enough time remaining to recoup closing costs',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * All debt optimization rules.
 */
export const DEBT_RULES: ScannerRule[] = [
  highInterestVsSavingsRule,
  pmiRemovalRule,
  debtAvalancheRule,
  refinanceOpportunityRule,
];

/**
 * Tax Optimization Rules
 *
 * Scanners for tax-related optimization opportunities.
 */

import type { Optimization } from '@models/optimization';
import { createOptimization } from '@models/optimization';
import { FEDERAL_TAX_BRACKETS } from '@data/federal-tax-brackets';
import type { ScannerRule } from './index';

/**
 * Detect when income is near a tax bracket boundary.
 * Suggests increasing retirement contributions to stay in lower bracket.
 */
const bracketBoundaryRule: ScannerRule = {
  id: 'tax-bracket-boundary',
  name: 'Tax Bracket Boundary Detection',
  type: 'tax',
  scan: (profile, _trajectory, year): Optimization | null => {
    const { taxFilingStatus } = profile.assumptions;
    const brackets = FEDERAL_TAX_BRACKETS[taxFilingStatus];
    const taxableIncome = year.grossIncome;

    // Find current bracket
    let currentBracketIndex = 0;
    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      if (bracket && taxableIncome >= bracket.min && taxableIncome < bracket.max) {
        currentBracketIndex = i;
        break;
      }
    }

    const currentBracket = brackets[currentBracketIndex];
    if (!currentBracket || currentBracketIndex === 0) return null;

    // Check if within 10% of current bracket minimum
    const distanceFromMin = taxableIncome - currentBracket.min;
    const bracketThreshold = currentBracket.min * 0.1;

    if (distanceFromMin > 0 && distanceFromMin < bracketThreshold) {
      const previousBracket = brackets[currentBracketIndex - 1];
      if (!previousBracket) return null;

      const rateDifference = currentBracket.rate - previousBracket.rate;
      const amountToReduce = distanceFromMin;
      const potentialSavings = Math.round(amountToReduce * rateDifference);

      if (potentialSavings < 10000) return null; // Less than $100 savings

      return createOptimization({
        type: 'tax',
        title: 'Tax Bracket Optimization',
        explanation: `Your taxable income of $${Math.round(taxableIncome / 100).toLocaleString()} is just above the ${(previousBracket.rate * 100).toFixed(0)}% tax bracket. By increasing pre-tax retirement contributions by $${Math.round(amountToReduce / 100).toLocaleString()}, you could drop to a lower marginal rate.`,
        action: `Increase 401(k) or traditional IRA contributions by $${Math.round(amountToReduce / 100).toLocaleString()}/year to save approximately $${Math.round(potentialSavings / 100).toLocaleString()} in federal taxes.`,
        impact: {
          monthlyChange: Math.round(potentialSavings / 12),
          annualChange: potentialSavings,
          lifetimeChange: potentialSavings * 20, // Rough estimate
          retirementDateChange: -Math.round((potentialSavings * 12) / year.grossIncome),
          metricAffected: 'Federal Tax',
        },
        confidence: 'high',
        prerequisites: [
          'Have access to 401(k) or traditional IRA',
          'Not already at contribution limit',
        ],
        yearApplicable: year.year,
      });
    }

    return null;
  },
};

/**
 * Detect if user is not maximizing employer 401(k) match.
 */
const employerMatchRule: ScannerRule = {
  id: 'employer-match-alert',
  name: 'Employer Match Alert',
  type: 'tax',
  scan: (profile, _trajectory, year): Optimization | null => {
    // Find retirement assets with employer match
    const retirementAssets = profile.assets.filter(
      (a) =>
        (a.type === 'retirement_pretax' || a.type === 'retirement_roth') &&
        a.employerMatch !== null &&
        a.matchLimit !== null &&
        a.employerMatch > 0
    );

    for (const asset of retirementAssets) {
      if (asset.employerMatch === null || asset.matchLimit === null) continue;

      // Calculate max employer contribution
      const maxEmployerContrib = Math.round(year.grossIncome * asset.matchLimit * asset.employerMatch);

      // Find actual employer contribution in trajectory
      const assetState = year.assets.find((a) => a.assetId === asset.id);
      if (!assetState) continue;

      const actualEmployerContrib = assetState.employerMatchThisYear;

      // If not getting full match
      if (actualEmployerContrib < maxEmployerContrib * 0.95) {
        const missedMatch = maxEmployerContrib - actualEmployerContrib;
        const requiredIncrease = Math.round(missedMatch / asset.employerMatch);

        return createOptimization({
          type: 'tax',
          title: 'Free Money: Employer Match',
          explanation: `You're leaving $${Math.round(missedMatch / 100).toLocaleString()} of employer 401(k) match on the table. Your employer matches ${(asset.employerMatch * 100).toFixed(0)}% of contributions up to ${(asset.matchLimit * 100).toFixed(0)}% of your salary.`,
          action: `Increase your ${asset.name} contribution by $${Math.round(requiredIncrease / 100).toLocaleString()}/year ($${Math.round(requiredIncrease / 1200).toLocaleString()}/month) to capture the full employer match.`,
          impact: {
            monthlyChange: Math.round(missedMatch / 12),
            annualChange: missedMatch,
            lifetimeChange: missedMatch * 30, // 30 years of compounding
            retirementDateChange: -Math.round((missedMatch * 12) / year.grossIncome),
            metricAffected: 'Retirement Savings',
          },
          confidence: 'high',
          prerequisites: ['Have access to employer 401(k)'],
          yearApplicable: year.year,
        });
      }
    }

    return null;
  },
};

/**
 * Detect low-income years that could be good for Roth conversions.
 */
const rothConversionRule: ScannerRule = {
  id: 'roth-conversion-window',
  name: 'Roth Conversion Window',
  type: 'tax',
  scan: (profile, _trajectory, year, previousYear): Optimization | null => {
    // Only suggest if income dropped significantly
    if (!previousYear) return null;
    if (year.grossIncome >= previousYear.grossIncome * 0.7) return null;

    // Check if user has pre-tax retirement assets
    const pretaxAssets = profile.assets.filter((a) => a.type === 'retirement_pretax');
    if (pretaxAssets.length === 0) return null;

    const totalPretax = pretaxAssets.reduce((sum, a) => {
      const state = year.assets.find((s) => s.assetId === a.id);
      return sum + (state?.balance ?? 0);
    }, 0);

    if (totalPretax < 1000000) return null; // Less than $10k, not worth it

    // Find current bracket
    const { taxFilingStatus } = profile.assumptions;
    const brackets = FEDERAL_TAX_BRACKETS[taxFilingStatus];
    let currentBracket = brackets[0];
    for (const bracket of brackets) {
      if (year.grossIncome >= bracket.min && year.grossIncome < bracket.max) {
        currentBracket = bracket;
        break;
      }
    }

    if (!currentBracket || currentBracket.rate >= 0.22) return null; // Already in 22%+ bracket

    // Calculate room in current bracket
    const roomInBracket = currentBracket.max - year.grossIncome;
    const suggestedConversion = Math.min(roomInBracket, totalPretax * 0.1);

    if (suggestedConversion < 500000) return null; // Less than $5k

    const taxOnConversion = Math.round(suggestedConversion * currentBracket.rate);

    return createOptimization({
      type: 'tax',
      title: 'Roth Conversion Opportunity',
      explanation: `Your income is lower than usual this year, putting you in the ${(currentBracket.rate * 100).toFixed(0)}% tax bracket. This is a good time to convert some traditional IRA/401(k) funds to Roth, paying taxes at a lower rate now.`,
      action: `Consider converting up to $${Math.round(suggestedConversion / 100).toLocaleString()} from traditional to Roth accounts. You'd pay approximately $${Math.round(taxOnConversion / 100).toLocaleString()} in taxes now to avoid higher taxes later.`,
      impact: {
        monthlyChange: 0,
        annualChange: 0,
        lifetimeChange: Math.round(suggestedConversion * 0.1), // Rough estimate of tax savings
        retirementDateChange: 0,
        metricAffected: 'Tax Diversification',
      },
      confidence: 'medium',
      prerequisites: [
        'Have pre-tax retirement accounts',
        'Have cash available for tax payment',
        'Expect to be in higher tax bracket in retirement',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * Detect unused tax-advantaged contribution space.
 */
const taxAdvantagedSpaceRule: ScannerRule = {
  id: 'tax-advantaged-space',
  name: 'Tax-Advantaged Space',
  type: 'tax',
  scan: (profile, _trajectory, year): Optimization | null => {
    // 2024 limits
    const LIMIT_401K = 2300000; // $23,000
    const LIMIT_IRA = 700000; // $7,000

    // Calculate total retirement contributions
    const retirementContributions = profile.assets
      .filter((a) => a.type === 'retirement_pretax' || a.type === 'retirement_roth')
      .reduce((sum, a) => sum + a.monthlyContribution * 12, 0);

    const has401k = profile.assets.some(
      (a) => a.type === 'retirement_pretax' && a.employerMatch !== null
    );

    const accountLimit = has401k ? LIMIT_401K : LIMIT_IRA;
    const unusedSpace = accountLimit - retirementContributions;

    if (unusedSpace < 100000) return null; // Less than $1k unused

    const accountType = has401k ? '401(k)' : 'IRA';

    // Calculate tax savings from maxing out
    const taxSavings = Math.round(unusedSpace * year.effectiveTaxRate);

    return createOptimization({
      type: 'tax',
      title: 'Unused Tax-Advantaged Space',
      explanation: `You're contributing $${Math.round(retirementContributions / 100).toLocaleString()}/year to retirement accounts, leaving $${Math.round(unusedSpace / 100).toLocaleString()} of tax-advantaged ${accountType} space unused.`,
      action: `Increase ${accountType} contributions by $${Math.round(unusedSpace / 1200).toLocaleString()}/month to maximize your tax-advantaged space and save approximately $${Math.round(taxSavings / 100).toLocaleString()}/year in taxes.`,
      impact: {
        monthlyChange: Math.round(taxSavings / 12),
        annualChange: taxSavings,
        lifetimeChange: taxSavings * 20,
        retirementDateChange: -Math.round((taxSavings * 24) / year.grossIncome),
        metricAffected: 'Tax-Advantaged Savings',
      },
      confidence: year.discretionaryIncome > unusedSpace ? 'high' : 'low',
      prerequisites: [
        `Have access to ${accountType}`,
        'Have sufficient cash flow to increase contributions',
      ],
      yearApplicable: year.year,
    });
  },
};

/**
 * All tax optimization rules.
 */
export const TAX_RULES: ScannerRule[] = [
  bracketBoundaryRule,
  employerMatchRule,
  rothConversionRule,
  taxAdvantagedSpaceRule,
];

import { describe, it, expect } from 'vitest';
import { TAX_RULES } from '@scanner/tax-rules';
import { createProfile } from '@models/profile';
import { createIncome } from '@models/income';
import { createAsset } from '@models/asset';
import { dollarsToCents } from '@models/common';
import { createEmptyTrajectoryYear } from '@models/trajectory';

describe('tax-rules', () => {
  describe('TAX_RULES array', () => {
    it('should have all expected rules', () => {
      const ruleIds = TAX_RULES.map((r) => r.id);

      expect(ruleIds).toContain('tax-bracket-boundary');
      expect(ruleIds).toContain('employer-match-alert');
      expect(ruleIds).toContain('roth-conversion-window');
      expect(ruleIds).toContain('tax-advantaged-space');
    });
  });

  describe('tax-advantaged-space rule', () => {
    const rule = TAX_RULES.find((r) => r.id === 'tax-advantaged-space');

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should detect unused 401k space', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000),
          }),
        ],
        assets: [
          createAsset({
            name: '401k',
            type: 'retirement_pretax',
            balance: dollarsToCents(50000),
            monthlyContribution: dollarsToCents(500), // $6k/year, well under $23k limit
            expectedReturn: 0.07,
            employerMatch: 0.5,
            matchLimit: 0.06,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 85,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const year = createEmptyTrajectoryYear(2026, 30);
      year.grossIncome = dollarsToCents(100000);
      year.effectiveTaxRate = 0.22;
      year.discretionaryIncome = dollarsToCents(30000);

      const result = rule?.scan(profile, { profileId: '', generatedAt: new Date(), years: [], milestones: [], summary: { totalYears: 0, retirementYear: null, retirementAge: null, totalLifetimeIncome: 0, totalLifetimeTaxes: 0, totalLifetimeInterest: 0, totalLifetimeWorkHours: 0, netWorthAtRetirement: 0, netWorthAtEnd: 0, goalsAchieved: 0, goalsMissed: 0, averageEffectiveHourlyRate: 0 } }, year);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('tax');
      expect(result?.title).toBe('Unused Tax-Advantaged Space');
    });

    it('should not trigger when 401k is maxed out', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000),
          }),
        ],
        assets: [
          createAsset({
            name: '401k',
            type: 'retirement_pretax',
            balance: dollarsToCents(50000),
            monthlyContribution: dollarsToCents(1917), // ~$23k/year, at the limit
            expectedReturn: 0.07,
            employerMatch: 0.5,
            matchLimit: 0.06,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 85,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const year = createEmptyTrajectoryYear(2026, 30);
      year.grossIncome = dollarsToCents(100000);
      year.effectiveTaxRate = 0.22;
      year.discretionaryIncome = dollarsToCents(30000);

      const result = rule?.scan(profile, { profileId: '', generatedAt: new Date(), years: [], milestones: [], summary: { totalYears: 0, retirementYear: null, retirementAge: null, totalLifetimeIncome: 0, totalLifetimeTaxes: 0, totalLifetimeInterest: 0, totalLifetimeWorkHours: 0, netWorthAtRetirement: 0, netWorthAtEnd: 0, goalsAchieved: 0, goalsMissed: 0, averageEffectiveHourlyRate: 0 } }, year);

      expect(result).toBeNull();
    });

    it('should include catch-up contributions for age 50+', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000),
          }),
        ],
        assets: [
          createAsset({
            name: '401k',
            type: 'retirement_pretax',
            balance: dollarsToCents(500000),
            monthlyContribution: dollarsToCents(500), // $6k/year
            expectedReturn: 0.07,
            employerMatch: 0.5,
            matchLimit: 0.06,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 85,
          currentAge: 50, // Age 50, eligible for catch-up
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const currentYear = new Date().getFullYear();
      const year = createEmptyTrajectoryYear(currentYear, 50);
      year.grossIncome = dollarsToCents(100000);
      year.effectiveTaxRate = 0.22;
      year.discretionaryIncome = dollarsToCents(30000);

      const result = rule?.scan(profile, { profileId: '', generatedAt: new Date(), years: [], milestones: [], summary: { totalYears: 0, retirementYear: null, retirementAge: null, totalLifetimeIncome: 0, totalLifetimeTaxes: 0, totalLifetimeInterest: 0, totalLifetimeWorkHours: 0, netWorthAtRetirement: 0, netWorthAtEnd: 0, goalsAchieved: 0, goalsMissed: 0, averageEffectiveHourlyRate: 0 } }, year);

      expect(result).not.toBeNull();
      // Should mention catch-up contribution in explanation
      expect(result?.explanation).toContain('catch-up');
    });
  });

  describe('employer-match-alert rule', () => {
    const rule = TAX_RULES.find((r) => r.id === 'employer-match-alert');

    it('should exist', () => {
      expect(rule).toBeDefined();
    });

    it('should detect missed employer match', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000),
          }),
        ],
        assets: [
          createAsset({
            id: 'asset-1',
            name: '401k',
            type: 'retirement_pretax',
            balance: dollarsToCents(50000),
            monthlyContribution: dollarsToCents(100), // $1.2k/year, well under match limit
            expectedReturn: 0.07,
            employerMatch: 0.5, // 50% match
            matchLimit: 0.06, // Up to 6% of salary
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 85,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const year = createEmptyTrajectoryYear(2026, 30);
      year.grossIncome = dollarsToCents(100000);
      year.assets = [
        {
          assetId: 'asset-1',
          balance: dollarsToCents(51200),
          contributionsThisYear: dollarsToCents(1200),
          employerMatchThisYear: dollarsToCents(600), // Got $600, but max would be $3000
          growthThisYear: 0,
        },
      ];

      const result = rule?.scan(profile, { profileId: '', generatedAt: new Date(), years: [], milestones: [], summary: { totalYears: 0, retirementYear: null, retirementAge: null, totalLifetimeIncome: 0, totalLifetimeTaxes: 0, totalLifetimeInterest: 0, totalLifetimeWorkHours: 0, netWorthAtRetirement: 0, netWorthAtEnd: 0, goalsAchieved: 0, goalsMissed: 0, averageEffectiveHourlyRate: 0 } }, year);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('tax');
      expect(result?.title).toBe('Free Money: Employer Match');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { generateTrajectory, generateQuickTrajectory } from '@engine/projector';
import { createProfile } from '@models/profile';
import { createIncome } from '@models/income';
import { createDebt } from '@models/debt';
import { createAsset } from '@models/asset';
import { dollarsToCents } from '@models/common';

describe('projector', () => {
  describe('generateTrajectory', () => {
    it('should generate trajectory for empty profile', () => {
      const profile = createProfile({
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

      const trajectory = generateTrajectory(profile);

      expect(trajectory.profileId).toBe(profile.id);
      expect(trajectory.years.length).toBe(55); // 85 - 30 = 55 years
      expect(trajectory.summary.totalYears).toBe(55);
    });

    it('should project income with growth', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000), // $100k/year
            expectedGrowth: 0.03,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 35, // Short projection for testing
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const trajectory = generateTrajectory(profile);
      const firstYear = trajectory.years[0];
      const lastYear = trajectory.years[trajectory.years.length - 1];

      // First year should have base income
      expect(firstYear?.grossIncome).toBe(dollarsToCents(100000));

      // Last year should have grown income (5 years at 3%)
      // 100000 * (1.03)^4 = ~112,550
      if (lastYear) {
        expect(lastYear.grossIncome).toBeGreaterThan(dollarsToCents(112000));
        expect(lastYear.grossIncome).toBeLessThan(dollarsToCents(113000));
      }
    });

    it('should track debt payoff', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000),
          }),
        ],
        debts: [
          createDebt({
            name: 'Car Loan',
            type: 'auto',
            principal: dollarsToCents(10000),
            interestRate: 0.05,
            minimumPayment: dollarsToCents(500),
            actualPayment: dollarsToCents(500),
            termMonths: 24,
            monthsRemaining: 24,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 40, // Short projection
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const trajectory = generateTrajectory(profile);

      // Debt should be paid off within a few years
      const debtPayoffMilestone = trajectory.milestones.find(
        (m) => m.type === 'debt_payoff' && m.description.includes('Car Loan')
      );

      expect(debtPayoffMilestone).toBeDefined();

      // Verify total debt goes to zero
      const lastYear = trajectory.years[trajectory.years.length - 1];
      expect(lastYear?.totalDebt).toBe(0);
    });

    it('should track asset growth', () => {
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
            monthlyContribution: dollarsToCents(1000),
            expectedReturn: 0.07,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 40,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const trajectory = generateTrajectory(profile);

      const firstYear = trajectory.years[0];
      const lastYear = trajectory.years[trajectory.years.length - 1];

      // Assets should grow over time
      expect(lastYear?.totalAssets).toBeGreaterThan(firstYear?.totalAssets ?? 0);

      // Should accumulate significant assets over 10 years
      // Starting: $50k, contributing $12k/year, ~7% return
      expect(lastYear?.totalAssets).toBeGreaterThan(dollarsToCents(200000));
    });

    it('should calculate net worth correctly', () => {
      const profile = createProfile({
        income: [
          createIncome({
            name: 'Salary',
            type: 'salary',
            amount: dollarsToCents(100000),
          }),
        ],
        debts: [
          createDebt({
            name: 'Mortgage',
            type: 'mortgage',
            principal: dollarsToCents(200000),
            interestRate: 0.06,
            actualPayment: dollarsToCents(1200),
            propertyValue: dollarsToCents(250000),
          }),
        ],
        assets: [
          createAsset({
            name: 'Savings',
            type: 'savings',
            balance: dollarsToCents(50000),
            monthlyContribution: dollarsToCents(500),
            expectedReturn: 0.04,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 35,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const trajectory = generateTrajectory(profile);

      for (const year of trajectory.years) {
        // Net worth = total assets - total debt
        expect(year.netWorth).toBe(year.totalAssets - year.totalDebt);
      }
    });

    it('should detect retirement readiness', () => {
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
            monthlyContribution: dollarsToCents(2000),
            expectedReturn: 0.07,
          }),
        ],
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80,
          lifeExpectancy: 60,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const trajectory = generateTrajectory(profile);

      // Should have a retirement_ready milestone at some point
      const retirementMilestone = trajectory.milestones.find(
        (m) => m.type === 'retirement_ready'
      );

      expect(retirementMilestone).toBeDefined();
      expect(trajectory.summary.retirementYear).not.toBeNull();
    });

    it('should use configurable income replacement ratio', () => {
      // Create two profiles with different income replacement ratios
      const baseProfile = {
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
            balance: dollarsToCents(1000000),
            monthlyContribution: dollarsToCents(1000),
            expectedReturn: 0.07,
          }),
        ],
      };

      const profile80 = createProfile({
        ...baseProfile,
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.80, // 80% replacement
          lifeExpectancy: 60,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const profile60 = createProfile({
        ...baseProfile,
        assumptions: {
          inflationRate: 0.03,
          marketReturn: 0.07,
          homeAppreciation: 0.03,
          salaryGrowth: 0.02,
          retirementWithdrawalRate: 0.04,
          incomeReplacementRatio: 0.60, // 60% replacement - should retire sooner
          lifeExpectancy: 60,
          currentAge: 30,
          taxFilingStatus: 'single',
          state: 'CA',
        },
      });

      const trajectory80 = generateTrajectory(profile80);
      const trajectory60 = generateTrajectory(profile60);

      // With lower income replacement, should be retirement ready sooner
      const retirementYear80 = trajectory80.summary.retirementYear;
      const retirementYear60 = trajectory60.summary.retirementYear;

      expect(retirementYear60).not.toBeNull();
      expect(retirementYear80).not.toBeNull();

      if (retirementYear60 !== null && retirementYear80 !== null) {
        expect(retirementYear60).toBeLessThanOrEqual(retirementYear80);
      }
    });
  });

  describe('generateQuickTrajectory', () => {
    it('should generate shortened trajectory', () => {
      const profile = createProfile({
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

      const quickTrajectory = generateQuickTrajectory(profile, 10);

      expect(quickTrajectory.years.length).toBe(10);
      expect(quickTrajectory.summary.totalYears).toBe(10);
    });

    it('should default to 10 years', () => {
      const profile = createProfile({
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

      const quickTrajectory = generateQuickTrajectory(profile);

      expect(quickTrajectory.years.length).toBe(10);
    });
  });
});

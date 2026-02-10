import { describe, it, expect } from 'vitest';
import {
  calculateOptimizationImpact,
  estimateLifetimeValue,
  estimateOneTimeImpact,
} from '@scanner/impact-calculator';
import { createProfile } from '@models/profile';
import { createIncome } from '@models/income';
import { createAsset } from '@models/asset';
import { createDebt } from '@models/debt';
import { dollarsToCents } from '@models/common';
import { generateTrajectory } from '@engine/projector';

function makeTestProfile() {
  return createProfile({
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
        monthlyContribution: dollarsToCents(500),
        expectedReturn: 0.07,
        employerMatch: 0.5,
        matchLimit: 0.06,
      }),
      createAsset({
        name: 'Savings',
        type: 'savings',
        balance: dollarsToCents(20000),
        monthlyContribution: dollarsToCents(200),
        expectedReturn: 0.02,
      }),
    ],
    debts: [
      createDebt({
        name: 'Credit Card',
        type: 'credit',
        principal: dollarsToCents(5000),
        interestRate: 0.20,
        minimumPayment: dollarsToCents(200),
        actualPayment: dollarsToCents(300),
      }),
    ],
    assumptions: {
      inflationRate: 0.03,
      marketReturn: 0.07,
      homeAppreciation: 0.03,
      salaryGrowth: 0.02,
      retirementWithdrawalRate: 0.04,
      incomeReplacementRatio: 0.80,
      lifeExpectancy: 65,
      currentAge: 30,
      taxFilingStatus: 'single',
      state: 'CA',
      taxYear: 2024,
    },
  });
}

describe('impact-calculator', () => {
  describe('estimateLifetimeValue', () => {
    it('should compute future value of annuity correctly', () => {
      // $1000/year at 7% for 30 years = $1000 * ((1.07^30 - 1) / 0.07)
      const result = estimateLifetimeValue(dollarsToCents(1000), 0.07, 30);
      // Expected: ~$94,461 in cents
      expect(result).toBeGreaterThan(dollarsToCents(90000));
      expect(result).toBeLessThan(dollarsToCents(100000));
    });

    it('should handle zero rate', () => {
      const result = estimateLifetimeValue(dollarsToCents(1000), 0, 30);
      expect(result).toBe(dollarsToCents(30000)); // Simple multiplication
    });

    it('should handle zero years', () => {
      const result = estimateLifetimeValue(dollarsToCents(1000), 0.07, 0);
      expect(result).toBe(dollarsToCents(1000)); // Just the annual amount
    });

    it('should scale with rate — higher rate produces higher lifetime value', () => {
      const low = estimateLifetimeValue(dollarsToCents(1000), 0.03, 30);
      const high = estimateLifetimeValue(dollarsToCents(1000), 0.10, 30);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('estimateOneTimeImpact', () => {
    it('should compound a one-time amount correctly', () => {
      // $10,000 at 7% for 30 years = $10,000 * 1.07^30
      const result = estimateOneTimeImpact(dollarsToCents(10000), 0.07, 30);
      // Expected: ~$76,123 in cents
      expect(result).toBeGreaterThan(dollarsToCents(70000));
      expect(result).toBeLessThan(dollarsToCents(80000));
    });

    it('should handle zero years', () => {
      const result = estimateOneTimeImpact(dollarsToCents(10000), 0.07, 0);
      expect(result).toBe(dollarsToCents(10000));
    });
  });

  describe('calculateOptimizationImpact', () => {
    it('should show positive lifetime change when increasing contributions', () => {
      const profile = makeTestProfile();
      const trajectory = generateTrajectory(profile);

      const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
        const retirement = modified.assets.find((a) => a.type === 'retirement_pretax');
        if (retirement) {
          retirement.monthlyContribution += dollarsToCents(500); // Add $500/month
        }
      });

      // More contributions should lead to higher net worth
      expect(impact.lifetimeChange).toBeGreaterThan(0);
    });

    it('should show positive lifetime change when increasing contributions significantly', () => {
      const profile = makeTestProfile();
      const trajectory = generateTrajectory(profile);

      const impact = calculateOptimizationImpact(profile, trajectory, (modified) => {
        const retirement = modified.assets.find((a) => a.type === 'retirement_pretax');
        if (retirement) {
          retirement.monthlyContribution += dollarsToCents(1000); // Add $1000/month
        }
      });

      // Significantly more contributions over 35 years should produce large net worth gain
      expect(impact.lifetimeChange).toBeGreaterThan(dollarsToCents(100000));
    });

    it('should not change when profile is unchanged', () => {
      const profile = makeTestProfile();
      const trajectory = generateTrajectory(profile);

      const impact = calculateOptimizationImpact(profile, trajectory, () => {
        // No modification
      });

      expect(impact.lifetimeChange).toBe(0);
      expect(impact.retirementDateChange).toBe(0);
    });

    it('should not mutate the original profile', () => {
      const profile = makeTestProfile();
      const originalContribution = profile.assets[0]!.monthlyContribution;
      const trajectory = generateTrajectory(profile);

      calculateOptimizationImpact(profile, trajectory, (modified) => {
        const retirement = modified.assets[0];
        if (retirement) {
          retirement.monthlyContribution += dollarsToCents(1000);
        }
      });

      // Original profile should be untouched
      expect(profile.assets[0]!.monthlyContribution).toBe(originalContribution);
    });
  });
});

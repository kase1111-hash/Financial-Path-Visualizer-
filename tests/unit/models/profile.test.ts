import { describe, it, expect } from 'vitest';
import {
  createProfile,
  updateProfile,
  cloneProfile,
  calculateTotalAnnualIncome,
  calculateTotalDebt,
  calculateNetWorth,
  getProfileTotalAssets,
  getProfileSummary,
  isProfileComplete,
} from '@models/profile';
import { createIncome } from '@models/income';
import { createDebt } from '@models/debt';
import { createAsset } from '@models/asset';
import { dollarsToCents } from '@models/common';

describe('profile', () => {
  describe('createProfile', () => {
    it('should create profile with defaults', () => {
      const profile = createProfile();
      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('My Financial Plan');
      expect(profile.income).toEqual([]);
      expect(profile.debts).toEqual([]);
      expect(profile.assets).toEqual([]);
      expect(profile.goals).toEqual([]);
      expect(profile.assumptions).toBeDefined();
    });

    it('should override defaults', () => {
      const profile = createProfile({ name: 'Test Plan' });
      expect(profile.name).toBe('Test Plan');
    });
  });

  describe('updateProfile', () => {
    it('should update profile and set updatedAt', () => {
      const original = createProfile();
      const originalUpdatedAt = original.updatedAt;

      // Small delay to ensure different timestamp
      const updated = updateProfile(original, { name: 'Updated Plan' });

      expect(updated.name).toBe('Updated Plan');
      expect(updated.id).toBe(original.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('cloneProfile', () => {
    it('should create a copy with new ID', () => {
      const original = createProfile({ name: 'Original' });
      const clone = cloneProfile(original);

      expect(clone.id).not.toBe(original.id);
      expect(clone.name).toBe('Original (Copy)');
    });

    it('should use custom name if provided', () => {
      const original = createProfile();
      const clone = cloneProfile(original, 'My Clone');

      expect(clone.name).toBe('My Clone');
    });
  });

  describe('calculateTotalAnnualIncome', () => {
    it('should sum all income sources', () => {
      const profile = createProfile({
        income: [
          createIncome({ type: 'salary', amount: dollarsToCents(75000) }),
          createIncome({ type: 'salary', amount: dollarsToCents(25000) }),
        ],
      });
      expect(calculateTotalAnnualIncome(profile)).toBe(dollarsToCents(100000));
    });

    it('should calculate hourly income correctly', () => {
      const profile = createProfile({
        income: [
          createIncome({
            type: 'hourly',
            amount: dollarsToCents(50), // $50/hour
            hoursPerWeek: 40,
          }),
        ],
      });
      // $50 * 40 * 52 = $104,000
      expect(calculateTotalAnnualIncome(profile)).toBe(dollarsToCents(104000));
    });

    it('should return 0 for no income', () => {
      const profile = createProfile();
      expect(calculateTotalAnnualIncome(profile)).toBe(0);
    });
  });

  describe('calculateTotalDebt', () => {
    it('should sum all debt principals', () => {
      const profile = createProfile({
        debts: [
          createDebt({ principal: dollarsToCents(200000) }),
          createDebt({ principal: dollarsToCents(25000) }),
        ],
      });
      expect(calculateTotalDebt(profile)).toBe(dollarsToCents(225000));
    });

    it('should return 0 for no debts', () => {
      const profile = createProfile();
      expect(calculateTotalDebt(profile)).toBe(0);
    });
  });

  describe('getProfileTotalAssets', () => {
    it('should sum all asset balances', () => {
      const profile = createProfile({
        assets: [
          createAsset({ balance: dollarsToCents(50000) }),
          createAsset({ balance: dollarsToCents(25000) }),
        ],
      });
      expect(getProfileTotalAssets(profile)).toBe(dollarsToCents(75000));
    });
  });

  describe('calculateNetWorth', () => {
    it('should calculate assets minus debts', () => {
      const profile = createProfile({
        assets: [createAsset({ balance: dollarsToCents(100000) })],
        debts: [createDebt({ principal: dollarsToCents(75000) })],
      });
      expect(calculateNetWorth(profile)).toBe(dollarsToCents(25000));
    });

    it('should handle negative net worth', () => {
      const profile = createProfile({
        assets: [createAsset({ balance: dollarsToCents(50000) })],
        debts: [createDebt({ principal: dollarsToCents(200000) })],
      });
      expect(calculateNetWorth(profile)).toBe(dollarsToCents(-150000));
    });
  });

  describe('isProfileComplete', () => {
    it('should return false for empty profile', () => {
      const profile = createProfile();
      expect(isProfileComplete(profile)).toBe(false);
    });

    it('should return true when income exists', () => {
      const profile = createProfile({
        income: [createIncome()],
      });
      expect(isProfileComplete(profile)).toBe(true);
    });
  });

  describe('getProfileSummary', () => {
    it('should return complete summary', () => {
      const profile = createProfile({
        income: [createIncome({ type: 'salary', amount: dollarsToCents(120000) })],
        debts: [createDebt({ principal: dollarsToCents(200000), actualPayment: dollarsToCents(1500) })],
        assets: [createAsset({ balance: dollarsToCents(50000), monthlyContribution: dollarsToCents(500) })],
      });

      const summary = getProfileSummary(profile);

      expect(summary.totalAnnualIncome).toBe(dollarsToCents(120000));
      expect(summary.totalMonthlyIncome).toBe(dollarsToCents(10000));
      expect(summary.totalDebt).toBe(dollarsToCents(200000));
      expect(summary.totalAssets).toBe(dollarsToCents(50000));
      expect(summary.netWorth).toBe(dollarsToCents(-150000));
      expect(summary.incomeSourceCount).toBe(1);
      expect(summary.debtCount).toBe(1);
      expect(summary.assetCount).toBe(1);
    });
  });
});

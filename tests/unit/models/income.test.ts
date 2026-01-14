import { describe, it, expect } from 'vitest';
import {
  createIncome,
  calculateAnnualIncome,
  calculateHourlyRate,
  calculateAnnualHours,
  isIncomeActive,
  projectIncomeToYear,
} from '@models/income';
import { dollarsToCents } from '@models/common';

describe('income', () => {
  describe('createIncome', () => {
    it('should create income with defaults', () => {
      const income = createIncome();
      expect(income.id).toBeDefined();
      expect(income.name).toBe('Primary Income');
      expect(income.type).toBe('salary');
      expect(income.hoursPerWeek).toBe(40);
      expect(income.expectedGrowth).toBe(0.02);
    });

    it('should override defaults with provided values', () => {
      const income = createIncome({
        name: 'Side Job',
        type: 'hourly',
        amount: dollarsToCents(25),
      });
      expect(income.name).toBe('Side Job');
      expect(income.type).toBe('hourly');
      expect(income.amount).toBe(2500);
    });
  });

  describe('calculateAnnualIncome', () => {
    it('should return amount for salary income', () => {
      const income = createIncome({
        type: 'salary',
        amount: dollarsToCents(75000),
      });
      expect(calculateAnnualIncome(income)).toBe(dollarsToCents(75000));
    });

    it('should calculate annual for hourly income', () => {
      const income = createIncome({
        type: 'hourly',
        amount: dollarsToCents(25), // $25/hour
        hoursPerWeek: 40,
      });
      // $25 * 40 hours * 52 weeks = $52,000
      expect(calculateAnnualIncome(income)).toBe(dollarsToCents(52000));
    });
  });

  describe('calculateHourlyRate', () => {
    it('should calculate hourly rate from salary', () => {
      const income = createIncome({
        type: 'salary',
        amount: dollarsToCents(104000), // $104,000/year
        hoursPerWeek: 40,
      });
      // $104,000 / (40 * 52) = $50/hour
      expect(calculateHourlyRate(income)).toBe(dollarsToCents(50));
    });

    it('should return the hourly rate for hourly income', () => {
      const income = createIncome({
        type: 'hourly',
        amount: dollarsToCents(30),
        hoursPerWeek: 40,
      });
      expect(calculateHourlyRate(income)).toBe(dollarsToCents(30));
    });

    it('should return 0 for zero hours', () => {
      const income = createIncome({
        type: 'salary',
        amount: dollarsToCents(50000),
        hoursPerWeek: 0,
      });
      expect(calculateHourlyRate(income)).toBe(0);
    });
  });

  describe('calculateAnnualHours', () => {
    it('should calculate annual hours', () => {
      const income = createIncome({ hoursPerWeek: 40 });
      expect(calculateAnnualHours(income)).toBe(2080);
    });

    it('should handle part-time hours', () => {
      const income = createIncome({ hoursPerWeek: 20 });
      expect(calculateAnnualHours(income)).toBe(1040);
    });
  });

  describe('isIncomeActive', () => {
    it('should return true for income with no end date', () => {
      const income = createIncome({ endDate: null });
      expect(isIncomeActive(income, { month: 6, year: 2030 })).toBe(true);
    });

    it('should return true when date is before end date', () => {
      const income = createIncome({ endDate: { month: 12, year: 2030 } });
      expect(isIncomeActive(income, { month: 6, year: 2030 })).toBe(true);
    });

    it('should return true when date equals end date', () => {
      const income = createIncome({ endDate: { month: 12, year: 2030 } });
      expect(isIncomeActive(income, { month: 12, year: 2030 })).toBe(true);
    });

    it('should return false when date is after end date', () => {
      const income = createIncome({ endDate: { month: 12, year: 2030 } });
      expect(isIncomeActive(income, { month: 1, year: 2031 })).toBe(false);
    });
  });

  describe('projectIncomeToYear', () => {
    it('should return same amount for current year', () => {
      const income = createIncome({
        type: 'salary',
        amount: dollarsToCents(100000),
        expectedGrowth: 0.03,
      });
      expect(projectIncomeToYear(income, 2024, 2024)).toBe(dollarsToCents(100000));
    });

    it('should apply growth for future years', () => {
      const income = createIncome({
        type: 'salary',
        amount: dollarsToCents(100000),
        expectedGrowth: 0.03,
      });
      // After 1 year: $100,000 * 1.03 = $103,000
      expect(projectIncomeToYear(income, 2024, 2025)).toBe(dollarsToCents(103000));
    });

    it('should compound growth over multiple years', () => {
      const income = createIncome({
        type: 'salary',
        amount: dollarsToCents(100000),
        expectedGrowth: 0.10, // 10% for easy math
      });
      // After 2 years: $100,000 * 1.10^2 = $121,000
      expect(projectIncomeToYear(income, 2024, 2026)).toBe(dollarsToCents(121000));
    });
  });
});

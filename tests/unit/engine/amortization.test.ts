import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  calculateMonthsToPayoff,
  calculateTotalInterest,
  generateAmortizationSchedule,
  calculateDebtYear,
  calculateExtraPaymentSavings,
  calculateAvalancheOrder,
  calculateSnowballOrder,
} from '@engine/amortization';
import { createDebt } from '@models/debt';
import { dollarsToCents } from '@models/common';

describe('amortization', () => {
  describe('calculateMonthlyPayment', () => {
    it('should calculate correct monthly payment for standard mortgage', () => {
      // $300,000 loan, 6.5% rate, 30 years
      const payment = calculateMonthlyPayment(
        dollarsToCents(300000),
        0.065,
        360
      );

      // Standard mortgage payment around $1,896/month
      expect(payment).toBeGreaterThan(dollarsToCents(1800));
      expect(payment).toBeLessThan(dollarsToCents(2000));
    });

    it('should handle zero interest rate', () => {
      const payment = calculateMonthlyPayment(
        dollarsToCents(12000),
        0,
        12
      );

      // $12,000 / 12 months = $1,000/month
      expect(payment).toBe(dollarsToCents(1000));
    });

    it('should return zero for zero term', () => {
      const payment = calculateMonthlyPayment(dollarsToCents(10000), 0.05, 0);
      expect(payment).toBe(0);
    });
  });

  describe('calculateMonthsToPayoff', () => {
    it('should calculate correct payoff time', () => {
      // $10,000 at 10% with $200/month payment
      const months = calculateMonthsToPayoff(
        dollarsToCents(10000),
        0.10,
        dollarsToCents(200)
      );

      // Should take about 65 months
      expect(months).toBeGreaterThan(60);
      expect(months).toBeLessThan(70);
    });

    it('should return Infinity if payment does not cover interest', () => {
      // $100,000 at 10% = $833/month interest
      // Payment of $500 doesn't cover it
      const months = calculateMonthsToPayoff(
        dollarsToCents(100000),
        0.10,
        dollarsToCents(500)
      );

      expect(months).toBe(Infinity);
    });

    it('should return 0 for zero balance', () => {
      const months = calculateMonthsToPayoff(0, 0.10, dollarsToCents(100));
      expect(months).toBe(0);
    });
  });

  describe('calculateTotalInterest', () => {
    it('should calculate total interest over loan life', () => {
      // Standard mortgage
      const interest = calculateTotalInterest(
        dollarsToCents(300000),
        0.065,
        dollarsToCents(1896)
      );

      // Should pay significant interest over 30 years
      expect(interest).toBeGreaterThan(dollarsToCents(300000));
    });

    it('should return Infinity for insufficient payment', () => {
      const interest = calculateTotalInterest(
        dollarsToCents(100000),
        0.10,
        dollarsToCents(500)
      );

      expect(interest).toBe(Infinity);
    });
  });

  describe('generateAmortizationSchedule', () => {
    it('should generate correct number of payments', () => {
      const schedule = generateAmortizationSchedule(
        dollarsToCents(12000),
        0.12,
        dollarsToCents(1100),
        24
      );

      // Should pay off in about 12 months
      expect(schedule.length).toBeGreaterThan(10);
      expect(schedule.length).toBeLessThan(15);
    });

    it('should have zero balance at end', () => {
      const schedule = generateAmortizationSchedule(
        dollarsToCents(10000),
        0.10,
        dollarsToCents(500),
        100
      );

      const lastPayment = schedule[schedule.length - 1];
      expect(lastPayment?.remainingBalance).toBe(0);
    });

    it('should have zero balance for a 30-year mortgage', () => {
      // Standard 30-year mortgage — the rounding fix must zero this out
      const principal = dollarsToCents(300000);
      const payment = calculateMonthlyPayment(principal, 0.065, 360);
      const schedule = generateAmortizationSchedule(principal, 0.065, payment, 360);

      const lastPayment = schedule[schedule.length - 1];
      expect(lastPayment?.remainingBalance).toBe(0);
    });

    it('should have total principal + interest equal total payments', () => {
      const principal = dollarsToCents(300000);
      const payment = calculateMonthlyPayment(principal, 0.065, 360);
      const schedule = generateAmortizationSchedule(principal, 0.065, payment, 360);

      const totalPrincipal = schedule.reduce((sum, p) => sum + p.principal, 0);
      const totalInterest = schedule.reduce((sum, p) => sum + p.interest, 0);
      const totalPayments = schedule.reduce((sum, p) => sum + p.totalPayment, 0);

      expect(totalPrincipal).toBe(principal);
      expect(totalPayments).toBe(totalPrincipal + totalInterest);
    });

    it('should track cumulative interest', () => {
      const schedule = generateAmortizationSchedule(
        dollarsToCents(10000),
        0.10,
        dollarsToCents(500),
        100
      );

      const lastPayment = schedule[schedule.length - 1];
      expect(lastPayment?.cumulativeInterest).toBeGreaterThan(0);
    });
  });

  describe('calculateDebtYear', () => {
    it('should calculate one year of payments', () => {
      const result = calculateDebtYear(
        dollarsToCents(100000),
        0.06,
        dollarsToCents(2000),
        2024
      );

      expect(result.year).toBe(2024);
      expect(result.startingBalance).toBe(dollarsToCents(100000));
      expect(result.endingBalance).toBeLessThan(dollarsToCents(100000));
      expect(result.principalPaid).toBeGreaterThan(0);
      expect(result.interestPaid).toBeGreaterThan(0);
      expect(result.isPaidOff).toBe(false);
    });

    it('should detect payoff within year', () => {
      // Small balance with large payment
      const result = calculateDebtYear(
        dollarsToCents(5000),
        0.10,
        dollarsToCents(1000),
        2024
      );

      expect(result.isPaidOff).toBe(true);
      expect(result.payoffMonth).not.toBeNull();
      expect(result.endingBalance).toBe(0);
    });

    it('should handle already paid off debt', () => {
      const result = calculateDebtYear(0, 0.06, dollarsToCents(500), 2024);

      expect(result.isPaidOff).toBe(true);
      expect(result.principalPaid).toBe(0);
      expect(result.interestPaid).toBe(0);
    });

    it('should not leave sub-cent rounding residuals', () => {
      // Use a principal and rate that tend to produce rounding residuals
      const result = calculateDebtYear(
        dollarsToCents(997.53),
        0.0799,
        dollarsToCents(200),
        2024
      );

      // Should either be exactly 0 or a clean remaining balance
      expect(result.endingBalance).toBeGreaterThanOrEqual(0);
      if (result.isPaidOff) {
        expect(result.endingBalance).toBe(0);
      }
    });
  });

  describe('calculateExtraPaymentSavings', () => {
    it('should calculate savings from extra payment', () => {
      const savings = calculateExtraPaymentSavings(
        dollarsToCents(100000),
        0.06,
        dollarsToCents(600),
        dollarsToCents(100)
      );

      expect(savings.monthsSaved).toBeGreaterThan(0);
      expect(savings.interestSaved).toBeGreaterThan(0);
    });
  });

  describe('calculateAvalancheOrder', () => {
    it('should sort by highest interest rate first', () => {
      const debts = [
        createDebt({ name: 'Low', principal: dollarsToCents(10000), interestRate: 0.05 }),
        createDebt({ name: 'High', principal: dollarsToCents(5000), interestRate: 0.22 }),
        createDebt({ name: 'Medium', principal: dollarsToCents(8000), interestRate: 0.10 }),
      ];

      const sorted = calculateAvalancheOrder(debts);

      expect(sorted[0]?.name).toBe('High');
      expect(sorted[1]?.name).toBe('Medium');
      expect(sorted[2]?.name).toBe('Low');
    });
  });

  describe('calculateSnowballOrder', () => {
    it('should sort by smallest balance first', () => {
      const debts = [
        createDebt({ name: 'Large', principal: dollarsToCents(20000), interestRate: 0.05 }),
        createDebt({ name: 'Small', principal: dollarsToCents(2000), interestRate: 0.10 }),
        createDebt({ name: 'Medium', principal: dollarsToCents(8000), interestRate: 0.22 }),
      ];

      const sorted = calculateSnowballOrder(debts);

      expect(sorted[0]?.name).toBe('Small');
      expect(sorted[1]?.name).toBe('Medium');
      expect(sorted[2]?.name).toBe('Large');
    });
  });
});

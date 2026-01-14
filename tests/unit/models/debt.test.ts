import { describe, it, expect } from 'vitest';
import {
  createDebt,
  createMortgage,
  calculateLTV,
  shouldPayPMI,
  calculateTotalMonthlyPayment,
  calculateHomeEquity,
  isHighInterestDebt,
  estimateAnnualInterest,
} from '@models/debt';
import { dollarsToCents } from '@models/common';

describe('debt', () => {
  describe('createDebt', () => {
    it('should create debt with defaults', () => {
      const debt = createDebt();
      expect(debt.id).toBeDefined();
      expect(debt.type).toBe('other');
      expect(debt.principal).toBe(0);
      expect(debt.propertyValue).toBeNull();
    });

    it('should override defaults', () => {
      const debt = createDebt({
        name: 'Car Loan',
        type: 'auto',
        principal: dollarsToCents(25000),
        interestRate: 0.06,
      });
      expect(debt.name).toBe('Car Loan');
      expect(debt.type).toBe('auto');
      expect(debt.principal).toBe(dollarsToCents(25000));
      expect(debt.interestRate).toBe(0.06);
    });
  });

  describe('createMortgage', () => {
    it('should create mortgage with defaults', () => {
      const mortgage = createMortgage();
      expect(mortgage.type).toBe('mortgage');
      expect(mortgage.name).toBe('Mortgage');
      expect(mortgage.pmiThreshold).toBe(0.8);
    });

    it('should override mortgage defaults', () => {
      const mortgage = createMortgage({
        principal: dollarsToCents(300000),
        propertyValue: dollarsToCents(400000),
      });
      expect(mortgage.principal).toBe(dollarsToCents(300000));
      expect(mortgage.propertyValue).toBe(dollarsToCents(400000));
    });
  });

  describe('calculateLTV', () => {
    it('should calculate LTV ratio', () => {
      const mortgage = createMortgage({
        principal: dollarsToCents(240000),
        propertyValue: dollarsToCents(300000),
      });
      expect(calculateLTV(mortgage)).toBe(0.8);
    });

    it('should return null for non-mortgage', () => {
      const debt = createDebt({ type: 'auto' });
      expect(calculateLTV(debt)).toBeNull();
    });

    it('should return null if no property value', () => {
      const mortgage = createMortgage({ propertyValue: null });
      expect(calculateLTV(mortgage)).toBeNull();
    });
  });

  describe('shouldPayPMI', () => {
    it('should return true when LTV > threshold', () => {
      const mortgage = createMortgage({
        principal: dollarsToCents(270000),
        propertyValue: dollarsToCents(300000),
        pmiThreshold: 0.8,
        pmiAmount: dollarsToCents(150),
      });
      expect(shouldPayPMI(mortgage)).toBe(true);
    });

    it('should return false when LTV <= threshold', () => {
      const mortgage = createMortgage({
        principal: dollarsToCents(240000),
        propertyValue: dollarsToCents(300000),
        pmiThreshold: 0.8,
        pmiAmount: dollarsToCents(150),
      });
      expect(shouldPayPMI(mortgage)).toBe(false);
    });

    it('should return false for non-mortgage', () => {
      const debt = createDebt({ type: 'auto' });
      expect(shouldPayPMI(debt)).toBe(false);
    });
  });

  describe('calculateTotalMonthlyPayment', () => {
    it('should return actual payment for non-mortgage', () => {
      const debt = createDebt({
        type: 'auto',
        actualPayment: dollarsToCents(500),
      });
      expect(calculateTotalMonthlyPayment(debt)).toBe(dollarsToCents(500));
    });

    it('should include escrow for mortgage', () => {
      const mortgage = createMortgage({
        actualPayment: dollarsToCents(1500),
        escrowTaxes: dollarsToCents(300),
        escrowInsurance: dollarsToCents(100),
        principal: dollarsToCents(200000),
        propertyValue: dollarsToCents(300000),
        pmiThreshold: 0.8,
        pmiAmount: null,
      });
      expect(calculateTotalMonthlyPayment(mortgage)).toBe(dollarsToCents(1900));
    });

    it('should include PMI when applicable', () => {
      const mortgage = createMortgage({
        actualPayment: dollarsToCents(1500),
        escrowTaxes: dollarsToCents(300),
        escrowInsurance: dollarsToCents(100),
        principal: dollarsToCents(270000),
        propertyValue: dollarsToCents(300000),
        pmiThreshold: 0.8,
        pmiAmount: dollarsToCents(150),
      });
      expect(calculateTotalMonthlyPayment(mortgage)).toBe(dollarsToCents(2050));
    });
  });

  describe('calculateHomeEquity', () => {
    it('should calculate equity', () => {
      const mortgage = createMortgage({
        principal: dollarsToCents(200000),
        propertyValue: dollarsToCents(300000),
      });
      expect(calculateHomeEquity(mortgage)).toBe(dollarsToCents(100000));
    });

    it('should return null for non-mortgage', () => {
      const debt = createDebt({ type: 'auto' });
      expect(calculateHomeEquity(debt)).toBeNull();
    });
  });

  describe('isHighInterestDebt', () => {
    it('should return true for rates > 10%', () => {
      const debt = createDebt({ interestRate: 0.22 });
      expect(isHighInterestDebt(debt)).toBe(true);
    });

    it('should return false for rates <= 10%', () => {
      const debt = createDebt({ interestRate: 0.065 });
      expect(isHighInterestDebt(debt)).toBe(false);
    });
  });

  describe('estimateAnnualInterest', () => {
    it('should estimate annual interest', () => {
      const debt = createDebt({
        principal: dollarsToCents(100000),
        interestRate: 0.06,
      });
      expect(estimateAnnualInterest(debt)).toBe(dollarsToCents(6000));
    });
  });
});

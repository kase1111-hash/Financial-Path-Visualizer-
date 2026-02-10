/**
 * Amortization Calculator
 *
 * Calculates loan amortization schedules and debt payoff projections.
 */

import type { Cents, Rate } from '@models/common';
import type { Debt } from '@models/debt';

/**
 * A single payment in an amortization schedule.
 */
export interface AmortizationPayment {
  /** Payment number (1-based) */
  paymentNumber: number;
  /** Principal portion of payment */
  principal: Cents;
  /** Interest portion of payment */
  interest: Cents;
  /** Total payment amount */
  totalPayment: Cents;
  /** Remaining balance after payment */
  remainingBalance: Cents;
  /** Cumulative interest paid to date */
  cumulativeInterest: Cents;
}

/**
 * Summary of a year's worth of debt payments.
 */
export interface YearlyDebtSummary {
  /** Year number */
  year: number;
  /** Starting balance at beginning of year */
  startingBalance: Cents;
  /** Ending balance at end of year */
  endingBalance: Cents;
  /** Total principal paid during year */
  principalPaid: Cents;
  /** Total interest paid during year */
  interestPaid: Cents;
  /** Total payments made during year */
  totalPaid: Cents;
  /** Whether debt was fully paid off this year */
  isPaidOff: boolean;
  /** Month debt was paid off (1-12), or null if not paid off */
  payoffMonth: number | null;
}

/**
 * Calculate monthly payment for a loan.
 */
export function calculateMonthlyPayment(
  principal: Cents,
  annualRate: Rate,
  termMonths: number
): Cents {
  if (termMonths <= 0) return 0;
  if (annualRate === 0) return Math.round(principal / termMonths);

  const monthlyRate = annualRate / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = (principal * monthlyRate * factor) / (factor - 1);

  return Math.round(payment);
}

/**
 * Calculate remaining months to payoff given a payment amount.
 */
export function calculateMonthsToPayoff(
  principal: Cents,
  annualRate: Rate,
  monthlyPayment: Cents
): number {
  if (principal <= 0) return 0;
  if (monthlyPayment <= 0) return Infinity;

  const monthlyRate = annualRate / 12;

  // If payment doesn't cover interest, loan will never be paid off
  const monthlyInterest = principal * monthlyRate;
  if (monthlyPayment <= monthlyInterest) return Infinity;

  if (annualRate === 0) {
    return Math.ceil(principal / monthlyPayment);
  }

  // n = -log(1 - (P * r / PMT)) / log(1 + r)
  const months = -Math.log(1 - (principal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);

  return Math.ceil(months);
}

/**
 * Calculate total interest that will be paid over the life of the loan.
 */
export function calculateTotalInterest(
  principal: Cents,
  annualRate: Rate,
  monthlyPayment: Cents
): Cents {
  const months = calculateMonthsToPayoff(principal, annualRate, monthlyPayment);
  if (months === Infinity) return Infinity;

  const totalPaid = monthlyPayment * months;
  return totalPaid - principal;
}

/**
 * Generate full amortization schedule.
 */
export function generateAmortizationSchedule(
  principal: Cents,
  annualRate: Rate,
  monthlyPayment: Cents,
  maxMonths: number = 360
): AmortizationPayment[] {
  const schedule: AmortizationPayment[] = [];
  let balance = principal;
  let cumulativeInterest = 0;
  const monthlyRate = annualRate / 12;

  for (let month = 1; month <= maxMonths && balance > 0; month++) {
    const interestPayment = Math.round(balance * monthlyRate);
    let principalPayment = monthlyPayment - interestPayment;

    // On the last scheduled month, or when balance is small enough to pay off,
    // adjust to zero out the balance exactly
    if (principalPayment >= balance || month === maxMonths) {
      principalPayment = balance;
    }

    balance -= principalPayment;

    const totalPayment = principalPayment + interestPayment;
    cumulativeInterest += interestPayment;

    schedule.push({
      paymentNumber: month,
      principal: principalPayment,
      interest: interestPayment,
      totalPayment,
      remainingBalance: balance,
      cumulativeInterest,
    });

    if (balance <= 0) break;
  }

  return schedule;
}

/**
 * Calculate debt state for a single year.
 */
export function calculateDebtYear(
  startingBalance: Cents,
  annualRate: Rate,
  monthlyPayment: Cents,
  year: number
): YearlyDebtSummary {
  if (startingBalance <= 0) {
    return {
      year,
      startingBalance: 0,
      endingBalance: 0,
      principalPaid: 0,
      interestPaid: 0,
      totalPaid: 0,
      isPaidOff: true,
      payoffMonth: null,
    };
  }

  let balance = startingBalance;
  let totalPrincipal = 0;
  let totalInterest = 0;
  let payoffMonth: number | null = null;
  const monthlyRate = annualRate / 12;

  for (let month = 1; month <= 12 && balance > 0; month++) {
    const interest = Math.round(balance * monthlyRate);
    let principal = monthlyPayment - interest;

    // Handle final payment
    if (principal >= balance) {
      principal = balance;
      payoffMonth = month;
    }

    balance -= principal;
    totalPrincipal += principal;
    totalInterest += interest;
  }

  return {
    year,
    startingBalance,
    endingBalance: Math.max(0, balance),
    principalPaid: totalPrincipal,
    interestPaid: totalInterest,
    totalPaid: totalPrincipal + totalInterest,
    isPaidOff: balance <= 0,
    payoffMonth,
  };
}

/**
 * Project debt over multiple years.
 */
export function projectDebtOverYears(
  debt: Debt,
  years: number
): YearlyDebtSummary[] {
  const summaries: YearlyDebtSummary[] = [];
  let balance = debt.principal;
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < years && balance > 0; i++) {
    const yearSummary = calculateDebtYear(
      balance,
      debt.interestRate,
      debt.actualPayment,
      currentYear + i
    );
    summaries.push(yearSummary);
    balance = yearSummary.endingBalance;
  }

  return summaries;
}

/**
 * Calculate interest saved by making extra payments.
 */
export function calculateExtraPaymentSavings(
  principal: Cents,
  annualRate: Rate,
  currentPayment: Cents,
  extraPayment: Cents
): { monthsSaved: number; interestSaved: Cents } {
  const currentMonths = calculateMonthsToPayoff(principal, annualRate, currentPayment);
  const newMonths = calculateMonthsToPayoff(principal, annualRate, currentPayment + extraPayment);

  if (currentMonths === Infinity || newMonths === Infinity) {
    return { monthsSaved: 0, interestSaved: 0 };
  }

  const currentTotalInterest = calculateTotalInterest(principal, annualRate, currentPayment);
  const newTotalInterest = calculateTotalInterest(principal, annualRate, currentPayment + extraPayment);

  return {
    monthsSaved: currentMonths - newMonths,
    interestSaved: currentTotalInterest - newTotalInterest,
  };
}

/**
 * Calculate debt avalanche order (highest interest first).
 */
export function calculateAvalancheOrder(debts: Debt[]): Debt[] {
  return [...debts]
    .filter((d) => d.principal > 0)
    .sort((a, b) => b.interestRate - a.interestRate);
}

/**
 * Calculate debt snowball order (smallest balance first).
 */
export function calculateSnowballOrder(debts: Debt[]): Debt[] {
  return [...debts]
    .filter((d) => d.principal > 0)
    .sort((a, b) => a.principal - b.principal);
}

/**
 * Calculate total interest saved using avalanche vs current order.
 */
export function calculateAvalancheSavings(
  debts: Debt[],
  extraMonthlyPayment: Cents
): Cents {
  // This is a simplified calculation
  // A full simulation would track payments rolling over as debts are paid off

  const sortedDebts = calculateAvalancheOrder(debts);
  if (sortedDebts.length === 0) return 0;

  // Estimate savings by applying extra payment to highest interest debt first
  const highestInterestDebt = sortedDebts[0];
  if (!highestInterestDebt) return 0;

  const savings = calculateExtraPaymentSavings(
    highestInterestDebt.principal,
    highestInterestDebt.interestRate,
    highestInterestDebt.actualPayment,
    extraMonthlyPayment
  );

  return savings.interestSaved;
}

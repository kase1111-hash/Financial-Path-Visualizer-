/**
 * Projection Engine
 *
 * The core engine that projects a financial profile forward through time.
 */

import type { Cents } from '@models/common';
import type { FinancialProfile } from '@models/profile';
import type {
  Trajectory,
  TrajectoryYear,
  TrajectorySummary,
  Milestone,
  DebtState,
  AssetState,
} from '@models/trajectory';
import type { Goal } from '@models/goal';
import { createEmptyTrajectoryYear, createEmptyTrajectorySummary } from '@models/trajectory';
import { calculateTotalTax } from './tax-calculator';
import { calculateDebtYear } from './amortization';
import { calculateAssetYearWithMatch, assetGrowthToState, calculateRetirementReadiness } from './growth';
import { projectAllIncome, calculateEffectiveHourlyRate } from './income-projector';

/**
 * Generate a complete financial trajectory from a profile.
 */
export function generateTrajectory(profile: FinancialProfile): Trajectory {
  const currentYear = new Date().getFullYear();
  const yearsToProject = profile.assumptions.lifeExpectancy - profile.assumptions.currentAge;

  const years: TrajectoryYear[] = [];
  const milestones: Milestone[] = [];

  // Track state across years
  let debtBalances = new Map<string, Cents>();
  let assetBalances = new Map<string, Cents>();
  let retirementReady = false;
  let retirementYear: number | null = null;

  // Initialize balances
  for (const debt of profile.debts) {
    debtBalances.set(debt.id, debt.principal);
  }
  for (const asset of profile.assets) {
    assetBalances.set(asset.id, asset.balance);
  }

  // Project each year
  for (let i = 0; i < yearsToProject; i++) {
    const year = currentYear + i;
    const age = profile.assumptions.currentAge + i;

    const trajectoryYear = projectYear(
      profile,
      year,
      age,
      currentYear,
      debtBalances,
      assetBalances
    );

    years.push(trajectoryYear);

    // Update balances for next year
    for (const debtState of trajectoryYear.debts) {
      debtBalances.set(debtState.debtId, debtState.remainingPrincipal);
    }
    for (const assetState of trajectoryYear.assets) {
      assetBalances.set(assetState.assetId, assetState.balance);
    }

    // Detect milestones
    const previousYear = i > 0 ? years[i - 1] ?? null : null;
    const yearMilestones = detectMilestones(
      profile,
      trajectoryYear,
      previousYear
    );
    milestones.push(...yearMilestones);

    // Check for retirement readiness
    if (!retirementReady) {
      const retirementAssets = profile.assets
        .filter((a) => a.type === 'retirement_pretax' || a.type === 'retirement_roth')
        .reduce((sum, a) => sum + (assetBalances.get(a.id) ?? 0), 0);

      const desiredRetirementIncome = trajectoryYear.netIncome * profile.assumptions.incomeReplacementRatio;
      const readiness = calculateRetirementReadiness(
        retirementAssets,
        desiredRetirementIncome,
        profile.assumptions.retirementWithdrawalRate
      );

      if (readiness.isReady) {
        retirementReady = true;
        retirementYear = year;
        milestones.push({
          year,
          month: 1,
          type: 'retirement_ready',
          description: `Retirement ready - can sustain $${Math.round(readiness.monthlyIncome / 100)}/month`,
          relatedId: null,
        });
      }
    }
  }

  // Generate summary
  const summary = generateSummary(profile, years, milestones, retirementYear);

  return {
    profileId: profile.id,
    generatedAt: new Date(),
    years,
    milestones,
    summary,
  };
}

/**
 * Project a single year of the financial profile.
 */
function projectYear(
  profile: FinancialProfile,
  year: number,
  age: number,
  currentYear: number,
  debtBalances: Map<string, Cents>,
  assetBalances: Map<string, Cents>
): TrajectoryYear {
  const trajectoryYear = createEmptyTrajectoryYear(year, age);

  // Project income
  const incomeProjection = projectAllIncome(
    profile.income,
    year,
    currentYear,
    profile.assumptions.salaryGrowth
  );
  trajectoryYear.grossIncome = incomeProjection.totalIncome;
  trajectoryYear.totalWorkHours = incomeProjection.totalHours;

  // Calculate pre-tax retirement contributions
  const preTaxContributions = profile.assets
    .filter((a) => a.type === 'retirement_pretax')
    .reduce((sum, a) => sum + a.monthlyContribution * 12, 0);

  // Calculate taxes
  const taxes = calculateTotalTax(
    trajectoryYear.grossIncome,
    profile.assumptions.taxFilingStatus,
    profile.assumptions.state,
    preTaxContributions
  );

  trajectoryYear.taxFederal = taxes.federalTax;
  trajectoryYear.taxState = taxes.stateTax;
  trajectoryYear.taxFica = taxes.totalFica;
  trajectoryYear.netIncome = taxes.netIncome;
  trajectoryYear.effectiveTaxRate = taxes.effectiveRate;

  // Calculate effective hourly rate
  trajectoryYear.effectiveHourlyRate = calculateEffectiveHourlyRate(
    trajectoryYear.netIncome,
    trajectoryYear.totalWorkHours
  );

  // Project debts
  const debtStates: DebtState[] = [];
  let totalDebt = 0;
  let totalDebtPayment = 0;
  let totalInterestPaid = 0;

  for (const debt of profile.debts) {
    const currentBalance = debtBalances.get(debt.id) ?? 0;

    if (currentBalance <= 0) {
      debtStates.push({
        debtId: debt.id,
        remainingPrincipal: 0,
        interestPaidThisYear: 0,
        principalPaidThisYear: 0,
        isPaidOff: true,
        payoffMonth: null,
      });
      continue;
    }

    const debtYear = calculateDebtYear(
      currentBalance,
      debt.interestRate,
      debt.actualPayment,
      year
    );

    debtStates.push({
      debtId: debt.id,
      remainingPrincipal: debtYear.endingBalance,
      interestPaidThisYear: debtYear.interestPaid,
      principalPaidThisYear: debtYear.principalPaid,
      isPaidOff: debtYear.isPaidOff,
      payoffMonth: debtYear.payoffMonth,
    });

    totalDebt += debtYear.endingBalance;
    totalDebtPayment += debtYear.totalPaid;
    totalInterestPaid += debtYear.interestPaid;
  }

  trajectoryYear.debts = debtStates;
  trajectoryYear.totalDebt = totalDebt;
  trajectoryYear.totalDebtPayment = totalDebtPayment;
  trajectoryYear.totalInterestPaid = totalInterestPaid;

  // Project assets
  const assetStates: AssetState[] = [];
  let totalAssets = 0;

  for (const asset of profile.assets) {
    const currentBalance = assetBalances.get(asset.id) ?? 0;
    const assetWithBalance = { ...asset, balance: currentBalance };
    const growth = calculateAssetYearWithMatch(assetWithBalance, trajectoryYear.grossIncome);
    const state = assetGrowthToState(asset.id, growth);

    assetStates.push(state);
    totalAssets += state.balance;
  }

  trajectoryYear.assets = assetStates;
  trajectoryYear.totalAssets = totalAssets;
  trajectoryYear.netWorth = totalAssets - totalDebt;

  // Calculate obligations (with inflation adjustment)
  const yearsElapsed = year - currentYear;
  const inflationMultiplier = Math.pow(1 + profile.assumptions.inflationRate, yearsElapsed);
  trajectoryYear.totalObligations = Math.round(
    profile.obligations.reduce((sum, o) => sum + o.amount * 12, 0) * inflationMultiplier
  );

  // Calculate discretionary income
  trajectoryYear.discretionaryIncome =
    trajectoryYear.netIncome - totalDebtPayment - trajectoryYear.totalObligations;

  // Calculate savings rate
  const totalContributions = assetStates.reduce(
    (sum, a) => sum + a.contributionsThisYear + a.employerMatchThisYear,
    0
  );
  trajectoryYear.savingsRate =
    trajectoryYear.netIncome > 0 ? totalContributions / trajectoryYear.netIncome : 0;

  // Calculate housing-specific fields
  const mortgage = profile.debts.find((d) => d.type === 'mortgage');
  if (mortgage) {
    const mortgageState = debtStates.find((d) => d.debtId === mortgage.id);
    const propertyValue = mortgage.propertyValue ?? 0;
    const appreciatedValue = Math.round(
      propertyValue * Math.pow(1 + profile.assumptions.homeAppreciation, yearsElapsed)
    );
    const mortgageBalance = mortgageState?.remainingPrincipal ?? 0;

    trajectoryYear.homeEquity = appreciatedValue - mortgageBalance;
    trajectoryYear.ltvRatio = appreciatedValue > 0 ? mortgageBalance / appreciatedValue : 0;
    trajectoryYear.payingPmi =
      mortgage.pmiThreshold !== null && trajectoryYear.ltvRatio > mortgage.pmiThreshold;
  }

  return trajectoryYear;
}

/**
 * Detect milestones for a year.
 */
function detectMilestones(
  profile: FinancialProfile,
  currentYear: TrajectoryYear,
  previousYear: TrajectoryYear | null
): Milestone[] {
  const milestones: Milestone[] = [];

  // Debt payoffs
  for (const debtState of currentYear.debts) {
    if (debtState.isPaidOff && debtState.payoffMonth !== null) {
      const debt = profile.debts.find((d) => d.id === debtState.debtId);
      milestones.push({
        year: currentYear.year,
        month: debtState.payoffMonth,
        type: 'debt_payoff',
        description: `${debt?.name ?? 'Debt'} paid off`,
        relatedId: debtState.debtId,
      });
    }
  }

  // PMI removal
  if (previousYear?.payingPmi && !currentYear.payingPmi) {
    const mortgage = profile.debts.find((d) => d.type === 'mortgage');
    if (mortgage) {
      milestones.push({
        year: currentYear.year,
        month: 1,
        type: 'pmi_removed',
        description: 'PMI removed - LTV below threshold',
        relatedId: mortgage.id,
      });
    }
  }

  // Net worth milestones (in cents: $100k, $250k, $500k, $1M, $2.5M, $5M, $10M)
  const netWorthMilestones = [10000000, 25000000, 50000000, 100000000, 250000000, 500000000, 1000000000];
  for (const milestone of netWorthMilestones) {
    if (
      (previousYear?.netWorth ?? 0) < milestone &&
      currentYear.netWorth >= milestone
    ) {
      milestones.push({
        year: currentYear.year,
        month: 6, // Approximate mid-year
        type: 'net_worth_milestone',
        description: `Net worth reached $${milestone / 100}`,
        relatedId: null,
      });
      break; // Only one net worth milestone per year
    }
  }

  // Goal achievement (simplified check)
  for (const goal of profile.goals) {
    if (goal.targetDate?.year === currentYear.year) {
      const achieved = checkGoalAchieved(goal, currentYear, profile);
      milestones.push({
        year: currentYear.year,
        month: goal.targetDate.month,
        type: achieved ? 'goal_achieved' : 'goal_missed',
        description: `${goal.name} ${achieved ? 'achieved' : 'missed'}`,
        relatedId: goal.id,
      });
    }
  }

  return milestones;
}

/**
 * Check if a goal is achieved.
 */
function checkGoalAchieved(
  goal: Goal,
  year: TrajectoryYear,
  profile: FinancialProfile
): boolean {
  switch (goal.type) {
    case 'debt_free':
      return year.totalDebt === 0;

    case 'savings_target':
    case 'emergency_fund':
      return goal.targetAmount !== null && year.totalAssets >= goal.targetAmount;

    case 'retirement':
      // Check if retirement assets can sustain desired income
      const retirementAssets = year.assets
        .filter((a) => {
          const asset = profile.assets.find((pa) => pa.id === a.assetId);
          return asset?.type === 'retirement_pretax' || asset?.type === 'retirement_roth';
        })
        .reduce((sum, a) => sum + a.balance, 0);

      const desiredIncome = year.netIncome * profile.assumptions.incomeReplacementRatio;
      const readiness = calculateRetirementReadiness(
        retirementAssets,
        desiredIncome,
        profile.assumptions.retirementWithdrawalRate
      );
      return readiness.isReady;

    default:
      return false;
  }
}

/**
 * Generate trajectory summary.
 */
function generateSummary(
  profile: FinancialProfile,
  years: TrajectoryYear[],
  milestones: Milestone[],
  retirementYear: number | null
): TrajectorySummary {
  const summary = createEmptyTrajectorySummary();

  summary.totalYears = years.length;
  summary.retirementYear = retirementYear;
  summary.retirementAge = retirementYear !== null
    ? profile.assumptions.currentAge + (retirementYear - new Date().getFullYear())
    : null;

  // Aggregate lifetime statistics
  summary.totalLifetimeIncome = years.reduce((sum, y) => sum + y.grossIncome, 0);
  summary.totalLifetimeTaxes = years.reduce(
    (sum, y) => sum + y.taxFederal + y.taxState + y.taxFica,
    0
  );
  summary.totalLifetimeInterest = years.reduce((sum, y) => sum + y.totalInterestPaid, 0);
  summary.totalLifetimeWorkHours = years.reduce((sum, y) => sum + y.totalWorkHours, 0);

  // End state
  const lastYear = years[years.length - 1];
  summary.netWorthAtEnd = lastYear?.netWorth ?? 0;

  // Net worth at retirement
  if (retirementYear !== null) {
    const retirementYearData = years.find((y) => y.year === retirementYear);
    summary.netWorthAtRetirement = retirementYearData?.netWorth ?? 0;
  } else {
    summary.netWorthAtRetirement = summary.netWorthAtEnd;
  }

  // Goals
  summary.goalsAchieved = milestones.filter((m) => m.type === 'goal_achieved').length;
  summary.goalsMissed = milestones.filter((m) => m.type === 'goal_missed').length;

  // Average effective hourly rate
  const yearsWithWork = years.filter((y) => y.totalWorkHours > 0);
  if (yearsWithWork.length > 0) {
    const totalNetIncome = yearsWithWork.reduce((sum, y) => sum + y.netIncome, 0);
    const totalHours = yearsWithWork.reduce((sum, y) => sum + y.totalWorkHours, 0);
    summary.averageEffectiveHourlyRate = totalHours > 0
      ? Math.round(totalNetIncome / totalHours)
      : 0;
  }

  return summary;
}

/**
 * Generate trajectory for a quick preview (fewer years, less detail).
 */
export function generateQuickTrajectory(
  profile: FinancialProfile,
  previewYears: number = 10
): Trajectory {
  const modifiedProfile = {
    ...profile,
    assumptions: {
      ...profile.assumptions,
      lifeExpectancy: profile.assumptions.currentAge + previewYears,
    },
  };
  return generateTrajectory(modifiedProfile);
}

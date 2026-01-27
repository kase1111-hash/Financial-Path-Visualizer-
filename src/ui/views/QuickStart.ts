/**
 * Quick Start View
 *
 * Simplified form for quickly setting up a basic financial profile.
 */

import type { FinancialProfile } from '@models/profile';
import type { FilingStatus } from '@models/assumptions';
import { createProfile } from '@models/profile';
import { createIncome } from '@models/income';
import { create401k } from '@models/asset';
import { createDebt, createMortgage } from '@models/debt';
import { createRetirementGoal, createEmergencyFundGoal } from '@models/goal';
import { createElement } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import {
  createTextInput,
  createCurrencyInput,
  createPercentageInput,
  createNumberInput,
  createStateSelect,
  createFilingStatusSelect,
} from '@ui/components/form';
import { navigate, setCurrentProfile, setLoading, setError } from '@ui/utils/state';
import { saveProfile } from '@storage/profile-store';

export interface QuickStartComponent {
  /** The DOM element */
  element: HTMLElement;
  /** Destroy and clean up */
  destroy(): void;
}

/**
 * Create the Quick Start view.
 */
export function createQuickStart(): QuickStartComponent {
  const container = createElement('div', { class: 'quick-start' });

  // Header
  const header = createElement('header', { class: 'quick-start__header' }, []);

  const title = createElement('h1', { class: 'quick-start__title' }, [
    'Financial Path Visualizer',
  ]);
  const subtitle = createElement('p', { class: 'quick-start__subtitle' }, [
    'See where your money decisions lead. Get started by entering your basic financial information.',
  ]);
  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);

  // Form
  const form = createElement('form', { class: 'quick-start__form' });

  // Track components for cleanup
  const components: { destroy(): void }[] = [];

  // === Section: Basic Info ===
  const basicSection = createElement('section', { class: 'quick-start__section' });
  basicSection.appendChild(
    createElement('h2', { class: 'quick-start__section-title' }, ['About You'])
  );

  const basicGrid = createElement('div', { class: 'quick-start__grid' });

  // Profile Name
  const nameInput = createTextInput({
    id: 'profile-name',
    label: 'Profile Name',
    placeholder: 'My Financial Plan',
    value: 'My Financial Plan',
    required: true,
    maxLength: 100,
  });
  components.push(nameInput);
  basicGrid.appendChild(nameInput.element);

  // Age
  const ageInput = createNumberInput({
    id: 'age',
    label: 'Current Age',
    placeholder: '30',
    value: 30,
    min: 18,
    max: 100,
    required: true,
    helpText: 'Your current age in years',
  });
  components.push(ageInput);
  basicGrid.appendChild(ageInput.element);

  // State
  const stateSelect = createStateSelect({
    id: 'state',
    label: 'State',
    value: 'CA',
    required: true,
    helpText: 'For tax calculations',
  });
  components.push(stateSelect);
  basicGrid.appendChild(stateSelect.element);

  // Filing Status
  const filingSelect = createFilingStatusSelect({
    id: 'filing-status',
    label: 'Tax Filing Status',
    value: 'single',
    required: true,
  });
  components.push(filingSelect);
  basicGrid.appendChild(filingSelect.element);

  basicSection.appendChild(basicGrid);
  form.appendChild(basicSection);

  // === Section: Income ===
  const incomeSection = createElement('section', { class: 'quick-start__section' });
  incomeSection.appendChild(
    createElement('h2', { class: 'quick-start__section-title' }, ['Income'])
  );

  const incomeGrid = createElement('div', { class: 'quick-start__grid' });

  // Annual Salary
  const salaryInput = createCurrencyInput({
    id: 'salary',
    label: 'Annual Salary (Gross)',
    placeholder: '$75,000',
    required: true,
    helpText: 'Your total annual income before taxes',
    min: 0,
  });
  components.push(salaryInput);
  incomeGrid.appendChild(salaryInput.element);

  // Expected Raise
  const raiseInput = createPercentageInput({
    id: 'raise',
    label: 'Expected Annual Raise',
    value: 0.03,
    min: 0,
    max: 0.5,
    helpText: 'Average expected salary increase per year',
  });
  components.push(raiseInput);
  incomeGrid.appendChild(raiseInput.element);

  incomeSection.appendChild(incomeGrid);
  form.appendChild(incomeSection);

  // === Section: Retirement ===
  const retirementSection = createElement('section', { class: 'quick-start__section' });
  retirementSection.appendChild(
    createElement('h2', { class: 'quick-start__section-title' }, ['Retirement Savings'])
  );

  const retirementGrid = createElement('div', { class: 'quick-start__grid' });

  // 401k Balance
  const balance401kInput = createCurrencyInput({
    id: '401k-balance',
    label: '401(k) Current Balance',
    placeholder: '$0',
    min: 0,
    helpText: 'Current retirement account balance',
  });
  components.push(balance401kInput);
  retirementGrid.appendChild(balance401kInput.element);

  // Monthly Contribution
  const contribution401kInput = createCurrencyInput({
    id: '401k-contribution',
    label: 'Monthly 401(k) Contribution',
    placeholder: '$500',
    min: 0,
    helpText: 'How much you contribute each month',
  });
  components.push(contribution401kInput);
  retirementGrid.appendChild(contribution401kInput.element);

  // Employer Match
  const matchInput = createPercentageInput({
    id: 'employer-match',
    label: 'Employer Match',
    value: 0.5,
    min: 0,
    max: 2,
    helpText: 'Employer match rate (e.g., 0.5 = 50% match)',
  });
  components.push(matchInput);
  retirementGrid.appendChild(matchInput.element);

  // Match Cap
  const matchCapInput = createPercentageInput({
    id: 'match-cap',
    label: 'Match Limit',
    value: 0.06,
    min: 0,
    max: 1,
    helpText: 'Maximum salary % employer matches (e.g., 6%)',
  });
  components.push(matchCapInput);
  retirementGrid.appendChild(matchCapInput.element);

  retirementSection.appendChild(retirementGrid);
  form.appendChild(retirementSection);

  // === Section: Debt ===
  const debtSection = createElement('section', { class: 'quick-start__section' });
  debtSection.appendChild(
    createElement('h2', { class: 'quick-start__section-title' }, ['Major Debts (Optional)'])
  );

  const debtGrid = createElement('div', { class: 'quick-start__grid' });

  // Mortgage Balance
  const mortgageInput = createCurrencyInput({
    id: 'mortgage-balance',
    label: 'Mortgage Balance',
    placeholder: '$0',
    min: 0,
  });
  components.push(mortgageInput);
  debtGrid.appendChild(mortgageInput.element);

  // Mortgage Rate
  const mortgageRateInput = createPercentageInput({
    id: 'mortgage-rate',
    label: 'Mortgage Interest Rate',
    value: 0.065,
    min: 0,
    max: 0.3,
  });
  components.push(mortgageRateInput);
  debtGrid.appendChild(mortgageRateInput.element);

  // Student Loans
  const studentLoanInput = createCurrencyInput({
    id: 'student-loan-balance',
    label: 'Student Loan Balance',
    placeholder: '$0',
    min: 0,
  });
  components.push(studentLoanInput);
  debtGrid.appendChild(studentLoanInput.element);

  // Student Loan Rate
  const studentLoanRateInput = createPercentageInput({
    id: 'student-loan-rate',
    label: 'Student Loan Rate',
    value: 0.05,
    min: 0,
    max: 0.3,
  });
  components.push(studentLoanRateInput);
  debtGrid.appendChild(studentLoanRateInput.element);

  debtSection.appendChild(debtGrid);
  form.appendChild(debtSection);

  // === Section: Goals ===
  const goalsSection = createElement('section', { class: 'quick-start__section' });
  goalsSection.appendChild(
    createElement('h2', { class: 'quick-start__section-title' }, ['Your Goals'])
  );

  const goalsGrid = createElement('div', { class: 'quick-start__grid' });

  // Target Retirement Age
  const retirementAgeInput = createNumberInput({
    id: 'retirement-age',
    label: 'Target Retirement Age',
    value: 65,
    min: 30,
    max: 100,
    helpText: 'When would you like to retire?',
  });
  components.push(retirementAgeInput);
  goalsGrid.appendChild(retirementAgeInput.element);

  // Emergency Fund Target
  const emergencyFundInput = createCurrencyInput({
    id: 'emergency-fund',
    label: 'Emergency Fund Target',
    placeholder: '$10,000',
    min: 0,
    helpText: '3-6 months of expenses recommended',
  });
  components.push(emergencyFundInput);
  goalsGrid.appendChild(emergencyFundInput.element);

  goalsSection.appendChild(goalsGrid);
  form.appendChild(goalsSection);

  // === Buttons ===
  const buttonGroup = createElement('div', { class: 'quick-start__buttons' });

  const submitButton = createButton({
    text: 'Create My Financial Plan',
    variant: 'primary',
    size: 'large',
    type: 'submit',
  });
  components.push(submitButton);
  buttonGroup.appendChild(submitButton.element);

  const skipButton = createButton({
    text: 'Skip to Advanced Editor',
    variant: 'ghost',
    size: 'medium',
    type: 'button',
    onClick: () => {
      navigate('editor');
    },
  });
  components.push(skipButton);
  buttonGroup.appendChild(skipButton.element);

  form.appendChild(buttonGroup);

  // Handle form submission
  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    submitButton.setLoading(true);
    setLoading(true);

    try {
      // Build profile from form data
      const profile = buildProfileFromForm();

      // Save profile
      await saveProfile(profile);

      // Navigate to trajectory view
      setCurrentProfile(profile.id);
      setLoading(false);
      navigate('trajectory');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create profile');
      submitButton.setLoading(false);
    }
  }

  function buildProfileFromForm(): FinancialProfile {
    const currentYear = new Date().getFullYear();
    const currentAge = ageInput.getValue() ?? 30;
    const retirementAge = retirementAgeInput.getValue() ?? 65;

    // Map filing status values
    const filingStatusMap: Record<string, FilingStatus> = {
      single: 'single',
      married_jointly: 'married_joint',
      married_separately: 'married_separate',
      head_of_household: 'head_of_household',
    };

    const profile = createProfile({
      name: nameInput.getValue() || 'My Financial Plan',
      assumptions: {
        inflationRate: 0.03,
        marketReturn: 0.07,
        homeAppreciation: 0.03,
        salaryGrowth: raiseInput.getValue() ?? 0.02,
        retirementWithdrawalRate: 0.04,
        incomeReplacementRatio: 0.80,
        lifeExpectancy: 85,
        currentAge,
        taxFilingStatus: filingStatusMap[filingSelect.getValue() ?? 'single'] ?? 'single',
        state: stateSelect.getValue() ?? 'CA',
      },
    });

    // Income
    const annualSalary = salaryInput.getValue() ?? 7500000; // $75,000 default in cents
    profile.income.push(
      createIncome({
        name: 'Primary Salary',
        type: 'salary',
        amount: annualSalary,
        hoursPerWeek: 40,
        variability: 0,
        expectedGrowth: raiseInput.getValue() ?? 0.03,
        endDate: null,
      })
    );

    // 401k Asset
    const balance401k = balance401kInput.getValue() ?? 0;
    const contribution401k = contribution401kInput.getValue() ?? 0;
    const employerMatch = matchInput.getValue() ?? 0.5;
    const matchLimit = matchCapInput.getValue() ?? 0.06;

    if (balance401k > 0 || contribution401k > 0) {
      profile.assets.push(
        create401k({
          balance: balance401k,
          monthlyContribution: contribution401k,
          expectedReturn: 0.07,
          employerMatch,
          matchLimit,
        })
      );
    }

    // Debts
    const mortgageBalance = mortgageInput.getValue();
    const studentLoanBalance = studentLoanInput.getValue();

    if (mortgageBalance && mortgageBalance > 0) {
      const monthlyPayment = Math.round(mortgageBalance * 0.005); // Rough estimate
      profile.debts.push(
        createMortgage({
          principal: mortgageBalance,
          interestRate: mortgageRateInput.getValue() ?? 0.065,
          minimumPayment: monthlyPayment,
          actualPayment: monthlyPayment,
          termMonths: 360,
          monthsRemaining: 360,
        })
      );
    }

    if (studentLoanBalance && studentLoanBalance > 0) {
      const monthlyPayment = Math.round(studentLoanBalance * 0.01); // Rough estimate
      profile.debts.push(
        createDebt({
          name: 'Student Loans',
          type: 'student',
          principal: studentLoanBalance,
          interestRate: studentLoanRateInput.getValue() ?? 0.05,
          minimumPayment: monthlyPayment,
          actualPayment: monthlyPayment,
          termMonths: 120,
          monthsRemaining: 120,
        })
      );
    }

    // Goals
    const emergencyFund = emergencyFundInput.getValue();

    profile.goals.push(
      createRetirementGoal({ month: 1, year: currentYear + (retirementAge - currentAge) })
    );

    if (emergencyFund && emergencyFund > 0) {
      profile.goals.push(createEmergencyFundGoal(emergencyFund));
    }

    return profile;
  }

  form.addEventListener('submit', handleSubmit);
  container.appendChild(form);

  return {
    element: container,

    destroy(): void {
      form.removeEventListener('submit', handleSubmit);
      for (const component of components) {
        component.destroy();
      }
    },
  };
}

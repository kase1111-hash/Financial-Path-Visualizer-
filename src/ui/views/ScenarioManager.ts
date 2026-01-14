/**
 * Scenario Manager View
 *
 * Create and manage what-if scenarios for comparison.
 */

import type { FinancialProfile } from '@models/profile';
import type { Change } from '@models/comparison';
import { cloneProfile } from '@models/profile';
import { createElement, clearChildren } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import { formatCurrency } from '@ui/utils/format';
import { navigate } from '@ui/utils/state';
import { saveProfile, loadAllProfiles, deleteProfile } from '@storage/profile-store';

export interface ScenarioManagerOptions {
  profile: FinancialProfile;
  onCompare: (baselineId: string, alternateId: string, changes: Change[]) => void;
}

export interface ScenarioManagerComponent {
  element: HTMLElement;
  update(profile: FinancialProfile): void;
  destroy(): void;
}

interface QuickScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  apply: (profile: FinancialProfile, value: number) => { profile: FinancialProfile; changes: Change[] };
  inputLabel: string;
  inputType: 'currency' | 'percent' | 'number';
  defaultValue: number;
}

const QUICK_SCENARIOS: QuickScenario[] = [
  {
    id: 'extra-debt-payment',
    name: 'Extra Debt Payment',
    description: 'What if you paid extra on your highest-interest debt each month?',
    icon: '💳',
    inputLabel: 'Extra monthly payment',
    inputType: 'currency',
    defaultValue: 50000, // $500
    apply: (profile, value) => {
      const newProfile = cloneProfile(profile, `${profile.name} (+$${value / 100}/mo debt)`);
      const highestDebt = [...newProfile.debts]
        .filter(d => d.principal > 0)
        .sort((a, b) => b.interestRate - a.interestRate)[0];

      if (highestDebt) {
        highestDebt.actualPayment += value;
        const changes: Change[] = [{
          field: `debts[${highestDebt.id}].actualPayment`,
          originalValue: highestDebt.actualPayment - value,
          newValue: highestDebt.actualPayment,
          description: `Pay $${value / 100} extra monthly on ${highestDebt.name}`,
        }];
        return { profile: newProfile, changes };
      }
      return { profile: newProfile, changes: [] };
    },
  },
  {
    id: 'income-increase',
    name: 'Income Increase',
    description: 'What if you earned more? See the impact of a raise or side income.',
    icon: '💰',
    inputLabel: 'Annual income increase',
    inputType: 'currency',
    defaultValue: 1000000, // $10,000
    apply: (profile, value) => {
      const newProfile = cloneProfile(profile, `${profile.name} (+$${value / 100}/yr)`);
      const primaryIncome = newProfile.income[0];

      if (primaryIncome) {
        const oldAmount = primaryIncome.amount;
        primaryIncome.amount += value;
        const changes: Change[] = [{
          field: 'income[0].amount',
          originalValue: oldAmount,
          newValue: primaryIncome.amount,
          description: `Increase annual income by $${(value / 100).toLocaleString()}`,
        }];
        return { profile: newProfile, changes };
      }
      return { profile: newProfile, changes: [] };
    },
  },
  {
    id: 'increase-savings',
    name: 'Increase Savings Rate',
    description: 'What if you saved more each month? See the long-term impact.',
    icon: '📈',
    inputLabel: 'Additional monthly savings',
    inputType: 'currency',
    defaultValue: 30000, // $300
    apply: (profile, value) => {
      const newProfile = cloneProfile(profile, `${profile.name} (+$${value / 100}/mo savings)`);
      const savingsAccount = newProfile.assets.find(a => a.type === 'savings' || a.type === 'investment');

      if (savingsAccount) {
        const oldContribution = savingsAccount.monthlyContribution;
        savingsAccount.monthlyContribution += value;
        const changes: Change[] = [{
          field: `assets[${savingsAccount.id}].monthlyContribution`,
          originalValue: oldContribution,
          newValue: savingsAccount.monthlyContribution,
          description: `Save $${value / 100} more monthly in ${savingsAccount.name}`,
        }];
        return { profile: newProfile, changes };
      }
      return { profile: newProfile, changes: [] };
    },
  },
  {
    id: 'retirement-contribution',
    name: 'Increase 401(k) Contribution',
    description: 'What if you maxed out your retirement contributions?',
    icon: '🏦',
    inputLabel: 'Additional monthly 401(k)',
    inputType: 'currency',
    defaultValue: 50000, // $500
    apply: (profile, value) => {
      const newProfile = cloneProfile(profile, `${profile.name} (+$${value / 100}/mo 401k)`);
      const retirement = newProfile.assets.find(a => a.type === 'retirement_pretax');

      if (retirement) {
        const oldContribution = retirement.monthlyContribution;
        retirement.monthlyContribution += value;
        const changes: Change[] = [{
          field: `assets[${retirement.id}].monthlyContribution`,
          originalValue: oldContribution,
          newValue: retirement.monthlyContribution,
          description: `Contribute $${value / 100} more monthly to 401(k)`,
        }];
        return { profile: newProfile, changes };
      }
      return { profile: newProfile, changes: [] };
    },
  },
  {
    id: 'reduce-expenses',
    name: 'Reduce Monthly Expenses',
    description: 'What if you cut discretionary spending?',
    icon: '✂️',
    inputLabel: 'Monthly expense reduction',
    inputType: 'currency',
    defaultValue: 20000, // $200
    apply: (profile, value) => {
      const newProfile = cloneProfile(profile, `${profile.name} (-$${value / 100}/mo expenses)`);
      const otherObligation = newProfile.obligations.find(o => o.category === 'other' || o.category === 'subscription');

      const changes: Change[] = [];
      if (otherObligation && otherObligation.amount >= value) {
        const oldAmount = otherObligation.amount;
        otherObligation.amount -= value;
        changes.push({
          field: `obligations[${otherObligation.id}].amount`,
          originalValue: oldAmount,
          newValue: otherObligation.amount,
          description: `Reduce ${otherObligation.name} by $${value / 100}/month`,
        });
      }
      return { profile: newProfile, changes };
    },
  },
];

/**
 * Create a scenario manager component.
 */
export function createScenarioManager(options: ScenarioManagerOptions): ScenarioManagerComponent {
  let profile = options.profile;
  let savedScenarios: FinancialProfile[] = [];

  const container = createElement('div', { class: 'scenario-manager' });
  const components: { destroy(): void }[] = [];

  // Header
  const header = createElement('header', { class: 'scenario-manager__header' });

  const headerLeft = createElement('div', { class: 'scenario-manager__header-left' });
  headerLeft.appendChild(
    createElement('h1', { class: 'scenario-manager__title' }, ['What-If Scenarios'])
  );
  headerLeft.appendChild(
    createElement('p', { class: 'scenario-manager__subtitle' }, [
      'Explore how different financial decisions could affect your future',
    ])
  );
  header.appendChild(headerLeft);

  const headerActions = createElement('div', { class: 'scenario-manager__actions' });
  const backButton = createButton({
    text: 'Back to Timeline',
    variant: 'secondary',
    onClick: () => navigate('trajectory'),
  });
  components.push(backButton);
  headerActions.appendChild(backButton.element);
  header.appendChild(headerActions);
  container.appendChild(header);

  // Current profile card
  const currentSection = createElement('section', { class: 'scenario-manager__current' });
  currentSection.appendChild(
    createElement('h2', { class: 'scenario-manager__section-title' }, ['Current Plan (Baseline)'])
  );
  const currentCard = createElement('div', { class: 'scenario-manager__profile-card' });
  currentSection.appendChild(currentCard);
  container.appendChild(currentSection);

  // Quick scenarios section
  const quickSection = createElement('section', { class: 'scenario-manager__quick' });
  quickSection.appendChild(
    createElement('h2', { class: 'scenario-manager__section-title' }, ['Quick What-If Scenarios'])
  );
  const quickGrid = createElement('div', { class: 'scenario-manager__quick-grid' });
  quickSection.appendChild(quickGrid);
  container.appendChild(quickSection);

  // Saved scenarios section
  const savedSection = createElement('section', { class: 'scenario-manager__saved' });
  savedSection.appendChild(
    createElement('h2', { class: 'scenario-manager__section-title' }, ['Saved Scenarios'])
  );
  const savedList = createElement('div', { class: 'scenario-manager__saved-list' });
  savedSection.appendChild(savedList);
  container.appendChild(savedSection);

  function renderCurrentProfile(): void {
    clearChildren(currentCard);

    const info = createElement('div', { class: 'scenario-manager__profile-info' });
    info.appendChild(
      createElement('h3', { class: 'scenario-manager__profile-name' }, [profile.name])
    );

    const stats = createElement('div', { class: 'scenario-manager__profile-stats' });

    const totalIncome = profile.income.reduce((sum, inc) => sum + inc.amount, 0);
    const totalDebt = profile.debts.reduce((sum, d) => sum + d.principal, 0);
    const totalAssets = profile.assets.reduce((sum, a) => sum + a.balance, 0);

    stats.appendChild(createStatItem('Annual Income', formatCurrency(totalIncome)));
    stats.appendChild(createStatItem('Total Debt', formatCurrency(totalDebt)));
    stats.appendChild(createStatItem('Total Assets', formatCurrency(totalAssets)));
    stats.appendChild(createStatItem('Net Worth', formatCurrency(totalAssets - totalDebt)));

    info.appendChild(stats);
    currentCard.appendChild(info);
  }

  function createStatItem(label: string, value: string): HTMLElement {
    const item = createElement('div', { class: 'scenario-manager__stat' });
    item.appendChild(createElement('span', { class: 'scenario-manager__stat-label' }, [label]));
    item.appendChild(createElement('span', { class: 'scenario-manager__stat-value' }, [value]));
    return item;
  }

  function renderQuickScenarios(): void {
    clearChildren(quickGrid);

    for (const scenario of QUICK_SCENARIOS) {
      const card = createQuickScenarioCard(scenario);
      quickGrid.appendChild(card);
    }
  }

  function createQuickScenarioCard(scenario: QuickScenario): HTMLElement {
    const card = createElement('div', { class: 'quick-scenario-card' });

    const header = createElement('div', { class: 'quick-scenario-card__header' });
    header.appendChild(
      createElement('span', { class: 'quick-scenario-card__icon' }, [scenario.icon])
    );
    header.appendChild(
      createElement('h3', { class: 'quick-scenario-card__title' }, [scenario.name])
    );
    card.appendChild(header);

    card.appendChild(
      createElement('p', { class: 'quick-scenario-card__description' }, [scenario.description])
    );

    const inputGroup = createElement('div', { class: 'quick-scenario-card__input-group' });
    inputGroup.appendChild(
      createElement('label', { class: 'quick-scenario-card__label' }, [scenario.inputLabel])
    );

    const input = createElement('input', {
      type: 'number',
      class: 'quick-scenario-card__input',
      value: String(scenario.inputType === 'currency' ? scenario.defaultValue / 100 : scenario.defaultValue),
      min: '0',
    }) as HTMLInputElement;
    inputGroup.appendChild(input);

    if (scenario.inputType === 'currency') {
      inputGroup.appendChild(
        createElement('span', { class: 'quick-scenario-card__suffix' }, ['$'])
      );
    } else if (scenario.inputType === 'percent') {
      inputGroup.appendChild(
        createElement('span', { class: 'quick-scenario-card__suffix' }, ['%'])
      );
    }

    card.appendChild(inputGroup);

    const actions = createElement('div', { class: 'quick-scenario-card__actions' });
    const compareBtn = createButton({
      text: 'Compare',
      variant: 'primary',
      size: 'small',
      onClick: async () => {
        let value = parseFloat(input.value);
        if (scenario.inputType === 'currency') {
          value = Math.round(value * 100); // Convert to cents
        }

        const { profile: newProfile, changes } = scenario.apply(profile, value);
        await saveProfile(newProfile);
        options.onCompare(profile.id, newProfile.id, changes);
      },
    });
    components.push(compareBtn);
    actions.appendChild(compareBtn.element);
    card.appendChild(actions);

    return card;
  }

  async function renderSavedScenarios(): Promise<void> {
    clearChildren(savedList);

    // Load all profiles that are variations of the current one
    const allProfiles = await loadAllProfiles();
    savedScenarios = allProfiles.filter(
      (p) => p.id !== profile.id && p.name.includes(profile.name.split(' (')[0] ?? '')
    );

    if (savedScenarios.length === 0) {
      savedList.appendChild(
        createElement('div', { class: 'scenario-manager__empty' }, [
          'No saved scenarios yet. Create one using the quick scenarios above!',
        ])
      );
      return;
    }

    for (const scenario of savedScenarios) {
      savedList.appendChild(createSavedScenarioCard(scenario));
    }
  }

  function createSavedScenarioCard(scenarioProfile: FinancialProfile): HTMLElement {
    const card = createElement('div', { class: 'saved-scenario-card' });

    const info = createElement('div', { class: 'saved-scenario-card__info' });
    info.appendChild(
      createElement('h3', { class: 'saved-scenario-card__name' }, [scenarioProfile.name])
    );
    info.appendChild(
      createElement('span', { class: 'saved-scenario-card__date' }, [
        `Created ${scenarioProfile.createdAt.toLocaleDateString()}`,
      ])
    );
    card.appendChild(info);

    const actions = createElement('div', { class: 'saved-scenario-card__actions' });

    const compareBtn = createButton({
      text: 'Compare',
      variant: 'primary',
      size: 'small',
      onClick: () => {
        options.onCompare(profile.id, scenarioProfile.id, []);
      },
    });
    components.push(compareBtn);
    actions.appendChild(compareBtn.element);

    const deleteBtn = createButton({
      text: 'Delete',
      variant: 'danger',
      size: 'small',
      onClick: async () => {
        await deleteProfile(scenarioProfile.id);
        await renderSavedScenarios();
      },
    });
    components.push(deleteBtn);
    actions.appendChild(deleteBtn.element);

    card.appendChild(actions);
    return card;
  }

  // Initial render
  renderCurrentProfile();
  renderQuickScenarios();
  renderSavedScenarios();

  return {
    element: container,

    update(newProfile: FinancialProfile): void {
      profile = newProfile;
      renderCurrentProfile();
      renderSavedScenarios();
    },

    destroy(): void {
      for (const component of components) {
        component.destroy();
      }
    },
  };
}

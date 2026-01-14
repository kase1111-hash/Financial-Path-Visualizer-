/**
 * Optimizations View
 *
 * Display financial optimization suggestions from the scanner.
 */

import type { FinancialProfile } from '@models/profile';
import type { Trajectory } from '@models/trajectory';
import type { Optimization, OptimizationType, Confidence } from '@models/optimization';
import {
  sortByImpact,
  sortByConfidence,
  filterByType,
  filterByMinConfidence,
  getOptimizationTypeInfo,
  getConfidenceInfo,
  formatImpactSummary,
  aggregateImpacts,
} from '@models/optimization';
import { createElement, clearChildren } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import { formatCurrency } from '@ui/utils/format';
import { navigate } from '@ui/utils/state';
import { generateTrajectory } from '@engine/projector';
import { runAllScanners } from '@scanner/index';

export interface OptimizationsViewOptions {
  profile: FinancialProfile;
}

export interface OptimizationsViewComponent {
  element: HTMLElement;
  update(profile: FinancialProfile): void;
  destroy(): void;
}

type SortMode = 'impact' | 'confidence';

/**
 * Create an optimizations view component.
 */
export function createOptimizationsView(
  options: OptimizationsViewOptions
): OptimizationsViewComponent {
  let profile = options.profile;
  let trajectory: Trajectory | null = null;
  let optimizations: Optimization[] = [];
  let filteredOptimizations: Optimization[] = [];
  let selectedType: OptimizationType | 'all' = 'all';
  let minConfidence: Confidence = 'low';
  let sortMode: SortMode = 'impact';

  const container = createElement('div', { class: 'optimizations-view' });
  const components: { destroy(): void }[] = [];

  // Header
  const header = createElement('header', { class: 'optimizations-view__header' });

  const headerLeft = createElement('div', { class: 'optimizations-view__header-left' });
  const title = createElement('h1', { class: 'optimizations-view__title' }, [
    'Financial Optimizations',
  ]);
  headerLeft.appendChild(title);

  const subtitle = createElement('p', { class: 'optimizations-view__subtitle' }, [
    'Opportunities to improve your financial trajectory',
  ]);
  headerLeft.appendChild(subtitle);
  header.appendChild(headerLeft);

  const headerActions = createElement('div', { class: 'optimizations-view__actions' });
  const backButton = createButton({
    text: 'Back to Timeline',
    variant: 'secondary',
    onClick: () => navigate('trajectory'),
  });
  components.push(backButton);
  headerActions.appendChild(backButton.element);
  header.appendChild(headerActions);
  container.appendChild(header);

  // Summary section
  const summarySection = createElement('section', { class: 'optimizations-view__summary' });
  container.appendChild(summarySection);

  // Filters section
  const filtersSection = createElement('div', { class: 'optimizations-view__filters' });

  // Type filter
  const typeFilterGroup = createElement('div', { class: 'optimizations-view__filter-group' });
  typeFilterGroup.appendChild(
    createElement('label', { class: 'optimizations-view__filter-label' }, ['Category:'])
  );
  const typeSelect = createElement('select', {
    class: 'optimizations-view__filter-select',
  }) as HTMLSelectElement;
  const typeOptions: Array<{ value: OptimizationType | 'all'; label: string }> = [
    { value: 'all', label: 'All Categories' },
    { value: 'tax', label: 'Tax' },
    { value: 'debt', label: 'Debt' },
    { value: 'savings', label: 'Savings' },
    { value: 'housing', label: 'Housing' },
  ];
  for (const opt of typeOptions) {
    const optionEl = createElement('option', { value: opt.value }, [opt.label]) as HTMLOptionElement;
    typeSelect.appendChild(optionEl);
  }
  typeSelect.value = selectedType;
  typeSelect.addEventListener('change', () => {
    selectedType = typeSelect.value as OptimizationType | 'all';
    applyFilters();
    renderOptimizations();
  });
  typeFilterGroup.appendChild(typeSelect);
  filtersSection.appendChild(typeFilterGroup);

  // Confidence filter
  const confidenceFilterGroup = createElement('div', { class: 'optimizations-view__filter-group' });
  confidenceFilterGroup.appendChild(
    createElement('label', { class: 'optimizations-view__filter-label' }, ['Min Confidence:'])
  );
  const confidenceSelect = createElement('select', {
    class: 'optimizations-view__filter-select',
  }) as HTMLSelectElement;
  const confidenceOptions: Array<{ value: Confidence; label: string }> = [
    { value: 'low', label: 'Low & Above' },
    { value: 'medium', label: 'Medium & Above' },
    { value: 'high', label: 'High Only' },
  ];
  for (const opt of confidenceOptions) {
    const optionEl = createElement('option', { value: opt.value }, [
      opt.label,
    ]) as HTMLOptionElement;
    confidenceSelect.appendChild(optionEl);
  }
  confidenceSelect.value = minConfidence;
  confidenceSelect.addEventListener('change', () => {
    minConfidence = confidenceSelect.value as Confidence;
    applyFilters();
    renderOptimizations();
  });
  confidenceFilterGroup.appendChild(confidenceSelect);
  filtersSection.appendChild(confidenceFilterGroup);

  // Sort mode
  const sortFilterGroup = createElement('div', { class: 'optimizations-view__filter-group' });
  sortFilterGroup.appendChild(
    createElement('label', { class: 'optimizations-view__filter-label' }, ['Sort By:'])
  );
  const sortSelect = createElement('select', {
    class: 'optimizations-view__filter-select',
  }) as HTMLSelectElement;
  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'impact', label: 'Highest Impact' },
    { value: 'confidence', label: 'Highest Confidence' },
  ];
  for (const opt of sortOptions) {
    const optionEl = createElement('option', { value: opt.value }, [opt.label]) as HTMLOptionElement;
    sortSelect.appendChild(optionEl);
  }
  sortSelect.value = sortMode;
  sortSelect.addEventListener('change', () => {
    sortMode = sortSelect.value as SortMode;
    applyFilters();
    renderOptimizations();
  });
  sortFilterGroup.appendChild(sortSelect);
  filtersSection.appendChild(sortFilterGroup);

  container.appendChild(filtersSection);

  // Optimizations list
  const optimizationsList = createElement('div', { class: 'optimizations-view__list' });
  container.appendChild(optimizationsList);

  function applyFilters(): void {
    let result = [...optimizations];

    // Filter by type
    if (selectedType !== 'all') {
      result = filterByType(result, selectedType);
    }

    // Filter by confidence
    result = filterByMinConfidence(result, minConfidence);

    // Sort
    if (sortMode === 'impact') {
      result = sortByImpact(result);
    } else {
      result = sortByConfidence(result);
    }

    filteredOptimizations = result;
  }

  function renderSummary(): void {
    clearChildren(summarySection);

    if (optimizations.length === 0) {
      return;
    }

    const summaryCards = createElement('div', { class: 'optimizations-view__summary-cards' });

    // Total optimizations
    const totalCard = createElement('div', { class: 'optimizations-view__summary-card' });
    totalCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-value' }, [
        String(optimizations.length),
      ])
    );
    totalCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-label' }, [
        'Opportunities Found',
      ])
    );
    summaryCards.appendChild(totalCard);

    // Aggregate impact
    const aggregateImpact = aggregateImpacts(optimizations);

    // Potential annual savings
    const annualCard = createElement('div', { class: 'optimizations-view__summary-card' });
    annualCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-value text-positive' }, [
        formatCurrency(aggregateImpact.annualChange, { compact: true }),
      ])
    );
    annualCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-label' }, [
        'Potential Annual Impact',
      ])
    );
    summaryCards.appendChild(annualCard);

    // Lifetime impact
    const lifetimeCard = createElement('div', { class: 'optimizations-view__summary-card' });
    lifetimeCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-value text-positive' }, [
        formatCurrency(aggregateImpact.lifetimeChange, { compact: true }),
      ])
    );
    lifetimeCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-label' }, ['Lifetime Impact'])
    );
    summaryCards.appendChild(lifetimeCard);

    // Retirement impact
    const retirementCard = createElement('div', { class: 'optimizations-view__summary-card' });
    const retirementMonths = Math.abs(aggregateImpact.retirementDateChange);
    const retirementYears = (retirementMonths / 12).toFixed(1);
    const retirementDirection = aggregateImpact.retirementDateChange < 0 ? 'earlier' : 'later';
    retirementCard.appendChild(
      createElement(
        'div',
        {
          class: `optimizations-view__summary-value ${aggregateImpact.retirementDateChange < 0 ? 'text-positive' : 'text-negative'}`,
        },
        [`${retirementYears} years`]
      )
    );
    retirementCard.appendChild(
      createElement('div', { class: 'optimizations-view__summary-label' }, [
        `Potential Retirement ${retirementDirection}`,
      ])
    );
    summaryCards.appendChild(retirementCard);

    summarySection.appendChild(summaryCards);
  }

  function renderOptimizations(): void {
    clearChildren(optimizationsList);

    if (filteredOptimizations.length === 0) {
      const emptyState = createElement('div', { class: 'optimizations-view__empty' });

      if (optimizations.length === 0) {
        emptyState.appendChild(
          createElement('p', {}, [
            'No optimization opportunities found. Your financial plan is already well optimized!',
          ])
        );
      } else {
        emptyState.appendChild(
          createElement('p', {}, [
            'No optimizations match your current filters. Try adjusting the category or confidence filter.',
          ])
        );
      }

      optimizationsList.appendChild(emptyState);
      return;
    }

    // Group by type for better organization
    const grouped = new Map<OptimizationType, Optimization[]>();
    for (const opt of filteredOptimizations) {
      const existing = grouped.get(opt.type) ?? [];
      existing.push(opt);
      grouped.set(opt.type, existing);
    }

    // Render each group
    for (const [type, opts] of grouped) {
      const typeInfo = getOptimizationTypeInfo(type);

      const groupSection = createElement('div', { class: 'optimizations-view__group' });

      const groupHeader = createElement('div', { class: 'optimizations-view__group-header' });
      groupHeader.appendChild(
        createElement('span', { class: 'optimizations-view__group-icon' }, [typeInfo.icon])
      );
      groupHeader.appendChild(
        createElement('h2', { class: 'optimizations-view__group-title' }, [
          `${typeInfo.label} (${opts.length})`,
        ])
      );
      groupSection.appendChild(groupHeader);

      for (const opt of opts) {
        groupSection.appendChild(createOptimizationCard(opt));
      }

      optimizationsList.appendChild(groupSection);
    }
  }

  function createOptimizationCard(opt: Optimization): HTMLElement {
    const confidenceInfo = getConfidenceInfo(opt.confidence);

    const card = createElement('article', { class: 'optimization-card' });

    // Header
    const cardHeader = createElement('div', { class: 'optimization-card__header' });

    const titleSection = createElement('div', { class: 'optimization-card__title-section' });
    titleSection.appendChild(
      createElement('h3', { class: 'optimization-card__title' }, [opt.title])
    );
    titleSection.appendChild(
      createElement(
        'span',
        { class: `optimization-card__confidence optimization-card__confidence--${opt.confidence}` },
        [confidenceInfo.label]
      )
    );
    cardHeader.appendChild(titleSection);

    const impact = createElement('div', { class: 'optimization-card__impact' });
    impact.appendChild(
      createElement('span', { class: 'optimization-card__impact-label' }, ['Impact:'])
    );
    impact.appendChild(
      createElement('span', { class: 'optimization-card__impact-value' }, [
        formatImpactSummary(opt.impact),
      ])
    );
    cardHeader.appendChild(impact);

    card.appendChild(cardHeader);

    // Body
    const cardBody = createElement('div', { class: 'optimization-card__body' });

    // Explanation
    const explanation = createElement('div', { class: 'optimization-card__section' });
    explanation.appendChild(
      createElement('h4', { class: 'optimization-card__section-title' }, ['Why This Matters'])
    );
    explanation.appendChild(
      createElement('p', { class: 'optimization-card__text' }, [opt.explanation])
    );
    cardBody.appendChild(explanation);

    // Action
    const action = createElement('div', { class: 'optimization-card__section' });
    action.appendChild(
      createElement('h4', { class: 'optimization-card__section-title' }, ['Recommended Action'])
    );
    action.appendChild(createElement('p', { class: 'optimization-card__text' }, [opt.action]));
    cardBody.appendChild(action);

    // Impact details
    const impactDetails = createElement('div', { class: 'optimization-card__section' });
    impactDetails.appendChild(
      createElement('h4', { class: 'optimization-card__section-title' }, ['Projected Impact'])
    );
    const impactGrid = createElement('div', { class: 'optimization-card__impact-grid' });

    if (opt.impact.monthlyChange !== 0) {
      impactGrid.appendChild(createImpactItem('Monthly', opt.impact.monthlyChange));
    }
    if (opt.impact.annualChange !== 0) {
      impactGrid.appendChild(createImpactItem('Annual', opt.impact.annualChange));
    }
    if (opt.impact.lifetimeChange !== 0) {
      impactGrid.appendChild(createImpactItem('Lifetime', opt.impact.lifetimeChange));
    }
    if (opt.impact.retirementDateChange !== 0) {
      const months = Math.abs(opt.impact.retirementDateChange);
      const direction = opt.impact.retirementDateChange < 0 ? 'earlier' : 'later';
      const retirementItem = createElement('div', { class: 'optimization-card__impact-item' });
      retirementItem.appendChild(
        createElement('span', { class: 'optimization-card__impact-item-label' }, ['Retirement'])
      );
      retirementItem.appendChild(
        createElement(
          'span',
          {
            class: `optimization-card__impact-item-value ${opt.impact.retirementDateChange < 0 ? 'text-positive' : 'text-negative'}`,
          },
          [`${(months / 12).toFixed(1)} years ${direction}`]
        )
      );
      impactGrid.appendChild(retirementItem);
    }

    impactDetails.appendChild(impactGrid);
    cardBody.appendChild(impactDetails);

    // Prerequisites
    if (opt.prerequisites.length > 0) {
      const prereqs = createElement('div', { class: 'optimization-card__section' });
      prereqs.appendChild(
        createElement('h4', { class: 'optimization-card__section-title' }, ['Prerequisites'])
      );
      const prereqList = createElement('ul', { class: 'optimization-card__prereq-list' });
      for (const prereq of opt.prerequisites) {
        prereqList.appendChild(createElement('li', {}, [prereq]));
      }
      prereqs.appendChild(prereqList);
      cardBody.appendChild(prereqs);
    }

    card.appendChild(cardBody);

    // Footer
    const cardFooter = createElement('div', { class: 'optimization-card__footer' });
    cardFooter.appendChild(
      createElement('span', { class: 'optimization-card__year' }, [`Year ${opt.yearApplicable}`])
    );
    cardFooter.appendChild(
      createElement('span', { class: 'optimization-card__metric' }, [
        `Affects: ${opt.impact.metricAffected}`,
      ])
    );
    card.appendChild(cardFooter);

    return card;
  }

  function createImpactItem(label: string, cents: number): HTMLElement {
    const item = createElement('div', { class: 'optimization-card__impact-item' });
    item.appendChild(
      createElement('span', { class: 'optimization-card__impact-item-label' }, [label])
    );
    const sign = cents >= 0 ? '+' : '';
    item.appendChild(
      createElement(
        'span',
        { class: `optimization-card__impact-item-value ${cents >= 0 ? 'text-positive' : 'text-negative'}` },
        [`${sign}${formatCurrency(cents, { compact: true })}`]
      )
    );
    return item;
  }

  function calculateAndRender(): void {
    // Generate trajectory
    trajectory = generateTrajectory(profile);

    // Run scanners
    optimizations = runAllScanners(profile, trajectory, {
      includeLowConfidence: true,
    });

    // Apply filters and render
    applyFilters();
    renderSummary();
    renderOptimizations();
  }

  // Initial calculation
  calculateAndRender();

  return {
    element: container,

    update(newProfile: FinancialProfile): void {
      profile = newProfile;
      calculateAndRender();
    },

    destroy(): void {
      for (const component of components) {
        component.destroy();
      }
    },
  };
}

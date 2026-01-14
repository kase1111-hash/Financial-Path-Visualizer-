/**
 * Compare View
 *
 * Side-by-side comparison of two financial trajectories.
 */

import type { FinancialProfile } from '@models/profile';
import type { Comparison, Change } from '@models/comparison';
import {
  formatRetirementDelta,
  formatCurrencyDelta,
  formatWorkHoursDelta,
} from '@models/comparison';
import { compareTrajectories, getComparisonAtYear } from '@engine/comparator';
import { generateTrajectory } from '@engine/projector';
import { createElement, clearChildren } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import { formatCurrency, formatPercent } from '@ui/utils/format';
import { navigate } from '@ui/utils/state';
import { loadProfile } from '@storage/profile-store';

export interface CompareViewOptions {
  baselineId: string;
  alternateId: string;
  changes: Change[];
}

export interface CompareViewComponent {
  element: HTMLElement;
  destroy(): void;
}

/**
 * Create a compare view component.
 */
export function createCompareView(options: CompareViewOptions): CompareViewComponent {
  const container = createElement('div', { class: 'compare-view' });
  const components: { destroy(): void }[] = [];

  let baselineProfile: FinancialProfile | null = null;
  let alternateProfile: FinancialProfile | null = null;
  let comparison: Comparison | null = null;
  let selectedYear: number | null = null;

  // Header
  const header = createElement('header', { class: 'compare-view__header' });

  const headerLeft = createElement('div', { class: 'compare-view__header-left' });
  headerLeft.appendChild(
    createElement('h1', { class: 'compare-view__title' }, ['Scenario Comparison'])
  );
  const subtitle = createElement('p', { class: 'compare-view__subtitle' });
  headerLeft.appendChild(subtitle);
  header.appendChild(headerLeft);

  const headerActions = createElement('div', { class: 'compare-view__actions' });
  const backButton = createButton({
    text: 'Back to Scenarios',
    variant: 'secondary',
    onClick: () => navigate('compare'),
  });
  components.push(backButton);
  headerActions.appendChild(backButton.element);
  header.appendChild(headerActions);
  container.appendChild(header);

  // Key insight banner
  const insightBanner = createElement('div', { class: 'compare-view__insight' });
  container.appendChild(insightBanner);

  // Summary comparison cards
  const summarySection = createElement('section', { class: 'compare-view__summary' });
  container.appendChild(summarySection);

  // Chart section
  const chartSection = createElement('section', { class: 'compare-view__chart-section' });
  chartSection.appendChild(
    createElement('h2', { class: 'compare-view__section-title' }, ['Timeline Comparison'])
  );
  const chartContainer = createElement('div', { class: 'compare-view__chart' });
  chartSection.appendChild(chartContainer);
  container.appendChild(chartSection);

  // Year slider
  const sliderSection = createElement('div', { class: 'compare-view__slider-section' });
  const sliderLabel = createElement('label', { class: 'compare-view__slider-label' }, [
    'Select Year:',
  ]);
  sliderSection.appendChild(sliderLabel);
  const slider = createElement('input', {
    type: 'range',
    class: 'compare-view__slider',
    min: '0',
    max: '50',
    value: '0',
  }) as HTMLInputElement;
  slider.addEventListener('input', () => {
    const yearIndex = parseInt(slider.value, 10);
    if (comparison && comparison.baseline.years[yearIndex]) {
      selectedYear = comparison.baseline.years[yearIndex]!.year;
      renderYearComparison();
    }
  });
  sliderSection.appendChild(slider);
  const sliderValue = createElement('span', { class: 'compare-view__slider-value' });
  sliderSection.appendChild(sliderValue);
  chartSection.appendChild(sliderSection);

  // Year detail comparison
  const yearDetailSection = createElement('section', { class: 'compare-view__year-detail' });
  container.appendChild(yearDetailSection);

  // Delta table
  const tableSection = createElement('section', { class: 'compare-view__table-section' });
  tableSection.appendChild(
    createElement('h2', { class: 'compare-view__section-title' }, ['Year-by-Year Differences'])
  );
  const tableContainer = createElement('div', { class: 'compare-view__table-container' });
  tableSection.appendChild(tableContainer);
  container.appendChild(tableSection);

  async function initialize(): Promise<void> {
    // Load profiles
    baselineProfile = (await loadProfile(options.baselineId)) ?? null;
    alternateProfile = (await loadProfile(options.alternateId)) ?? null;

    if (!baselineProfile || !alternateProfile) {
      container.appendChild(
        createElement('div', { class: 'compare-view__error' }, [
          'Unable to load profiles for comparison.',
        ])
      );
      return;
    }

    // Generate trajectories
    const baselineTrajectory = generateTrajectory(baselineProfile);
    const alternateTrajectory = generateTrajectory(alternateProfile);

    // Compare them
    comparison = compareTrajectories(
      baselineTrajectory,
      alternateTrajectory,
      options.changes,
      `${baselineProfile.name} vs ${alternateProfile.name}`
    );

    // Update subtitle
    subtitle.textContent = `${baselineProfile.name} vs ${alternateProfile.name}`;

    // Set up slider
    slider.max = String(comparison.baseline.years.length - 1);
    slider.value = '0';
    if (comparison.baseline.years[0]) {
      selectedYear = comparison.baseline.years[0].year;
    }

    // Render all sections
    renderInsight();
    renderSummary();
    renderChart();
    renderYearComparison();
    renderDeltaTable();
  }

  function renderInsight(): void {
    clearChildren(insightBanner);
    if (!comparison) return;

    const icon = createElement('span', { class: 'compare-view__insight-icon' }, ['💡']);
    insightBanner.appendChild(icon);
    insightBanner.appendChild(
      createElement('span', { class: 'compare-view__insight-text' }, [
        comparison.summary.keyInsight,
      ])
    );
  }

  function renderSummary(): void {
    clearChildren(summarySection);
    if (!comparison || !baselineProfile || !alternateProfile) return;

    const grid = createElement('div', { class: 'compare-view__summary-grid' });

    // Retirement date
    grid.appendChild(
      createComparisonCard(
        'Retirement',
        comparison.summary.retirementDateDelta === 0
          ? 'Same'
          : formatRetirementDelta(comparison.summary.retirementDateDelta),
        comparison.summary.retirementDateDelta < 0 ? 'positive' : comparison.summary.retirementDateDelta > 0 ? 'negative' : 'neutral'
      )
    );

    // Net worth at end
    grid.appendChild(
      createComparisonCard(
        'Final Net Worth',
        formatCurrencyDelta(comparison.summary.netWorthAtEndDelta),
        comparison.summary.netWorthAtEndDelta > 0 ? 'positive' : comparison.summary.netWorthAtEndDelta < 0 ? 'negative' : 'neutral'
      )
    );

    // Lifetime interest
    grid.appendChild(
      createComparisonCard(
        'Lifetime Interest',
        formatCurrencyDelta(comparison.summary.lifetimeInterestDelta),
        comparison.summary.lifetimeInterestDelta < 0 ? 'positive' : comparison.summary.lifetimeInterestDelta > 0 ? 'negative' : 'neutral'
      )
    );

    // Work hours
    grid.appendChild(
      createComparisonCard(
        'Work Hours',
        comparison.summary.totalWorkHoursDelta === 0
          ? 'Same'
          : formatWorkHoursDelta(comparison.summary.totalWorkHoursDelta),
        comparison.summary.totalWorkHoursDelta < 0 ? 'positive' : comparison.summary.totalWorkHoursDelta > 0 ? 'negative' : 'neutral'
      )
    );

    summarySection.appendChild(grid);
  }

  function createComparisonCard(
    title: string,
    value: string,
    sentiment: 'positive' | 'negative' | 'neutral'
  ): HTMLElement {
    const card = createElement('div', {
      class: `compare-view__summary-card compare-view__summary-card--${sentiment}`,
    });
    card.appendChild(createElement('div', { class: 'compare-view__summary-label' }, [title]));
    card.appendChild(createElement('div', { class: 'compare-view__summary-value' }, [value]));
    return card;
  }

  function renderChart(): void {
    clearChildren(chartContainer);
    if (!comparison) return;

    // Create simple SVG chart with both trajectories
    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'compare-view__svg');

    // Get data ranges
    const baselineData = comparison.baseline.years;
    const alternateData = comparison.alternate.years;

    const allYears = baselineData.map((y) => y.year);
    const allNetWorth = [
      ...baselineData.map((y) => y.netWorth),
      ...alternateData.map((y) => y.netWorth),
    ];

    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    const minNetWorth = Math.min(...allNetWorth, 0);
    const maxNetWorth = Math.max(...allNetWorth);

    // Scale functions
    const xScale = (year: number) =>
      margin.left + ((year - minYear) / (maxYear - minYear || 1)) * innerWidth;
    const yScale = (value: number) =>
      margin.top + innerHeight - ((value - minNetWorth) / (maxNetWorth - minNetWorth || 1)) * innerHeight;

    // Draw grid lines
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'compare-view__grid');

    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (innerHeight * i) / 5;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(margin.left));
      line.setAttribute('x2', String(width - margin.right));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', '#e2e8f0');
      line.setAttribute('stroke-dasharray', '4');
      gridGroup.appendChild(line);
    }
    svg.appendChild(gridGroup);

    // Draw axes
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxis.setAttribute('class', 'compare-view__x-axis');

    // X-axis labels
    const yearStep = Math.ceil((maxYear - minYear) / 10);
    for (let year = minYear; year <= maxYear; year += yearStep) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(xScale(year)));
      text.setAttribute('y', String(height - 10));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#64748b');
      text.setAttribute('font-size', '12');
      text.textContent = String(year);
      xAxis.appendChild(text);
    }
    svg.appendChild(xAxis);

    // Y-axis labels
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    yAxis.setAttribute('class', 'compare-view__y-axis');

    for (let i = 0; i <= 5; i++) {
      const value = minNetWorth + ((maxNetWorth - minNetWorth) * (5 - i)) / 5;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(margin.left - 10));
      text.setAttribute('y', String(margin.top + (innerHeight * i) / 5 + 4));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('fill', '#64748b');
      text.setAttribute('font-size', '12');
      text.textContent = formatCurrency(value, { compact: true });
      yAxis.appendChild(text);
    }
    svg.appendChild(yAxis);

    // Draw baseline line
    const baselinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const baselinePoints = baselineData
      .map((y) => `${xScale(y.year)},${yScale(y.netWorth)}`)
      .join(' L ');
    baselinePath.setAttribute('d', `M ${baselinePoints}`);
    baselinePath.setAttribute('fill', 'none');
    baselinePath.setAttribute('stroke', '#64748b');
    baselinePath.setAttribute('stroke-width', '2');
    baselinePath.setAttribute('class', 'compare-view__line compare-view__line--baseline');
    svg.appendChild(baselinePath);

    // Draw alternate line
    const alternatePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const alternatePoints = alternateData
      .map((y) => `${xScale(y.year)},${yScale(y.netWorth)}`)
      .join(' L ');
    alternatePath.setAttribute('d', `M ${alternatePoints}`);
    alternatePath.setAttribute('fill', 'none');
    alternatePath.setAttribute('stroke', '#2563eb');
    alternatePath.setAttribute('stroke-width', '2');
    alternatePath.setAttribute('class', 'compare-view__line compare-view__line--alternate');
    svg.appendChild(alternatePath);

    // Legend
    const legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legend.setAttribute('transform', `translate(${width - margin.right - 150}, ${margin.top})`);

    // Baseline legend
    const baselineLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const baselineLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    baselineLine.setAttribute('x1', '0');
    baselineLine.setAttribute('x2', '20');
    baselineLine.setAttribute('y1', '0');
    baselineLine.setAttribute('y2', '0');
    baselineLine.setAttribute('stroke', '#64748b');
    baselineLine.setAttribute('stroke-width', '2');
    baselineLegend.appendChild(baselineLine);
    const baselineText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    baselineText.setAttribute('x', '25');
    baselineText.setAttribute('y', '4');
    baselineText.setAttribute('fill', '#64748b');
    baselineText.setAttribute('font-size', '12');
    baselineText.textContent = 'Baseline';
    baselineLegend.appendChild(baselineText);
    legend.appendChild(baselineLegend);

    // Alternate legend
    const alternateLegend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    alternateLegend.setAttribute('transform', 'translate(0, 20)');
    const alternateLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    alternateLine.setAttribute('x1', '0');
    alternateLine.setAttribute('x2', '20');
    alternateLine.setAttribute('y1', '0');
    alternateLine.setAttribute('y2', '0');
    alternateLine.setAttribute('stroke', '#2563eb');
    alternateLine.setAttribute('stroke-width', '2');
    alternateLegend.appendChild(alternateLine);
    const alternateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    alternateText.setAttribute('x', '25');
    alternateText.setAttribute('y', '4');
    alternateText.setAttribute('fill', '#2563eb');
    alternateText.setAttribute('font-size', '12');
    alternateText.textContent = 'Scenario';
    alternateLegend.appendChild(alternateText);
    legend.appendChild(alternateLegend);

    svg.appendChild(legend);

    chartContainer.appendChild(svg);
  }

  function renderYearComparison(): void {
    clearChildren(yearDetailSection);
    if (!comparison || !selectedYear) return;

    const { baselineYear, alternateYear, delta } = getComparisonAtYear(comparison, selectedYear);
    if (!baselineYear || !alternateYear || !delta) return;

    // Update slider value display
    sliderValue.textContent = String(selectedYear);

    yearDetailSection.appendChild(
      createElement('h2', { class: 'compare-view__section-title' }, [`Year ${selectedYear} Comparison`])
    );

    const grid = createElement('div', { class: 'compare-view__year-grid' });

    // Net Worth row
    grid.appendChild(createComparisonRow('Net Worth', baselineYear.netWorth, alternateYear.netWorth, delta.netWorthDelta));
    // Income row
    grid.appendChild(createComparisonRow('Gross Income', baselineYear.grossIncome, alternateYear.grossIncome, delta.incomeDelta));
    // Debt row
    grid.appendChild(createComparisonRow('Total Debt', baselineYear.totalDebt, alternateYear.totalDebt, delta.debtDelta, true));
    // Assets row
    grid.appendChild(createComparisonRow('Total Assets', baselineYear.totalAssets, alternateYear.totalAssets, delta.assetsDelta));
    // Savings rate row
    grid.appendChild(createComparisonRowPercent('Savings Rate', baselineYear.savingsRate, alternateYear.savingsRate, delta.savingsRateDelta));

    yearDetailSection.appendChild(grid);
  }

  function createComparisonRow(
    label: string,
    baseline: number,
    alternate: number,
    delta: number,
    invertColors: boolean = false
  ): HTMLElement {
    const row = createElement('div', { class: 'compare-view__row' });
    row.appendChild(createElement('span', { class: 'compare-view__row-label' }, [label]));
    row.appendChild(
      createElement('span', { class: 'compare-view__row-baseline' }, [formatCurrency(baseline)])
    );
    row.appendChild(
      createElement('span', { class: 'compare-view__row-alternate' }, [formatCurrency(alternate)])
    );

    const deltaClass = invertColors
      ? delta < 0 ? 'positive' : delta > 0 ? 'negative' : ''
      : delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    row.appendChild(
      createElement('span', { class: `compare-view__row-delta compare-view__row-delta--${deltaClass}` }, [
        formatCurrencyDelta(delta),
      ])
    );
    return row;
  }

  function createComparisonRowPercent(
    label: string,
    baseline: number,
    alternate: number,
    delta: number
  ): HTMLElement {
    const row = createElement('div', { class: 'compare-view__row' });
    row.appendChild(createElement('span', { class: 'compare-view__row-label' }, [label]));
    row.appendChild(
      createElement('span', { class: 'compare-view__row-baseline' }, [formatPercent(baseline)])
    );
    row.appendChild(
      createElement('span', { class: 'compare-view__row-alternate' }, [formatPercent(alternate)])
    );

    const sign = delta >= 0 ? '+' : '';
    const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
    row.appendChild(
      createElement('span', { class: `compare-view__row-delta compare-view__row-delta--${deltaClass}` }, [
        `${sign}${(delta * 100).toFixed(1)}%`,
      ])
    );
    return row;
  }

  function renderDeltaTable(): void {
    clearChildren(tableContainer);
    if (!comparison) return;

    const table = createElement('table', { class: 'compare-view__table' });

    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    const headers = ['Year', 'Net Worth Δ', 'Income Δ', 'Debt Δ', 'Assets Δ', 'Savings Rate Δ'];
    for (const h of headers) {
      headerRow.appendChild(createElement('th', {}, [h]));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = createElement('tbody');
    for (const delta of comparison.deltas) {
      const row = createElement('tr');
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        selectedYear = delta.year;
        const yearIndex = comparison!.baseline.years.findIndex((y) => y.year === delta.year);
        slider.value = String(yearIndex);
        renderYearComparison();
      });

      row.appendChild(createElement('td', {}, [String(delta.year)]));
      row.appendChild(createDeltaCell(delta.netWorthDelta));
      row.appendChild(createDeltaCell(delta.incomeDelta));
      row.appendChild(createDeltaCell(delta.debtDelta, true));
      row.appendChild(createDeltaCell(delta.assetsDelta));
      row.appendChild(createDeltaCellPercent(delta.savingsRateDelta));

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  function createDeltaCell(value: number, invertColors: boolean = false): HTMLElement {
    const colorClass = invertColors
      ? value < 0 ? 'text-positive' : value > 0 ? 'text-negative' : ''
      : value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : '';
    return createElement('td', { class: colorClass }, [formatCurrencyDelta(value)]);
  }

  function createDeltaCellPercent(value: number): HTMLElement {
    const sign = value >= 0 ? '+' : '';
    const colorClass = value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : '';
    return createElement('td', { class: colorClass }, [`${sign}${(value * 100).toFixed(1)}%`]);
  }

  // Initialize
  initialize();

  return {
    element: container,

    destroy(): void {
      for (const component of components) {
        component.destroy();
      }
    },
  };
}

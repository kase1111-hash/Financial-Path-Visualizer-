/**
 * Trajectory View
 *
 * Display financial projection trajectory with D3 visualization.
 */

import type { FinancialProfile } from '@models/profile';
import type { Trajectory, TrajectoryYear } from '@models/trajectory';
import { createElement, clearChildren } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import { formatCurrency, formatPercent } from '@ui/utils/format';
import { navigate } from '@ui/utils/state';
import { generateTrajectory } from '@engine/projector';
import { createTimelineChart, type TimelineChartComponent } from '@ui/viz/TimelineChart';
import { createSummaryCards, type SummaryCardsComponent } from '@ui/viz/SummaryCards';
import { createYearDetail, type YearDetailComponent } from '@ui/viz/YearDetail';
import { createMilestoneList, type MilestoneListComponent } from '@ui/viz/MilestoneList';

export interface TrajectoryViewOptions {
  profile: FinancialProfile;
}

export interface TrajectoryViewComponent {
  element: HTMLElement;
  update(profile: FinancialProfile): void;
  destroy(): void;
}

/**
 * Create a trajectory view component.
 */
export function createTrajectoryView(options: TrajectoryViewOptions): TrajectoryViewComponent {
  let profile = options.profile;
  let trajectory: Trajectory | null = null;

  const container = createElement('div', { class: 'trajectory-view' });
  const components: { destroy(): void }[] = [];

  // Sub-components
  let timelineChart: TimelineChartComponent | null = null;
  let summaryCards: SummaryCardsComponent | null = null;
  let yearDetail: YearDetailComponent | null = null;
  let milestoneList: MilestoneListComponent | null = null;

  // Header
  const header = createElement('header', { class: 'trajectory-view__header' });

  const headerLeft = createElement('div', { class: 'trajectory-view__header-left' });
  const title = createElement('h1', { class: 'trajectory-view__title' }, [profile.name]);
  headerLeft.appendChild(title);
  header.appendChild(headerLeft);

  const headerActions = createElement('div', { class: 'trajectory-view__actions' });

  const editButton = createButton({
    text: 'Edit Profile',
    variant: 'secondary',
    onClick: () => navigate('editor'),
  });
  components.push(editButton);
  headerActions.appendChild(editButton.element);

  const compareButton = createButton({
    text: 'Compare Scenarios',
    variant: 'ghost',
    onClick: () => navigate('compare'),
  });
  components.push(compareButton);
  headerActions.appendChild(compareButton.element);

  const optimizeButton = createButton({
    text: 'Optimizations',
    variant: 'primary',
    onClick: () => navigate('optimizations'),
  });
  components.push(optimizeButton);
  headerActions.appendChild(optimizeButton.element);

  header.appendChild(headerActions);
  container.appendChild(header);

  // Summary cards section
  const summarySection = createElement('section', { class: 'trajectory-view__summary' });
  container.appendChild(summarySection);

  // Main content layout
  const mainContent = createElement('div', { class: 'trajectory-view__main' });

  // Chart section (left/main)
  const chartSection = createElement('section', { class: 'trajectory-view__chart-section' });
  chartSection.appendChild(
    createElement('h2', { class: 'trajectory-view__section-title' }, ['Financial Timeline'])
  );
  const chartContainer = createElement('div', { class: 'trajectory-view__chart-container' });
  chartSection.appendChild(chartContainer);
  mainContent.appendChild(chartSection);

  // Sidebar (right)
  const sidebar = createElement('aside', { class: 'trajectory-view__sidebar' });

  // Year detail panel
  const yearDetailSection = createElement('section', { class: 'trajectory-view__year-detail' });
  yearDetailSection.appendChild(
    createElement('h2', { class: 'trajectory-view__section-title' }, ['Year Details'])
  );
  const yearDetailContainer = createElement('div', { class: 'trajectory-view__year-detail-container' });
  yearDetailSection.appendChild(yearDetailContainer);
  sidebar.appendChild(yearDetailSection);

  // Milestones section
  const milestonesSection = createElement('section', { class: 'trajectory-view__milestones' });
  milestonesSection.appendChild(
    createElement('h2', { class: 'trajectory-view__section-title' }, ['Key Milestones'])
  );
  const milestonesContainer = createElement('div', { class: 'trajectory-view__milestones-container' });
  milestonesSection.appendChild(milestonesContainer);
  sidebar.appendChild(milestonesSection);

  mainContent.appendChild(sidebar);
  container.appendChild(mainContent);

  // Year-by-year table (collapsible)
  const tableSection = createElement('section', { class: 'trajectory-view__table-section' });
  const tableHeader = createElement('div', { class: 'trajectory-view__table-header' });
  tableHeader.appendChild(
    createElement('h2', { class: 'trajectory-view__section-title' }, ['Year-by-Year Data'])
  );

  const toggleButton = createButton({
    text: 'Show Table',
    variant: 'ghost',
    size: 'small',
    onClick: () => {
      tableContainer.classList.toggle('trajectory-view__table-container--expanded');
      toggleButton.element.textContent = tableContainer.classList.contains(
        'trajectory-view__table-container--expanded'
      )
        ? 'Hide Table'
        : 'Show Table';
    },
  });
  components.push(toggleButton);
  tableHeader.appendChild(toggleButton.element);
  tableSection.appendChild(tableHeader);

  const tableContainer = createElement('div', { class: 'trajectory-view__table-container' });
  tableSection.appendChild(tableContainer);
  container.appendChild(tableSection);

  function handleYearSelect(year: TrajectoryYear): void {
    if (yearDetail && trajectory) {
      yearDetail.setYear(year, trajectory.milestones);
    }
    if (timelineChart) {
      timelineChart.highlightYear(year.year);
    }
    if (milestoneList) {
      milestoneList.highlightYear(year.year);
    }
  }

  function handleMilestoneClick(milestone: { year: number }): void {
    if (!trajectory) return;

    const yearData = trajectory.years.find((y) => y.year === milestone.year);
    if (yearData) {
      handleYearSelect(yearData);
    }
  }

  function calculateAndRender(): void {
    trajectory = generateTrajectory(profile);
    renderSummaryCards();
    renderChart();
    renderYearDetail();
    renderMilestones();
    renderTable();
  }

  function renderSummaryCards(): void {
    clearChildren(summarySection);

    if (!trajectory) return;

    if (summaryCards) {
      summaryCards.destroy();
    }

    summaryCards = createSummaryCards({ trajectory });
    components.push(summaryCards);
    summarySection.appendChild(summaryCards.element);
  }

  function renderChart(): void {
    clearChildren(chartContainer);

    if (!trajectory || trajectory.years.length === 0) {
      chartContainer.appendChild(
        createElement('div', { class: 'trajectory-view__empty' }, [
          'No projection data available. Add income to generate a trajectory.',
        ])
      );
      return;
    }

    if (timelineChart) {
      timelineChart.destroy();
    }

    timelineChart = createTimelineChart({
      trajectory,
      initialMetric: 'netWorth',
      onYearSelect: handleYearSelect,
      onMilestoneClick: handleMilestoneClick,
    });
    components.push(timelineChart);
    chartContainer.appendChild(timelineChart.element);
  }

  function renderYearDetail(): void {
    clearChildren(yearDetailContainer);

    if (!trajectory) return;

    if (yearDetail) {
      yearDetail.destroy();
    }

    yearDetail = createYearDetail({
      profile,
      milestones: trajectory.milestones,
      onClose: () => {
        yearDetail?.setYear(null);
        timelineChart?.highlightYear(null);
        milestoneList?.highlightYear(null);
      },
    });
    components.push(yearDetail);
    yearDetailContainer.appendChild(yearDetail.element);
  }

  function renderMilestones(): void {
    clearChildren(milestonesContainer);

    if (!trajectory) return;

    if (milestoneList) {
      milestoneList.destroy();
    }

    milestoneList = createMilestoneList({
      milestones: trajectory.milestones,
      onMilestoneClick: handleMilestoneClick,
      compact: true,
    });
    components.push(milestoneList);
    milestonesContainer.appendChild(milestoneList.element);
  }

  function renderTable(): void {
    clearChildren(tableContainer);

    if (!trajectory || trajectory.years.length === 0) return;

    const table = createElement('table', { class: 'trajectory-table' });

    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    const headers = ['Year', 'Age', 'Income', 'Net Income', 'Savings Rate', 'Assets', 'Debt', 'Net Worth'];

    for (const h of headers) {
      headerRow.appendChild(createElement('th', {}, [h]));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = createElement('tbody');

    for (const year of trajectory.years) {
      const row = createElement('tr', { 'data-year': String(year.year) });
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => handleYearSelect(year));

      row.appendChild(createElement('td', {}, [String(year.year)]));
      row.appendChild(createElement('td', {}, [String(year.age)]));
      row.appendChild(
        createElement('td', {}, [formatCurrency(year.grossIncome, { compact: true })])
      );
      row.appendChild(
        createElement('td', {}, [formatCurrency(year.netIncome, { compact: true })])
      );
      row.appendChild(createElement('td', {}, [formatPercent(year.savingsRate)]));
      row.appendChild(
        createElement('td', { class: 'text-positive' }, [
          formatCurrency(year.totalAssets, { compact: true }),
        ])
      );
      row.appendChild(
        createElement('td', { class: year.totalDebt > 0 ? 'text-negative' : '' }, [
          formatCurrency(year.totalDebt, { compact: true }),
        ])
      );
      row.appendChild(
        createElement(
          'td',
          { class: year.netWorth >= 0 ? 'text-positive' : 'text-negative' },
          [formatCurrency(year.netWorth, { compact: true })]
        )
      );

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  // Initial calculation
  calculateAndRender();

  return {
    element: container,

    update(newProfile: FinancialProfile): void {
      profile = newProfile;
      title.textContent = profile.name;
      calculateAndRender();
    },

    destroy(): void {
      for (const component of components) {
        component.destroy();
      }
    },
  };
}

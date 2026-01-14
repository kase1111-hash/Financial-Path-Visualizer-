/**
 * Timeline Chart Component
 *
 * D3-based interactive timeline visualization for financial projections.
 */

import * as d3 from 'd3';
import type { Trajectory, TrajectoryYear, Milestone } from '@models/trajectory';
import { createElement, clearChildren } from '@ui/utils/dom';
import { formatCurrency, formatPercent } from '@ui/utils/format';
import {
  calculateDimensions,
  createYearScale,
  createCurrencyScale,
  createPercentScale,
  createYearAxis,
  createCurrencyAxis,
  createPercentAxis,
  createYGridLines,
  createLineGenerator,
  createAreaGenerator,
  createResizeObserver,
  debounce,
  findNearestDataPoint,
  CHART_COLORS,
  MILESTONE_ICONS,
  type ChartDimensions,
} from './chart-utils';

/**
 * Available metrics for display.
 */
export type ChartMetric = 'netWorth' | 'totalDebt' | 'totalAssets' | 'grossIncome' | 'savingsRate';

export interface TimelineChartOptions {
  trajectory: Trajectory;
  initialMetric?: ChartMetric;
  onYearSelect?: (year: TrajectoryYear) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
}

export interface TimelineChartComponent {
  element: HTMLElement;
  setMetric(metric: ChartMetric): void;
  setTrajectory(trajectory: Trajectory): void;
  highlightYear(year: number | null): void;
  destroy(): void;
}

/**
 * Metric display configuration.
 */
const METRIC_CONFIG: Record<
  ChartMetric,
  {
    label: string;
    accessor: (d: TrajectoryYear) => number;
    format: (v: number) => string;
    color: string;
    isPercent: boolean;
  }
> = {
  netWorth: {
    label: 'Net Worth',
    accessor: (d) => d.netWorth,
    format: (v) => formatCurrency(v, { compact: true }),
    color: CHART_COLORS.netWorth,
    isPercent: false,
  },
  totalDebt: {
    label: 'Total Debt',
    accessor: (d) => d.totalDebt,
    format: (v) => formatCurrency(v, { compact: true }),
    color: CHART_COLORS.debt,
    isPercent: false,
  },
  totalAssets: {
    label: 'Total Assets',
    accessor: (d) => d.totalAssets,
    format: (v) => formatCurrency(v, { compact: true }),
    color: CHART_COLORS.assets,
    isPercent: false,
  },
  grossIncome: {
    label: 'Gross Income',
    accessor: (d) => d.grossIncome,
    format: (v) => formatCurrency(v, { compact: true }),
    color: CHART_COLORS.income,
    isPercent: false,
  },
  savingsRate: {
    label: 'Savings Rate',
    accessor: (d) => d.savingsRate,
    format: (v) => formatPercent(v),
    color: CHART_COLORS.savingsRate,
    isPercent: true,
  },
};

/**
 * Create a timeline chart component.
 */
export function createTimelineChart(options: TimelineChartOptions): TimelineChartComponent {
  const { onYearSelect, onMilestoneClick } = options;
  let trajectory = options.trajectory;
  let currentMetric: ChartMetric = options.initialMetric ?? 'netWorth';
  let highlightedYear: number | null = null;

  // Container
  const container = createElement('div', { class: 'timeline-chart' });

  // Metric selector
  const selectorContainer = createElement('div', { class: 'timeline-chart__selector' });
  const metricButtons: Map<ChartMetric, HTMLButtonElement> = new Map();

  for (const [metric, config] of Object.entries(METRIC_CONFIG)) {
    const btn = createElement(
      'button',
      {
        type: 'button',
        class: `timeline-chart__metric-btn${metric === currentMetric ? ' timeline-chart__metric-btn--active' : ''}`,
        'data-metric': metric,
      },
      [config.label]
    ) as HTMLButtonElement;

    btn.addEventListener('click', () => {
      setMetric(metric as ChartMetric);
    });

    metricButtons.set(metric as ChartMetric, btn);
    selectorContainer.appendChild(btn);
  }

  container.appendChild(selectorContainer);

  // Chart container
  const chartContainer = createElement('div', { class: 'timeline-chart__chart' });
  container.appendChild(chartContainer);

  // Tooltip
  const tooltip = createElement('div', { class: 'timeline-chart__tooltip' });
  tooltip.style.display = 'none';
  container.appendChild(tooltip);

  // SVG elements
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  let xScale: d3.ScaleLinear<number, number>;
  let yScale: d3.ScaleLinear<number, number>;
  let dimensions: ChartDimensions;

  // Resize observer
  const resizeObserver = createResizeObserver(
    chartContainer,
    debounce((width: number) => {
      if (width > 0) {
        render();
      }
    }, 100)
  );

  function render(): void {
    clearChildren(chartContainer);

    if (trajectory.years.length === 0) {
      chartContainer.appendChild(
        createElement('div', { class: 'timeline-chart__empty' }, ['No projection data available.'])
      );
      return;
    }

    const containerWidth = chartContainer.clientWidth || 600;
    dimensions = calculateDimensions(containerWidth, 2.5);
    const { width, height, margins, innerWidth, innerHeight } = dimensions;

    // Create SVG
    svg = d3
      .select(chartContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'timeline-chart__svg');

    chartGroup = svg
      .append('g')
      .attr('transform', `translate(${margins.left},${margins.top})`);

    // Get data range
    const years = trajectory.years;
    const startYear = years[0]!.year;
    const endYear = years[years.length - 1]!.year;
    const config = METRIC_CONFIG[currentMetric];
    const values = years.map((y) => config.accessor(y));
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values);

    // Create scales
    xScale = createYearScale(startYear, endYear, innerWidth);

    if (config.isPercent) {
      const minRate = Math.min(...values, 0);
      const maxRate = Math.max(...values, 0.5);
      yScale = createPercentScale(minRate, maxRate, innerHeight);
    } else {
      yScale = createCurrencyScale(minValue, maxValue, innerHeight);
    }

    // Add grid lines
    chartGroup
      .append('g')
      .attr('class', 'timeline-chart__grid')
      .call(createYGridLines(yScale, innerWidth))
      .selectAll('line')
      .attr('stroke', CHART_COLORS.gridLine)
      .attr('stroke-dasharray', '3,3');

    // Add zero line if applicable
    if (minValue < 0 && maxValue > 0) {
      chartGroup
        .append('line')
        .attr('class', 'timeline-chart__zero-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', CHART_COLORS.axis)
        .attr('stroke-width', 1);
    }

    // Add area fill
    const areaGenerator = createAreaGenerator<TrajectoryYear>(
      xScale,
      yScale,
      (d) => d.year,
      config.accessor,
      config.isPercent ? 0 : Math.max(minValue, 0)
    );

    chartGroup
      .append('path')
      .datum(years)
      .attr('class', 'timeline-chart__area')
      .attr('d', areaGenerator)
      .attr('fill', config.color)
      .attr('fill-opacity', 0.15);

    // Add line
    const lineGenerator = createLineGenerator<TrajectoryYear>(
      xScale,
      yScale,
      (d) => d.year,
      config.accessor
    );

    chartGroup
      .append('path')
      .datum(years)
      .attr('class', 'timeline-chart__line')
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', config.color)
      .attr('stroke-width', 2.5);

    // Add milestone markers
    const milestonesGroup = chartGroup.append('g').attr('class', 'timeline-chart__milestones');

    for (const milestone of trajectory.milestones) {
      const yearData = years.find((y) => y.year === milestone.year);
      if (!yearData) continue;

      const x = xScale(milestone.year);
      const y = yScale(config.accessor(yearData));

      const milestoneGroup = milestonesGroup
        .append('g')
        .attr('class', 'timeline-chart__milestone')
        .attr('transform', `translate(${x},${y})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          onMilestoneClick?.(milestone);
        });

      milestoneGroup
        .append('circle')
        .attr('r', 8)
        .attr('fill', '#fff')
        .attr('stroke', CHART_COLORS.milestone)
        .attr('stroke-width', 2);

      milestoneGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '10px')
        .text(MILESTONE_ICONS[milestone.type] ?? '●');
    }

    // Add axes
    chartGroup
      .append('g')
      .attr('class', 'timeline-chart__x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(createYearAxis(xScale, innerHeight));

    const yAxis = config.isPercent ? createPercentAxis(yScale) : createCurrencyAxis(yScale);
    chartGroup.append('g').attr('class', 'timeline-chart__y-axis').call(yAxis);

    // Add interaction overlay
    const overlay = chartGroup
      .append('rect')
      .attr('class', 'timeline-chart__overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    // Highlight circle
    const highlightCircle = chartGroup
      .append('circle')
      .attr('class', 'timeline-chart__highlight')
      .attr('r', 6)
      .attr('fill', config.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('display', 'none');

    // Vertical line
    const verticalLine = chartGroup
      .append('line')
      .attr('class', 'timeline-chart__vertical-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', CHART_COLORS.axis)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .style('display', 'none');

    // Mouse handlers
    overlay
      .on('mousemove', function (event: MouseEvent) {
        const [mouseX] = d3.pointer(event, this);
        const yearData = findNearestDataPoint(
          years,
          xScale,
          (d) => d.year,
          mouseX
        );

        if (yearData) {
          const x = xScale(yearData.year);
          const y = yScale(config.accessor(yearData));

          highlightCircle.attr('cx', x).attr('cy', y).style('display', null);
          verticalLine.attr('x1', x).attr('x2', x).style('display', null);

          // Update tooltip using safe DOM manipulation (avoids innerHTML XSS risk)
          tooltip.textContent = '';
          const yearDiv = document.createElement('div');
          yearDiv.className = 'timeline-chart__tooltip-year';
          yearDiv.textContent = `Year ${yearData.year} (Age ${yearData.age})`;
          tooltip.appendChild(yearDiv);

          const valueDiv = document.createElement('div');
          valueDiv.className = 'timeline-chart__tooltip-value';
          valueDiv.textContent = `${config.label}: ${config.format(config.accessor(yearData))}`;
          tooltip.appendChild(valueDiv);
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.offsetX + 15}px`;
          tooltip.style.top = `${event.offsetY - 10}px`;
        }
      })
      .on('mouseleave', () => {
        highlightCircle.style('display', 'none');
        verticalLine.style('display', 'none');
        tooltip.style.display = 'none';
      })
      .on('click', function (event: MouseEvent) {
        const [mouseX] = d3.pointer(event, this);
        const yearData = findNearestDataPoint(
          years,
          xScale,
          (d) => d.year,
          mouseX
        );

        if (yearData) {
          highlightYear(yearData.year);
          onYearSelect?.(yearData);
        }
      });

    // Render highlighted year if set
    if (highlightedYear !== null) {
      renderHighlight();
    }
  }

  function renderHighlight(): void {
    if (!chartGroup || highlightedYear === null) return;

    const config = METRIC_CONFIG[currentMetric];
    const yearData = trajectory.years.find((y) => y.year === highlightedYear);
    if (!yearData) return;

    // Remove existing highlight
    chartGroup.selectAll('.timeline-chart__selected').remove();

    const x = xScale(yearData.year);
    const y = yScale(config.accessor(yearData));

    chartGroup
      .append('circle')
      .attr('class', 'timeline-chart__selected')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 8)
      .attr('fill', config.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);
  }

  function setMetric(metric: ChartMetric): void {
    if (metric === currentMetric) return;

    // Update button states
    metricButtons.get(currentMetric)?.classList.remove('timeline-chart__metric-btn--active');
    metricButtons.get(metric)?.classList.add('timeline-chart__metric-btn--active');

    currentMetric = metric;
    render();
  }

  function setTrajectory(newTrajectory: Trajectory): void {
    trajectory = newTrajectory;
    render();
  }

  function highlightYear(year: number | null): void {
    highlightedYear = year;
    if (chartGroup) {
      if (year === null) {
        chartGroup.selectAll('.timeline-chart__selected').remove();
      } else {
        renderHighlight();
      }
    }
  }

  // Initial render
  setTimeout(() => render(), 0);

  return {
    element: container,
    setMetric,
    setTrajectory,
    highlightYear,
    destroy(): void {
      resizeObserver.disconnect();
      clearChildren(container);
    },
  };
}

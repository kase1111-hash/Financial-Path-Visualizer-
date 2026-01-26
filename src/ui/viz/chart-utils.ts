/**
 * Chart Utilities
 *
 * Common utilities for D3-based visualizations.
 */

import * as d3 from 'd3';
import type { Cents } from '@models/common';

/**
 * Standard margins for charts.
 */
export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_MARGINS: ChartMargins = {
  top: 20,
  right: 30,
  bottom: 40,
  left: 60,
};

/**
 * Chart dimensions.
 */
export interface ChartDimensions {
  width: number;
  height: number;
  margins: ChartMargins;
  innerWidth: number;
  innerHeight: number;
}

/**
 * Calculate chart dimensions from container size.
 */
export function calculateDimensions(
  containerWidth: number,
  aspectRatio: number = 2,
  margins: ChartMargins = DEFAULT_MARGINS
): ChartDimensions {
  const width = containerWidth;
  const height = Math.round(containerWidth / aspectRatio);
  const innerWidth = width - margins.left - margins.right;
  const innerHeight = height - margins.top - margins.bottom;

  return { width, height, margins, innerWidth, innerHeight };
}

/**
 * Create a linear scale for years (x-axis).
 */
export function createYearScale(
  startYear: number,
  endYear: number,
  width: number
): d3.ScaleLinear<number, number> {
  return d3.scaleLinear().domain([startYear, endYear]).range([0, width]);
}

/**
 * Create a linear scale for currency values (y-axis).
 */
export function createCurrencyScale(
  minValue: Cents,
  maxValue: Cents,
  height: number,
  padding: number = 0.1
): d3.ScaleLinear<number, number> {
  const range = maxValue - minValue;
  const paddedMin = minValue - range * padding;
  const paddedMax = maxValue + range * padding;

  return d3.scaleLinear().domain([paddedMin, paddedMax]).range([height, 0]).nice();
}

/**
 * Create a linear scale for percentages (y-axis).
 */
export function createPercentScale(
  minValue: number,
  maxValue: number,
  height: number
): d3.ScaleLinear<number, number> {
  return d3.scaleLinear().domain([minValue, maxValue]).range([height, 0]).nice();
}

/**
 * Format currency value for axis ticks.
 */
export function formatCurrencyTick(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000000) {
    return `$${(dollars / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(dollars) >= 1000) {
    return `$${Math.round(dollars / 1000)}K`;
  }
  return `$${Math.round(dollars)}`;
}

/**
 * Format percentage value for axis ticks.
 */
export function formatPercentTick(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Create X-axis for years.
 */
export function createYearAxis(
  scale: d3.ScaleLinear<number, number>,
  _height?: number
): d3.Axis<d3.NumberValue> {
  return d3
    .axisBottom(scale)
    .tickFormat((d: d3.NumberValue) => String(d))
    .ticks(Math.min(10, scale.domain()[1]! - scale.domain()[0]!));
}

/**
 * Create Y-axis for currency.
 */
export function createCurrencyAxis(
  scale: d3.ScaleLinear<number, number>
): d3.Axis<d3.NumberValue> {
  return d3.axisLeft(scale).tickFormat((d: d3.NumberValue) => formatCurrencyTick(d.valueOf()));
}

/**
 * Create Y-axis for percentages.
 */
export function createPercentAxis(
  scale: d3.ScaleLinear<number, number>
): d3.Axis<d3.NumberValue> {
  return d3.axisLeft(scale).tickFormat((d: d3.NumberValue) => formatPercentTick(d.valueOf()));
}

/**
 * Create grid lines for Y-axis.
 */
export function createYGridLines(
  scale: d3.ScaleLinear<number, number>,
  width: number
): d3.Axis<d3.NumberValue> {
  return d3.axisLeft(scale).tickSize(-width).tickFormat((_d: d3.NumberValue) => '');
}

/**
 * Create a line generator for trajectory data.
 */
export function createLineGenerator<T>(
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAccessor: (d: T) => number,
  yAccessor: (d: T) => number
): d3.Line<T> {
  return d3
    .line<T>()
    .x((d) => xScale(xAccessor(d)))
    .y((d) => yScale(yAccessor(d)))
    .curve(d3.curveMonotoneX);
}

/**
 * Create an area generator for trajectory data.
 */
export function createAreaGenerator<T>(
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAccessor: (d: T) => number,
  yAccessor: (d: T) => number,
  baseline: number = 0
): d3.Area<T> {
  return d3
    .area<T>()
    .x((d) => xScale(xAccessor(d)))
    .y0(yScale(baseline))
    .y1((d) => yScale(yAccessor(d)))
    .curve(d3.curveMonotoneX);
}

/**
 * Color palette for charts.
 */
export const CHART_COLORS = {
  netWorth: '#10b981', // emerald-500
  netWorthNegative: '#ef4444', // red-500
  debt: '#f97316', // orange-500
  assets: '#3b82f6', // blue-500
  income: '#8b5cf6', // violet-500
  savingsRate: '#06b6d4', // cyan-500
  gridLine: '#e5e7eb', // gray-200
  axis: '#6b7280', // gray-500
  milestone: '#eab308', // yellow-500
  retirement: '#22c55e', // green-500
} as const;

/**
 * Milestone icons/markers.
 */
export const MILESTONE_ICONS: Record<string, string> = {
  debt_payoff: '✓',
  goal_achieved: '★',
  goal_missed: '✗',
  retirement_ready: '🎉',
  pmi_removed: '🏠',
  net_worth_milestone: '💰',
};

/**
 * Create responsive resize observer for charts.
 */
export function createResizeObserver(
  element: HTMLElement,
  callback: (width: number, height: number) => void
): ResizeObserver {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      callback(width, height);
    }
  });
  observer.observe(element);
  return observer;
}

/**
 * Debounce function for resize handlers.
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Find data point nearest to x position.
 */
export function findNearestDataPoint<T>(
  data: T[],
  xScale: d3.ScaleLinear<number, number>,
  xAccessor: (d: T) => number,
  mouseX: number
): T | undefined {
  if (data.length === 0) return undefined;

  const bisector = d3.bisector(xAccessor).left;
  const x0 = xScale.invert(mouseX);
  const i = bisector(data, x0, 1);
  const d0 = data[i - 1];
  const d1 = data[i];

  if (!d0) return d1;
  if (!d1) return d0;

  return x0 - xAccessor(d0) > xAccessor(d1) - x0 ? d1 : d0;
}

/**
 * Optimization Model
 *
 * Types for financial optimization suggestions.
 */

import { ID, Cents, generateId } from './common';

/**
 * Categories of optimizations.
 */
export type OptimizationType = 'tax' | 'debt' | 'savings' | 'housing' | 'income';

/**
 * Confidence level for an optimization suggestion.
 */
export type Confidence = 'high' | 'medium' | 'low';

/**
 * The impact of applying an optimization.
 */
export interface Impact {
  /**
   * Change in monthly cash flow (positive = more money).
   */
  monthlyChange: Cents;
  /**
   * Change in annual cash flow.
   */
  annualChange: Cents;
  /**
   * Total lifetime impact.
   */
  lifetimeChange: Cents;
  /**
   * Change in retirement date (negative = earlier retirement).
   * Measured in months.
   */
  retirementDateChange: number;
  /**
   * Primary metric affected by this optimization.
   */
  metricAffected: string;
}

/**
 * An optimization suggestion.
 */
export interface Optimization {
  id: ID;
  /**
   * Category of optimization.
   */
  type: OptimizationType;
  /**
   * Short title for the optimization.
   */
  title: string;
  /**
   * Detailed explanation of why this helps.
   */
  explanation: string;
  /**
   * Specific action to take.
   */
  action: string;
  /**
   * Quantified impact of the optimization.
   */
  impact: Impact;
  /**
   * Confidence level in the recommendation.
   */
  confidence: Confidence;
  /**
   * Prerequisites that must be true for this to work.
   */
  prerequisites: string[];
  /**
   * Year this optimization applies to.
   */
  yearApplicable: number;
}

/**
 * Create an empty impact.
 */
export function createEmptyImpact(): Impact {
  return {
    monthlyChange: 0,
    annualChange: 0,
    lifetimeChange: 0,
    retirementDateChange: 0,
    metricAffected: '',
  };
}

/**
 * Create a new optimization.
 */
export function createOptimization(partial: Partial<Optimization> = {}): Optimization {
  return {
    id: generateId(),
    type: 'savings',
    title: '',
    explanation: '',
    action: '',
    impact: createEmptyImpact(),
    confidence: 'medium',
    prerequisites: [],
    yearApplicable: new Date().getFullYear(),
    ...partial,
  };
}

/**
 * Sort optimizations by impact (highest first).
 */
export function sortByImpact(optimizations: Optimization[]): Optimization[] {
  return [...optimizations].sort((a, b) => b.impact.lifetimeChange - a.impact.lifetimeChange);
}

/**
 * Sort optimizations by confidence (highest first).
 */
export function sortByConfidence(optimizations: Optimization[]): Optimization[] {
  const order: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
  return [...optimizations].sort((a, b) => order[b.confidence] - order[a.confidence]);
}

/**
 * Filter optimizations by type.
 */
export function filterByType(
  optimizations: Optimization[],
  type: OptimizationType
): Optimization[] {
  return optimizations.filter((o) => o.type === type);
}

/**
 * Filter optimizations by minimum confidence.
 */
export function filterByMinConfidence(
  optimizations: Optimization[],
  minConfidence: Confidence
): Optimization[] {
  const order: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
  const minOrder = order[minConfidence];
  return optimizations.filter((o) => order[o.confidence] >= minOrder);
}

/**
 * Get display info for optimization type.
 */
export function getOptimizationTypeInfo(type: OptimizationType): { label: string; icon: string } {
  const info: Record<OptimizationType, { label: string; icon: string }> = {
    tax: { label: 'Tax Optimization', icon: '📊' },
    debt: { label: 'Debt Strategy', icon: '💳' },
    savings: { label: 'Savings Opportunity', icon: '💰' },
    housing: { label: 'Housing Strategy', icon: '🏠' },
    income: { label: 'Income Optimization', icon: '📈' },
  };
  return info[type];
}

/**
 * Get display info for confidence level.
 */
export function getConfidenceInfo(confidence: Confidence): { label: string; color: string } {
  const info: Record<Confidence, { label: string; color: string }> = {
    high: { label: 'High Confidence', color: 'green' },
    medium: { label: 'Medium Confidence', color: 'yellow' },
    low: { label: 'Low Confidence', color: 'gray' },
  };
  return info[confidence];
}

/**
 * Format impact for display.
 */
export function formatImpactSummary(impact: Impact): string {
  const parts: string[] = [];

  if (impact.monthlyChange !== 0) {
    const sign = impact.monthlyChange > 0 ? '+' : '';
    parts.push(`${sign}$${(impact.monthlyChange / 100).toFixed(0)}/mo`);
  }

  if (impact.retirementDateChange !== 0) {
    const years = Math.abs(impact.retirementDateChange) / 12;
    const direction = impact.retirementDateChange < 0 ? 'earlier' : 'later';
    parts.push(`${years.toFixed(1)} years ${direction}`);
  }

  return parts.join(', ') || 'Minimal impact';
}

/**
 * Calculate aggregate impact of multiple optimizations.
 * Note: This is a simple sum; actual interactions may be more complex.
 */
export function aggregateImpacts(optimizations: Optimization[]): Impact {
  return optimizations.reduce(
    (acc, opt) => ({
      monthlyChange: acc.monthlyChange + opt.impact.monthlyChange,
      annualChange: acc.annualChange + opt.impact.annualChange,
      lifetimeChange: acc.lifetimeChange + opt.impact.lifetimeChange,
      retirementDateChange: acc.retirementDateChange + opt.impact.retirementDateChange,
      metricAffected: 'Multiple',
    }),
    createEmptyImpact()
  );
}

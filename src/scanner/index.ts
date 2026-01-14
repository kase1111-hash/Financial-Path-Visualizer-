/**
 * Optimization Scanner Framework
 *
 * Analyzes financial profiles and trajectories to suggest optimizations.
 */

import type { FinancialProfile } from '@models/profile';
import type { Trajectory, TrajectoryYear } from '@models/trajectory';
import type { Optimization, OptimizationType } from '@models/optimization';

/**
 * A scanner rule that can detect optimization opportunities.
 */
export interface ScannerRule {
  /** Unique identifier for this rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of optimization this rule produces */
  type: OptimizationType;
  /** Run the scanner for a specific year */
  scan: (
    profile: FinancialProfile,
    trajectory: Trajectory,
    year: TrajectoryYear,
    previousYear: TrajectoryYear | null
  ) => Optimization | null;
}

/**
 * Scanner configuration.
 */
export interface ScannerConfig {
  /** Only run rules of these types (null = all types) */
  types?: OptimizationType[] | null;
  /** Only scan these years (null = all years) */
  years?: number[] | null;
  /** Include low confidence suggestions */
  includeLowConfidence?: boolean;
}

// Import all scanner rules
import { TAX_RULES } from './tax-rules';
import { DEBT_RULES } from './debt-rules';
import { SAVINGS_RULES } from './savings-rules';
import { HOUSING_RULES } from './housing-rules';

/**
 * All available scanner rules.
 */
export const ALL_RULES: ScannerRule[] = [
  ...TAX_RULES,
  ...DEBT_RULES,
  ...SAVINGS_RULES,
  ...HOUSING_RULES,
];

/**
 * Run all scanners on a profile and trajectory.
 */
export function runAllScanners(
  profile: FinancialProfile,
  trajectory: Trajectory,
  config: ScannerConfig = {}
): Optimization[] {
  const { types = null, years = null, includeLowConfidence = true } = config;

  const optimizations: Optimization[] = [];

  // Filter rules by type
  const rulesToRun = types
    ? ALL_RULES.filter((rule) => types.includes(rule.type))
    : ALL_RULES;

  // Filter years
  const yearsToScan = years
    ? trajectory.years.filter((y) => years.includes(y.year))
    : trajectory.years;

  // Run each rule on each year
  for (const yearData of yearsToScan) {
    const yearIndex = trajectory.years.indexOf(yearData);
    const previousYear = yearIndex > 0 ? trajectory.years[yearIndex - 1] ?? null : null;

    for (const rule of rulesToRun) {
      try {
        const result = rule.scan(profile, trajectory, yearData, previousYear);
        if (result) {
          // Filter low confidence if needed
          if (!includeLowConfidence && result.confidence === 'low') {
            continue;
          }
          optimizations.push(result);
        }
      } catch (error) {
        // Log but don't fail on individual rule errors
        console.warn(`Scanner rule ${rule.id} failed for year ${yearData.year}:`, error);
      }
    }
  }

  // Remove duplicate optimizations (same title + year)
  const seen = new Set<string>();
  const uniqueOptimizations = optimizations.filter((opt) => {
    const key = `${opt.title}-${opt.yearApplicable}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return uniqueOptimizations;
}

/**
 * Run scanners for a single year.
 */
export function scanYear(
  profile: FinancialProfile,
  trajectory: Trajectory,
  year: number,
  config: ScannerConfig = {}
): Optimization[] {
  return runAllScanners(profile, trajectory, {
    ...config,
    years: [year],
  });
}

/**
 * Run scanners of a specific type.
 */
export function scanByType(
  profile: FinancialProfile,
  trajectory: Trajectory,
  type: OptimizationType,
  config: ScannerConfig = {}
): Optimization[] {
  return runAllScanners(profile, trajectory, {
    ...config,
    types: [type],
  });
}

/**
 * Get the current year's optimization suggestions.
 */
export function getCurrentYearOptimizations(
  profile: FinancialProfile,
  trajectory: Trajectory
): Optimization[] {
  const currentYear = new Date().getFullYear();
  return scanYear(profile, trajectory, currentYear);
}

export * from './tax-rules';
export * from './debt-rules';
export * from './savings-rules';
export * from './housing-rules';

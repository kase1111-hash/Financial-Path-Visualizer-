import { describe, it, expect } from 'vitest';
import {
  createOptimization,
  createEmptyImpact,
  sortByImpact,
  sortByConfidence,
  filterByType,
  filterByMinConfidence,
  getOptimizationTypeInfo,
  getConfidenceInfo,
  formatImpactSummary,
  aggregateImpacts,
} from '@models/optimization';
import { dollarsToCents } from '@models/common';

describe('optimization model', () => {
  describe('createEmptyImpact', () => {
    it('should create impact with zero values', () => {
      const impact = createEmptyImpact();

      expect(impact.monthlyChange).toBe(0);
      expect(impact.annualChange).toBe(0);
      expect(impact.lifetimeChange).toBe(0);
      expect(impact.retirementDateChange).toBe(0);
      expect(impact.metricAffected).toBe('');
    });
  });

  describe('createOptimization', () => {
    it('should create optimization with defaults', () => {
      const opt = createOptimization();

      expect(opt.id).toBeDefined();
      expect(opt.type).toBe('savings');
      expect(opt.confidence).toBe('medium');
      expect(opt.prerequisites).toHaveLength(0);
    });

    it('should allow overriding defaults', () => {
      const opt = createOptimization({
        type: 'debt',
        title: 'Pay off credit card',
        confidence: 'high',
        prerequisites: ['Have emergency fund'],
      });

      expect(opt.type).toBe('debt');
      expect(opt.title).toBe('Pay off credit card');
      expect(opt.confidence).toBe('high');
      expect(opt.prerequisites).toContain('Have emergency fund');
    });
  });

  describe('sortByImpact', () => {
    it('should sort by lifetime change descending', () => {
      const opts = [
        createOptimization({ title: 'Low', impact: { ...createEmptyImpact(), lifetimeChange: dollarsToCents(1000) } }),
        createOptimization({ title: 'High', impact: { ...createEmptyImpact(), lifetimeChange: dollarsToCents(10000) } }),
        createOptimization({ title: 'Medium', impact: { ...createEmptyImpact(), lifetimeChange: dollarsToCents(5000) } }),
      ];

      const sorted = sortByImpact(opts);

      expect(sorted[0]?.title).toBe('High');
      expect(sorted[1]?.title).toBe('Medium');
      expect(sorted[2]?.title).toBe('Low');
    });

    it('should not mutate original array', () => {
      const opts = [
        createOptimization({ title: 'A', impact: { ...createEmptyImpact(), lifetimeChange: 100 } }),
        createOptimization({ title: 'B', impact: { ...createEmptyImpact(), lifetimeChange: 200 } }),
      ];

      sortByImpact(opts);

      expect(opts[0]?.title).toBe('A');
    });
  });

  describe('sortByConfidence', () => {
    it('should sort by confidence level descending', () => {
      const opts = [
        createOptimization({ title: 'Low', confidence: 'low' }),
        createOptimization({ title: 'High', confidence: 'high' }),
        createOptimization({ title: 'Medium', confidence: 'medium' }),
      ];

      const sorted = sortByConfidence(opts);

      expect(sorted[0]?.title).toBe('High');
      expect(sorted[1]?.title).toBe('Medium');
      expect(sorted[2]?.title).toBe('Low');
    });
  });

  describe('filterByType', () => {
    it('should filter by optimization type', () => {
      const opts = [
        createOptimization({ title: 'Tax 1', type: 'tax' }),
        createOptimization({ title: 'Debt 1', type: 'debt' }),
        createOptimization({ title: 'Tax 2', type: 'tax' }),
        createOptimization({ title: 'Savings 1', type: 'savings' }),
      ];

      const taxOpts = filterByType(opts, 'tax');

      expect(taxOpts).toHaveLength(2);
      expect(taxOpts.every((o) => o.type === 'tax')).toBe(true);
    });

    it('should return empty array if no matches', () => {
      const opts = [
        createOptimization({ type: 'tax' }),
        createOptimization({ type: 'debt' }),
      ];

      expect(filterByType(opts, 'housing')).toHaveLength(0);
    });
  });

  describe('filterByMinConfidence', () => {
    it('should filter by minimum confidence', () => {
      const opts = [
        createOptimization({ title: 'High', confidence: 'high' }),
        createOptimization({ title: 'Medium', confidence: 'medium' }),
        createOptimization({ title: 'Low', confidence: 'low' }),
      ];

      const mediumOrHigher = filterByMinConfidence(opts, 'medium');

      expect(mediumOrHigher).toHaveLength(2);
      expect(mediumOrHigher.some((o) => o.confidence === 'low')).toBe(false);
    });

    it('should include all for low minimum', () => {
      const opts = [
        createOptimization({ confidence: 'high' }),
        createOptimization({ confidence: 'medium' }),
        createOptimization({ confidence: 'low' }),
      ];

      expect(filterByMinConfidence(opts, 'low')).toHaveLength(3);
    });

    it('should only include high for high minimum', () => {
      const opts = [
        createOptimization({ title: 'High', confidence: 'high' }),
        createOptimization({ title: 'Medium', confidence: 'medium' }),
        createOptimization({ title: 'Low', confidence: 'low' }),
      ];

      const highOnly = filterByMinConfidence(opts, 'high');

      expect(highOnly).toHaveLength(1);
      expect(highOnly[0]?.title).toBe('High');
    });
  });

  describe('getOptimizationTypeInfo', () => {
    it('should return info for tax type', () => {
      const info = getOptimizationTypeInfo('tax');
      expect(info.label).toBe('Tax Optimization');
      expect(info.icon).toBe('📊');
    });

    it('should return info for debt type', () => {
      const info = getOptimizationTypeInfo('debt');
      expect(info.label).toBe('Debt Strategy');
      expect(info.icon).toBe('💳');
    });

    it('should return info for savings type', () => {
      const info = getOptimizationTypeInfo('savings');
      expect(info.label).toBe('Savings Opportunity');
      expect(info.icon).toBe('💰');
    });

    it('should return info for housing type', () => {
      const info = getOptimizationTypeInfo('housing');
      expect(info.label).toBe('Housing Strategy');
      expect(info.icon).toBe('🏠');
    });

    it('should return info for income type', () => {
      const info = getOptimizationTypeInfo('income');
      expect(info.label).toBe('Income Optimization');
      expect(info.icon).toBe('📈');
    });
  });

  describe('getConfidenceInfo', () => {
    it('should return info for high confidence', () => {
      const info = getConfidenceInfo('high');
      expect(info.label).toBe('High Confidence');
      expect(info.color).toBe('green');
    });

    it('should return info for medium confidence', () => {
      const info = getConfidenceInfo('medium');
      expect(info.label).toBe('Medium Confidence');
      expect(info.color).toBe('yellow');
    });

    it('should return info for low confidence', () => {
      const info = getConfidenceInfo('low');
      expect(info.label).toBe('Low Confidence');
      expect(info.color).toBe('gray');
    });
  });

  describe('formatImpactSummary', () => {
    it('should format monthly change', () => {
      const impact = createEmptyImpact();
      impact.monthlyChange = dollarsToCents(500);

      expect(formatImpactSummary(impact)).toContain('+$500/mo');
    });

    it('should format negative monthly change', () => {
      const impact = createEmptyImpact();
      impact.monthlyChange = dollarsToCents(-200);

      // Format outputs sign from number formatting
      expect(formatImpactSummary(impact)).toContain('-200/mo');
    });

    it('should format retirement date change', () => {
      const impact = createEmptyImpact();
      impact.retirementDateChange = -24;

      expect(formatImpactSummary(impact)).toContain('2.0 years earlier');
    });

    it('should combine multiple impacts', () => {
      const impact = {
        monthlyChange: dollarsToCents(500),
        annualChange: dollarsToCents(6000),
        lifetimeChange: dollarsToCents(60000),
        retirementDateChange: -12,
        metricAffected: 'Savings',
      };

      const summary = formatImpactSummary(impact);
      expect(summary).toContain('+$500/mo');
      expect(summary).toContain('1.0 years earlier');
    });

    it('should return minimal impact for zero values', () => {
      const impact = createEmptyImpact();
      expect(formatImpactSummary(impact)).toBe('Minimal impact');
    });
  });

  describe('aggregateImpacts', () => {
    it('should sum impacts from multiple optimizations', () => {
      const opts = [
        createOptimization({
          impact: {
            monthlyChange: dollarsToCents(100),
            annualChange: dollarsToCents(1200),
            lifetimeChange: dollarsToCents(12000),
            retirementDateChange: -6,
            metricAffected: 'A',
          },
        }),
        createOptimization({
          impact: {
            monthlyChange: dollarsToCents(200),
            annualChange: dollarsToCents(2400),
            lifetimeChange: dollarsToCents(24000),
            retirementDateChange: -12,
            metricAffected: 'B',
          },
        }),
      ];

      const aggregate = aggregateImpacts(opts);

      expect(aggregate.monthlyChange).toBe(dollarsToCents(300));
      expect(aggregate.annualChange).toBe(dollarsToCents(3600));
      expect(aggregate.lifetimeChange).toBe(dollarsToCents(36000));
      expect(aggregate.retirementDateChange).toBe(-18);
      expect(aggregate.metricAffected).toBe('Multiple');
    });

    it('should return empty impact for empty array', () => {
      const aggregate = aggregateImpacts([]);

      expect(aggregate.monthlyChange).toBe(0);
      expect(aggregate.lifetimeChange).toBe(0);
      expect(aggregate.retirementDateChange).toBe(0);
    });
  });
});

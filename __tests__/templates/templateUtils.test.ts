import { describe, test, expect } from '@jest/globals';
import {
  validateWeeklyPattern,
  calculatePatternHours,
  calculateWorkingDays,
  getPatternSummary,
  analyzePattern,
  calculatePatternSimilarity,
  findMostSimilarPattern,
  generateCommonPatterns,
  scalePattern,
  shiftPattern,
  patternToString,
  stringToPattern,
  suggestPatternsByHours,
  getPatternRecommendations
} from '../../src/utils/templateUtils';
import { WeeklyPattern } from '../../src/types/templateTypes';

describe('Template Utils', () => {
  describe('validateWeeklyPattern', () => {
    test('validates correct full week pattern', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      const result = validateWeeklyPattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates correct half-day pattern', () => {
      const pattern: WeeklyPattern = {
        mon: 0.5, tue: 0.5, wed: 0.5, thu: 0.5, fri: 0.5, sat: 0, sun: 0
      };
      const result = validateWeeklyPattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects pattern with invalid values', () => {
      const pattern: WeeklyPattern = {
        mon: 2, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      const result = validateWeeklyPattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid value for mon: 2. Must be 0, 0.5, or 1');
    });

    test('rejects pattern with no working hours', () => {
      const pattern: WeeklyPattern = {
        mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
      };
      const result = validateWeeklyPattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pattern must include at least some working hours');
    });

    test('rejects pattern with excessive hours', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 1, sun: 1
      };
      const result = validateWeeklyPattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pattern exceeds typical full-time hours (35h)');
    });
  });

  describe('calculatePatternHours', () => {
    test('calculates hours for full week pattern', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      expect(calculatePatternHours(pattern)).toBe(35);
    });

    test('calculates hours for half-day pattern', () => {
      const pattern: WeeklyPattern = {
        mon: 0.5, tue: 0.5, wed: 0.5, thu: 0.5, fri: 0.5, sat: 0, sun: 0
      };
      expect(calculatePatternHours(pattern)).toBe(17.5);
    });

    test('calculates hours for mixed pattern', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 0.5, wed: 1, thu: 0, fri: 0.5, sat: 0, sun: 0
      };
      expect(calculatePatternHours(pattern)).toBe(21);
    });
  });

  describe('calculateWorkingDays', () => {
    test('counts working days correctly', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 0, wed: 1, thu: 0, fri: 1, sat: 0, sun: 0
      };
      expect(calculateWorkingDays(pattern)).toBe(3);
    });

    test('counts half days as working days', () => {
      const pattern: WeeklyPattern = {
        mon: 0.5, tue: 0.5, wed: 0, thu: 0, fri: 0.5, sat: 0, sun: 0
      };
      expect(calculateWorkingDays(pattern)).toBe(3);
    });
  });

  describe('getPatternSummary', () => {
    test('generates correct summary for full week', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      const summary = getPatternSummary(pattern);
      
      expect(summary.totalHours).toBe(35);
      expect(summary.workingDays).toBe(5);
      expect(summary.isValid).toBe(true);
      expect(summary.dayBreakdown).toHaveLength(7);
      expect(summary.dayBreakdown[0].status).toBe('full'); // Monday
      expect(summary.dayBreakdown[5].status).toBe('off'); // Saturday
    });

    test('generates correct day breakdown', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 0.5, wed: 0, thu: 1, fri: 0.5, sat: 0, sun: 0
      };
      const summary = getPatternSummary(pattern);
      
      const monday = summary.dayBreakdown.find(d => d.day === 'mon');
      const tuesday = summary.dayBreakdown.find(d => d.day === 'tue');
      const wednesday = summary.dayBreakdown.find(d => d.day === 'wed');
      
      expect(monday?.status).toBe('full');
      expect(monday?.hours).toBe(7);
      expect(tuesday?.status).toBe('half');
      expect(tuesday?.hours).toBe(3.5);
      expect(wednesday?.status).toBe('off');
      expect(wednesday?.hours).toBe(0);
    });
  });

  describe('analyzePattern', () => {
    test('analyzes full week pattern', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      const analysis = analyzePattern(pattern);
      
      expect(analysis.totalHours).toBe(35);
      expect(analysis.workingDays).toBe(5);
      expect(analysis.efficiency).toBe(1); // Perfect distribution
      expect(analysis.balance).toBe(1); // No weekend work
    });

    test('analyzes unbalanced pattern with weekend work', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 1, sun: 0
      };
      const analysis = analyzePattern(pattern);
      
      expect(analysis.balance).toBeLessThan(1); // Weekend work reduces balance
    });
  });

  describe('calculatePatternSimilarity', () => {
    test('calculates 100% similarity for identical patterns', () => {
      const pattern1: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      const pattern2: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      
      expect(calculatePatternSimilarity(pattern1, pattern2)).toBe(1);
    });

    test('calculates partial similarity for different patterns', () => {
      const pattern1: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      const pattern2: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 0, fri: 0, sat: 0, sun: 0
      };
      
      const similarity = calculatePatternSimilarity(pattern1, pattern2);
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1);
    });

    test('calculates 0% similarity for completely different patterns', () => {
      const pattern1: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 1, sun: 1
      };
      const pattern2: WeeklyPattern = {
        mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
      };
      
      expect(calculatePatternSimilarity(pattern1, pattern2)).toBe(0);
    });
  });

  describe('findMostSimilarPattern', () => {
    test('finds most similar pattern from list', () => {
      const target: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0, sun: 0
      };
      
      const patterns = [
        { 
          pattern: { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 }, 
          id: '1', 
          name: 'Full Week' 
        },
        { 
          pattern: { mon: 1, tue: 1, wed: 1, thu: 0, fri: 0, sat: 0, sun: 0 }, 
          id: '2', 
          name: 'Three Day Week' 
        }
      ];
      
      const result = findMostSimilarPattern(target, patterns);
      expect(result?.id).toBe('1'); // Full week is more similar
      expect(result?.similarity).toBeGreaterThan(0.8);
    });

    test('returns null for empty pattern list', () => {
      const target: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      
      const result = findMostSimilarPattern(target, []);
      expect(result).toBeNull();
    });
  });

  describe('generateCommonPatterns', () => {
    test('generates valid common patterns', () => {
      const patterns = generateCommonPatterns();
      
      expect(patterns.fullWeek).toBeDefined();
      expect(patterns.halfDays).toBeDefined();
      expect(patterns.threeDayWeek).toBeDefined();
      
      // All patterns should be valid
      Object.values(patterns).forEach(pattern => {
        const validation = validateWeeklyPattern(pattern);
        expect(validation.isValid).toBe(true);
      });
    });

    test('full week pattern has correct hours', () => {
      const patterns = generateCommonPatterns();
      expect(calculatePatternHours(patterns.fullWeek)).toBe(35);
    });

    test('half days pattern has correct hours', () => {
      const patterns = generateCommonPatterns();
      expect(calculatePatternHours(patterns.halfDays)).toBe(17.5);
    });
  });

  describe('scalePattern', () => {
    test('scales pattern by factor', () => {
      const originalPattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      
      const scaledPattern = scalePattern(originalPattern, 0.5);
      const scaledHours = calculatePatternHours(scaledPattern);
      
      expect(scaledHours).toBeLessThanOrEqual(calculatePatternHours(originalPattern));
      expect(scaledPattern.mon).toBe(0.5); // 1 * 0.5 rounds to 0.5
    });

    test('scales to zero when factor is very small', () => {
      const originalPattern: WeeklyPattern = {
        mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
      };
      
      const scaledPattern = scalePattern(originalPattern, 0.1);
      expect(calculatePatternHours(scaledPattern)).toBe(0);
    });
  });

  describe('shiftPattern', () => {
    test('shifts pattern by one day forward', () => {
      const originalPattern: WeeklyPattern = {
        mon: 1, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
      };
      
      const shiftedPattern = shiftPattern(originalPattern, 1);
      expect(shiftedPattern.mon).toBe(0);
      expect(shiftedPattern.tue).toBe(1);
    });

    test('shifts pattern by one day backward', () => {
      const originalPattern: WeeklyPattern = {
        mon: 0, tue: 1, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
      };
      
      const shiftedPattern = shiftPattern(originalPattern, -1);
      expect(shiftedPattern.mon).toBe(1);
      expect(shiftedPattern.tue).toBe(0);
    });

    test('preserves total hours when shifting', () => {
      const originalPattern: WeeklyPattern = {
        mon: 1, tue: 0.5, wed: 1, thu: 0, fri: 0.5, sat: 0, sun: 0
      };
      
      const shiftedPattern = shiftPattern(originalPattern, 2);
      expect(calculatePatternHours(shiftedPattern)).toBe(calculatePatternHours(originalPattern));
    });
  });

  describe('patternToString and stringToPattern', () => {
    test('converts pattern to string and back', () => {
      const originalPattern: WeeklyPattern = {
        mon: 1, tue: 0.5, wed: 1, thu: 0, fri: 0.5, sat: 0, sun: 0,
        reason: 'Test pattern'
      };
      
      const stringForm = patternToString(originalPattern);
      const parsedPattern = stringToPattern(stringForm);
      
      expect(parsedPattern).toEqual(originalPattern);
    });

    test('converts pattern without reason', () => {
      const originalPattern: WeeklyPattern = {
        mon: 1, tue: 0.5, wed: 1, thu: 0, fri: 0.5, sat: 0, sun: 0
      };
      
      const stringForm = patternToString(originalPattern);
      const parsedPattern = stringToPattern(stringForm);
      
      expect(parsedPattern).toEqual(originalPattern);
    });

    test('returns null for invalid string', () => {
      expect(stringToPattern('invalid')).toBeNull();
      expect(stringToPattern('1,2,3')).toBeNull(); // Too few values
      expect(stringToPattern('1,2,1,1,1,1,1')).toBeNull(); // Invalid value
    });
  });

  describe('suggestPatternsByHours', () => {
    test('suggests patterns close to target hours', () => {
      const suggestions = suggestPatternsByHours(35);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should be close to 35 hours
      suggestions.forEach(pattern => {
        const hours = calculatePatternHours(pattern);
        expect(Math.abs(hours - 35)).toBeLessThanOrEqual(3.5);
      });
    });

    test('suggests patterns for part-time hours', () => {
      const suggestions = suggestPatternsByHours(17.5);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should include patterns close to 17.5 hours
      const exactMatch = suggestions.find(pattern => calculatePatternHours(pattern) === 17.5);
      expect(exactMatch).toBeDefined();
    });
  });

  describe('getPatternRecommendations', () => {
    test('recommends concentrated patterns for concentrated work style', () => {
      const recommendations = getPatternRecommendations({
        workStyle: 'concentrated'
      });
      
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(pattern => {
        expect(calculateWorkingDays(pattern)).toBeLessThanOrEqual(4);
      });
    });

    test('recommends distributed patterns for distributed work style', () => {
      const recommendations = getPatternRecommendations({
        workStyle: 'distributed'
      });
      
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(pattern => {
        expect(calculateWorkingDays(pattern)).toBeGreaterThanOrEqual(4);
      });
    });

    test('recommends flexible patterns for flexible work style', () => {
      const recommendations = getPatternRecommendations({
        workStyle: 'flexible'
      });
      
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(pattern => {
        const summary = getPatternSummary(pattern);
        const hasHalfDays = summary.dayBreakdown.some(day => day.status === 'half');
        expect(hasHalfDays).toBe(true);
      });
    });

    test('filters by total hours when specified', () => {
      const recommendations = getPatternRecommendations({
        totalHours: 35
      });
      
      recommendations.forEach(pattern => {
        const hours = calculatePatternHours(pattern);
        expect(Math.abs(hours - 35)).toBeLessThanOrEqual(7);
      });
    });

    test('limits recommendations to 3', () => {
      const recommendations = getPatternRecommendations({});
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });
  });
});
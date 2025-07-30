import { 
  WeeklyPattern, 
  PatternSummary, 
  DayPatternInfo, 
  PatternAnalysis,
  WORK_VALUES, 
  HOURS_PER_DAY, 
  DAY_LABELS 
} from '@/types/templateTypes';

/**
 * Pattern Analysis and Validation Utilities
 */

// Validate a weekly pattern
export const validateWeeklyPattern = (pattern: WeeklyPattern): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  // Check that all required days are present
  for (const day of days) {
    if (!(day in pattern)) {
      errors.push(`Missing ${day} in pattern`);
      continue;
    }

    const value = pattern[day];
    if (typeof value !== 'number' || ![0, 0.5, 1].includes(value)) {
      errors.push(`Invalid value for ${day}: ${value}. Must be 0, 0.5, or 1`);
    }
  }

  // Check for reasonable patterns (at least some work days)
  const totalHours = calculatePatternHours(pattern);
  if (totalHours === 0) {
    errors.push('Pattern must include at least some working hours');
  }

  if (totalHours > 35) {
    errors.push('Pattern exceeds typical full-time hours (35h)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculate total hours in a pattern
export const calculatePatternHours = (pattern: WeeklyPattern): number => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  return days.reduce((total, day) => {
    const value = pattern[day];
    const hours = HOURS_PER_DAY[value as keyof typeof HOURS_PER_DAY] || 0;
    return total + hours;
  }, 0);
};

// Calculate working days in a pattern
export const calculateWorkingDays = (pattern: WeeklyPattern): number => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  return days.filter(day => pattern[day] > 0).length;
};

// Get detailed pattern summary
export const getPatternSummary = (pattern: WeeklyPattern): PatternSummary => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const totalHours = calculatePatternHours(pattern);
  const workingDays = calculateWorkingDays(pattern);
  const validation = validateWeeklyPattern(pattern);

  const dayBreakdown: DayPatternInfo[] = days.map(day => {
    const value = pattern[day];
    const hours = HOURS_PER_DAY[value as keyof typeof HOURS_PER_DAY] || 0;
    
    let status: 'full' | 'half' | 'off';
    let color: string;

    if (value === WORK_VALUES.FULL) {
      status = 'full';
      color = '#10B981'; // green
    } else if (value === WORK_VALUES.HALF) {
      status = 'half';
      color = '#F59E0B'; // yellow
    } else {
      status = 'off';
      color = '#6B7280'; // gray
    }

    return {
      day,
      label: DAY_LABELS[day].full,
      shortLabel: DAY_LABELS[day].short,
      value,
      hours,
      status,
      color
    };
  });

  return {
    totalHours,
    workingDays,
    pattern,
    dayBreakdown,
    isValid: validation.isValid,
    warnings: validation.errors
  };
};

// Analyze pattern efficiency and balance
export const analyzePattern = (pattern: WeeklyPattern): PatternAnalysis => {
  const summary = getPatternSummary(pattern);
  const totalHours = summary.totalHours;
  const workingDays = summary.workingDays;

  // Calculate efficiency (0-1 score based on how well hours are distributed)
  const idealHoursPerDay = totalHours / 5; // Assuming 5-day work week
  const dayVariances = ['mon', 'tue', 'wed', 'thu', 'fri'].map(day => {
    const dayHours = HOURS_PER_DAY[pattern[day as keyof WeeklyPattern] as keyof typeof HOURS_PER_DAY] || 0;
    return Math.abs(dayHours - idealHoursPerDay);
  });
  
  const averageVariance = dayVariances.reduce((a, b) => a + b, 0) / dayVariances.length;
  const efficiency = Math.max(0, 1 - (averageVariance / 7)); // Normalize by max possible variance

  // Calculate work-life balance (0-1 score)
  const weekendHours = (HOURS_PER_DAY[pattern.sat as keyof typeof HOURS_PER_DAY] || 0) + 
                      (HOURS_PER_DAY[pattern.sun as keyof typeof HOURS_PER_DAY] || 0);
  const weekdayHours = totalHours - weekendHours;
  const balance = weekendHours === 0 ? 1 : Math.max(0, 1 - (weekendHours / weekdayHours));

  // Calculate commonality (placeholder - would be based on usage data in real implementation)
  const commonality = 0.5; // Default value

  return {
    pattern,
    totalHours,
    workingDays,
    efficiency,
    balance,
    commonality
  };
};

/**
 * Pattern Comparison and Similarity
 */

// Calculate similarity between two patterns (0-1 score)
export const calculatePatternSimilarity = (pattern1: WeeklyPattern, pattern2: WeeklyPattern): number => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  let totalDifference = 0;
  
  for (const day of days) {
    const diff = Math.abs(pattern1[day] - pattern2[day]);
    totalDifference += diff;
  }
  
  // Max possible difference is 7 (all days completely different)
  const similarity = 1 - (totalDifference / 7);
  return Math.max(0, similarity);
};

// Find the most similar pattern from a list
export const findMostSimilarPattern = (
  targetPattern: WeeklyPattern, 
  patterns: { pattern: WeeklyPattern; id: string; name: string }[]
): { pattern: WeeklyPattern; id: string; name: string; similarity: number } | null => {
  if (patterns.length === 0) return null;

  let mostSimilar = patterns[0];
  let highestSimilarity = calculatePatternSimilarity(targetPattern, patterns[0].pattern);

  for (let i = 1; i < patterns.length; i++) {
    const similarity = calculatePatternSimilarity(targetPattern, patterns[i].pattern);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilar = patterns[i];
    }
  }

  return {
    ...mostSimilar,
    similarity: highestSimilarity
  };
};

/**
 * Pattern Generation and Transformation
 */

// Generate common patterns
export const generateCommonPatterns = (): { [key: string]: WeeklyPattern } => {
  return {
    fullWeek: {
      mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
    },
    halfDays: {
      mon: 0.5, tue: 0.5, wed: 0.5, thu: 0.5, fri: 0.5, sat: 0, sun: 0
    },
    threeDayWeek: {
      mon: 1, tue: 0, wed: 1, thu: 0, fri: 1, sat: 0, sun: 0
    },
    fourDayWeek: {
      mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0, sun: 0
    },
    frontLoaded: {
      mon: 1, tue: 1, wed: 1, thu: 0, fri: 0, sat: 0, sun: 0
    },
    backLoaded: {
      mon: 0, tue: 0, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0
    },
    compressedWeek: {
      mon: 1, tue: 1, wed: 1, thu: 1, fri: 0.5, sat: 0, sun: 0
    },
    flexibleWeek: {
      mon: 0.5, tue: 1, wed: 0.5, thu: 1, fri: 0.5, sat: 0, sun: 0
    }
  };
};

// Scale a pattern by a factor (useful for part-time variations)
export const scalePattern = (pattern: WeeklyPattern, factor: number): WeeklyPattern => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const scaledPattern: WeeklyPattern = { ...pattern };

  for (const day of days) {
    const scaledValue = pattern[day] * factor;
    
    // Round to nearest valid work value
    if (scaledValue <= 0.25) {
      scaledPattern[day] = 0;
    } else if (scaledValue <= 0.75) {
      scaledPattern[day] = 0.5;
    } else {
      scaledPattern[day] = 1;
    }
  }

  return scaledPattern;
};

// Shift pattern by days (e.g., move Monday work to Tuesday)
export const shiftPattern = (pattern: WeeklyPattern, days: number): WeeklyPattern => {
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const shiftedPattern: WeeklyPattern = {
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0,
    reason: pattern.reason
  };

  for (let i = 0; i < dayOrder.length; i++) {
    const currentDay = dayOrder[i];
    const targetIndex = (i + days) % dayOrder.length;
    const targetDay = dayOrder[targetIndex < 0 ? targetIndex + dayOrder.length : targetIndex];
    
    shiftedPattern[targetDay] = pattern[currentDay];
  }

  return shiftedPattern;
};

/**
 * Pattern Export and Import
 */

// Convert pattern to a compact string representation
export const patternToString = (pattern: WeeklyPattern): string => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  const values = days.map(day => pattern[day].toString()).join(',');
  return pattern.reason ? `${values}|${pattern.reason}` : values;
};

// Parse pattern from string representation
export const stringToPattern = (str: string): WeeklyPattern | null => {
  try {
    const [values, reason] = str.split('|');
    const dayValues = values.split(',').map(v => parseFloat(v));
    
    if (dayValues.length !== 7) return null;
    
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    const pattern: WeeklyPattern = {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
    };

    for (let i = 0; i < days.length; i++) {
      const value = dayValues[i];
      if (![0, 0.5, 1].includes(value)) return null;
      pattern[days[i]] = value;
    }

    if (reason) {
      pattern.reason = reason;
    }

    return pattern;
  } catch {
    return null;
  }
};

/**
 * Pattern Suggestions and Recommendations
 */

// Suggest patterns based on total hours target
export const suggestPatternsByHours = (targetHours: number): WeeklyPattern[] => {
  const commonPatterns = generateCommonPatterns();
  const suggestions: WeeklyPattern[] = [];

  // Find patterns that match or are close to target hours
  Object.values(commonPatterns).forEach(pattern => {
    const patternHours = calculatePatternHours(pattern);
    if (Math.abs(patternHours - targetHours) <= 3.5) { // Within half day
      suggestions.push(pattern);
    }
  });

  // If no close matches, generate scaled versions
  if (suggestions.length === 0) {
    const fullWeek = commonPatterns.fullWeek;
    const fullWeekHours = calculatePatternHours(fullWeek);
    const scaleFactor = targetHours / fullWeekHours;
    suggestions.push(scalePattern(fullWeek, scaleFactor));
  }

  // Sort by closeness to target
  return suggestions.sort((a, b) => {
    const diffA = Math.abs(calculatePatternHours(a) - targetHours);
    const diffB = Math.abs(calculatePatternHours(b) - targetHours);
    return diffA - diffB;
  });
};

// Get pattern recommendations based on work style preferences
export const getPatternRecommendations = (preferences: {
  workStyle?: 'concentrated' | 'distributed' | 'flexible';
  workLifeBalance?: 'high' | 'medium' | 'low';
  totalHours?: number;
}): WeeklyPattern[] => {
  const { workStyle, workLifeBalance, totalHours } = preferences;
  const commonPatterns = generateCommonPatterns();
  let candidates: WeeklyPattern[] = Object.values(commonPatterns);

  // Filter by work style
  if (workStyle === 'concentrated') {
    candidates = candidates.filter(pattern => calculateWorkingDays(pattern) <= 4);
  } else if (workStyle === 'distributed') {
    candidates = candidates.filter(pattern => calculateWorkingDays(pattern) >= 4);
  } else if (workStyle === 'flexible') {
    candidates = candidates.filter(pattern => {
      const summary = getPatternSummary(pattern);
      return summary.dayBreakdown.some(day => day.status === 'half');
    });
  }

  // Filter by work-life balance
  if (workLifeBalance === 'high') {
    candidates = candidates.filter(pattern => {
      const analysis = analyzePattern(pattern);
      return analysis.balance >= 0.8;
    });
  }

  // Filter by total hours if specified
  if (totalHours) {
    candidates = candidates.filter(pattern => {
      const patternHours = calculatePatternHours(pattern);
      return Math.abs(patternHours - totalHours) <= 7; // Within one day
    });
  }

  // Return top 3 recommendations
  return candidates.slice(0, 3);
};
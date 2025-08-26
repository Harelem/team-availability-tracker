'use client';

import { useCallback, useMemo, useRef } from 'react';

// Performance monitoring utilities
const performance = typeof window !== 'undefined' ? window.performance : null;

export const logPerformanceMetric = (name: string, startTime: number, hitRate?: number) => {
  if (process.env.NODE_ENV === 'development' && performance) {
    const duration = performance.now() - startTime;
    console.log(`🚀 Performance: ${name} took ${duration.toFixed(2)}ms${hitRate ? ` (${hitRate.toFixed(1)}% hit rate)` : ''}`);
    if (duration > 50) {
      console.warn(`⚠️ Performance: ${name} is slow (${duration.toFixed(2)}ms > 50ms target)`);
    }
  }
};

// Debouncing hook for expensive operations
export const useDebounce = (callback: Function, delay: number = 200) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Types for team member row cache
interface ScheduleEntry {
  value: '1' | '0.5' | 'X';
  reason?: string;
}

interface TeamMemberRowData {
  id: number;
  name: string;
  hebrew: string;
  isManager: boolean;
  scheduleEntries: Record<string, ScheduleEntry>;
  totalHours: number;
}

// Memoized team member row data cache
export const useTeamMemberRowCache = (teamMembers: any[], scheduleData: any, validatedSprintDays: Date[]) => {
  return useMemo(() => {
    const cacheStart = performance?.now() || 0;
    const cache = new Map<number, TeamMemberRowData>();
    
    teamMembers.forEach(member => {
      const scheduleEntries: Record<string, ScheduleEntry> = {};
      
      // Pre-calculate all schedule entries for this member
      validatedSprintDays.forEach(day => {
        const dateKey = day.toISOString().split('T')[0];
        if (dateKey && scheduleData[member.id]?.[dateKey]) {
          scheduleEntries[dateKey] = scheduleData[member.id][dateKey];
        }
      });
      
      // Pre-calculate member hours
      const totalHours = Object.values(scheduleEntries).reduce((total, entry) => {
        if (entry.value === '1') return total + 7;
        if (entry.value === '0.5') return total + 3.5;
        return total;
      }, 0);
      
      const rowData: TeamMemberRowData = {
        id: member.id,
        name: member.name,
        hebrew: member.hebrew,
        isManager: member.isManager,
        scheduleEntries,
        totalHours
      };
      
      cache.set(member.id, rowData);
    });
    
    logPerformanceMetric('Team member row cache build', cacheStart);
    return cache;
  }, [teamMembers, scheduleData, validatedSprintDays]);
};

// Performance-optimized calculation cache
const calculationCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds

export const useMemoizedCalculation = <T>(
  key: string,
  calculator: () => T,
  dependencies: any[]
): T => {
  return useMemo(() => {
    const calcStart = performance?.now() || 0;
    const cacheKey = `${key}-${JSON.stringify(dependencies)}`;
    const cached = calculationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logPerformanceMetric(`${key} (cached)`, calcStart, 100);
      return cached.value;
    }
    
    const result = calculator();
    calculationCache.set(cacheKey, { value: result, timestamp: Date.now() });
    
    const hitRate = cached ? 0 : undefined;
    logPerformanceMetric(`${key} (calculated)`, calcStart, hitRate);
    
    return result;
  }, dependencies);
};

// Clear stale cache entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of calculationCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        calculationCache.delete(key);
      }
    }
  }, CACHE_DURATION);
}
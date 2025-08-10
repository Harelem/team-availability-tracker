/**
 * State Debugging Utilities
 * 
 * This file provides comprehensive debugging utilities for the centralized state management system.
 * It includes DevTools integration, performance monitoring, and state inspection tools.
 */

import { AppState, AppAction } from '@/types/state';

// =============================================================================
// DEVTOOLS INTEGRATION
// =============================================================================

interface DevToolsConfig {
  name: string;
  maxAge: number;
  trace: boolean;
  traceLimit: number;
  serialize: boolean;
}

const defaultConfig: DevToolsConfig = {
  name: 'Team Availability Tracker State',
  maxAge: 50,
  trace: true,
  traceLimit: 30,
  serialize: true
};

export class StateDevTools {
  private devtools: any;
  private isEnabled: boolean = false;

  constructor(config: Partial<DevToolsConfig> = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    
    if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      this.devtools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect(finalConfig);
      this.isEnabled = true;
      
      this.devtools.subscribe((message: any) => {
        this.handleDevToolsMessage(message);
      });
    }
  }

  send(action: AppAction, state: AppState) {
    if (this.isEnabled && this.devtools) {
      this.devtools.send(action, state);
    }
  }

  init(state: AppState) {
    if (this.isEnabled && this.devtools) {
      this.devtools.init(state);
    }
  }

  error(message: string) {
    if (this.isEnabled && this.devtools) {
      this.devtools.error(message);
    }
  }

  private handleDevToolsMessage(message: any) {
    switch (message.type) {
      case 'DISPATCH':
        switch (message.payload.type) {
          case 'RESET':
            // Handle reset
            break;
          case 'ROLLBACK':
            // Handle rollback
            break;
          case 'COMMIT':
            // Handle commit
            break;
          case 'SWEEP':
            // Handle sweep
            break;
          case 'TOGGLE_ACTION':
            // Handle toggle action
            break;
          case 'JUMP_TO_ACTION':
          case 'JUMP_TO_STATE':
            // Handle time travel
            break;
          case 'IMPORT_STATE':
            // Handle state import
            break;
        }
        break;
    }
  }

  disconnect() {
    if (this.isEnabled && this.devtools) {
      this.devtools.unsubscribe();
    }
  }
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

export class StatePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  private isEnabled: boolean;

  constructor(enabled = process.env.NODE_ENV === 'development') {
    this.isEnabled = enabled;
  }

  startMeasure(actionType: string) {
    if (!this.isEnabled) return;
    
    this.startTimes.set(actionType, performance.now());
  }

  endMeasure(actionType: string) {
    if (!this.isEnabled) return;
    
    const startTime = this.startTimes.get(actionType);
    if (startTime === undefined) return;
    
    const duration = performance.now() - startTime;
    this.startTimes.delete(actionType);
    
    if (!this.metrics.has(actionType)) {
      this.metrics.set(actionType, []);
    }
    
    const actionMetrics = this.metrics.get(actionType)!;
    actionMetrics.push(duration);
    
    // Keep only last 100 measurements
    if (actionMetrics.length > 100) {
      actionMetrics.shift();
    }
    
    // Log slow actions
    if (duration > 16) { // More than one frame
      console.warn(`🐌 Slow state action: ${actionType} took ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics() {
    if (!this.isEnabled) return {};
    
    const result: Record<string, { 
      count: number; 
      avg: number; 
      min: number; 
      max: number; 
      total: number;
    }> = {};
    
    this.metrics.forEach((durations, actionType) => {
      const count = durations.length;
      const total = durations.reduce((sum, d) => sum + d, 0);
      const avg = total / count;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      result[actionType] = { count, avg, min, max, total };
    });
    
    return result;
  }

  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }

  logSummary() {
    if (!this.isEnabled) return;
    
    const metrics = this.getMetrics();
    console.group('📊 State Performance Summary');
    
    Object.entries(metrics)
      .sort((a, b) => b[1].avg - a[1].avg)
      .forEach(([action, stats]) => {
        console.log(`${action}: avg ${stats.avg.toFixed(2)}ms (${stats.count} calls, max ${stats.max.toFixed(2)}ms)`);
      });
    
    console.groupEnd();
  }
}

// =============================================================================
// STATE INSPECTOR
// =============================================================================

export class StateInspector {
  static inspectState(state: AppState) {
    console.group('🔍 App State Inspector');
    
    // Overall state structure
    console.log('📋 State Overview:', {
      version: state.version,
      initialized: state.initialized,
      debugMode: state.debugMode,
      historyLength: state.history.length
    });
    
    // UI State
    console.group('🎨 UI State');
    console.log('Loading:', state.ui.loading);
    console.log('Errors:', Object.entries(state.ui.errors).filter(([, error]) => error !== null));
    console.log('Open Modals:', Object.entries(state.ui.modals).filter(([, modal]) => modal.isOpen));
    console.log('Notifications:', state.ui.notifications.items.length);
    console.log('Navigation:', state.ui.navigation);
    console.groupEnd();
    
    // Data State
    console.group('📊 Data State');
    console.log('Teams:', {
      count: state.data.teams.items.length,
      selected: state.data.teams.selectedTeam?.name || 'None',
      lastFetch: state.data.teams.lastFetch
    });
    console.log('Members:', {
      count: state.data.members.items.length,
      selected: state.data.members.selectedMember?.name || 'None',
      lastFetch: state.data.members.lastFetch
    });
    console.log('Sprints:', {
      current: state.data.sprints.currentSprint?.current_sprint_number || 'None',
      lastFetch: state.data.sprints.lastFetch
    });
    console.log('Dashboards:', {
      hasCOOData: state.data.dashboards.cooData !== null,
      hasDailyStatus: state.data.dashboards.dailyCompanyStatus !== null,
      lastFetch: state.data.dashboards.lastFetch
    });
    console.groupEnd();
    
    // User State
    console.group('👤 User State');
    console.log('Current User:', state.user.currentUser?.name || 'None');
    console.log('User Type:', state.user.userType);
    console.log('Permissions:', state.user.permissions);
    console.log('Preferences:', state.user.preferences);
    console.groupEnd();
    
    // Cache State
    console.group('💾 Cache State');
    const now = Date.now();
    const cacheAges = Object.entries(state.cache.timestamps).reduce((acc, [key, timestamp]) => {
      if (timestamp) {
        const ageSeconds = Math.round((now - timestamp.getTime()) / 1000);
        acc[key] = `${ageSeconds}s ago`;
      } else {
        acc[key] = 'never';
      }
      return acc;
    }, {} as Record<string, string>);
    
    console.log('Cache Ages:', cacheAges);
    console.log('Invalidated:', Object.entries(state.cache.invalidation).filter(([, invalid]) => invalid));
    console.log('Policies:', state.cache.policies);
    console.groupEnd();
    
    console.groupEnd();
  }

  static inspectHistory(state: AppState, limit = 10) {
    console.group(`📋 State History (last ${limit})`);
    
    state.history.slice(-limit).forEach((entry, index) => {
      console.group(`${index + 1}. ${entry.action} - ${entry.timestamp.toISOString()}`);
      
      if (entry.previousState && entry.newState) {
        const changes = this.findStateChanges(entry.previousState, entry.newState);
        if (changes.length > 0) {
          console.log('Changes:', changes);
        }
      }
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }

  private static findStateChanges(prev: any, next: any, path = ''): string[] {
    const changes: string[] = [];
    
    if (prev === next) return changes;
    
    if (typeof prev !== 'object' || typeof next !== 'object' || prev === null || next === null) {
      changes.push(`${path}: ${prev} → ${next}`);
      return changes;
    }
    
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    
    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (!(key in prev)) {
        changes.push(`${newPath}: added ${next[key]}`);
      } else if (!(key in next)) {
        changes.push(`${newPath}: removed ${prev[key]}`);
      } else {
        changes.push(...this.findStateChanges(prev[key], next[key], newPath));
      }
    }
    
    return changes;
  }

  static validateState(state: AppState): string[] {
    const errors: string[] = [];
    
    // Validate UI state
    if (!state.ui) {
      errors.push('Missing ui state');
    } else {
      if (!state.ui.loading) errors.push('Missing ui.loading');
      if (!state.ui.errors) errors.push('Missing ui.errors');
      if (!state.ui.modals) errors.push('Missing ui.modals');
      if (!state.ui.notifications) errors.push('Missing ui.notifications');
      if (!state.ui.navigation) errors.push('Missing ui.navigation');
    }
    
    // Validate data state
    if (!state.data) {
      errors.push('Missing data state');
    } else {
      if (!state.data.teams) errors.push('Missing data.teams');
      if (!state.data.members) errors.push('Missing data.members');
      if (!state.data.sprints) errors.push('Missing data.sprints');
      if (!state.data.schedules) errors.push('Missing data.schedules');
      if (!state.data.dashboards) errors.push('Missing data.dashboards');
    }
    
    // Validate user state
    if (!state.user) {
      errors.push('Missing user state');
    } else {
      if (!state.user.permissions) errors.push('Missing user.permissions');
      if (!state.user.preferences) errors.push('Missing user.preferences');
      if (!state.user.session) errors.push('Missing user.session');
    }
    
    // Validate cache state
    if (!state.cache) {
      errors.push('Missing cache state');
    } else {
      if (!state.cache.timestamps) errors.push('Missing cache.timestamps');
      if (!state.cache.invalidation) errors.push('Missing cache.invalidation');
      if (!state.cache.policies) errors.push('Missing cache.policies');
    }
    
    // Validate required fields
    if (typeof state.version !== 'string') errors.push('Invalid version field');
    if (typeof state.initialized !== 'boolean') errors.push('Invalid initialized field');
    if (typeof state.debugMode !== 'boolean') errors.push('Invalid debugMode field');
    if (!Array.isArray(state.history)) errors.push('Invalid history field');
    
    return errors;
  }
}

// =============================================================================
// STATE COMPARATOR
// =============================================================================

export class StateComparator {
  static compareStates(state1: AppState, state2: AppState) {
    console.group('🔄 State Comparison');
    
    const differences = this.findDifferences(state1, state2);
    
    if (differences.length === 0) {
      console.log('✅ States are identical');
    } else {
      console.log(`Found ${differences.length} differences:`);
      differences.forEach((diff, index) => {
        console.log(`${index + 1}. ${diff}`);
      });
    }
    
    console.groupEnd();
    
    return differences;
  }

  private static findDifferences(obj1: any, obj2: any, path = ''): string[] {
    const differences: string[] = [];
    
    if (obj1 === obj2) return differences;
    
    if (typeof obj1 !== typeof obj2) {
      differences.push(`${path}: type changed from ${typeof obj1} to ${typeof obj2}`);
      return differences;
    }
    
    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
      differences.push(`${path}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`);
      return differences;
    }
    
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj1)) {
        differences.push(`${newPath}: added`);
      } else if (!(key in obj2)) {
        differences.push(`${newPath}: removed`);
      } else {
        differences.push(...this.findDifferences(obj1[key], obj2[key], newPath));
      }
    }
    
    return differences;
  }
}

// =============================================================================
// STATE SERIALIZER
// =============================================================================

export class StateSerializer {
  static serialize(state: AppState): string {
    return JSON.stringify(state, this.replacer, 2);
  }

  static deserialize(serialized: string): AppState {
    return JSON.parse(serialized, this.reviver);
  }

  private static replacer(key: string, value: any): any {
    // Handle Date objects
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    
    // Handle Functions (convert to string representation)
    if (typeof value === 'function') {
      return { __type: 'Function', value: value.toString() };
    }
    
    return value;
  }

  private static reviver(key: string, value: any): any {
    // Restore Date objects
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    
    // Restore Functions (not recommended, but possible)
    if (value && typeof value === 'object' && value.__type === 'Function') {
      try {
        return new Function(`return ${value.value}`)();
      } catch (error) {
        console.warn('Failed to restore function:', error);
        return null;
      }
    }
    
    return value;
  }

  static exportToFile(state: AppState, filename = 'app-state.json') {
    const serialized = this.serialize(state);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  static importFromFile(): Promise<AppState> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const state = this.deserialize(content);
            resolve(state);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsText(file);
      };
      
      input.click();
    });
  }
}

// =============================================================================
// GLOBAL DEBUG UTILITIES
// =============================================================================

export function setupGlobalDebugUtils(
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
  performanceMonitor: StatePerformanceMonitor
) {
  if (typeof window === 'undefined') return;
  
  (window as any).__TEAM_TRACKER_DEBUG__ = {
    // State inspection
    inspectState: () => StateInspector.inspectState(state),
    inspectHistory: (limit?: number) => StateInspector.inspectHistory(state, limit),
    validateState: () => StateInspector.validateState(state),
    
    // Performance
    getPerformanceMetrics: () => performanceMonitor.getMetrics(),
    logPerformanceSummary: () => performanceMonitor.logSummary(),
    resetPerformanceMetrics: () => performanceMonitor.reset(),
    
    // State manipulation
    dispatch,
    resetState: () => dispatch({ type: 'RESET_STATE' }),
    toggleDebugMode: () => dispatch({ type: 'TOGGLE_DEBUG_MODE' }),
    
    // Serialization
    exportState: () => StateSerializer.exportToFile(state),
    importState: () => StateSerializer.importFromFile()
      .then(importedState => dispatch({ type: 'HYDRATE_STATE', payload: { state: importedState } }))
      .catch(console.error),
    
    // Cache management
    clearCache: () => dispatch({ type: 'CLEAR_ALL_CACHE' }),
    invalidateCache: (key: string) => dispatch({ type: 'INVALIDATE_CACHE', payload: { key } }),
    
    // Utilities
    StateInspector,
    StateComparator,
    StateSerializer
  };
  
  console.log('🐛 Debug utilities available at window.__TEAM_TRACKER_DEBUG__');
}
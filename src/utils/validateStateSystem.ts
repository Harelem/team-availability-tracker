/**
 * State System Validation Utility
 * 
 * This utility validates that the centralized state management system is properly
 * set up and working correctly. It can be used during development to ensure
 * components are properly migrated.
 */

import { AppState, createInitialState } from '@/types/state';
import { appStateReducer } from '@/lib/appState';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
  };
}

export class StateSystemValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private totalTests = 0;
  private passed = 0;

  validate(): ValidationResult {
    console.log('🔍 Starting state system validation...');
    
    this.validateInitialState();
    this.validateReducer();
    this.validateStateStructure();
    this.validateActionHandling();
    this.validateSelectors();
    
    const failed = this.totalTests - this.passed;
    
    console.log(`✅ Validation complete: ${this.passed}/${this.totalTests} tests passed`);
    
    if (this.errors.length > 0) {
      console.error('❌ Validation errors found:');
      this.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.warn('⚠️ Validation warnings:');
      this.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalTests: this.totalTests,
        passed: this.passed,
        failed
      }
    };
  }

  private test(name: string, testFn: () => boolean | void): void {
    this.totalTests++;
    try {
      const result = testFn();
      if (result !== false) {
        this.passed++;
        console.log(`  ✓ ${name}`);
      } else {
        this.errors.push(`Test failed: ${name}`);
        console.error(`  ✗ ${name}`);
      }
    } catch (error) {
      this.errors.push(`Test error in "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`  ✗ ${name} - ${error}`);
    }
  }

  private validateInitialState(): void {
    console.log('📋 Validating initial state...');
    
    this.test('Initial state factory exists', () => {
      return typeof createInitialState === 'function';
    });

    this.test('Initial state has correct structure', () => {
      const state = createInitialState();
      return (
        state &&
        typeof state === 'object' &&
        'ui' in state &&
        'data' in state &&
        'user' in state &&
        'cache' in state &&
        'version' in state &&
        'initialized' in state &&
        'debugMode' in state &&
        'history' in state
      );
    });

    this.test('UI state is properly initialized', () => {
      const state = createInitialState();
      return (
        state.ui &&
        'loading' in state.ui &&
        'errors' in state.ui &&
        'modals' in state.ui &&
        'notifications' in state.ui &&
        'navigation' in state.ui &&
        'refreshKeys' in state.ui
      );
    });

    this.test('Data state is properly initialized', () => {
      const state = createInitialState();
      return (
        state.data &&
        'teams' in state.data &&
        'members' in state.data &&
        'sprints' in state.data &&
        'schedules' in state.data &&
        'dashboards' in state.data
      );
    });
  }

  private validateReducer(): void {
    console.log('⚙️ Validating reducer...');
    
    this.test('Reducer function exists', () => {
      return typeof appStateReducer === 'function';
    });

    this.test('Reducer handles SET_LOADING action', () => {
      const initialState = createInitialState();
      const action = { type: 'SET_LOADING' as const, payload: { key: 'dashboard' as const, value: true } };
      const newState = appStateReducer(initialState, action);
      return newState.ui.loading.dashboard === true;
    });

    this.test('Reducer handles SET_ERROR action', () => {
      const initialState = createInitialState();
      const action = { type: 'SET_ERROR' as const, payload: { key: 'teams' as const, value: 'Test error' } };
      const newState = appStateReducer(initialState, action);
      return newState.ui.errors.teams === 'Test error';
    });

    this.test('Reducer handles OPEN_MODAL action', () => {
      const initialState = createInitialState();
      const action = { type: 'OPEN_MODAL' as const, payload: { modal: 'workforceStatus' as const } };
      const newState = appStateReducer(initialState, action);
      return newState.ui.modals.workforceStatus.isOpen === true;
    });

    this.test('Reducer preserves immutability', () => {
      const initialState = createInitialState();
      const action = { type: 'SET_LOADING' as const, payload: { key: 'dashboard' as const, value: true } };
      const newState = appStateReducer(initialState, action);
      return initialState !== newState && initialState.ui.loading.dashboard === false;
    });
  }

  private validateStateStructure(): void {
    console.log('🏗️ Validating state structure...');
    
    this.test('Loading state has all required keys', () => {
      const state = createInitialState();
      const requiredKeys = ['global', 'dashboard', 'teams', 'members', 'schedules', 'sprints', 'analytics', 'exports'];
      return requiredKeys.every(key => key in state.ui.loading);
    });

    this.test('Error state has all required keys', () => {
      const state = createInitialState();
      const requiredKeys = ['global', 'dashboard', 'teams', 'members', 'schedules', 'sprints', 'analytics', 'exports'];
      return requiredKeys.every(key => key in state.ui.errors);
    });

    this.test('Modal state has all required modals', () => {
      const state = createInitialState();
      const requiredModals = ['workforceStatus', 'sprintPotential', 'teamDetail', 'reasonDialog', 'viewReasons', 'memberForm', 'sprintForm', 'exportModal'];
      return requiredModals.every(modal => modal in state.ui.modals);
    });

    this.test('Navigation state has correct default values', () => {
      const state = createInitialState();
      return (
        state.ui.navigation.cooActiveTab === 'dashboard' &&
        state.ui.navigation.analyticsActiveSection === 'charts' &&
        state.ui.navigation.currentWeekOffset === 0
      );
    });
  }

  private validateActionHandling(): void {
    console.log('🎬 Validating action handling...');
    
    const initialState = createInitialState();

    this.test('CLEAR_ALL_ERRORS clears all errors', () => {
      // First set some errors
      let state = appStateReducer(initialState, { type: 'SET_ERROR', payload: { key: 'dashboard', value: 'Error 1' } });
      state = appStateReducer(state, { type: 'SET_ERROR', payload: { key: 'teams', value: 'Error 2' } });
      
      // Then clear all
      state = appStateReducer(state, { type: 'CLEAR_ALL_ERRORS' });
      
      return Object.values(state.ui.errors).every(error => error === null);
    });

    this.test('ADD_NOTIFICATION adds notification', () => {
      const action = { 
        type: 'ADD_NOTIFICATION' as const, 
        payload: { type: 'success' as const, title: 'Test', message: 'Test message' } 
      };
      const newState = appStateReducer(initialState, action);
      return newState.ui.notifications.items.length === 1 && newState.ui.notifications.unreadCount === 1;
    });

    this.test('SET_TEAMS updates teams data', () => {
      const mockTeams = [{ id: 1, name: 'Test Team', description: 'Test' }];
      const action = { type: 'SET_TEAMS' as const, payload: { teams: mockTeams } };
      const newState = appStateReducer(initialState, action);
      return newState.data.teams.items.length === 1 && newState.data.teams.items[0].name === 'Test Team';
    });

    this.test('INCREMENT_REFRESH_KEY increments correctly', () => {
      const action = { type: 'INCREMENT_REFRESH_KEY' as const, payload: { key: 'dashboard' as const } };
      const newState = appStateReducer(initialState, action);
      return newState.ui.refreshKeys.dashboard === 1;
    });
  }

  private validateSelectors(): void {
    console.log('🎯 Validating selectors...');
    
    // Note: This is a basic validation since selectors are created dynamically
    this.test('Selectors would be created from state', () => {
      const state = createInitialState();
      // Basic check that state structure supports selectors
      return (
        'ui' in state &&
        'data' in state &&
        'user' in state &&
        'cache' in state
      );
    });
  }
}

// Utility function to run validation
export function validateStateSystem(): ValidationResult {
  const validator = new StateSystemValidator();
  return validator.validate();
}

// Development helper to run validation in browser console
if (typeof window !== 'undefined') {
  (window as any).__validateStateSystem = validateStateSystem;
  console.log('🔧 State validation available at window.__validateStateSystem()');
}
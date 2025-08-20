/**
 * Loading State Debugger
 * Utility functions to help diagnose and fix loading state issues
 */

interface LoadingState {
  component: string;
  isLoading: boolean;
  startTime: number;
  timeout?: number;
}

class LoadingStateManager {
  private static instance: LoadingStateManager;
  private loadingStates: Map<string, LoadingState> = new Map();
  private debugEnabled: boolean = process.env.NODE_ENV === 'development';

  static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager();
    }
    return LoadingStateManager.instance;
  }

  // Register a loading state
  registerLoading(componentId: string, timeout: number = 30000): void {
    if (this.debugEnabled) {
      console.log(`🔄 Loading started: ${componentId}`);
    }

    this.loadingStates.set(componentId, {
      component: componentId,
      isLoading: true,
      startTime: Date.now(),
      timeout
    });

    // Set up automatic timeout
    setTimeout(() => {
      const state = this.loadingStates.get(componentId);
      if (state && state.isLoading) {
        console.error(`⏱️ Loading timeout: ${componentId} has been loading for ${timeout}ms`);
        this.forceComplete(componentId);
      }
    }, timeout);
  }

  // Mark loading as complete
  completeLoading(componentId: string): void {
    const state = this.loadingStates.get(componentId);
    if (state) {
      const duration = Date.now() - state.startTime;
      if (this.debugEnabled) {
        console.log(`✅ Loading complete: ${componentId} (${duration}ms)`);
      }
      
      this.loadingStates.set(componentId, {
        ...state,
        isLoading: false
      });
    }
  }

  // Force complete a loading state
  forceComplete(componentId: string): void {
    const state = this.loadingStates.get(componentId);
    if (state) {
      const duration = Date.now() - state.startTime;
      console.warn(`🚫 Force completing: ${componentId} after ${duration}ms`);
      
      this.loadingStates.set(componentId, {
        ...state,
        isLoading: false
      });

      // Trigger custom event for components to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('loading-force-complete', {
          detail: { componentId }
        }));
      }
    }
  }

  // Get current loading states
  getLoadingStates(): LoadingState[] {
    return Array.from(this.loadingStates.values());
  }

  // Get stuck loading components (loading for more than 30 seconds)
  getStuckComponents(): LoadingState[] {
    const now = Date.now();
    return this.getLoadingStates().filter(state => 
      state.isLoading && (now - state.startTime) > 30000
    );
  }

  // Clear all loading states
  clearAllLoadingStates(): void {
    console.warn('🧹 Clearing all loading states');
    this.loadingStates.forEach((state, componentId) => {
      if (state.isLoading) {
        this.forceComplete(componentId);
      }
    });
  }

  // Debug report
  getDebugReport(): string {
    const states = this.getLoadingStates();
    const stuck = this.getStuckComponents();
    
    return `
Loading State Debug Report:
- Total components tracked: ${states.length}
- Currently loading: ${states.filter(s => s.isLoading).length}
- Stuck components: ${stuck.length}
- Stuck components details: ${stuck.map(s => `${s.component} (${Date.now() - s.startTime}ms)`).join(', ')}
    `;
  }
}

// Global loading state manager
export const loadingStateManager = LoadingStateManager.getInstance();

// Hook for components to use loading state debugging
export function useLoadingDebugger(componentId: string, timeout: number = 30000) {
  const startLoading = () => loadingStateManager.registerLoading(componentId, timeout);
  const completeLoading = () => loadingStateManager.completeLoading(componentId);
  const forceComplete = () => loadingStateManager.forceComplete(componentId);

  return {
    startLoading,
    completeLoading,
    forceComplete
  };
}

// Emergency functions for browser console
if (typeof window !== 'undefined') {
  (window as any).loadingDebugger = {
    getReport: () => {
      console.log(loadingStateManager.getDebugReport());
      return loadingStateManager.getDebugReport();
    },
    getStuckComponents: () => {
      const stuck = loadingStateManager.getStuckComponents();
      console.log('Stuck loading components:', stuck);
      return stuck;
    },
    forceCompleteAll: () => {
      loadingStateManager.clearAllLoadingStates();
      console.log('✅ All loading states have been force completed');
    },
    forceComplete: (componentId: string) => {
      loadingStateManager.forceComplete(componentId);
      console.log(`✅ Force completed: ${componentId}`);
    }
  };
}

export default loadingStateManager;
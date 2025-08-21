/**
 * Lazy Loading and Code Splitting Utilities
 * 
 * Provides utilities for dynamic imports, route-based code splitting,
 * and performance optimization for the team availability tracker.
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { ComponentProps } from 'react';

// Types for lazy loading configuration
interface LazyLoadingOptions {
  fallback?: ComponentType;
  retry?: number;
  timeout?: number;
  preload?: boolean;
}

interface RouteConfig {
  path: string;
  component: () => Promise<{ default: ComponentType<any> }>;
  preload?: boolean;
  chunkName?: string;
}

// Enhanced lazy loading with retry logic and error handling
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadingOptions = {}
): LazyExoticComponent<T> {
  const { retry = 3, timeout = 30000 } = options; // Extended timeout for COO dashboard compatibility

  const enhancedImportFn = async (): Promise<{ default: T }> => {
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= retry; attempt++) {
      try {
        // Add timeout to import
        const importPromise = importFn();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Import timeout')), timeout);
        });

        const result = await Promise.race([importPromise, timeoutPromise]);
        
        // Log successful load for analytics
        if (typeof window !== 'undefined' && 'performance' in window) {
          performance.mark(`lazy-load-success-${result.default.name || 'unknown'}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Lazy loading attempt ${attempt} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < retry) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    // Log failed load for analytics
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark('lazy-load-failure');
    }
    
    throw new Error(`Failed to load component after ${retry} attempts: ${lastError.message}`);
  };

  return lazy(enhancedImportFn);
}

// Preload lazy components
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
): Promise<void> {
  return importFn()
    .then(() => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark('component-preloaded');
      }
    })
    .catch(error => {
      console.warn('Failed to preload component:', error);
    });
}

// Route-based lazy loading components
export const LazyComponents = {
  // Main application routes
  HomePage: createLazyComponent(
    () => import('@/app/page'),
    { preload: true }
  ),
  
  SchedulePage: createLazyComponent(
    () => import('@/components/ScheduleTable'),
    { preload: true }
  ),
  
  TeamsPage: createLazyComponent(
    () => import('@/components/TeamSelectionScreen'),
    { preload: false }
  ),
  
  AnalyticsPage: createLazyComponent(
    () => import('@/components/analytics/ExecutiveSummaryDashboard'),
    { preload: false }
  ),
  
  COODashboard: createLazyComponent(
    () => import('@/components/COOAnalyticsDashboard'),
    { preload: false }
  ),

  // Mobile-specific components
  MobileTeamNavigation: createLazyComponent(
    () => import('@/components/mobile/MobileTeamNavigation'),
    { preload: true } // Critical for mobile
  ),
  
  MobileScheduleView: createLazyComponent(
    () => import('@/components/MobileScheduleView'),
    { preload: true }
  ),
  
  MobileCOODashboard: createLazyComponent(
    () => import('@/components/MobileCOODashboard'),
    { preload: false }
  ),

  // Accessibility components
  AccessibilityControls: createLazyComponent(
    () => import('@/components/accessibility/AccessibilityControls'),
    { preload: false }
  ),

  // Chart components (heavy dependencies)
  // NOTE: Chart components use named exports - requires different lazy loading approach
  // SprintCapacityBarChart: Deferred for future optimization
  // TeamUtilizationPieChart: Deferred for future optimization  
  // CapacityTrendAreaChart: Deferred for future optimization

  // Modal components
  TeamDetailModal: createLazyComponent(
    () => import('@/components/modals/TeamDetailModal'),
    { preload: false }
  ),
  
  MemberFormModal: createLazyComponent(
    () => import('@/components/MemberFormModal'),
    { preload: false }
  ),
  
  SprintFormModal: createLazyComponent(
    () => import('@/components/SprintFormModal'),
    { preload: false }
  ),

  // Export components (heavy processing)
  EnhancedExportModal: createLazyComponent(
    () => import('@/components/EnhancedExportModal'),
    { preload: false }
  ),
  
  CustomRangeExportModal: createLazyComponent(
    () => import('@/components/CustomRangeExportModal'),
    { preload: false }
  )
};

// Route configuration for code splitting
export const routeConfig: RouteConfig[] = [
  {
    path: '/',
    component: () => import('@/app/page'),
    preload: true,
    chunkName: 'home'
  },
  {
    path: '/schedule',
    component: () => import('@/components/ScheduleTable'),
    preload: true,
    chunkName: 'schedule'
  },
  {
    path: '/teams',
    component: () => import('@/components/TeamSelectionScreen'),
    preload: false,
    chunkName: 'teams'
  },
  {
    path: '/analytics',
    component: () => import('@/components/analytics/ExecutiveSummaryDashboard'),
    preload: false,
    chunkName: 'analytics'
  },
  {
    path: '/coo-dashboard',
    component: () => import('@/components/COOAnalyticsDashboard'),
    preload: false,
    chunkName: 'coo'
  }
];

// Intelligent preloading based on user behavior
export class IntelligentPreloader {
  private preloadedComponents = new Set<string>();
  private preloadQueue: Array<() => Promise<any>> = [];
  private isPreloading = false;

  constructor() {
    this.setupIntersectionObserver();
    this.setupIdleCallback();
  }

  // Preload component when link is hovered
  preloadOnHover(componentName: keyof typeof LazyComponents): void {
    if (this.preloadedComponents.has(componentName)) return;

    this.addToQueue(() => {
      this.preloadedComponents.add(componentName);
      return preloadComponent(LazyComponents[componentName] as any);
    });
  }

  // Preload component when it's likely to be needed
  preloadOnIntersection(componentName: keyof typeof LazyComponents): void {
    if (this.preloadedComponents.has(componentName)) return;

    this.addToQueue(() => {
      this.preloadedComponents.add(componentName);
      return preloadComponent(LazyComponents[componentName] as any);
    });
  }

  // Preload based on user role
  preloadForUserRole(userRole: 'manager' | 'coo' | 'member'): void {
    const roleBasedComponents: Record<string, (keyof typeof LazyComponents)[]> = {
      coo: ['COODashboard', 'MobileCOODashboard', 'AnalyticsPage'],
      manager: ['TeamsPage', 'TeamDetailModal', 'EnhancedExportModal'],
      member: ['SchedulePage', 'MobileScheduleView']
    };

    const componentsToPreload = roleBasedComponents[userRole] || [];
    componentsToPreload.forEach(component => {
      this.preloadOnHover(component);
    });
  }

  // Preload based on device type
  preloadForDevice(isMobile: boolean): void {
    if (isMobile) {
      this.preloadOnHover('MobileTeamNavigation');
      this.preloadOnHover('MobileScheduleView');
    } else {
      // Desktop users might need charts more often
      // Chart preloading deferred - requires named export handling
      // this.preloadOnIntersection('SprintCapacityBarChart');
      // this.preloadOnIntersection('TeamUtilizationPieChart');
    }
  }

  private addToQueue(preloadFn: () => Promise<any>): void {
    this.preloadQueue.push(preloadFn);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const preloadFn = this.preloadQueue.shift()!;
      
      try {
        await preloadFn();
        // Small delay to prevent blocking main thread
        await new Promise(resolve => setTimeout(resolve, 16));
      } catch (error) {
        console.warn('Preloading failed:', error);
      }
    }

    this.isPreloading = false;
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const preloadComponent = element.dataset.preload as keyof typeof LazyComponents;
            
            if (preloadComponent) {
              this.preloadOnIntersection(preloadComponent);
              observer.unobserve(element);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    // Observe elements with data-preload attribute
    setTimeout(() => {
      document.querySelectorAll('[data-preload]').forEach(element => {
        observer.observe(element);
      });
    }, 1000);
  }

  private setupIdleCallback(): void {
    if (typeof window === 'undefined' || !('requestIdleCallback' in window)) {
      return;
    }

    const idleCallback = (deadline: IdleDeadline) => {
      // Preload critical components during idle time
      if (deadline.timeRemaining() > 10) {
        this.processQueue();
      }

      // Schedule next idle callback
      requestIdleCallback(idleCallback);
    };

    requestIdleCallback(idleCallback);
  }
}

// Global preloader instance
export const intelligentPreloader = new IntelligentPreloader();

// Hook for using lazy loading in components
export function useLazyLoading() {
  const preloadComponent = (componentName: keyof typeof LazyComponents) => {
    intelligentPreloader.preloadOnHover(componentName);
  };

  const preloadForRole = (userRole: 'manager' | 'coo' | 'member') => {
    intelligentPreloader.preloadForUserRole(userRole);
  };

  const preloadForDevice = (isMobile: boolean) => {
    intelligentPreloader.preloadForDevice(isMobile);
  };

  return {
    preloadComponent,
    preloadForRole,
    preloadForDevice,
    LazyComponents
  };
}

// Utility for measuring bundle sizes
export function measureBundleSize(componentName: string) {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return;
  }

  const startMark = `bundle-start-${componentName}`;
  const endMark = `bundle-end-${componentName}`;
  const measureName = `bundle-size-${componentName}`;

  performance.mark(startMark);

  return {
    end: () => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      
      const measure = performance.getEntriesByName(measureName)[0];
      console.log(`Bundle loading time for ${componentName}:`, measure.duration);
      
      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    }
  };
}

// Critical resource preloader
export function preloadCriticalResources(): void {
  if (typeof window === 'undefined') return;

  // Preload critical routes
  routeConfig
    .filter(route => route.preload)
    .forEach(route => {
      preloadComponent(route.component);
    });

  // Preload critical fonts
  const criticalFonts = [
    '/fonts/inter-var.woff2',
    '/fonts/inter-var-italic.woff2'
  ];

  criticalFonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });

  // Preload critical images
  const criticalImages = [
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
  ];

  criticalImages.forEach(image => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = image;
    link.as = 'image';
    document.head.appendChild(link);
  });
}

export default {
  createLazyComponent,
  preloadComponent,
  LazyComponents,
  intelligentPreloader,
  useLazyLoading,
  measureBundleSize,
  preloadCriticalResources
};
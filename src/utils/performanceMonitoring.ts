/**
 * Performance Monitoring Utilities
 * 
 * Monitors Core Web Vitals, bundle sizes, component render times,
 * and provides performance insights for optimization.
 */

import React from 'react';

// Core Web Vitals interfaces
interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface WebVitalsMetrics {
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  LCP: number; // Largest Contentful Paint
  FCP: number; // First Contentful Paint
  TTFB: number; // Time to First Byte
}

interface ComponentPerformance {
  name: string;
  renderTime: number;
  rerenderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

interface BundleAnalytics {
  totalSize: number;
  loadTime: number;
  cacheHitRate: number;
  failedLoads: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private componentMetrics: Map<string, ComponentPerformance> = new Map();
  private bundleMetrics: BundleAnalytics = {
    totalSize: 0,
    loadTime: 0,
    cacheHitRate: 0,
    failedLoads: 0
  };
  
  private observers: PerformanceObserver[] = [];
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeWebVitalsMonitoring();
    this.initializeBundleMonitoring();
    this.startPeriodicReporting();
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitalsMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number };
        
        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime, this.getLCPRating(lastEntry.startTime));
        }
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
          const fid = entry.processingStart ? entry.processingStart - entry.startTime : 0;
          this.recordMetric('FID', fid, this.getFIDRating(fid));
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: PerformanceEntry & { value?: number; hadRecentInput?: boolean }) => {
          if (!entry.hadRecentInput && entry.value) {
            clsValue += entry.value;
            this.recordMetric('CLS', clsValue, this.getCLSRating(clsValue));
          }
        });
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }

    // Navigation timing for TTFB and FCP
    this.monitorNavigationTiming();
  }

  /**
   * Monitor navigation timing
   */
  private monitorNavigationTiming(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Time to First Byte
        const ttfb = navigation.responseStart - navigation.fetchStart;
        this.recordMetric('TTFB', ttfb, this.getTTFBRating(ttfb));

        // First Contentful Paint
        const fcpEntries = performance.getEntriesByName('first-contentful-paint');
        if (fcpEntries.length > 0) {
          const fcp = fcpEntries[0].startTime;
          this.recordMetric('FCP', fcp, this.getFCPRating(fcp));
        }
      }
    });
  }

  /**
   * Initialize bundle monitoring
   */
  private initializeBundleMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          this.trackBundleLoad(entry);
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  /**
   * Track individual bundle loads
   */
  private trackBundleLoad(entry: PerformanceEntry): void {
    const resourceEntry = entry as PerformanceResourceTiming;
    const loadTime = resourceEntry.responseEnd - resourceEntry.fetchStart;
    const size = resourceEntry.transferSize || 0;

    this.bundleMetrics.totalSize += size;
    this.bundleMetrics.loadTime += loadTime;

    // Track cache hits
    if (resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0) {
      this.bundleMetrics.cacheHitRate++;
    }

    // Track failed loads
    if (resourceEntry.responseStart === 0) {
      this.bundleMetrics.failedLoads++;
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    };

    this.metrics.set(name, metric);
    
    // Report to analytics if available
    this.reportToAnalytics(metric);
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    const existing = this.componentMetrics.get(componentName);
    
    if (existing) {
      existing.rerenderCount++;
      existing.lastRenderTime = renderTime;
      existing.averageRenderTime = (existing.averageRenderTime + renderTime) / 2;
    } else {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderTime,
        rerenderCount: 1,
        lastRenderTime: renderTime,
        averageRenderTime: renderTime
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): {
    webVitals: Map<string, PerformanceMetric>;
    components: Map<string, ComponentPerformance>;
    bundles: BundleAnalytics;
  } {
    return {
      webVitals: new Map(this.metrics),
      components: new Map(this.componentMetrics),
      bundles: { ...this.bundleMetrics }
    };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const metrics = Array.from(this.metrics.values());
    if (metrics.length === 0) return 100;

    const scoreMap = { good: 100, 'needs-improvement': 60, poor: 20 };
    const totalScore = metrics.reduce((sum, metric) => sum + scoreMap[metric.rating], 0);
    
    return Math.round(totalScore / metrics.length);
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;

    // LCP recommendations
    const lcp = metrics.get('LCP');
    if (lcp && lcp.rating !== 'good') {
      recommendations.push('Optimize Largest Contentful Paint by reducing image sizes and improving server response times');
    }

    // FID recommendations
    const fid = metrics.get('FID');
    if (fid && fid.rating !== 'good') {
      recommendations.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }

    // CLS recommendations
    const cls = metrics.get('CLS');
    if (cls && cls.rating !== 'good') {
      recommendations.push('Improve Cumulative Layout Shift by setting dimensions on images and avoiding dynamic content');
    }

    // Bundle recommendations
    if (this.bundleMetrics.failedLoads > 0) {
      recommendations.push('Some resources failed to load - check network connectivity and CDN configuration');
    }

    if (this.bundleMetrics.cacheHitRate < 0.8) {
      recommendations.push('Improve caching strategy to reduce bundle load times');
    }

    return recommendations;
  }

  /**
   * Export performance data
   */
  exportData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
      components: Object.fromEntries(this.componentMetrics),
      bundles: this.bundleMetrics,
      score: this.getPerformanceScore(),
      recommendations: this.getRecommendations()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    // Report every 30 seconds
    this.reportingInterval = setInterval(() => {
      this.reportPerformanceData();
    }, 30000);
  }

  /**
   * Report performance data to analytics
   */
  private reportToAnalytics(metric: PerformanceMetric): void {
    // In a real application, you would send this to your analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metric:', metric);
    }

    // Example: Send to Google Analytics 4
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'web_vitals', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating
      });
    }
  }

  /**
   * Send comprehensive performance report
   */
  private reportPerformanceData(): void {
    const report = {
      timestamp: Date.now(),
      score: this.getPerformanceScore(),
      metrics: Object.fromEntries(this.metrics),
      slowComponents: this.getSlowComponents(),
      recommendations: this.getRecommendations()
    };

    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example API call
      fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(error => {
        console.warn('Failed to report performance data:', error);
      });
    }
  }

  /**
   * Get components with poor performance
   */
  private getSlowComponents(): ComponentPerformance[] {
    return Array.from(this.componentMetrics.values())
      .filter(component => component.averageRenderTime > 16) // > 16ms is potentially problematic
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime);
  }

  /**
   * Rating functions for Web Vitals
   */
  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const trackRender = (renderTime: number) => {
    performanceMonitor.trackComponentRender(componentName, renderTime);
  };

  return { trackRender };
}

// Higher-order component for automatic performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  return function PerformanceTrackedComponent(props: P) {
    const startTime = performance.now();

    React.useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      performanceMonitor.trackComponentRender(displayName, renderTime);
    });

    return React.createElement(WrappedComponent, props);
  };
}

// Performance measurement utilities
export const performanceUtils = {
  // Measure function execution time
  measureFunction: <T extends any[], R>(
    fn: (...args: T) => R,
    name: string
  ) => {
    return (...args: T): R => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      console.log(`${name} execution time: ${end - start}ms`);
      return result;
    };
  },

  // Measure async function execution time
  measureAsyncFunction: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    name: string
  ) => {
    return async (...args: T): Promise<R> => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      
      console.log(`${name} execution time: ${end - start}ms`);
      return result;
    };
  },

  // Create performance mark
  mark: (name: string) => {
    if ('performance' in window) {
      performance.mark(name);
    }
  },

  // Measure between two marks
  measure: (name: string, startMark: string, endMark?: string) => {
    if ('performance' in window) {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`${name}: ${measure.duration}ms`);
      return measure.duration;
    }
    return 0;
  }
};

export default performanceMonitor;
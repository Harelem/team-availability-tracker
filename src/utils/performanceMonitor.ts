'use client';

// Enhanced Performance Monitoring for Team Availability Tracker
interface PerformanceMetrics {
  renderTime: number;
  memoizationHitRate: number;
  reRenderCount: number;
  calculationTime: number;
  cacheHitRate: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private renderCounts: Map<string, number> = new Map();
  private performance = typeof window !== 'undefined' ? window.performance : null;

  // Track component render
  trackRender(componentName: string, startTime: number): void {
    if (!this.performance) return;
    
    const endTime = this.performance.now();
    const renderTime = endTime - startTime;
    
    // Update render count
    const currentCount = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, currentCount + 1);
    
    // Store metrics
    const existingMetrics = this.metrics.get(componentName) || [];
    existingMetrics.push({
      renderTime,
      memoizationHitRate: 0, // To be updated by memoization tracking
      reRenderCount: currentCount + 1,
      calculationTime: 0, // To be updated by calculation tracking
      cacheHitRate: 0, // To be updated by cache tracking
      timestamp: Date.now()
    });
    
    // Keep only last 10 measurements
    if (existingMetrics.length > 10) {
      existingMetrics.shift();
    }
    
    this.metrics.set(componentName, existingMetrics);
    
    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (renderTime > 100) {
        console.warn(`⚠️ SLOW RENDER: ${componentName} took ${renderTime.toFixed(2)}ms (target: <100ms)`);
      } else if (renderTime > 50) {
        console.log(`🔄 ${componentName} render: ${renderTime.toFixed(2)}ms`);
      }
    }
  }

  // Track calculation performance
  trackCalculation(calculationName: string, startTime: number, isCacheHit: boolean = false): void {
    if (!this.performance) return;
    
    const calculationTime = this.performance.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      const cacheStatus = isCacheHit ? '(cached)' : '(calculated)';
      console.log(`🧮 ${calculationName}: ${calculationTime.toFixed(2)}ms ${cacheStatus}`);
    }
  }

  // Get performance summary
  getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [componentName, metrics] of this.metrics) {
      if (metrics.length === 0) continue;
      
      const latestMetrics = metrics[metrics.length - 1];
      const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
      
      summary[componentName] = {
        latestRenderTime: latestMetrics.renderTime,
        averageRenderTime: avgRenderTime,
        totalRenders: latestMetrics.reRenderCount,
        improvementStatus: avgRenderTime < 100 ? '✅ GOOD' : avgRenderTime < 200 ? '⚠️ SLOW' : '❌ CRITICAL',
        targetAchieved: avgRenderTime < 100
      };
    }
    
    return summary;
  }

  // Log performance report
  logPerformanceReport(): void {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('🚀 Performance Optimization Report');
    
    const summary = this.getPerformanceSummary();
    
    console.log('📊 Component Performance:');
    console.table(summary);
    
    // Calculate overall improvements
    const componentCount = Object.keys(summary).length;
    const optimizedComponents = Object.values(summary).filter((s: any) => s.targetAchieved).length;
    const optimizationRate = componentCount > 0 ? (optimizedComponents / componentCount) * 100 : 0;
    
    console.log(`\n🎯 Optimization Progress: ${optimizedComponents}/${componentCount} components under 100ms target`);
    console.log(`📈 Success Rate: ${optimizationRate.toFixed(1)}%`);
    
    if (optimizationRate >= 80) {
      console.log('🎉 EXCELLENT: Performance targets achieved!');
    } else if (optimizationRate >= 60) {
      console.log('✅ GOOD: Most components optimized, some improvements needed');
    } else {
      console.log('⚠️ NEEDS WORK: Several components need optimization');
    }
    
    console.groupEnd();
  }

  // Reset metrics
  reset(): void {
    this.metrics.clear();
    this.renderCounts.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for easy component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const startTime = performance?.now() || 0;
  
  return {
    trackRender: () => performanceMonitor.trackRender(componentName, startTime),
    trackCalculation: (calcName: string, calcStart: number, isCacheHit?: boolean) =>
      performanceMonitor.trackCalculation(calcName, calcStart, isCacheHit)
  };
};

// Development utility to log reports
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Log performance report every 30 seconds
  setInterval(() => {
    performanceMonitor.logPerformanceReport();
  }, 30000);
  
  // Global access for manual reporting
  (window as any).performanceReport = () => performanceMonitor.logPerformanceReport();
  
  console.log('🚀 Performance monitoring active. Run performanceReport() in console for manual report.');
}
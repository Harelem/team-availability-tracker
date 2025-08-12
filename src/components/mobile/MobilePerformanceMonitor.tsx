'use client';

import { useEffect, useState } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionDelay: number;
  memoryUsage?: number;
  networkSpeed?: 'fast' | 'slow' | 'offline';
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

interface MobilePerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  logMetrics?: boolean;
  showDebugInfo?: boolean;
}

export default function MobilePerformanceMonitor({
  onMetricsUpdate,
  logMetrics = false,
  showDebugInfo = false
}: MobilePerformanceMonitorProps) {
  const isMobile = useMobileDetection();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(showDebugInfo && process.env.NODE_ENV === 'development');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let startTime = performance.now();
    
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const loadTime = navigation?.loadEventEnd - navigation?.fetchStart || 0;
      const renderTime = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
      
      // Measure interaction delay (simplified)
      const interactionStart = performance.now();
      setTimeout(() => {
        const interactionDelay = performance.now() - interactionStart;
        
        const newMetrics: PerformanceMetrics = {
          loadTime: Math.round(loadTime),
          renderTime: Math.round(renderTime),
          interactionDelay: Math.round(interactionDelay),
          deviceType: isMobile ? 'mobile' : 'desktop',
          networkSpeed: getNetworkSpeed()
        };

        // Add memory usage if available
        if ('memory' in performance) {
          const memInfo = (performance as any).memory;
          newMetrics.memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
        }

        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);

        if (logMetrics) {
          console.group('📱 Mobile Performance Metrics');
          console.log('Load Time:', newMetrics.loadTime + 'ms');
          console.log('First Paint:', newMetrics.renderTime + 'ms');
          console.log('Interaction Delay:', newMetrics.interactionDelay + 'ms');
          console.log('Device Type:', newMetrics.deviceType);
          console.log('Network Speed:', newMetrics.networkSpeed);
          if (newMetrics.memoryUsage) {
            console.log('Memory Usage:', newMetrics.memoryUsage + 'MB');
          }
          console.groupEnd();
        }
      }, 100);
    };

    const getNetworkSpeed = (): 'fast' | 'slow' | 'offline' => {
      if (!navigator.onLine) return 'offline';
      
      // Check Network Information API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType === '4g') return 'fast';
        if (connection.effectiveType === '3g') return 'slow';
        if (connection.effectiveType === '2g') return 'slow';
      }
      
      // Fallback: estimate based on load time
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation?.loadEventEnd - navigation?.fetchStart || 0;
      return loadTime < 2000 ? 'fast' : 'slow';
    };

    // Wait for page load to complete
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, [isMobile, onMetricsUpdate, logMetrics]);

  // Monitor Core Web Vitals
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (logMetrics) {
          // Use duration for timing entries, or startTime for other entries
          const value = ('duration' in entry && typeof entry.duration === 'number') 
            ? entry.duration 
            : entry.startTime;
          console.log(`📊 ${entry.name}:`, Math.round(value) + 'ms');
        }
      }
    });

    try {
      // Observe Core Web Vitals
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    return () => observer.disconnect();
  }, [logMetrics]);

  if (!isVisible || !metrics) return null;

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'text-green-600';
    if (value <= thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-20 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">📱 Performance</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-300 hover:text-white ml-2"
          aria-label="Close performance monitor"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Load:</span>
          <span className={getPerformanceColor(metrics.loadTime, [1000, 2500])}>
            {metrics.loadTime}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Paint:</span>
          <span className={getPerformanceColor(metrics.renderTime, [1000, 2500])}>
            {metrics.renderTime}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Interaction:</span>
          <span className={getPerformanceColor(metrics.interactionDelay, [50, 100])}>
            {metrics.interactionDelay}ms
          </span>
        </div>
        
        {metrics.memoryUsage && (
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={getPerformanceColor(metrics.memoryUsage, [50, 100])}>
              {metrics.memoryUsage}MB
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>Network:</span>
          <span className={
            metrics.networkSpeed === 'fast' ? 'text-green-400' :
            metrics.networkSpeed === 'slow' ? 'text-yellow-400' : 'text-red-400'
          }>
            {metrics.networkSpeed}
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook for using performance metrics in components
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const logPerformance = (label: string, startTime?: number) => {
    const endTime = performance.now();
    const duration = startTime ? endTime - startTime : endTime;
    
    console.log(`⚡ ${label}: ${Math.round(duration)}ms`);
    return duration;
  };

  const measureComponent = (name: string) => {
    const startTime = performance.now();
    
    return {
      finish: () => logPerformance(`${name} Component`, startTime)
    };
  };

  return {
    metrics,
    setMetrics,
    logPerformance,
    measureComponent
  };
};

// Performance optimization utilities
export const MobilePerformanceUtils = {
  // Preload critical resources
  preloadResource: (href: string, as: 'script' | 'style' | 'image' | 'font') => {
    if (typeof document === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (as === 'font') link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  },

  // Lazy load images
  lazyLoadImages: () => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  },

  // Optimize scroll performance
  optimizeScroll: (element?: Element) => {
    const target = (element || document.documentElement) as HTMLElement;
    
    if ('scrollBehavior' in target.style) {
      target.style.scrollBehavior = 'smooth';
    }
    
    // Enable hardware acceleration
    if ('transform' in target.style) {
      target.style.transform = 'translateZ(0)';
    }
  },

  // Reduce motion for performance
  reduceMotion: () => {
    if (typeof window === 'undefined') return false;
    
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
};
/**
 * Performance Monitoring Script
 * Initializes performance monitoring and Core Web Vitals tracking
 */

(function() {
  'use strict';
  
  // Initialize performance monitoring
  if (typeof window !== 'undefined' && 'performance' in window) {
    try {
      // Mark the app as loaded
      performance.mark('app-loaded');

      // Monitor Core Web Vitals
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        new PerformanceObserver(function(list) {
          list.getEntries().forEach(function(entry) {
            console.log('LCP:', entry.startTime);
            // Send to analytics if needed
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay
        new PerformanceObserver(function(list) {
          list.getEntries().forEach(function(entry) {
            console.log('FID:', entry.processingStart - entry.startTime);
            // Send to analytics if needed
          });
        }).observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift
        new PerformanceObserver(function(list) {
          var clsValue = 0;
          list.getEntries().forEach(function(entry) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          console.log('CLS:', clsValue);
          // Send to analytics if needed
        }).observe({ type: 'layout-shift', buffered: true });
      }

      // Monitor navigation timing
      window.addEventListener('load', function() {
        setTimeout(function() {
          var navTiming = performance.getEntriesByType('navigation')[0];
          if (navTiming) {
            var loadTime = navTiming.loadEventEnd - navTiming.navigationStart;
            console.log('Page load time:', loadTime + 'ms');
            
            // Track key metrics
            var metrics = {
              dns: navTiming.domainLookupEnd - navTiming.domainLookupStart,
              tcp: navTiming.connectEnd - navTiming.connectStart,
              ssl: navTiming.connectEnd - navTiming.secureConnectionStart,
              ttfb: navTiming.responseStart - navTiming.navigationStart,
              dom: navTiming.domInteractive - navTiming.responseStart,
              load: loadTime
            };
            
            console.log('Performance metrics:', metrics);
            // Send to analytics if needed
          }
        }, 0);
      });

      // Monitor resource timing
      if (window.PerformanceResourceTiming) {
        new PerformanceObserver(function(list) {
          list.getEntries().forEach(function(entry) {
            // Log slow resources (>2s)
            if (entry.duration > 2000) {
              console.warn('Slow resource:', entry.name, entry.duration + 'ms');
            }
          });
        }).observe({ type: 'resource', buffered: true });
      }

    } catch (error) {
      console.error('Performance monitoring initialization error:', error);
    }
  }
})();
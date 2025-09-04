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
        // Largest Contentful Paint (with error handling)
        try {
          new PerformanceObserver(function(list) {
            list.getEntries().forEach(function(entry) {
              // Only log LCP in development mode or if it's poor (> 2500ms)
            var isDevelopment = typeof window !== 'undefined' && 
                               (window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' ||
                                window.location.port !== '');
            // LCP logging disabled for performance
              // Send to analytics if needed
            });
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          var isDevelopment = typeof window !== 'undefined' && 
                             (window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' ||
                              window.location.port !== '');
          if (isDevelopment) {
            // LCP monitoring not supported
          }
        }

        // First Input Delay (with error handling)
        try {
          new PerformanceObserver(function(list) {
            list.getEntries().forEach(function(entry) {
              // Only log FID in development mode or if it's poor (> 100ms)
            var fidValue = entry.processingStart - entry.startTime;
            var isDevelopment = typeof window !== 'undefined' && 
                               (window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' ||
                                window.location.port !== '');
            // FID logging disabled for performance
              // Send to analytics if needed
            });
          }).observe({ type: 'first-input', buffered: true });
        } catch (e) {
          var isDevelopment = typeof window !== 'undefined' && 
                             (window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' ||
                              window.location.port !== '');
          if (isDevelopment) {
            // FID monitoring not supported
          }
        }

        // Cumulative Layout Shift (with proper support check)
        try {
          // Check if layout-shift is supported before observing
          if (typeof PerformanceObserver !== 'undefined' && 
              PerformanceObserver.supportedEntryTypes && 
              PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
            new PerformanceObserver(function(list) {
              var clsValue = 0;
              list.getEntries().forEach(function(entry) {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              });
              // Only log significant CLS changes (> 0.1)
              if (clsValue > 0.1) {
                // CLS logging disabled for performance
              }
              // Send to analytics if needed
            }).observe({ type: 'layout-shift', buffered: true });
          } else {
            // Layout shift monitoring not supported - skip silently
            // Layout shift monitoring not supported
          }
        } catch (e) {
          // Silently handle any other PerformanceObserver errors
          // Performance monitoring error (logging disabled)
        }
      }

      // Monitor navigation timing
      window.addEventListener('load', function() {
        setTimeout(function() {
          var navTiming = performance.getEntriesByType('navigation')[0];
          if (navTiming) {
            // Helper function to safely calculate timing differences
            function safeTiming(end, start) {
              var result = end - start;
              return isNaN(result) || result < 0 ? 0 : Math.round(result);
            }
            
            var loadTime = safeTiming(navTiming.loadEventEnd, navTiming.navigationStart);
            // Only log performance metrics in development mode or if load time is slow (> 3000ms)
            var isDevelopment = typeof window !== 'undefined' && 
                               (window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' ||
                                window.location.port !== '');
            if (isDevelopment || loadTime > 3000) {
              // Page load time logging disabled
              
              // Track key metrics with safe calculations
              var metrics = {
                dns: safeTiming(navTiming.domainLookupEnd, navTiming.domainLookupStart),
                tcp: safeTiming(navTiming.connectEnd, navTiming.connectStart),
                ssl: navTiming.secureConnectionStart > 0 ? safeTiming(navTiming.connectEnd, navTiming.secureConnectionStart) : 0,
                ttfb: safeTiming(navTiming.responseStart, navTiming.requestStart),
                dom: safeTiming(navTiming.domInteractive, navTiming.responseStart),
                load: loadTime
              };
              
              // Performance metrics logging disabled
            }
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
              // Slow resource warning disabled
            }
          });
        }).observe({ type: 'resource', buffered: true });
      }

    } catch (error) {
      // Performance monitoring initialization error (logging disabled)
    }
  }
})();
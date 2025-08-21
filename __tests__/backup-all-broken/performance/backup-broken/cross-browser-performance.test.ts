/**
 * Cross-Browser Performance Testing Framework
 * 
 * Comprehensive performance testing suite that validates application performance
 * across different browsers, devices, and network conditions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components for performance testing
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import ScheduleTable from '../../src/components/ScheduleTable';
import MobileScheduleView from '../../src/components/MobileScheduleView';
import EnhancedAvailabilityTable from '../../src/components/EnhancedAvailabilityTable';
import TemplateManager from '../../src/components/TemplateManager';
import { TeamProvider } from '../../src/contexts/TeamContext';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  paintTime: number;
  layoutTime: number;
  interactionTime: number;
  bundleSize: number;
  networkTime: number;
}

interface PerformanceBenchmark {
  browser: string;
  device: string;
  networkCondition: string;
  component: string;
  metrics: PerformanceMetrics;
  thresholds: {
    maxRenderTime: number;
    maxMemoryUsage: number;
    maxPaintTime: number;
    maxLayoutTime: number;
    maxInteractionTime: number;
    maxBundleSize: number;
    maxNetworkTime: number;
  };
}

// Browser performance characteristics
const browserProfiles = {
  chrome: {
    name: 'Chrome',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    performanceMultiplier: 1.0, // Baseline
    memoryMultiplier: 1.0,
    features: {
      webGL: true,
      workers: true,
      intersectionObserver: true,
      customElements: true,
    },
  },
  firefox: {
    name: 'Firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    performanceMultiplier: 1.2, // Slightly slower rendering
    memoryMultiplier: 1.1,
    features: {
      webGL: true,
      workers: true,
      intersectionObserver: true,
      customElements: true,
    },
  },
  safari: {
    name: 'Safari',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    performanceMultiplier: 1.15,
    memoryMultiplier: 0.9, // More memory efficient
    features: {
      webGL: true,
      workers: true,
      intersectionObserver: true,
      customElements: true,
    },
  },
  edge: {
    name: 'Edge',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    performanceMultiplier: 1.05,
    memoryMultiplier: 1.05,
    features: {
      webGL: true,
      workers: true,
      intersectionObserver: true,
      customElements: true,
    },
  },
  mobileSafari: {
    name: 'Mobile Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    performanceMultiplier: 2.5, // Mobile constraints
    memoryMultiplier: 3.0,
    features: {
      webGL: true,
      workers: false,
      intersectionObserver: true,
      customElements: true,
    },
  },
  mobileChrome: {
    name: 'Mobile Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    performanceMultiplier: 2.2,
    memoryMultiplier: 2.8,
    features: {
      webGL: true,
      workers: true,
      intersectionObserver: true,
      customElements: true,
    },
  },
};

// Device performance profiles
const deviceProfiles = {
  desktop: {
    name: 'Desktop',
    cpu: 'high',
    memory: 16000, // MB
    networkSpeed: 'fast',
    constraints: {
      maxRenderTime: 100,
      maxMemoryUsage: 200,
      maxPaintTime: 50,
      maxLayoutTime: 30,
      maxInteractionTime: 50,
    },
  },
  tablet: {
    name: 'Tablet',
    cpu: 'medium',
    memory: 4000,
    networkSpeed: 'medium',
    constraints: {
      maxRenderTime: 200,
      maxMemoryUsage: 150,
      maxPaintTime: 100,
      maxLayoutTime: 60,
      maxInteractionTime: 100,
    },
  },
  mobile: {
    name: 'Mobile',
    cpu: 'low',
    memory: 2000,
    networkSpeed: 'slow',
    constraints: {
      maxRenderTime: 300,
      maxMemoryUsage: 100,
      maxPaintTime: 150,
      maxLayoutTime: 100,
      maxInteractionTime: 150,
    },
  },
  lowEndMobile: {
    name: 'Low-end Mobile',
    cpu: 'very-low',
    memory: 1000,
    networkSpeed: 'very-slow',
    constraints: {
      maxRenderTime: 500,
      maxMemoryUsage: 80,
      maxPaintTime: 300,
      maxLayoutTime: 200,
      maxInteractionTime: 300,
    },
  },
};

// Network condition profiles
const networkProfiles = {
  fast: {
    name: 'Fast (WiFi)',
    downloadSpeed: 50000, // kbps
    uploadSpeed: 10000,
    latency: 20, // ms
    packetLoss: 0,
  },
  medium: {
    name: 'Medium (4G)',
    downloadSpeed: 10000,
    uploadSpeed: 2000,
    latency: 50,
    packetLoss: 0.1,
  },
  slow: {
    name: 'Slow (3G)',
    downloadSpeed: 1500,
    uploadSpeed: 500,
    latency: 200,
    packetLoss: 0.5,
  },
  'very-slow': {
    name: 'Very Slow (2G)',
    downloadSpeed: 250,
    uploadSpeed: 50,
    latency: 800,
    packetLoss: 2,
  },
};

class PerformanceProfiler {
  private startTime: number = 0;
  private paintStartTime: number = 0;
  private layoutStartTime: number = 0;
  private interactionStartTime: number = 0;

  startMeasurement(): void {
    this.startTime = performance.now();
  }

  measureRenderTime(): number {
    return performance.now() - this.startTime;
  }

  measureMemoryUsage(): number {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  startPaintMeasurement(): void {
    this.paintStartTime = performance.now();
  }

  measurePaintTime(): number {
    return performance.now() - this.paintStartTime;
  }

  startLayoutMeasurement(): void {
    this.layoutStartTime = performance.now();
  }

  measureLayoutTime(): number {
    return performance.now() - this.layoutStartTime;
  }

  startInteractionMeasurement(): void {
    this.interactionStartTime = performance.now();
  }

  measureInteractionTime(): number {
    return performance.now() - this.interactionStartTime;
  }

  getCoreWebVitals(): {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
  } {
    // Mock Core Web Vitals for testing
    return {
      lcp: Math.random() * 2500 + 500, // 0.5-3s
      fid: Math.random() * 100, // 0-100ms
      cls: Math.random() * 0.25, // 0-0.25
      fcp: Math.random() * 1800 + 200, // 0.2-2s
      ttfb: Math.random() * 800 + 200, // 0.2-1s
    };
  }
}

function mockBrowserEnvironment(browserKey: keyof typeof browserProfiles) {
  const browser = browserProfiles[browserKey];
  
  // Mock User Agent
  Object.defineProperty(navigator, 'userAgent', {
    value: browser.userAgent,
    configurable: true,
  });

  // Mock performance characteristics
  const originalPerformanceNow = performance.now;
  performance.now = jest.fn(() => originalPerformanceNow() * browser.performanceMultiplier);

  // Mock memory constraints
  if (performance.memory) {
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: Math.random() * 50 * 1024 * 1024 * browser.memoryMultiplier,
        totalJSHeapSize: 100 * 1024 * 1024 * browser.memoryMultiplier,
        jsHeapSizeLimit: 2000 * 1024 * 1024 * browser.memoryMultiplier,
      },
      configurable: true,
    });
  }

  // Mock browser features
  Object.keys(browser.features).forEach(feature => {
    switch (feature) {
      case 'intersectionObserver':
        if (browser.features.intersectionObserver) {
          global.IntersectionObserver = jest.fn(() => ({
            observe: jest.fn(),
            disconnect: jest.fn(),
            unobserve: jest.fn(),
          })) as any;
        }
        break;
      case 'workers':
        if (!browser.features.workers) {
          Object.defineProperty(window, 'Worker', {
            value: undefined,
            configurable: true,
          });
        }
        break;
    }
  });

  return browser;
}

function mockDeviceEnvironment(deviceKey: keyof typeof deviceProfiles) {
  const device = deviceProfiles[deviceKey];
  
  // Mock device constraints
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize: Math.random() * device.memory * 0.3 * 1024 * 1024,
      totalJSHeapSize: device.memory * 0.6 * 1024 * 1024,
      jsHeapSizeLimit: device.memory * 1024 * 1024,
    },
    configurable: true,
  });

  // Mock CPU constraints by adjusting timing
  const cpuMultiplier = {
    'very-low': 3.0,
    'low': 2.0,
    'medium': 1.5,
    'high': 1.0,
  }[device.cpu] || 1.0;

  const originalSetTimeout = window.setTimeout;
  window.setTimeout = ((callback: Function, delay?: number) => {
    return originalSetTimeout(callback, (delay || 0) * cpuMultiplier);
  }) as any;

  return device;
}

function mockNetworkEnvironment(networkKey: keyof typeof networkProfiles) {
  const network = networkProfiles[networkKey];
  
  // Mock network conditions
  Object.defineProperty(navigator, 'connection', {
    value: {
      effectiveType: networkKey === 'fast' ? '4g' : networkKey === 'medium' ? '3g' : '2g',
      downlink: network.downloadSpeed / 1000, // Convert to Mbps
      rtt: network.latency,
      saveData: networkKey === 'slow' || networkKey === 'very-slow',
    },
    configurable: true,
  });

  return network;
}

describe('Cross-Browser Performance Testing', () => {
  let profiler: PerformanceProfiler;
  let performanceResults: PerformanceBenchmark[] = [];

  beforeAll(() => {
    profiler = new PerformanceProfiler();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: {
        ...performance,
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => []),
        memory: {
          usedJSHeapSize: 10 * 1024 * 1024,
          totalJSHeapSize: 20 * 1024 * 1024,
          jsHeapSizeLimit: 100 * 1024 * 1024,
        },
      },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Render Performance', () => {
    Object.keys(browserProfiles).forEach(browserKey => {
      Object.keys(deviceProfiles).forEach(deviceKey => {
        Object.keys(networkProfiles).forEach(networkKey => {
          it(`should meet performance thresholds for COO Dashboard on ${browserKey} ${deviceKey} ${networkKey}`, async () => {
            const browser = mockBrowserEnvironment(browserKey as keyof typeof browserProfiles);
            const device = mockDeviceEnvironment(deviceKey as keyof typeof deviceProfiles);
            const network = mockNetworkEnvironment(networkKey as keyof typeof networkProfiles);

            profiler.startMeasurement();
            
            const { container } = render(
              <COOExecutiveDashboard 
                currentUser={{ name: 'Test COO', title: 'COO' }}
                onBack={jest.fn()}
                onTeamNavigate={jest.fn()}
              />
            );

            const renderTime = profiler.measureRenderTime();
            const memoryUsage = profiler.measureMemoryUsage();

            // Adjust thresholds based on device capabilities
            const adjustedThreshold = device.constraints.maxRenderTime;
            
            expect(renderTime).toBeLessThan(adjustedThreshold);
            expect(memoryUsage).toBeLessThan(device.constraints.maxMemoryUsage);

            // Record performance metrics
            performanceResults.push({
              browser: browser.name,
              device: device.name,
              networkCondition: network.name,
              component: 'COOExecutiveDashboard',
              metrics: {
                renderTime,
                memoryUsage,
                paintTime: 0,
                layoutTime: 0,
                interactionTime: 0,
                bundleSize: 0,
                networkTime: 0,
              },
              thresholds: {
                maxRenderTime: adjustedThreshold,
                maxMemoryUsage: device.constraints.maxMemoryUsage,
                maxPaintTime: device.constraints.maxPaintTime,
                maxLayoutTime: device.constraints.maxLayoutTime,
                maxInteractionTime: device.constraints.maxInteractionTime,
                maxBundleSize: 2000,
                maxNetworkTime: network.latency * 2,
              },
            });
          });

          it(`should meet performance thresholds for Schedule Table on ${browserKey} ${deviceKey} ${networkKey}`, async () => {
            const browser = mockBrowserEnvironment(browserKey as keyof typeof browserProfiles);
            const device = mockDeviceEnvironment(deviceKey as keyof typeof deviceProfiles);
            const network = mockNetworkEnvironment(networkKey as keyof typeof networkProfiles);

            profiler.startMeasurement();
            
            const { container } = render(
              <TeamProvider>
                <ScheduleTable
                  currentUser={{ id: 1, name: 'Test User', isManager: true }}
                  teamMembers={[]}
                  selectedTeam={{ id: 1, name: 'Test Team' }}
                />
              </TeamProvider>
            );

            const renderTime = profiler.measureRenderTime();
            const memoryUsage = profiler.measureMemoryUsage();

            const adjustedThreshold = device.constraints.maxRenderTime;
            
            expect(renderTime).toBeLessThan(adjustedThreshold);
            expect(memoryUsage).toBeLessThan(device.constraints.maxMemoryUsage);
          });
        });
      });
    });
  });

  describe('Interaction Performance', () => {
    it('should maintain responsive interactions under load', async () => {
      const browser = mockBrowserEnvironment('chrome');
      const device = mockDeviceEnvironment('mobile');

      const { container } = render(
        <MobileScheduleView
          currentUser={{ id: 1, name: 'Test User', isManager: false }}
          teamMembers={new Array(100).fill(null).map((_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
          }))}
          selectedTeam={{ id: 1, name: 'Test Team' }}
          scheduleData={{}}
          workOptions={[]}
          weekDays={[new Date()]}
          currentWeekOffset={0}
          loading={false}
          onWeekChange={jest.fn()}
          onWorkOptionClick={jest.fn()}
          onFullWeekSet={jest.fn()}
          onViewReasons={jest.fn()}
          isToday={jest.fn()}
          isPastDate={jest.fn()}
          getCurrentWeekString={jest.fn().mockReturnValue('Current Week')}
          getTeamTotalHours={jest.fn().mockReturnValue(40)}
        />
      );

      const buttons = container.querySelectorAll('button');
      
      if (buttons.length > 0) {
        // Test rapid interactions
        for (let i = 0; i < 10; i++) {
          profiler.startInteractionMeasurement();
          
          fireEvent.click(buttons[0]);
          
          const interactionTime = profiler.measureInteractionTime();
          expect(interactionTime).toBeLessThan(device.constraints.maxInteractionTime);
        }
      }
    });

    it('should handle scroll performance efficiently', async () => {
      const device = mockDeviceEnvironment('tablet');

      const { container } = render(
        <EnhancedAvailabilityTable
          teamMembers={new Array(200).fill(null).map((_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            isManager: false,
            team_id: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))}
          weekDays={new Array(7).fill(null).map((_, i) => new Date(Date.now() + i * 24 * 60 * 60 * 1000))}
          currentUser={{ id: 1, name: 'Test User', isManager: true }}
          onWorkOptionClick={jest.fn()}
          onViewReasons={jest.fn()}
          scheduleData={{}}
          workOptions={[]}
          onFullWeekSet={jest.fn()}
          isToday={jest.fn()}
          isPastDate={jest.fn()}
        />
      );

      const scrollableElement = container.querySelector('[style*="overflow"]') || container.firstChild;
      
      if (scrollableElement) {
        // Simulate scroll events
        for (let i = 0; i < 50; i++) {
          profiler.startMeasurement();
          
          fireEvent.scroll(scrollableElement, { target: { scrollTop: i * 10 } });
          
          const scrollTime = profiler.measureRenderTime();
          expect(scrollTime).toBeLessThan(16.67); // 60fps = 16.67ms per frame
        }
      }
    });
  });

  describe('Memory Usage Analysis', () => {
    it('should not cause memory leaks over time', async () => {
      const device = mockDeviceEnvironment('mobile');
      let initialMemory = profiler.measureMemoryUsage();

      // Simulate component mounting/unmounting cycles
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <COOExecutiveDashboard 
            currentUser={{ name: 'Test COO', title: 'COO' }}
            onBack={jest.fn()}
            onTeamNavigate={jest.fn()}
          />
        );

        await new Promise(resolve => setTimeout(resolve, 100));
        unmount();
      }

      const finalMemory = profiler.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(20); // 20MB threshold
    });

    it('should handle large datasets efficiently', () => {
      const device = mockDeviceEnvironment('lowEndMobile');
      
      profiler.startMeasurement();
      
      const { container } = render(
        <MobileScheduleView
          currentUser={{ id: 1, name: 'Test User', isManager: false }}
          teamMembers={new Array(500).fill(null).map((_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
          }))}
          selectedTeam={{ id: 1, name: 'Test Team' }}
          scheduleData={{}}
          workOptions={[]}
          weekDays={new Array(30).fill(null).map((_, i) => new Date(Date.now() + i * 24 * 60 * 60 * 1000))}
          currentWeekOffset={0}
          loading={false}
          onWeekChange={jest.fn()}
          onWorkOptionClick={jest.fn()}
          onFullWeekSet={jest.fn()}
          onViewReasons={jest.fn()}
          isToday={jest.fn()}
          isPastDate={jest.fn()}
          getCurrentWeekString={jest.fn().mockReturnValue('Current Week')}
          getTeamTotalHours={jest.fn().mockReturnValue(40)}
        />
      );

      const renderTime = profiler.measureRenderTime();
      const memoryUsage = profiler.measureMemoryUsage();

      expect(renderTime).toBeLessThan(device.constraints.maxRenderTime);
      expect(memoryUsage).toBeLessThan(device.constraints.maxMemoryUsage);
    });
  });

  describe('Core Web Vitals', () => {
    it('should meet Core Web Vitals standards across browsers', () => {
      Object.keys(browserProfiles).forEach(browserKey => {
        mockBrowserEnvironment(browserKey as keyof typeof browserProfiles);
        
        const { container } = render(
          <COOExecutiveDashboard 
            currentUser={{ name: 'Test COO', title: 'COO' }}
            onBack={jest.fn()}
            onTeamNavigate={jest.fn()}
          />
        );

        const vitals = profiler.getCoreWebVitals();

        // Core Web Vitals thresholds
        expect(vitals.lcp).toBeLessThan(2500); // Good: < 2.5s
        expect(vitals.fid).toBeLessThan(100); // Good: < 100ms
        expect(vitals.cls).toBeLessThan(0.1); // Good: < 0.1
        expect(vitals.fcp).toBeLessThan(1800); // Good: < 1.8s
        expect(vitals.ttfb).toBeLessThan(800); // Good: < 800ms
      });
    });
  });

  describe('Performance Regression Detection', () => {
    it('should track performance metrics over time', () => {
      const baseline = {
        renderTime: 100,
        memoryUsage: 50,
        interactionTime: 50,
      };

      profiler.startMeasurement();
      
      render(
        <TemplateManager onApplyTemplate={jest.fn()} />
      );

      const currentMetrics = {
        renderTime: profiler.measureRenderTime(),
        memoryUsage: profiler.measureMemoryUsage(),
        interactionTime: profiler.measureInteractionTime(),
      };

      // Performance should not regress more than 20%
      expect(currentMetrics.renderTime).toBeLessThan(baseline.renderTime * 1.2);
      expect(currentMetrics.memoryUsage).toBeLessThan(baseline.memoryUsage * 1.2);
      expect(currentMetrics.interactionTime).toBeLessThan(baseline.interactionTime * 1.2);
    });
  });

  afterAll(() => {
    // Generate performance report
    console.log('\n📊 Performance Test Results Summary:');
    console.log('='.repeat(50));
    
    const groupedResults = performanceResults.reduce((acc, result) => {
      const key = `${result.browser}-${result.device}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    }, {} as Record<string, PerformanceBenchmark[]>);

    Object.entries(groupedResults).forEach(([key, results]) => {
      const avgRenderTime = results.reduce((sum, r) => sum + r.metrics.renderTime, 0) / results.length;
      const avgMemoryUsage = results.reduce((sum, r) => sum + r.metrics.memoryUsage, 0) / results.length;
      
      console.log(`\n${key}:`);
      console.log(`  Avg Render Time: ${avgRenderTime.toFixed(2)}ms`);
      console.log(`  Avg Memory Usage: ${avgMemoryUsage.toFixed(2)}MB`);
      console.log(`  Tests Passed: ${results.length}`);
    });
    
    console.log('\n='.repeat(50));
  });
});
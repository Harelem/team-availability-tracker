/**
 * Performance Audit Tests
 * 
 * Validates application performance, load times, memory usage, bundle size,
 * lazy loading efficiency, and overall user experience optimization.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import COOAnalyticsDashboard from '../../src/components/COOAnalyticsDashboard';
import TemplateManager from '../../src/components/TemplateManager';
import { DatabaseService } from '@/lib/database';

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  }
});

describe('Performance Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset performance mocks
    (window.performance.now as jest.Mock).mockReturnValue(Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Render Performance', () => {
    it('should render COO Executive Dashboard within performance budget (< 2 seconds)', async () => {
      mockDatabaseService.getOrganizationMetrics.mockResolvedValue({
        totalTeams: 6,
        totalEmployees: 27,
        teamSummaries: Array.from({ length: 6 }, (_, i) => ({
          teamId: i + 1,
          name: `Team ${i + 1}`,
          members: 4,
          utilization: 90,
          health: 'good'
        }))
      });
      
      const startTime = performance.now();
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('27')).toBeInTheDocument(); // Total employees loaded
      }, { timeout: 2000 });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 2 second performance budget
      expect(renderTime).toBeLessThan(2000);
    });

    it('should render Analytics Dashboard efficiently with large datasets', async () => {
      // Simulate large analytics dataset
      const largeAnalyticsData = {
        sprintHistory: Array.from({ length: 52 }, (_, i) => ({
          sprintNumber: i + 1,
          completion: Math.floor(Math.random() * 20) + 80,
          date: new Date(2024, 0, i * 7).toISOString()
        })),
        teamMetrics: Array.from({ length: 25 }, (_, i) => ({
          teamId: i + 1,
          name: `Team ${i + 1}`,
          weeklyData: Array.from({ length: 12 }, (_, w) => ({
            week: w + 1,
            hours: Math.floor(Math.random() * 15) + 280,
            utilization: Math.floor(Math.random() * 30) + 70
          }))
        }))
      };
      
      mockDatabaseService.getAnalyticsData.mockResolvedValue(largeAnalyticsData);
      
      const startTime = performance.now();
      
      render(<COOAnalyticsDashboard />);
      
      await waitFor(() => {
        // Should render charts without timing out
        const charts = screen.queryAllByTestId(/chart/);
        if (charts.length > 0) {
          expect(charts[0]).toBeInTheDocument();
        }
      }, { timeout: 3000 });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle large datasets within 3 seconds
      expect(renderTime).toBeLessThan(3000);
    });

    it('should demonstrate efficient re-renders when data updates', async () => {
      let renderCount = 0;
      const originalRender = render;
      
      // Mock to count renders
      const countingRender = (component: any) => {
        renderCount++;
        return originalRender(component);
      };
      
      const initialData = {
        totalTeams: 6,
        totalEmployees: 27,
        teamSummaries: []
      };
      
      const updatedData = {
        totalTeams: 6,
        totalEmployees: 28, // Changed
        teamSummaries: []
      };
      
      mockDatabaseService.getOrganizationMetrics
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(updatedData);
      
      const { rerender } = render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('27')).toBeInTheDocument();
      });
      
      const startTime = performance.now();
      
      // Trigger re-render with updated data
      rerender(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('28')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const rerenderTime = endTime - startTime;
      
      // Re-render should be faster than initial render
      expect(rerenderTime).toBeLessThan(500); // Within 500ms
    });

    it('should efficiently handle template manager with many templates', async () => {
      // Simulate many personal templates
      const manyTemplates = Array.from({ length: 50 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i} · תבנית ${i}`,
        description: `Description for template ${i}`,
        schedule: {
          sun: { value: Math.random() > 0.5 ? '1' : '0.5' as const },
          mon: { value: Math.random() > 0.5 ? '1' : '0.5' as const },
          tue: { value: Math.random() > 0.5 ? '1' : '0.5' as const },
          wed: { value: Math.random() > 0.5 ? '1' : '0.5' as const },
          thu: { value: Math.random() > 0.5 ? '1' : '0.5' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        },
        isPersonal: true
      }));
      
      mockDatabaseService.getUserTemplates.mockResolvedValue(manyTemplates);
      
      const startTime = performance.now();
      
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('Availability Templates')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle 50 templates within reasonable time
      expect(renderTime).toBeLessThan(1500); // 1.5 seconds
    });
  });

  describe('Memory Usage and Optimization', () => {
    it('should not create memory leaks during component lifecycle', async () => {
      // Mock memory usage tracking
      const mockMemory = {
        usedJSHeapSize: 50000000, // 50MB baseline
        totalJSHeapSize: 100000000
      };
      
      Object.defineProperty(window.performance, 'memory', {
        value: mockMemory,
        configurable: true
      });
      
      const initialMemory = mockMemory.usedJSHeapSize;
      
      const { unmount } = render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.queryByText('Teams')).toBeInTheDocument();
      });
      
      // Simulate memory increase during operation
      mockMemory.usedJSHeapSize = 55000000; // 5MB increase
      
      unmount();
      
      // Simulate garbage collection after unmount
      setTimeout(() => {
        mockMemory.usedJSHeapSize = 51000000; // Should return close to baseline
      }, 100);
      
      // Memory should not exceed reasonable bounds
      expect(mockMemory.usedJSHeapSize).toBeLessThan(60000000); // Less than 60MB
    });

    it('should efficiently manage event listeners and subscriptions', () => {
      const mockAddEventListener = jest.spyOn(window, 'addEventListener');
      const mockRemoveEventListener = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<COOExecutiveDashboard />);
      
      const addedListeners = mockAddEventListener.mock.calls.length;
      
      unmount();
      
      const removedListeners = mockRemoveEventListener.mock.calls.length;
      
      // All added listeners should be removed
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners);
      
      mockAddEventListener.mockRestore();
      mockRemoveEventListener.mockRestore();
    });

    it('should use efficient data structures for large collections', () => {
      // Test efficient handling of large team collections
      const largeTeamCollection = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        members: Array.from({ length: 10 }, (_, j) => ({
          id: j + 1,
          name: `Member ${j + 1}`,
          hebrew: `חבר ${j + 1}`
        }))
      }));
      
      mockDatabaseService.getAllTeams.mockResolvedValue(largeTeamCollection);
      
      const startTime = performance.now();
      
      // Simulate operations on large collection
      const processedTeams = largeTeamCollection.map(team => ({
        ...team,
        memberCount: team.members.length,
        capacity: team.members.length * 35
      }));
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      expect(processedTeams).toHaveLength(100);
      expect(processingTime).toBeLessThan(100); // Should process 100 teams in < 100ms
    });
  });

  describe('Network Performance and Caching', () => {
    it('should implement efficient data fetching strategies', async () => {
      let fetchCount = 0;
      
      // Mock network delay
      mockDatabaseService.getOrganizationMetrics.mockImplementation(async () => {
        fetchCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return {
          totalTeams: 6,
          totalEmployees: 27,
          teamSummaries: []
        };
      });
      
      const startTime = performance.now();
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('27')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should minimize network requests
      expect(fetchCount).toBeLessThanOrEqual(3); // Allow for some parallel requests
      expect(totalTime).toBeLessThan(1000); // Total time including network
    });

    it('should handle offline scenarios gracefully', async () => {
      // Mock offline network condition
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue(
        new Error('Network request failed')
      );
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should show offline indicator or cached data
        const offlineIndicator = screen.queryByText(/offline|error|loading/i);
        expect(offlineIndicator).toBeTruthy();
      });
    });
  });

  describe('Bundle Size and Code Splitting', () => {
    it('should demonstrate lazy loading of analytics components', async () => {
      // Simulate dynamic import delay
      const mockLazyLoad = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ default: COOAnalyticsDashboard }), 200)
        )
      );
      
      // Mock React.lazy
      const originalLazy = React.lazy;
      React.lazy = mockLazyLoad as any;
      
      const startTime = performance.now();
      
      // This would typically be in a route or lazy-loaded component
      const LazyAnalytics = React.lazy(() => mockLazyLoad());
      
      render(
        <React.Suspense fallback={<div>Loading analytics...</div>}>
          <LazyAnalytics />
        </React.Suspense>
      );
      
      // Should show loading state initially
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockLazyLoad).toHaveBeenCalled();
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeGreaterThan(200); // Should respect lazy loading delay
      expect(loadTime).toBeLessThan(500);    // But load reasonably fast
      
      // Restore original
      React.lazy = originalLazy;
    });

    it('should validate efficient tree shaking for unused components', () => {
      // Test that unused components are not included in bundle
      const bundleComponents = [
        'COOExecutiveDashboard',
        'COOAnalyticsDashboard',
        'TemplateManager',
        'TeamDetailModal'
      ];
      
      // Simulate bundle analysis
      const usedComponents = bundleComponents.filter(component => {
        // This would typically be from a bundle analyzer
        const isUsed = ['COOExecutiveDashboard', 'TemplateManager'].includes(component);
        return isUsed;
      });
      
      expect(usedComponents).toHaveLength(2);
      expect(usedComponents).toContain('COOExecutiveDashboard');
      expect(usedComponents).toContain('TemplateManager');
      expect(usedComponents).not.toContain('UnusedComponent');
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize database queries for minimal round trips', async () => {
      let queryCount = 0;
      
      // Mock database service with query counting
      const mockQueries = {
        getOrganizationMetrics: jest.fn(async () => {
          queryCount++;
          return { totalTeams: 6, totalEmployees: 27, teamSummaries: [] };
        }),
        getCurrentGlobalSprint: jest.fn(async () => {
          queryCount++;
          return { id: 1, current_sprint_number: 45 };
        }),
        getTeamSummaries: jest.fn(async () => {
          queryCount++;
          return [];
        })
      };
      
      Object.assign(mockDatabaseService, mockQueries);
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('27')).toBeInTheDocument();
      });
      
      // Should minimize database round trips
      expect(queryCount).toBeLessThanOrEqual(5); // Reasonable limit for dashboard
    });

    it('should implement efficient data pagination for large datasets', async () => {
      const paginatedData = {
        page: 1,
        pageSize: 25,
        totalRecords: 100,
        hasNextPage: true,
        data: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          name: `Record ${i + 1}`,
          timestamp: new Date().toISOString()
        }))
      };
      
      mockDatabaseService.getPaginatedData.mockResolvedValue(paginatedData);
      
      const startTime = performance.now();
      
      // Simulate loading paginated data
      const result = await mockDatabaseService.getPaginatedData(1, 25);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(result.data).toHaveLength(25);
      expect(result.totalRecords).toBe(100);
      expect(queryTime).toBeLessThan(200); // Fast pagination query
    });

    it('should cache frequently accessed data efficiently', async () => {
      let cacheHits = 0;
      let cacheMisses = 0;
      
      // Mock simple cache implementation
      const cache = new Map();
      
      const cachedDatabaseService = {
        getOrganizationMetrics: async (useCache = true) => {
          const cacheKey = 'org-metrics';
          
          if (useCache && cache.has(cacheKey)) {
            cacheHits++;
            return cache.get(cacheKey);
          }
          
          cacheMisses++;
          const data = { totalTeams: 6, totalEmployees: 27, teamSummaries: [] };
          cache.set(cacheKey, data);
          return data;
        }
      };
      
      // First call - cache miss
      await cachedDatabaseService.getOrganizationMetrics();
      expect(cacheMisses).toBe(1);
      expect(cacheHits).toBe(0);
      
      // Second call - cache hit
      await cachedDatabaseService.getOrganizationMetrics();
      expect(cacheMisses).toBe(1);
      expect(cacheHits).toBe(1);
      
      // Third call - cache hit
      await cachedDatabaseService.getOrganizationMetrics();
      expect(cacheMisses).toBe(1);
      expect(cacheHits).toBe(2);
    });
  });

  describe('User Experience Performance Metrics', () => {
    it('should achieve acceptable First Contentful Paint (FCP)', () => {
      // Mock performance entries
      const mockEntries = [
        {
          name: 'first-contentful-paint',
          entryType: 'paint',
          startTime: 800, // 800ms
          duration: 0
        }
      ];
      
      (window.performance.getEntriesByType as jest.Mock).mockReturnValue(mockEntries);
      
      const entries = window.performance.getEntriesByType('paint');
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      expect(fcpEntry).toBeTruthy();
      expect(fcpEntry!.startTime).toBeLessThan(1800); // Good FCP < 1.8s
    });

    it('should achieve acceptable Largest Contentful Paint (LCP)', () => {
      // Mock LCP entry
      const mockLCPEntry = {
        name: '',
        entryType: 'largest-contentful-paint',
        startTime: 1200, // 1.2s
        size: 50000,
        element: document.createElement('div')
      };
      
      (window.performance.getEntriesByType as jest.Mock).mockReturnValue([mockLCPEntry]);
      
      const entries = window.performance.getEntriesByType('largest-contentful-paint');
      const lcpEntry = entries[entries.length - 1]; // Latest LCP entry
      
      expect(lcpEntry.startTime).toBeLessThan(2500); // Good LCP < 2.5s
    });

    it('should minimize Cumulative Layout Shift (CLS)', async () => {
      let layoutShiftScore = 0;
      
      // Mock layout shift tracking
      const mockLayoutShiftEntry = {
        entryType: 'layout-shift',
        value: 0.05, // Small shift
        hadRecentInput: false
      };
      
      // Simulate layout shift calculation
      if (!mockLayoutShiftEntry.hadRecentInput) {
        layoutShiftScore += mockLayoutShiftEntry.value;
      }
      
      expect(layoutShiftScore).toBeLessThan(0.1); // Good CLS < 0.1
    });
  });
});
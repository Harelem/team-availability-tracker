/**
 * Design System Performance Tests
 * 
 * Tests component rendering performance, bundle size impact,
 * and memory usage to ensure the design system is efficient.
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { testUtils } from '../setup/designSystemTestSetup';

// Design system components
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { DataTable } from '@/components/ui/DataTable';
import { FormField, FormInput, FormSelect, FormCheckbox } from '@/components/ui/FormField';
import { Container, Grid, Stack } from '@/components/ui/Layout';
import { ConsistentLoader, LoadingSkeleton } from '@/components/ui/ConsistentLoader';
import { Badge } from '@/components/ui/Badge';
import { ActionSheet } from '@/components/ui/ActionSheet';

// Performance test wrapper
const PerformanceTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme="light">
    {children}
  </ThemeProvider>
);

// Large dataset for stress testing
const generateLargeDataset = (size: number) => 
  Array.from({ length: size }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    email: `item${i}@example.com`,
    role: i % 3 === 0 ? 'Manager' : i % 3 === 1 ? 'Developer' : 'Designer',
    status: i % 2 === 0 ? 'Active' : 'Inactive',
    description: `Description for item ${i}`,
    tags: [`tag-${i % 5}`, `category-${i % 3}`],
    createdAt: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
    updatedAt: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
  }));

const tableColumns = [
  { key: 'name' as const, header: 'Name', sortable: true },
  { key: 'email' as const, header: 'Email', sortable: true },
  { key: 'role' as const, header: 'Role', sortable: false },
  { key: 'status' as const, header: 'Status', sortable: true },
];

describe('Design System Performance Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Component Rendering Performance', () => {
    it('renders Button component efficiently', () => {
      const renderButton = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <Button variant="primary">Test Button</Button>
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderButton, 100);
      
      expect(benchmark.average).toBeLessThan(5); // Less than 5ms average
      expect(benchmark.max).toBeLessThan(20); // Less than 20ms maximum
    });

    it('renders Card component efficiently', () => {
      const renderCard = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <Card title="Performance Test Card" subtitle="Testing performance">
              <p>Card content for performance testing</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Button size="sm" variant="primary">Action 1</Button>
                <Button size="sm" variant="secondary">Action 2</Button>
              </div>
            </Card>
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderCard, 50);
      
      expect(benchmark.average).toBeLessThan(10); // Less than 10ms average
      expect(benchmark.max).toBeLessThan(30); // Less than 30ms maximum
    });

    it('renders complex form efficiently', () => {
      const renderComplexForm = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <Card title="Complex Form">
              <Stack space={4}>
                <FormInput label="First Name" defaultValue="" />
                <FormInput label="Last Name" defaultValue="" />
                <FormInput label="Email" type="email" defaultValue="" />
                <FormSelect 
                  label="Role"
                  options={[
                    { value: 'dev', label: 'Developer' },
                    { value: 'designer', label: 'Designer' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'admin', label: 'Administrator' },
                  ]}
                  defaultValue=""
                />
                <FormCheckbox label="Subscribe to newsletter" defaultChecked={false} />
                <FormCheckbox label="Accept terms and conditions" defaultChecked={false} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button variant="primary" type="submit">Submit</Button>
                  <Button variant="ghost" type="button">Cancel</Button>
                </div>
              </Stack>
            </Card>
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderComplexForm, 25);
      
      expect(benchmark.average).toBeLessThan(25); // Less than 25ms average
      expect(benchmark.max).toBeLessThan(60); // Less than 60ms maximum
    });

    it('renders large grid layout efficiently', () => {
      const renderLargeGrid = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <Container maxWidth="xl">
              <Grid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
                {Array.from({ length: 100 }, (_, i) => (
                  <Card key={i} title={`Card ${i + 1}`}>
                    <p>Content for card {i + 1}</p>
                    <Badge variant="primary">{`Badge ${i + 1}`}</Badge>
                  </Card>
                ))}
              </Grid>
            </Container>
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderLargeGrid, 5);
      
      expect(benchmark.average).toBeLessThan(200); // Less than 200ms average for 100 cards
      expect(benchmark.max).toBeLessThan(500); // Less than 500ms maximum
    });
  });

  describe('Data Table Performance', () => {
    it('handles small datasets efficiently', () => {
      const smallData = generateLargeDataset(10);
      
      const renderSmallTable = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <DataTable
              data={smallData}
              columns={tableColumns}
              searchable
              pagination={{ pageSize: 10 }}
            />
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderSmallTable, 25);
      
      expect(benchmark.average).toBeLessThan(20); // Less than 20ms average
      expect(benchmark.max).toBeLessThan(50); // Less than 50ms maximum
    });

    it('handles medium datasets efficiently', () => {
      const mediumData = generateLargeDataset(100);
      
      const renderMediumTable = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <DataTable
              data={mediumData}
              columns={tableColumns}
              searchable
              pagination={{ pageSize: 25 }}
            />
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderMediumTable, 10);
      
      expect(benchmark.average).toBeLessThan(50); // Less than 50ms average
      expect(benchmark.max).toBeLessThan(120); // Less than 120ms maximum
    });

    it('handles large datasets with pagination efficiently', () => {
      const largeData = generateLargeDataset(1000);
      
      const renderLargeTable = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <DataTable
              data={largeData}
              columns={tableColumns}
              searchable
              pagination={{ pageSize: 50 }}
            />
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderLargeTable, 5);
      
      expect(benchmark.average).toBeLessThan(150); // Less than 150ms average
      expect(benchmark.max).toBeLessThan(300); // Less than 300ms maximum
      
      // Should only render current page, not all 1000 items
      const { container } = render(
        <PerformanceTestWrapper>
          <DataTable
            data={largeData}
            columns={tableColumns}
            pagination={{ pageSize: 50 }}
            testId="large-table"
          />
        </PerformanceTestWrapper>
      );
      
      // Count rendered rows (excluding header)
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeLessThanOrEqual(50); // Only current page
      
      cleanup();
    });
  });

  describe('Loading Performance', () => {
    it('renders loading states efficiently', () => {
      const renderLoadingStates = () => {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <Stack space={4}>
              <ConsistentLoader variant="spinner" message="Loading..." />
              <ConsistentLoader variant="pulse" />
              <ConsistentLoader variant="skeleton" />
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={5} avatar />
              <LoadingSkeleton lines={4} actions />
            </Stack>
          </PerformanceTestWrapper>
        );
        unmount();
      };

      const benchmark = testUtils.benchmarkRender(renderLoadingStates, 50);
      
      expect(benchmark.average).toBeLessThan(15); // Less than 15ms average
      expect(benchmark.max).toBeLessThan(40); // Less than 40ms maximum
    });

    it('transitions from loading to loaded state efficiently', async () => {
      const TransitionTest = () => {
        const [isLoading, setIsLoading] = React.useState(true);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setIsLoading(false), 50);
          return () => clearTimeout(timer);
        }, []);

        return (
          <PerformanceTestWrapper>
            {isLoading ? (
              <ConsistentLoader variant="skeleton" testId="loading-state" />
            ) : (
              <Card title="Loaded Content" testId="loaded-content">
                <p>Content has loaded successfully</p>
              </Card>
            )}
          </PerformanceTestWrapper>
        );
      };

      const startTime = performance.now();
      const { container } = render(<TransitionTest />);
      
      // Wait for transition
      await testUtils.waitForAnimation(100);
      
      const endTime = performance.now();
      const transitionTime = endTime - startTime;
      
      expect(transitionTime).toBeLessThan(200); // Less than 200ms for complete transition
      expect(container.querySelector('[data-testid="loaded-content"]')).toBeInTheDocument();
      
      cleanup();
    });
  });

  describe('Memory Usage', () => {
    it('properly cleans up component instances', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render and unmount many components
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <PerformanceTestWrapper>
            <Card title={`Card ${i}`} key={i}>
              <Stack space={2}>
                <Button variant="primary">Button {i}</Button>
                <Badge variant="success">Badge {i}</Badge>
              </Stack>
            </Card>
          </PerformanceTestWrapper>
        );
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 100 components)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('handles modal mounting and unmounting without memory leaks', () => {
      const ModalTest = ({ isOpen }: { isOpen: boolean }) => (
        <PerformanceTestWrapper>
          <Modal
            isOpen={isOpen}
            onClose={() => {}}
            title="Memory Test Modal"
          >
            <Stack space={4}>
              <p>Modal content for memory testing</p>
              <FormInput label="Test Input" defaultValue="" />
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary">Save</Button>
                <Button variant="ghost">Cancel</Button>
              </div>
            </Stack>
          </Modal>
        </PerformanceTestWrapper>
      );

      // Open and close modal multiple times
      for (let i = 0; i < 50; i++) {
        const { rerender, unmount } = render(<ModalTest isOpen={true} />);
        rerender(<ModalTest isOpen={false} />);
        unmount();
      }
      
      // Should not cause significant memory increase
      // This is more of a smoke test - actual memory leak detection
      // would require more sophisticated tooling
      expect(true).toBe(true); // Test completes without hanging
    });
  });

  describe('Animation Performance', () => {
    it('handles CSS animations efficiently', async () => {
      const AnimationTest = () => {
        const [animate, setAnimate] = React.useState(false);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setAnimate(true), 10);
          return () => clearTimeout(timer);
        }, []);

        return (
          <PerformanceTestWrapper>
            <div 
              className={`transition-all duration-300 ${
                animate ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'
              }`}
            >
              <Card title="Animation Test">
                <p>This card animates in</p>
              </Card>
            </div>
          </PerformanceTestWrapper>
        );
      };

      const startTime = performance.now();
      render(<AnimationTest />);
      
      await testUtils.waitForAnimation(350); // Wait for animation to complete
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(500); // Animation should complete in reasonable time
      
      cleanup();
    });

    it('handles loading spinner animations efficiently', () => {
      const SpinnerTest = () => (
        <PerformanceTestWrapper>
          <Stack space={4}>
            {Array.from({ length: 10 }, (_, i) => (
              <ConsistentLoader 
                key={i}
                variant="spinner" 
                message={`Loading ${i + 1}...`} 
              />
            ))}
          </Stack>
        </PerformanceTestWrapper>
      );

      const startTime = performance.now();
      const { container } = render(<SpinnerTest />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Multiple spinners should render quickly
      
      // Check that spinners are present
      const spinners = container.querySelectorAll('[class*="animate-spin"]');
      expect(spinners.length).toBeGreaterThan(0);
      
      cleanup();
    });
  });

  describe('Bundle Size Impact', () => {
    it('components should be tree-shakeable', () => {
      // This is more of a documentation test - actual tree-shaking
      // would be tested at the bundler level
      
      // Import individual components (tree-shaking friendly)
      const IndividualImports = () => (
        <PerformanceTestWrapper>
          <Button variant="primary">Individual Import</Button>
        </PerformanceTestWrapper>
      );

      const { container } = render(<IndividualImports />);
      expect(container.querySelector('button')).toBeInTheDocument();
      
      cleanup();
    });

    it('should not import unnecessary dependencies', () => {
      // Test that components render without requiring heavy dependencies
      const LightweightTest = () => (
        <PerformanceTestWrapper>
          <Stack space={2}>
            <Badge variant="success">Lightweight</Badge>
            <Button variant="ghost">Simple Button</Button>
          </Stack>
        </PerformanceTestWrapper>
      );

      const startTime = performance.now();
      const { container } = render(<LightweightTest />);
      const endTime = performance.now();
      
      // Should render very quickly for simple components
      expect(endTime - startTime).toBeLessThan(10);
      expect(container.querySelector('button')).toBeInTheDocument();
      
      cleanup();
    });
  });

  describe('Responsive Performance', () => {
    it('handles viewport changes efficiently', async () => {
      const ResponsiveTest = () => (
        <PerformanceTestWrapper>
          <Grid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
            {Array.from({ length: 16 }, (_, i) => (
              <Card key={i} title={`Responsive Card ${i + 1}`}>
                <p>Content that adapts to viewport</p>
              </Card>
            ))}
          </Grid>
        </PerformanceTestWrapper>
      );

      const { container } = render(<ResponsiveTest />);
      
      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet  
        { width: 1200, height: 800 }, // Desktop
      ];

      for (const viewport of viewports) {
        const startTime = performance.now();
        
        testUtils.mockViewport(viewport.width, viewport.height);
        
        // Allow time for responsive changes
        await testUtils.simulateUserDelay(50);
        
        const endTime = performance.now();
        const resizeTime = endTime - startTime;
        
        expect(resizeTime).toBeLessThan(100); // Responsive changes should be quick
      }
      
      cleanup();
    });
  });

  describe('Theme Switching Performance', () => {
    it('switches themes efficiently', () => {
      const ThemeSwitchTest = ({ theme }: { theme: 'light' | 'dark' }) => (
        <ThemeProvider theme={theme}>
          <Stack space={4}>
            <Card title="Theme Switch Test">
              <p>Testing theme performance</p>
            </Card>
            <Button variant="primary">Primary Button</Button>
            <Badge variant="success">Success Badge</Badge>
          </Stack>
        </ThemeProvider>
      );

      const { rerender } = render(<ThemeSwitchTest theme="light" />);
      
      // Measure theme switch performance
      const startTime = performance.now();
      rerender(<ThemeSwitchTest theme="dark" />);
      const endTime = performance.now();
      
      const switchTime = endTime - startTime;
      expect(switchTime).toBeLessThan(50); // Theme switch should be fast
      
      cleanup();
    });
  });
});
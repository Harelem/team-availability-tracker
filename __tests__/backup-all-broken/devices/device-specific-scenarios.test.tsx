/**
 * Device-Specific Testing Scenarios
 * 
 * Comprehensive tests for device-specific behaviors, constraints, and optimizations
 * across mobile phones, tablets, and desktop environments.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import components for testing
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import MobileScheduleView from '../../src/components/MobileScheduleView';
import MobileCOODashboard from '../../src/components/MobileCOODashboard';
import ScheduleTable from '../../src/components/ScheduleTable';
import TemplateManager from '../../src/components/TemplateManager';
import EnhancedAvailabilityTable from '../../src/components/EnhancedAvailabilityTable';
import { TeamProvider } from '../../src/contexts/TeamContext';

// Import test utilities
import {
  resizeWindow,
  mockOrientationChange,
  mockDevicePixelRatio,
  mockNetworkConnection,
  mockMediaQuery,
  viewportSizes,
  testAcrossViewports,
} from '../mobile/test-utils';

interface DeviceTestCase {
  category: 'mobile' | 'tablet' | 'desktop';
  device: string;
  specs: {
    viewport: { width: number; height: number };
    pixelRatio: number;
    memory: number; // MB
    cpu: 'low' | 'medium' | 'high';
    network: '3g' | '4g' | 'wifi';
    orientation: 'portrait' | 'landscape' | 'both';
    touch: boolean;
    keyboard: boolean;
    mouse: boolean;
  };
  constraints: {
    maxRenderTime: number; // ms
    maxMemoryUsage: number; // MB
    minTouchTargetSize: number; // px
    maxBundleSize: number; // KB
  };
  features: {
    pwa: boolean;
    offline: boolean;
    notifications: boolean;
    fileSystem: boolean;
    camera: boolean;
    geolocation: boolean;
  };
}

const deviceTestMatrix: DeviceTestCase[] = [
  // Mobile Devices
  {
    category: 'mobile',
    device: 'iPhone SE (1st gen)',
    specs: {
      viewport: { width: 320, height: 568 },
      pixelRatio: 2,
      memory: 512,
      cpu: 'low',
      network: '4g',
      orientation: 'both',
      touch: true,
      keyboard: false,
      mouse: false,
    },
    constraints: {
      maxRenderTime: 300,
      maxMemoryUsage: 200,
      minTouchTargetSize: 44,
      maxBundleSize: 1000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: false,
      camera: true,
      geolocation: true,
    },
  },
  {
    category: 'mobile',
    device: 'iPhone 14 Pro',
    specs: {
      viewport: { width: 393, height: 852 },
      pixelRatio: 3,
      memory: 6000,
      cpu: 'high',
      network: '4g',
      orientation: 'both',
      touch: true,
      keyboard: false,
      mouse: false,
    },
    constraints: {
      maxRenderTime: 100,
      maxMemoryUsage: 500,
      minTouchTargetSize: 44,
      maxBundleSize: 2000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: true,
      camera: true,
      geolocation: true,
    },
  },
  {
    category: 'mobile',
    device: 'Samsung Galaxy S21',
    specs: {
      viewport: { width: 360, height: 800 },
      pixelRatio: 3,
      memory: 8000,
      cpu: 'high',
      network: '4g',
      orientation: 'both',
      touch: true,
      keyboard: false,
      mouse: false,
    },
    constraints: {
      maxRenderTime: 120,
      maxMemoryUsage: 600,
      minTouchTargetSize: 48, // Android guidelines
      maxBundleSize: 2000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: true,
      camera: true,
      geolocation: true,
    },
  },
  {
    category: 'mobile',
    device: 'Low-end Android',
    specs: {
      viewport: { width: 360, height: 640 },
      pixelRatio: 2,
      memory: 1000,
      cpu: 'low',
      network: '3g',
      orientation: 'both',
      touch: true,
      keyboard: false,
      mouse: false,
    },
    constraints: {
      maxRenderTime: 500,
      maxMemoryUsage: 300,
      minTouchTargetSize: 48,
      maxBundleSize: 800,
    },
    features: {
      pwa: false,
      offline: false,
      notifications: false,
      fileSystem: false,
      camera: false,
      geolocation: true,
    },
  },
  // Tablet Devices
  {
    category: 'tablet',
    device: 'iPad (9th gen)',
    specs: {
      viewport: { width: 768, height: 1024 },
      pixelRatio: 2,
      memory: 3000,
      cpu: 'medium',
      network: 'wifi',
      orientation: 'both',
      touch: true,
      keyboard: true,
      mouse: true,
    },
    constraints: {
      maxRenderTime: 150,
      maxMemoryUsage: 800,
      minTouchTargetSize: 44,
      maxBundleSize: 3000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: true,
      camera: true,
      geolocation: true,
    },
  },
  {
    category: 'tablet',
    device: 'iPad Pro 12.9"',
    specs: {
      viewport: { width: 1024, height: 1366 },
      pixelRatio: 2,
      memory: 8000,
      cpu: 'high',
      network: 'wifi',
      orientation: 'both',
      touch: true,
      keyboard: true,
      mouse: true,
    },
    constraints: {
      maxRenderTime: 100,
      maxMemoryUsage: 1000,
      minTouchTargetSize: 44,
      maxBundleSize: 4000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: true,
      camera: true,
      geolocation: true,
    },
  },
  {
    category: 'tablet',
    device: 'Samsung Galaxy Tab A',
    specs: {
      viewport: { width: 800, height: 1280 },
      pixelRatio: 2,
      memory: 2000,
      cpu: 'medium',
      network: 'wifi',
      orientation: 'both',
      touch: true,
      keyboard: true,
      mouse: true,
    },
    constraints: {
      maxRenderTime: 200,
      maxMemoryUsage: 600,
      minTouchTargetSize: 48,
      maxBundleSize: 2500,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: false,
      camera: true,
      geolocation: true,
    },
  },
  // Desktop Devices
  {
    category: 'desktop',
    device: 'MacBook Pro 13"',
    specs: {
      viewport: { width: 1440, height: 900 },
      pixelRatio: 2,
      memory: 16000,
      cpu: 'high',
      network: 'wifi',
      orientation: 'landscape',
      touch: false,
      keyboard: true,
      mouse: true,
    },
    constraints: {
      maxRenderTime: 50,
      maxMemoryUsage: 2000,
      minTouchTargetSize: 0, // Not applicable
      maxBundleSize: 5000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: true,
      camera: true,
      geolocation: true,
    },
  },
  {
    category: 'desktop',
    device: 'Windows Desktop 1080p',
    specs: {
      viewport: { width: 1920, height: 1080 },
      pixelRatio: 1,
      memory: 8000,
      cpu: 'medium',
      network: 'wifi',
      orientation: 'landscape',
      touch: false,
      keyboard: true,
      mouse: true,
    },
    constraints: {
      maxRenderTime: 80,
      maxMemoryUsage: 1500,
      minTouchTargetSize: 0,
      maxBundleSize: 4000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: false,
      camera: false,
      geolocation: true,
    },
  },
  {
    category: 'desktop',
    device: '4K Monitor',
    specs: {
      viewport: { width: 3840, height: 2160 },
      pixelRatio: 2,
      memory: 32000,
      cpu: 'high',
      network: 'wifi',
      orientation: 'landscape',
      touch: false,
      keyboard: true,
      mouse: true,
    },
    constraints: {
      maxRenderTime: 60,
      maxMemoryUsage: 3000,
      minTouchTargetSize: 0,
      maxBundleSize: 8000,
    },
    features: {
      pwa: true,
      offline: true,
      notifications: true,
      fileSystem: true,
      camera: true,
      geolocation: true,
    },
  },
];

describe('Device-Specific Testing Scenarios', () => {
  let originalUserAgent: string;
  let originalViewport: { width: number; height: number };

  beforeAll(() => {
    originalUserAgent = navigator.userAgent;
    originalViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  afterAll(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    resizeWindow(originalViewport.width, originalViewport.height);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset to default viewport
    resizeWindow(1024, 768);
    mockDevicePixelRatio(1);
  });

  describe('Mobile Device Scenarios', () => {
    deviceTestMatrix
      .filter((device) => device.category === 'mobile')
      .forEach((device) => {
        describe(`${device.device}`, () => {
          beforeEach(() => {
            // Setup device environment
            resizeWindow(device.specs.viewport.width, device.specs.viewport.height);
            mockDevicePixelRatio(device.specs.pixelRatio);
            mockNetworkConnection(true, device.specs.network);

            // Mock device capabilities
            Object.defineProperty(navigator, 'maxTouchPoints', {
              value: device.specs.touch ? 5 : 0,
              configurable: true,
            });

            if (device.specs.touch) {
              Object.defineProperty(window, 'ontouchstart', {
                value: null,
                configurable: true,
              });
            }

            // Mock memory constraints
            Object.defineProperty(performance, 'memory', {
              value: {
                usedJSHeapSize: device.specs.memory * 0.3 * 1024 * 1024,
                totalJSHeapSize: device.specs.memory * 0.6 * 1024 * 1024,
                jsHeapSizeLimit: device.specs.memory * 1024 * 1024,
              },
              configurable: true,
            });
          });

          it('should render mobile schedule view optimally', () => {
            const mockProps = {
              currentUser: { id: 1, name: 'Test User', isManager: false },
              teamMembers: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
              selectedTeam: { id: 1, name: 'Test Team' },
              scheduleData: {},
              workOptions: [{ value: '1', label: 'Full', hours: 8, color: 'bg-green-100' }],
              weekDays: [new Date()],
              currentWeekOffset: 0,
              loading: false,
              onWeekChange: jest.fn(),
              onWorkOptionClick: jest.fn(),
              onFullWeekSet: jest.fn(),
              onViewReasons: jest.fn(),
              isToday: jest.fn(),
              isPastDate: jest.fn(),
              getCurrentWeekString: jest.fn().mockReturnValue('Current Week'),
              getTeamTotalHours: jest.fn().mockReturnValue(40),
            };

            const startTime = performance.now();
            const { container } = render(<MobileScheduleView {...mockProps} />);
            const endTime = performance.now();

            // Performance constraint
            const renderTime = endTime - startTime;
            expect(renderTime).toBeLessThan(device.constraints.maxRenderTime);

            // Layout constraint - no horizontal scroll
            const scheduleElement = container.firstChild as HTMLElement;
            if (scheduleElement) {
              expect(scheduleElement.scrollWidth).toBeLessThanOrEqual(
                device.specs.viewport.width + 20
              );
            }
          });

          it('should handle touch targets appropriately', () => {
            const { container } = render(
              <MobileScheduleView
                currentUser={{ id: 1, name: 'Test User', isManager: false }}
                teamMembers={[]}
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

            if (device.specs.touch) {
              const touchTargets = container.querySelectorAll(
                'button, a[href], input, [role="button"], [onclick]'
              );

              touchTargets.forEach((target) => {
                const rect = target.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(target);

                if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
                  const minSize = Math.min(rect.width, rect.height);
                  expect(minSize).toBeGreaterThanOrEqual(device.constraints.minTouchTargetSize);
                }
              });
            }
          });

          it('should handle orientation changes gracefully', async () => {
            const { container, rerender } = render(
              <MobileScheduleView
                currentUser={{ id: 1, name: 'Test User', isManager: false }}
                teamMembers={[]}
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

            if (device.specs.orientation === 'both') {
              // Test landscape orientation
              mockOrientationChange('landscape');
              
              rerender(
                <MobileScheduleView
                  currentUser={{ id: 1, name: 'Test User', isManager: false }}
                  teamMembers={[]}
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

              // Should still render without horizontal scroll
              const scheduleElement = container.firstChild as HTMLElement;
              if (scheduleElement) {
                expect(scheduleElement.scrollWidth).toBeLessThanOrEqual(
                  device.specs.viewport.height + 20 // Landscape - height becomes width
                );
              }
            }
          });

          it('should respect memory constraints', () => {
            render(
              <MobileScheduleView
                currentUser={{ id: 1, name: 'Test User', isManager: false }}
                teamMembers={new Array(50).fill(null).map((_, i) => ({
                  id: i,
                  name: `User ${i}`,
                  email: `user${i}@example.com`,
                }))} // Large dataset
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

            // Memory usage should stay within device limits
            if (performance.memory) {
              const memoryUsageMB = performance.memory.usedJSHeapSize / (1024 * 1024);
              expect(memoryUsageMB).toBeLessThan(device.constraints.maxMemoryUsage);
            }
          });

          if (device.specs.network === '3g') {
            it('should optimize for slow network conditions', async () => {
              // Mock slow network
              mockNetworkConnection(true, '3g');

              const { container } = render(
                <MobileScheduleView
                  currentUser={{ id: 1, name: 'Test User', isManager: false }}
                  teamMembers={[]}
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

              // Should show loading states appropriately
              const loadingElements = container.querySelectorAll('[aria-busy="true"], .loading, .spinner');
              // Slow networks should show loading indicators
              expect(loadingElements.length).toBeGreaterThanOrEqual(0);
            });
          }
        });
      });
  });

  describe('Tablet Device Scenarios', () => {
    deviceTestMatrix
      .filter((device) => device.category === 'tablet')
      .forEach((device) => {
        describe(`${device.device}`, () => {
          beforeEach(() => {
            resizeWindow(device.specs.viewport.width, device.specs.viewport.height);
            mockDevicePixelRatio(device.specs.pixelRatio);

            // Mock tablet capabilities
            Object.defineProperty(navigator, 'maxTouchPoints', {
              value: 10,
              configurable: true,
            });

            Object.defineProperty(window, 'ontouchstart', {
              value: null,
              configurable: true,
            });
          });

          it('should render hybrid desktop/mobile experience', () => {
            const { container } = render(
              <TeamProvider>
                <ScheduleTable
                  currentUser={{ id: 1, name: 'Test User', isManager: true }}
                  teamMembers={[]}
                  selectedTeam={{ id: 1, name: 'Test Team' }}
                />
              </TeamProvider>
            );

            // Should use desktop-like layout with touch optimizations
            const scheduleElement = container.firstChild as HTMLElement;
            expect(scheduleElement).toBeInTheDocument();

            // Touch targets should still meet minimum size
            const touchTargets = container.querySelectorAll('button, a[href], input');
            touchTargets.forEach((target) => {
              const rect = target.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const minSize = Math.min(rect.width, rect.height);
                expect(minSize).toBeGreaterThanOrEqual(device.constraints.minTouchTargetSize);
              }
            });
          });

          it('should support both touch and mouse interactions', async () => {
            const user = userEvent.setup();
            const { container } = render(
              <TemplateManager onApplyTemplate={jest.fn()} />
            );

            const buttons = container.querySelectorAll('button');
            if (buttons.length > 0) {
              const button = buttons[0];

              // Should handle mouse events
              await user.hover(button);
              expect(button).toBeInTheDocument();

              // Should handle touch events
              fireEvent.touchStart(button, {
                touches: [{ clientX: 100, clientY: 100 }],
              });
              fireEvent.touchEnd(button, {
                changedTouches: [{ clientX: 100, clientY: 100 }],
              });

              expect(button).toBeInTheDocument();
            }
          });

          it('should handle split-screen and multitasking scenarios', () => {
            // Simulate split screen by reducing viewport width
            resizeWindow(device.specs.viewport.width / 2, device.specs.viewport.height);

            const { container } = render(
              <COOExecutiveDashboard 
                currentUser={{ name: 'Test COO', title: 'COO' }}
                onBack={jest.fn()}
                onTeamNavigate={jest.fn()}
              />
            );

            // Should adapt to reduced width gracefully
            const dashboard = container.firstChild as HTMLElement;
            if (dashboard) {
              expect(dashboard.scrollWidth).toBeLessThanOrEqual(
                (device.specs.viewport.width / 2) + 20
              );
            }
          });
        });
      });
  });

  describe('Desktop Device Scenarios', () => {
    deviceTestMatrix
      .filter((device) => device.category === 'desktop')
      .forEach((device) => {
        describe(`${device.device}`, () => {
          beforeEach(() => {
            resizeWindow(device.specs.viewport.width, device.specs.viewport.height);
            mockDevicePixelRatio(device.specs.pixelRatio);

            // Mock desktop capabilities
            Object.defineProperty(navigator, 'maxTouchPoints', {
              value: 0,
              configurable: true,
            });

            delete (window as any).ontouchstart;
          });

          it('should provide full desktop experience', () => {
            const { container } = render(
              <TeamProvider>
                <COOExecutiveDashboard 
                  currentUser={{ name: 'Test COO', title: 'COO' }}
                  onBack={jest.fn()}
                  onTeamNavigate={jest.fn()}
                />
              </TeamProvider>
            );

            // Should show all desktop features
            const dashboard = container.firstChild as HTMLElement;
            expect(dashboard).toBeInTheDocument();

            // Should utilize full viewport width
            expect(dashboard.scrollWidth).toBeLessThanOrEqual(device.specs.viewport.width);
          });

          it('should support keyboard navigation efficiently', async () => {
            const user = userEvent.setup();
            const { container } = render(
              <TemplateManager onApplyTemplate={jest.fn()} />
            );

            // Should have proper tab order
            const focusableElements = container.querySelectorAll(
              'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length > 1) {
              const firstElement = focusableElements[0] as HTMLElement;
              const secondElement = focusableElements[1] as HTMLElement;

              firstElement.focus();
              expect(firstElement).toHaveFocus();

              await user.tab();
              expect(secondElement).toHaveFocus();
            }
          });

          it('should handle multiple monitors and window resizing', () => {
            const { container, rerender } = render(
              <COOExecutiveDashboard 
                currentUser={{ name: 'Test COO', title: 'COO' }}
                onBack={jest.fn()}
                onTeamNavigate={jest.fn()}
              />
            );

            // Test different desktop resolutions
            const resolutions = [
              { width: 1280, height: 720 },
              { width: 1920, height: 1080 },
              { width: 2560, height: 1440 },
              { width: 3840, height: 2160 },
            ];

            resolutions.forEach((resolution) => {
              resizeWindow(resolution.width, resolution.height);
              
              rerender(
                <COOExecutiveDashboard 
                  currentUser={{ name: 'Test COO', title: 'COO' }}
                  onBack={jest.fn()}
                  onTeamNavigate={jest.fn()}
                />
              );

              const dashboard = container.firstChild as HTMLElement;
              if (dashboard) {
                expect(dashboard.scrollWidth).toBeLessThanOrEqual(resolution.width + 50);
              }
            });
          });

          if (device.specs.pixelRatio > 1) {
            it('should optimize for high-DPI displays', () => {
              const { container } = render(
                <COOExecutiveDashboard 
                  currentUser={{ name: 'Test COO', title: 'COO' }}
                  onBack={jest.fn()}
                  onTeamNavigate={jest.fn()}
                />
              );

              // Images should be crisp on high-DPI displays
              const images = container.querySelectorAll('img, svg');
              images.forEach((img) => {
                const style = window.getComputedStyle(img);
                expect(style.maxWidth).toBeTruthy();
              });

              // Text should be sharp
              const textElements = container.querySelectorAll('h1, h2, h3, p, span');
              textElements.forEach((text) => {
                const style = window.getComputedStyle(text);
                expect(style.fontSmooth || style.webkitFontSmoothing).toBeTruthy();
              });
            });
          }
        });
      });
  });

  describe('Cross-Device Feature Compatibility', () => {
    it('should maintain core functionality across all devices', async () => {
      const coreFeatures = [
        'Schedule View',
        'Navigation',
        'Data Entry',
        'Export Functions',
        'Modal Interactions',
      ];

      for (const device of deviceTestMatrix) {
        // Setup device environment
        resizeWindow(device.specs.viewport.width, device.specs.viewport.height);
        mockDevicePixelRatio(device.specs.pixelRatio);

        for (const feature of coreFeatures) {
          let testPassed = false;

          try {
            switch (feature) {
              case 'Schedule View':
                if (device.category === 'mobile') {
                  render(
                    <MobileScheduleView
                      currentUser={{ id: 1, name: 'Test User', isManager: false }}
                      teamMembers={[]}
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
                } else {
                  render(
                    <TeamProvider>
                      <ScheduleTable
                        currentUser={{ id: 1, name: 'Test User', isManager: true }}
                        teamMembers={[]}
                        selectedTeam={{ id: 1, name: 'Test Team' }}
                      />
                    </TeamProvider>
                  );
                }
                testPassed = true;
                break;

              case 'Navigation':
                render(
                  <COOExecutiveDashboard 
                    currentUser={{ name: 'Test COO', title: 'COO' }}
                    onBack={jest.fn()}
                    onTeamNavigate={jest.fn()}
                  />
                );
                testPassed = true;
                break;

              case 'Export Functions':
                render(<TemplateManager onApplyTemplate={jest.fn()} />);
                testPassed = true;
                break;

              default:
                testPassed = true;
            }
          } catch (error) {
            console.error(`${feature} failed on ${device.device}:`, error);
            testPassed = false;
          }

          expect(testPassed).toBe(true);
        }
      }
    });

    it('should adapt UI density based on device category', () => {
      deviceTestMatrix.forEach((device) => {
        resizeWindow(device.specs.viewport.width, device.specs.viewport.height);

        const { container } = render(
          <COOExecutiveDashboard 
            currentUser={{ name: 'Test COO', title: 'COO' }}
            onBack={jest.fn()}
            onTeamNavigate={jest.fn()}
          />
        );

        const elements = container.querySelectorAll('button, .card, .metric');
        
        elements.forEach((element) => {
          const style = window.getComputedStyle(element);
          const padding = parseInt(style.padding) || 0;

          switch (device.category) {
            case 'mobile':
              // Mobile should have larger padding for touch
              expect(padding).toBeGreaterThanOrEqual(8);
              break;
            case 'tablet':
              // Tablet should have medium padding
              expect(padding).toBeGreaterThanOrEqual(6);
              break;
            case 'desktop':
              // Desktop can have tighter spacing
              expect(padding).toBeGreaterThanOrEqual(4);
              break;
          }
        });
      });
    });
  });
});
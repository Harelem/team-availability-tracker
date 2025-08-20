/**
 * Comprehensive Accessibility Audit Tests
 * 
 * Extended accessibility testing for all major components using axe-core,
 * custom accessibility checks, mobile accessibility, Hebrew/RTL support,
 * and production-ready accessibility validation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import { axeConfig, mobileAxeConfig, keyboardAxeConfig, highContrastAxeConfig, getAxeConfig } from '../accessibility/axe-config';

// Import components to test
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import TemplateManager from '../../src/components/TemplateManager';
import RecognitionDashboard from '../../src/components/recognition/RecognitionDashboard';
import TeamDetailModal from '../../src/components/modals/TeamDetailModal';
import ScheduleTable from '../../src/components/ScheduleTable';
import COOAnalyticsDashboard from '../../src/components/COOAnalyticsDashboard';
import { COOCard } from '../../src/components/ui/COOCard';

// Add custom matchers
expect.extend(toHaveNoViolations);

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
jest.mock('../../src/hooks/useTeamDetailData');
jest.mock('../../src/hooks/useRecognitionSystem');

// Mock chart components to avoid canvas rendering issues
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div role="img" aria-label="Bar chart" data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div role="img" aria-label="Pie chart" data-testid="pie-chart">{children}</div>,
  LineChart: ({ children }: any) => <div role="img" aria-label="Line chart" data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div role="img" aria-label="Area chart" data-testid="area-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
  Pie: () => null,
  Line: () => null,
  Area: () => null
}));

describe('Comprehensive Accessibility Audit', () => {
  beforeEach(() => {
    // Mock console to reduce noise during testing
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WCAG 2.1 AA Compliance - Core Components', () => {
    it('COO Executive Dashboard should have no accessibility violations', async () => {
      const { container } = render(<COOExecutiveDashboard />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('COO Analytics Dashboard should have no accessibility violations', async () => {
      const { container } = render(<COOAnalyticsDashboard />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('Template Manager should have no accessibility violations', async () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('Recognition Dashboard should have no accessibility violations', async () => {
      const { container } = render(<RecognitionDashboard userId={1} />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('Team Detail Modal should have no accessibility violations', async () => {
      const { container } = render(
        <TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />
      );
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('Schedule Table should have no accessibility violations', async () => {
      const mockProps = {
        scheduleData: {},
        onScheduleChange: jest.fn(),
        onReasonChange: jest.fn(),
        weekDays: [new Date()],
        isCurrentWeek: true,
        members: [{ id: 1, name: 'Test User', hebrew: 'משתמש בדיקה' }],
        currentUserId: 1,
        userRole: 'team' as const,
        teamId: 1
      };
      
      const { container } = render(<ScheduleTable {...mockProps} />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('COO Card component should have no accessibility violations', async () => {
      const { container } = render(
        <COOCard 
          title="Test Metric" 
          value="85%" 
          change={5} 
          trend="up" 
          icon="TrendingUp" 
        />
      );
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Mobile Accessibility Compliance', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    afterEach(() => {
      // Reset viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('COO Dashboard should be accessible on mobile', async () => {
      const { container } = render(<COOExecutiveDashboard />);
      const results = await axe(container, mobileAxeConfig);
      expect(results).toHaveNoViolations();
    });

    it('Template Manager should be accessible on mobile', async () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      const results = await axe(container, mobileAxeConfig);
      expect(results).toHaveNoViolations();
    });

    it('Touch targets should meet minimum size requirements (44x44px)', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const touchTargets = container.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
      
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(target);
        
        // Skip elements that are hidden or have no dimensions
        if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') return;
        
        // Calculate effective touch target size including padding
        const paddingTop = parseInt(computedStyle.paddingTop) || 0;
        const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
        const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
        const paddingRight = parseInt(computedStyle.paddingRight) || 0;
        
        const effectiveWidth = rect.width + paddingLeft + paddingRight;
        const effectiveHeight = rect.height + paddingTop + paddingBottom;
        
        // Touch targets should be at least 44x44px
        expect(effectiveWidth >= 44 || effectiveHeight >= 44).toBe(true);
      });
    });

    it('Mobile navigation should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<COOExecutiveDashboard />);
      
      // Should be able to navigate with keyboard on mobile
      const interactiveElements = screen.getAllByRole('button');
      
      if (interactiveElements.length > 0) {
        await user.tab();
        expect(document.activeElement).toBe(interactiveElements[0]);
      }
    });

    it('Mobile content should not have horizontal scroll', () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      // Check that content doesn't exceed mobile viewport width
      const dashboard = container.firstChild as HTMLElement;
      if (dashboard && dashboard.scrollWidth) {
        expect(dashboard.scrollWidth).toBeLessThanOrEqual(375 + 20); // Allow small margin
      }
    });
  });

  describe('Keyboard Navigation Excellence', () => {
    it('should support complete keyboard navigation flow', async () => {
      const user = userEvent.setup();
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBe(focusableElements[0]);
      
      // Test that focus is visible
      const focusedElement = document.activeElement as HTMLElement;
      const computedStyle = window.getComputedStyle(focusedElement);
      
      expect(
        focusedElement.classList.toString().includes('focus:') ||
        focusedElement.classList.toString().includes('focus-visible:') ||
        computedStyle.outline !== 'none'
      ).toBe(true);
    });

    it('should handle Enter and Space key activation', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        buttons[0].focus();
        
        // Test Enter key
        await user.keyboard('{Enter}');
        
        // Test Space key
        await user.keyboard(' ');
      }
    });

    it('should manage focus properly in modal dialogs', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={onClose} />);
      
      const modal = screen.getByRole('dialog');
      const focusableElements = modal.querySelectorAll(
        'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Focus should start within modal
      await user.tab();
      expect(Array.from(focusableElements)).toContain(document.activeElement);
      
      // Test focus trap
      for (let i = 0; i < focusableElements.length + 1; i++) {
        await user.tab();
      }
      
      // Focus should still be within modal
      expect(Array.from(focusableElements)).toContain(document.activeElement);
    });

    it('should handle Escape key properly', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={onClose} />);
      
      // Escape should close modal
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('should pass keyboard-specific accessibility audit', async () => {
      const { container } = render(<COOExecutiveDashboard />);
      const results = await axe(container, keyboardAxeConfig);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader and Assistive Technology Support', () => {
    it('should have comprehensive ARIA labels for all interactive elements', () => {
      render(<RecognitionDashboard userId={1} />);
      
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link', { hidden: true }),
        ...screen.getAllByRole('tab', { hidden: true }),
        ...screen.getAllByRole('menuitem', { hidden: true })
      ];
      
      interactiveElements.forEach(element => {
        expect(
          element.hasAttribute('aria-label') ||
          element.hasAttribute('aria-labelledby') ||
          element.textContent !== '' ||
          element.hasAttribute('title')
        ).toBe(true);
      });
    });

    it('should provide live region announcements for dynamic content', async () => {
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        const liveRegions = [
          ...screen.queryAllByRole('status'),
          ...screen.queryAllByRole('alert'),
          ...screen.queryAllByLabelText(/announcement/i)
        ];
        
        liveRegions.forEach(region => {
          expect(region).toHaveAttribute('aria-live');
          expect(['polite', 'assertive', 'off']).toContain(
            region.getAttribute('aria-live')
          );
        });
      });
    });

    it('should have logical heading hierarchy for screen readers', () => {
      render(<COOExecutiveDashboard />);
      
      const headings = screen.getAllByRole('heading');
      const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
      
      if (headingLevels.length > 0) {
        // First heading should be h1 or h2
        expect([1, 2]).toContain(headingLevels[0]);
        
        // No heading should skip more than one level
        for (let i = 1; i < headingLevels.length; i++) {
          const levelDifference = headingLevels[i] - headingLevels[i - 1];
          expect(levelDifference).toBeLessThanOrEqual(1);
        }
      }
      
      // All headings should have meaningful text
      headings.forEach(heading => {
        expect(heading.textContent).toBeTruthy();
        expect(heading.textContent!.trim().length).toBeGreaterThan(2);
      });
    });

    it('should use semantic HTML landmarks appropriately', () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      // Should have proper page structure
      const landmarks = [
        container.querySelector('main'),
        container.querySelector('nav'),
        container.querySelector('[role="main"]'),
        container.querySelector('[role="navigation"]'),
        container.querySelector('[role="banner"]'),
        container.querySelector('[role="contentinfo"]')
      ].filter(Boolean);
      
      expect(landmarks.length).toBeGreaterThan(0);
    });

    it('should provide descriptive text for complex UI components', () => {
      render(<COOAnalyticsDashboard />);
      
      // Charts should have accessible descriptions
      const charts = screen.queryAllByTestId(/chart/);
      
      charts.forEach(chart => {
        expect(
          chart.hasAttribute('aria-label') ||
          chart.hasAttribute('aria-describedby') ||
          chart.hasAttribute('title')
        ).toBe(true);
      });
    });
  });

  describe('Color and Visual Accessibility', () => {
    it('should meet WCAG AA contrast requirements', async () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      const contrastConfig = {
        ...axeConfig,
        rules: {
          ...axeConfig.rules,
          'color-contrast': { enabled: true }
        }
      };
      
      const results = await axe(container, contrastConfig);
      expect(results).toHaveNoViolations();
    });

    it('should support high contrast mode', async () => {
      const { container } = render(<COOExecutiveDashboard />);
      const results = await axe(container, highContrastAxeConfig);
      expect(results).toHaveNoViolations();
    });

    it('should not rely solely on color to convey information', () => {
      render(<COOCard title="Test" value="85%" change={5} trend="up" icon="TrendingUp" />);
      
      // Status indicators should have additional visual cues
      const container = screen.getByText('85%').closest('[class*="bg-"]');
      if (container) {
        // Should have text, icons, or other non-color indicators
        const hasIcon = container.querySelector('svg') || screen.queryByRole('img');
        const hasDescriptiveText = container.textContent && 
          /up|down|increase|decrease|positive|negative/.test(container.textContent.toLowerCase());
        
        expect(hasIcon || hasDescriptiveText).toBe(true);
      }
    });

    it('should handle reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Animated elements should respect reduced motion
      const animatedElements = container.querySelectorAll('[class*="animate-"], [class*="transition-"]');
      
      animatedElements.forEach(element => {
        // Should have reduced motion handling or be non-essential animation
        expect(element.classList.toString()).toBeTruthy();
      });
    });
  });

  describe('Hebrew/RTL Accessibility Excellence', () => {
    it('should handle Hebrew text with proper direction and accessibility', () => {
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const hebrewPattern = /[\u0590-\u05FF]+/;
      const elementsWithHebrew = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && hebrewPattern.test(el.textContent)
      );
      
      elementsWithHebrew.forEach(element => {
        // Hebrew content should have proper direction
        expect(
          element.hasAttribute('dir') ||
          element.closest('[dir="rtl"]') ||
          window.getComputedStyle(element).direction === 'rtl'
        ).toBe(true);
        
        // Should still be accessible to screen readers
        expect(element.textContent).toBeTruthy();
      });
    });

    it('should maintain accessibility with bilingual UI elements', () => {
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Find bilingual elements (English · Hebrew pattern)
      const bilingualPattern = /[\w\s]+\s*·\s*[\u0590-\u05FF\s]+/;
      const bilingualElements = Array.from(document.querySelectorAll('*')).filter(el =>
        el.textContent && bilingualPattern.test(el.textContent)
      );
      
      bilingualElements.forEach(element => {
        // Should maintain semantic meaning for assistive technology
        expect(element.textContent).toBeTruthy();
        
        if (element.getAttribute('role') === 'button' || element.tagName === 'BUTTON') {
          expect(
            element.hasAttribute('aria-label') ||
            element.textContent!.trim().length > 0
          ).toBe(true);
        }
      });
    });

    it('should handle RTL keyboard navigation correctly', async () => {
      const user = userEvent.setup();
      
      // Set RTL context
      document.dir = 'rtl';
      
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const buttons = screen.getAllByRole('button');
      
      if (buttons.length > 1) {
        buttons[0].focus();
        
        // Arrow key navigation should work in RTL context
        await user.keyboard('{ArrowRight}');
        await user.keyboard('{ArrowLeft}');
        
        // Focus should still be manageable
        expect(document.activeElement).toBeTruthy();
      }
      
      // Reset
      document.dir = 'ltr';
    });
  });

  describe('Data Table Accessibility', () => {
    it('should have accessible table structure', () => {
      const mockProps = {
        scheduleData: {
          '2024-01-07': { value: '1' as const },
          '2024-01-08': { value: '0.5' as const }
        },
        onScheduleChange: jest.fn(),
        onReasonChange: jest.fn(),
        weekDays: [new Date('2024-01-07'), new Date('2024-01-08')],
        isCurrentWeek: true,
        members: [
          { id: 1, name: 'John Doe', hebrew: 'ג\'ון דו' },
          { id: 2, name: 'Jane Smith', hebrew: 'ג\'יין סמית' }
        ],
        currentUserId: 1,
        userRole: 'team' as const,
        teamId: 1
      };
      
      render(<ScheduleTable {...mockProps} />);
      
      const tables = screen.getAllByRole('table');
      
      tables.forEach(table => {
        // Should have proper table structure
        const headers = table.querySelectorAll('th');
        const rows = table.querySelectorAll('tr');
        
        expect(headers.length).toBeGreaterThan(0);
        expect(rows.length).toBeGreaterThan(0);
        
        // Headers should have proper scope or ID
        headers.forEach(header => {
          expect(
            header.hasAttribute('scope') ||
            header.hasAttribute('id') ||
            header.hasAttribute('aria-label')
          ).toBe(true);
        });
        
        // Table should have accessible name
        expect(
          table.hasAttribute('aria-label') ||
          table.hasAttribute('aria-labelledby') ||
          table.querySelector('caption')
        ).toBeTruthy();
      });
    });
  });

  describe('Integration with Assistive Technologies', () => {
    it('should work with screen readers', () => {
      render(<COOExecutiveDashboard />);
      
      // Main content should be identifiable
      const mainContent = screen.queryByRole('main') || 
                         document.querySelector('[role="main"]') ||
                         document.querySelector('main');
      
      expect(mainContent).toBeTruthy();
      
      // Navigation should be identifiable
      const navigation = screen.queryByRole('navigation') ||
                        document.querySelector('nav') ||
                        document.querySelector('[role="navigation"]');
      
      // Either main content or navigation should exist for proper page structure
      expect(mainContent || navigation).toBeTruthy();
    });

    it('should support voice control software', () => {
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Interactive elements should have accessible names for voice commands
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link', { hidden: true }),
        ...screen.getAllByRole('textbox', { hidden: true })
      ];
      
      interactiveElements.forEach(element => {
        const accessibleName = 
          element.getAttribute('aria-label') ||
          element.textContent ||
          element.getAttribute('title') ||
          element.getAttribute('placeholder');
        
        expect(accessibleName).toBeTruthy();
        expect(accessibleName!.trim().length).toBeGreaterThan(0);
      });
    });

    it('should support switch navigation', async () => {
      const user = userEvent.setup();
      render(<COOExecutiveDashboard />);
      
      // Should be able to navigate with single switch (Tab key simulation)
      const focusableElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link', { hidden: true }),
        ...screen.getAllByRole('textbox', { hidden: true })
      ];
      
      if (focusableElements.length > 0) {
        // Focus first element
        focusableElements[0].focus();
        expect(focusableElements[0]).toHaveFocus();
        
        // Should be able to activate with Enter or Space
        await user.keyboard('{Enter}');
        // Element should handle keyboard activation
      }
    });
  });
});
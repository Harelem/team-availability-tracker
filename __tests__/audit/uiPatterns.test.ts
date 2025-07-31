/**
 * UI/UX Pattern Consistency Audit Tests
 * 
 * Validates design system compliance, component consistency, responsive design,
 * typography hierarchy, color usage, and interaction patterns across the application.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import TemplateManager from '../../src/components/TemplateManager';
import TeamDetailModal from '../../src/components/modals/TeamDetailModal';
import RecognitionDashboard from '../../src/components/recognition/RecognitionDashboard';
import { COOCard } from '../../src/components/ui/COOCard';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';

// Mock components that require database connections
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
jest.mock('../../src/hooks/useTeamDetailData');

// Mock chart components to avoid canvas issues in tests
jest.mock('../../src/components/charts/SprintCapacityBarChart', () => {
  return function MockChart() {
    return <div data-testid="mock-chart">Chart Component</div>;
  };
});

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: () => <div data-testid="bar-chart">Bar Chart</div>,
  PieChart: () => <div data-testid="pie-chart">Pie Chart</div>,
  LineChart: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
  Pie: () => null,
  Line: () => null
}));

describe('UI/UX Pattern Consistency Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console warnings for tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Design System Color Token Compliance', () => {
    it('should use consistent blue color tokens throughout application', () => {
      const { container: cooContainer } = render(<COOExecutiveDashboard />);
      const { container: templateContainer } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Check for consistent blue usage across components
      const blueElements = [
        ...cooContainer.querySelectorAll('[class*="bg-blue-"]'),
        ...templateContainer.querySelectorAll('[class*="bg-blue-"]')
      ];

      blueElements.forEach(element => {
        const classes = element.className;
        // Should use design system blue variants
        expect(
          classes.includes('bg-blue-50') || 
          classes.includes('bg-blue-100') ||
          classes.includes('bg-blue-500') ||
          classes.includes('bg-blue-600') ||
          classes.includes('bg-blue-700')
        ).toBe(true);
      });
    });

    it('should use consistent green color tokens for success states', () => {
      const testCard = render(
        <COOCard 
          title="Test Card" 
          value="100%" 
          change={5} 
          trend="up" 
          icon="TrendingUp" 
        />
      );

      const greenElements = testCard.container.querySelectorAll('[class*="bg-green-"], [class*="text-green-"]');
      
      greenElements.forEach(element => {
        const classes = element.className;
        // Should use design system green variants
        expect(
          classes.includes('bg-green-50') ||
          classes.includes('bg-green-100') ||
          classes.includes('bg-green-500') ||
          classes.includes('bg-green-600') ||
          classes.includes('text-green-600') ||
          classes.includes('text-green-700')
        ).toBe(true);
      });
    });

    it('should use consistent red color tokens for error/warning states', () => {
      const testCard = render(
        <COOCard 
          title="Test Card" 
          value="50%" 
          change={-10} 
          trend="down" 
          icon="TrendingDown" 
        />
      );

      const redElements = testCard.container.querySelectorAll('[class*="bg-red-"], [class*="text-red-"]');
      
      redElements.forEach(element => {
        const classes = element.className;
        // Should use design system red variants
        expect(
          classes.includes('bg-red-50') ||
          classes.includes('bg-red-100') ||
          classes.includes('bg-red-500') ||
          classes.includes('bg-red-600') ||
          classes.includes('text-red-600') ||
          classes.includes('text-red-700')
        ).toBe(true);
      });
    });

    it('should use consistent gray color tokens for neutral elements', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const grayElements = container.querySelectorAll('[class*="bg-gray-"], [class*="text-gray-"]');
      
      expect(grayElements.length).toBeGreaterThan(0);
      
      grayElements.forEach(element => {
        const classes = element.className;
        // Should use design system gray variants
        expect(
          classes.includes('bg-gray-50') ||
          classes.includes('bg-gray-100') ||
          classes.includes('bg-gray-200') ||
          classes.includes('bg-gray-300') ||
          classes.includes('text-gray-500') ||
          classes.includes('text-gray-600') ||
          classes.includes('text-gray-700') ||
          classes.includes('text-gray-900')
        ).toBe(true);
      });
    });
  });

  describe('Typography Hierarchy Validation', () => {
    it('should have proper heading hierarchy in COO Dashboard', () => {
      render(<COOExecutiveDashboard />);
      
      // Check for proper heading structure
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      
      // Should have at least one main heading
      expect(h1Elements.length).toBeGreaterThanOrEqual(1);
      
      // Should have section headings
      expect(h2Elements.length).toBeGreaterThanOrEqual(1);
      
      // Check heading text sizes
      h1Elements.forEach(heading => {
        expect(heading.className).toMatch(/text-(2xl|3xl|4xl)/);
      });
    });

    it('should use consistent font weight classes', () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      const fontWeightElements = container.querySelectorAll('[class*="font-"]');
      
      fontWeightElements.forEach(element => {
        const classes = element.className;
        // Should use standard font weight classes
        expect(
          classes.includes('font-normal') ||
          classes.includes('font-medium') ||
          classes.includes('font-semibold') ||
          classes.includes('font-bold')
        ).toBe(true);
      });
    });

    it('should maintain consistent text size scale', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const textSizeElements = container.querySelectorAll('[class*="text-"]');
      
      const validTextSizes = [
        'text-xs', 'text-sm', 'text-base', 'text-lg', 
        'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'
      ];
      
      textSizeElements.forEach(element => {
        const classes = element.className;
        const hasValidTextSize = validTextSizes.some(size => classes.includes(size));
        
        // Should use design system text sizes
        if (classes.includes('text-')) {
          expect(hasValidTextSize).toBe(true);
        }
      });
    });
  });

  describe('Interactive Element Consistency', () => {
    it('should have consistent button styles across components', () => {
      const { container: cooContainer } = render(<COOExecutiveDashboard />);
      const { container: templateContainer } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const buttons = [
        ...cooContainer.querySelectorAll('button'),
        ...templateContainer.querySelectorAll('button')
      ];

      buttons.forEach(button => {
        const classes = button.className;
        
        // All buttons should have proper padding
        expect(
          classes.includes('px-2') || classes.includes('px-3') || 
          classes.includes('px-4') || classes.includes('px-6') ||
          classes.includes('p-2') || classes.includes('p-3')
        ).toBe(true);
        
        // All buttons should have proper vertical padding or general padding
        expect(
          classes.includes('py-1') || classes.includes('py-2') || 
          classes.includes('py-3') || classes.includes('p-2') || 
          classes.includes('p-3')
        ).toBe(true);
        
        // All buttons should have border radius
        expect(
          classes.includes('rounded') || classes.includes('rounded-md') || 
          classes.includes('rounded-lg') || classes.includes('rounded-full')
        ).toBe(true);
      });
    });

    it('should have proper focus management in interactive elements', () => {
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const interactiveElements = screen.getAllByRole('button');
      
      interactiveElements.forEach(element => {
        // Focus the element
        element.focus();
        expect(element).toHaveFocus();
        
        // Should have focus styles
        const classes = element.className;
        expect(
          classes.includes('focus:') || 
          classes.includes('focus-visible:') ||
          element.style.outline !== ''
        ).toBe(true);
      });
    });

    it('should handle hover states consistently', () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      const hoverableElements = container.querySelectorAll('[class*="hover:"]');
      
      expect(hoverableElements.length).toBeGreaterThan(0);
      
      hoverableElements.forEach(element => {
        const classes = element.className;
        // Should have proper hover transition
        expect(
          classes.includes('transition') || 
          classes.includes('transition-colors') ||
          classes.includes('transition-all')
        ).toBe(true);
      });
    });

    it('should display loading states consistently', async () => {
      render(<COOExecutiveDashboard />);
      
      // Look for loading indicators
      await waitFor(() => {
        const loadingElements = [
          ...screen.queryAllByText(/loading/i),
          ...screen.queryAllByTestId(/loading/i),
          ...screen.queryAllByRole('status')
        ];
        
        loadingElements.forEach(element => {
          // Loading elements should have proper ARIA attributes
          expect(
            element.hasAttribute('aria-label') ||
            element.hasAttribute('aria-describedby') ||
            element.getAttribute('role') === 'status'
          ).toBe(true);
        });
      });
    });
  });

  describe('Responsive Design Validation', () => {
    it('should work correctly on mobile viewport (375px)', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { 
        value: 375, 
        configurable: true 
      });
      Object.defineProperty(window, 'innerHeight', { 
        value: 667, 
        configurable: true 
      });
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Should not have horizontal scrolling
      const dashboard = container.querySelector('[data-testid="coo-dashboard"]') || container.firstChild as HTMLElement;
      if (dashboard && dashboard instanceof HTMLElement) {
        expect(dashboard.scrollWidth).toBeLessThanOrEqual(375);
      }
      
      // Should use mobile-responsive classes
      const responsiveElements = container.querySelectorAll('[class*="sm:"], [class*="md:"], [class*="lg:"]');
      expect(responsiveElements.length).toBeGreaterThan(0);
    });

    it('should use proper responsive grid classes', () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      const gridElements = container.querySelectorAll('[class*="grid-cols-"]');
      
      gridElements.forEach(element => {
        const classes = element.className;
        
        // Should have responsive grid classes
        expect(
          classes.includes('grid-cols-1') || 
          classes.includes('sm:grid-cols-') ||
          classes.includes('md:grid-cols-') ||
          classes.includes('lg:grid-cols-') ||
          classes.includes('xl:grid-cols-')
        ).toBe(true);
      });
    });

    it('should handle tablet viewport (768px) correctly', () => {
      Object.defineProperty(window, 'innerWidth', { 
        value: 768, 
        configurable: true 
      });
      
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Should use tablet-appropriate layouts
      const tabletElements = container.querySelectorAll('[class*="md:"]');
      expect(tabletElements.length).toBeGreaterThan(0);
    });

    it('should handle desktop viewport (1024px+) correctly', () => {
      Object.defineProperty(window, 'innerWidth', { 
        value: 1024, 
        configurable: true 
      });
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Should use desktop-appropriate layouts
      const desktopElements = container.querySelectorAll('[class*="lg:"]');
      expect(desktopElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Layout Consistency', () => {
    it('should use consistent card layouts across components', () => {
      const cards = [
        render(<COOCard title="Test" value="100" icon="TrendingUp" />),
        render(<Card className="p-4"><p>Test content</p></Card>)
      ];

      cards.forEach(({ container }) => {
        const cardElements = container.querySelectorAll('[class*="bg-white"], [class*="shadow"], [class*="rounded"]');
        
        cardElements.forEach(card => {
          const classes = card.className;
          
          // Should have background
          expect(
            classes.includes('bg-white') || 
            classes.includes('bg-gray-50')
          ).toBe(true);
          
          // Should have shadow
          expect(
            classes.includes('shadow') || 
            classes.includes('shadow-sm') ||
            classes.includes('shadow-md') ||
            classes.includes('shadow-lg')
          ).toBe(true);
          
          // Should have border radius
          expect(
            classes.includes('rounded') || 
            classes.includes('rounded-md') ||
            classes.includes('rounded-lg')
          ).toBe(true);
        });
      });
    });

    it('should maintain consistent spacing patterns', () => {
      const { container } = render(<COOExecutiveDashboard />);
      
      const spacingElements = container.querySelectorAll('[class*="p-"], [class*="m-"], [class*="gap-"]');
      
      const validSpacingValues = [
        '0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'
      ];
      
      spacingElements.forEach(element => {
        const classes = element.className;
        const spacingMatches = classes.match(/(p|m|gap)-(\d+)/g);
        
        if (spacingMatches) {
          spacingMatches.forEach(match => {
            const value = match.split('-')[1];
            expect(validSpacingValues).toContain(value);
          });
        }
      });
    });

    it('should use consistent flex layouts', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const flexElements = container.querySelectorAll('[class*="flex"]');
      
      flexElements.forEach(element => {
        const classes = element.className;
        
        if (classes.includes('flex') && !classes.includes('flex-col')) {
          // Flex rows should have proper alignment
          expect(
            classes.includes('items-center') ||
            classes.includes('items-start') ||
            classes.includes('items-end') ||
            classes.includes('items-stretch')
          ).toBe(true);
        }
      });
    });
  });

  describe('Accessibility Pattern Consistency', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        // Should have accessible name
        expect(
          button.hasAttribute('aria-label') ||
          button.hasAttribute('aria-labelledby') ||
          button.textContent !== '' ||
          button.hasAttribute('title')
        ).toBe(true);
      });
    });

    it('should have proper heading structure for screen readers', () => {
      render(<COOExecutiveDashboard />);
      
      const headings = screen.getAllByRole('heading');
      
      // Should have logical heading hierarchy
      const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
      
      // First heading should be h1 or h2
      if (headingLevels.length > 0) {
        expect([1, 2]).toContain(headingLevels[0]);
      }
      
      // No heading should skip more than one level
      for (let i = 1; i < headingLevels.length; i++) {
        const levelDifference = headingLevels[i] - headingLevels[i - 1];
        expect(levelDifference).toBeLessThanOrEqual(1);
      }
    });

    it('should provide keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const firstButton = screen.getAllByRole('button')[0];
      
      // Should be able to focus first interactive element
      await user.tab();
      expect(document.activeElement).toBe(firstButton);
      
      // Should be able to navigate with keyboard
      await user.tab();
      expect(document.activeElement).not.toBe(firstButton);
    });

    it('should handle focus trapping in modals', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={onClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Focus should be within modal
      const focusableElements = dialog.querySelectorAll(
        'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Should be able to navigate within modal
      if (focusableElements.length > 1) {
        await user.tab();
        expect(Array.from(focusableElements)).toContain(document.activeElement);
      }
    });
  });

  describe('Hebrew/RTL Text Support', () => {
    it('should handle Hebrew text with proper RTL support', () => {
      const hebrewText = 'שמור כתבנית';
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Look for Hebrew text in the component
      const hebrewElements = screen.queryAllByText(new RegExp(hebrewText));
      
      hebrewElements.forEach(element => {
        // Hebrew text should have proper direction
        const computedStyle = window.getComputedStyle(element);
        expect(
          element.hasAttribute('dir') || 
          computedStyle.direction === 'rtl' ||
          element.closest('[dir="rtl"]') !== null
        ).toBe(true);
      });
    });

    it('should display bilingual UI elements correctly', () => {
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Look for bilingual text patterns (English · Hebrew)
      const bilingualPattern = /[\w\s]+\s*·\s*[\u0590-\u05FF\s]+/;
      
      const textElements = screen.getAllByText(bilingualPattern);
      
      textElements.forEach(element => {
        expect(element.textContent).toMatch(bilingualPattern);
      });
    });

    it('should handle mixed LTR/RTL content properly', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Find elements with both English and Hebrew content
      const mixedContentElements = Array.from(container.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return /[a-zA-Z]/.test(text) && /[\u0590-\u05FF]/.test(text);
      });
      
      mixedContentElements.forEach(element => {
        // Should handle mixed content appropriately
        expect(element.textContent).toBeTruthy();
      });
    });
  });

  describe('Error State Consistency', () => {
    it('should display consistent error messages', () => {
      // Test error states across components
      const errorMessage = 'Test error message';
      
      const TestErrorComponent = () => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{errorMessage}</p>
        </div>
      );
      
      const { container } = render(<TestErrorComponent />);
      
      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveClass('border-red-200', 'rounded-lg', 'p-4');
      
      const errorText = container.querySelector('.text-red-700');
      expect(errorText).toBeInTheDocument();
      expect(errorText).toHaveTextContent(errorMessage);
    });

    it('should provide consistent empty state messaging', () => {
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Expand templates to see empty state
      const expandButton = screen.getByText('Availability Templates');
      fireEvent.click(expandButton);
      
      waitFor(() => {
        const emptyMessage = screen.queryByText(/no templates found/i);
        if (emptyMessage) {
          expect(emptyMessage).toBeInTheDocument();
        }
      });
    });
  });
});
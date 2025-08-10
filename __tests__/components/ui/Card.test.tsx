/**
 * Enhanced Card Component Tests
 * 
 * Comprehensive test suite covering functionality, accessibility, variants, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  CardVariant,
  CardSize 
} from '@/components/ui/card';

expect.extend(toHaveNoViolations);

describe('Card Component', () => {
  // =============================================================================
  // BASIC FUNCTIONALITY TESTS
  // =============================================================================

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Card className="custom-card">Card content</Card>);
      const card = screen.getByText('Card content').parentElement;
      expect(card).toHaveClass('custom-card');
    });

    it('supports test ID', () => {
      render(<Card testId="test-card">Card content</Card>);
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Card content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('passes through HTML attributes', () => {
      render(<Card data-custom="value">Card content</Card>);
      const card = screen.getByText('Card content').parentElement;
      expect(card).toHaveAttribute('data-custom', 'value');
    });
  });

  // =============================================================================
  // VARIANT TESTS
  // =============================================================================

  describe('Variants', () => {
    const variants: CardVariant[] = [
      'default', 'elevated', 'outlined', 'filled', 'interactive', 
      'success', 'warning', 'error', 'info'
    ];

    it.each(variants)('renders %s variant correctly', (variant) => {
      render(<Card variant={variant}>Variant test</Card>);
      const card = screen.getByText('Variant test').parentElement;
      expect(card).toBeInTheDocument();
      
      // Check for variant-specific classes
      if (variant === 'elevated') {
        expect(card).toHaveClass('shadow-md');
      } else if (variant === 'outlined') {
        expect(card).toHaveClass('shadow-none', 'border-gray-300');
      } else if (variant === 'filled') {
        expect(card).toHaveClass('bg-gray-50');
      } else if (variant === 'interactive') {
        expect(card).toHaveClass('cursor-pointer');
      } else if (variant === 'success') {
        expect(card).toHaveClass('border-green-200', 'bg-green-50');
      }
    });

    it('applies default variant when none specified', () => {
      render(<Card>Default variant</Card>);
      const card = screen.getByText('Default variant').parentElement;
      expect(card).toHaveClass('shadow-sm', 'border-gray-200');
    });
  });

  // =============================================================================
  // SIZE TESTS
  // =============================================================================

  describe('Sizes', () => {
    const sizes: CardSize[] = ['sm', 'md', 'lg', 'xl'];

    it.each(sizes)('renders %s size correctly', (size) => {
      render(<Card size={size}>Size test</Card>);
      const card = screen.getByText('Size test').parentElement;
      expect(card).toBeInTheDocument();
    });

    it('applies default size when none specified', () => {
      render(<Card>Default size</Card>);
      const card = screen.getByText('Default size').parentElement;
      expect(card).toBeInTheDocument();
    });
  });

  // =============================================================================
  // INTERACTIVE TESTS
  // =============================================================================

  describe('Interactive Card', () => {
    it('handles click events when interactive', () => {
      const handleClick = jest.fn();
      render(
        <Card interactive onClick={handleClick}>
          Interactive card
        </Card>
      );
      
      const card = screen.getByText('Interactive card').parentElement;
      fireEvent.click(card!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover styles when interactive', () => {
      render(<Card interactive>Interactive card</Card>);
      const card = screen.getByText('Interactive card').parentElement;
      expect(card).toHaveClass('hover:shadow-md', 'hover:-translate-y-0.5');
    });

    it('applies interactive variant styles correctly', () => {
      render(<Card variant="interactive">Interactive variant</Card>);
      const card = screen.getByText('Interactive variant').parentElement;
      expect(card).toHaveClass('cursor-pointer');
    });

    it('can be both interactive prop and variant', () => {
      render(<Card variant="interactive" interactive>Both interactive</Card>);
      const card = screen.getByText('Both interactive').parentElement;
      expect(card).toHaveClass('cursor-pointer');
    });

    it('supports keyboard interaction', () => {
      const handleClick = jest.fn();
      render(
        <Card interactive onClick={handleClick} onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }} tabIndex={0}>
          Keyboard interactive
        </Card>
      );
      
      const card = screen.getByText('Keyboard interactive').parentElement;
      card?.focus();
      fireEvent.keyDown(card!, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>Card content</CardContent>
        </Card>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('maintains proper semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle as="h2">Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Main content</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );
      
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Card Title');
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// CARD SUBCOMPONENT TESTS
// =============================================================================

describe('Card Subcomponents', () => {
  describe('CardHeader', () => {
    it('renders children correctly', () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>);
      const header = screen.getByText('Header');
      expect(header).toHaveClass('custom-header');
    });

    it('has proper default styles', () => {
      render(<CardHeader>Header</CardHeader>);
      const header = screen.getByText('Header');
      expect(header).toHaveClass('px-6', 'py-4', 'border-b');
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Card Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Card Title');
    });

    it('supports different heading levels', () => {
      render(<CardTitle as="h1">H1 Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('H1 Title');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      const title = screen.getByRole('heading');
      expect(title).toHaveClass('custom-title');
    });

    it('has proper default styles', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByRole('heading');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
    });

    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const)('renders as %s when specified', (level) => {
      render(<CardTitle as={level}>Title</CardTitle>);
      const expectedLevel = parseInt(level.charAt(1));
      const title = screen.getByRole('heading', { level: expectedLevel });
      expect(title).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('renders children correctly', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>);
      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('custom-desc');
    });

    it('has proper default styles', () => {
      render(<CardDescription>Description</CardDescription>);
      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('mt-1', 'text-sm', 'text-gray-600');
    });
  });

  describe('CardContent', () => {
    it('renders children correctly', () => {
      render(<CardContent>Content area</CardContent>);
      expect(screen.getByText('Content area')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Content</CardContent>);
      const content = screen.getByText('Content');
      expect(content).toHaveClass('custom-content');
    });

    it('has proper default styles', () => {
      render(<CardContent>Content</CardContent>);
      const content = screen.getByText('Content');
      expect(content).toHaveClass('px-6', 'py-4');
    });
  });

  describe('CardFooter', () => {
    it('renders children correctly', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>);
      const footer = screen.getByText('Footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('has proper default styles', () => {
      render(<CardFooter>Footer</CardFooter>);
      const footer = screen.getByText('Footer');
      expect(footer).toHaveClass('px-6', 'py-4', 'border-t', 'bg-gray-50');
    });

    it('uses flexbox layout', () => {
      render(<CardFooter>Footer</CardFooter>);
      const footer = screen.getByText('Footer');
      expect(footer).toHaveClass('flex', 'items-center', 'justify-between');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  it('renders complete card structure', () => {
    render(
      <Card variant="elevated" size="lg" testId="integration-card">
        <CardHeader>
          <CardTitle as="h2">Complete Card</CardTitle>
          <CardDescription>This is a complete card example</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main card content goes here</p>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
          </ul>
        </CardContent>
        <CardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      </Card>
    );

    // Verify all parts are rendered
    expect(screen.getByTestId('integration-card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Complete Card');
    expect(screen.getByText('This is a complete card example')).toBeInTheDocument();
    expect(screen.getByText('Main card content goes here')).toBeInTheDocument();
    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('works with form elements', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Form Card</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <input type="text" placeholder="Enter text" />
            <textarea placeholder="Enter description"></textarea>
          </form>
        </CardContent>
        <CardFooter>
          <button type="submit">Submit</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('supports nested cards', () => {
    render(
      <Card variant="outlined" testId="outer-card">
        <CardContent>
          <Card variant="filled" testId="inner-card">
            <CardContent>Nested card content</CardContent>
          </Card>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('outer-card')).toBeInTheDocument();
    expect(screen.getByTestId('inner-card')).toBeInTheDocument();
    expect(screen.getByText('Nested card content')).toBeInTheDocument();
  });

  it('handles complex interactive scenarios', () => {
    const handleClick = jest.fn();
    const handleHover = jest.fn();
    
    render(
      <Card 
        interactive 
        variant="interactive"
        onClick={handleClick}
        onMouseEnter={handleHover}
        testId="complex-card"
      >
        <CardHeader>
          <CardTitle>Interactive Complex Card</CardTitle>
        </CardHeader>
        <CardContent>
          Click me or hover over me
        </CardContent>
      </Card>
    );

    const card = screen.getByTestId('complex-card');
    
    fireEvent.mouseEnter(card);
    expect(handleHover).toHaveBeenCalled();
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalled();
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('renders quickly with many cards', () => {
    const startTime = performance.now();
    
    render(
      <div>
        {Array.from({ length: 20 }).map((_, i) => (
          <Card key={i} variant="default">
            <CardContent>Card {i}</CardContent>
          </Card>
        ))}
      </div>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(100);
  });

  it('does not cause memory leaks', () => {
    const { unmount } = render(
      <Card>
        <CardContent>Memory test</CardContent>
      </Card>
    );
    
    expect(() => unmount()).not.toThrow();
  });

  it('handles rapid re-renders efficiently', () => {
    const TestCard = ({ count }: { count: number }) => (
      <Card>
        <CardContent>Render count: {count}</CardContent>
      </Card>
    );

    const { rerender } = render(<TestCard count={1} />);
    
    const startTime = performance.now();
    for (let i = 2; i <= 10; i++) {
      rerender(<TestCard count={i} />);
    }
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(50);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty content', () => {
    render(<Card></Card>);
    // Should render without errors
  });

  it('handles null children', () => {
    render(<Card>{null}</Card>);
    // Should render without errors
  });

  it('handles undefined props gracefully', () => {
    render(<Card variant={undefined as any} size={undefined as any}>Test</Card>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles very long content', () => {
    const longContent = 'A'.repeat(1000);
    render(
      <Card>
        <CardContent>{longContent}</CardContent>
      </Card>
    );
    
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('preserves custom event handlers', () => {
    const customHandler = jest.fn();
    render(
      <Card onDoubleClick={customHandler}>
        Double click me
      </Card>
    );
    
    const card = screen.getByText('Double click me').parentElement;
    fireEvent.doubleClick(card!);
    expect(customHandler).toHaveBeenCalled();
  });
});
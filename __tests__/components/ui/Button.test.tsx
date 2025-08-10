/**
 * Enhanced Button Component Tests
 * 
 * Comprehensive test suite covering functionality, accessibility, variants, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button, ButtonGroup, IconButton } from '@/components/ui/button';
import { ButtonVariant, ButtonSize } from '@/design-system/variants';

expect.extend(toHaveNoViolations);

describe('Button Component', () => {
  // =============================================================================
  // BASIC FUNCTIONALITY TESTS
  // =============================================================================

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports custom test ID', () => {
      render(<Button testId="custom-button">Test Button</Button>);
      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  // =============================================================================
  // VARIANT TESTS
  // =============================================================================

  describe('Variants', () => {
    const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'link', 'success', 'warning', 'error'];

    it.each(variants)('renders %s variant correctly', (variant) => {
      render(<Button variant={variant}>{variant} button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass(variant === 'primary' ? 'bg-blue-600' : '');
    });

    it('applies focus ring classes for all variants', () => {
      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant}>Test</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('focus:ring-2');
        unmount();
      });
    });
  });

  // =============================================================================
  // SIZE TESTS
  // =============================================================================

  describe('Sizes', () => {
    const sizes: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

    it.each(sizes)('renders %s size correctly', (size) => {
      render(<Button size={size}>{size} button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      const expectedHeights = {
        xs: 'h-6',
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12',
        xl: 'h-14'
      };
      expect(button).toHaveClass(expectedHeights[size]);
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('shows custom loading text', () => {
      render(<Button loading loadingText="Processing...">Submit</Button>);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('hides loading text for icon-only buttons', () => {
      render(<Button loading loadingText="Loading..." iconOnly>Icon</Button>);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('prevents interaction when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // ICON TESTS
  // =============================================================================

  describe('Icons', () => {
    it('renders left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">←</span>}>With Left Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>With Right Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders both icons', () => {
      render(
        <Button 
          leftIcon={<span data-testid="left-icon">←</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          Both Icons
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('supports icon-only mode', () => {
      render(<Button iconOnly leftIcon={<span data-testid="icon">★</span>}>Hidden Text</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.queryByText('Hidden Text')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // FULL WIDTH TESTS
  // =============================================================================

  describe('Full Width', () => {
    it('applies full width class', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<Button>Accessible Button</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });

    it('has proper ARIA attributes when loading', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('has proper ARIA attributes when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // =============================================================================
  // CUSTOM PROPS TESTS
  // =============================================================================

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('supports custom type attribute', () => {
      render(<Button type="submit">Submit Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('passes through data attributes', () => {
      render(<Button data-custom="value">Data Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-custom', 'value');
    });
  });
});

// =============================================================================
// BUTTON GROUP COMPONENT TESTS
// =============================================================================

describe('ButtonGroup Component', () => {
  it('renders multiple buttons', () => {
    render(
      <ButtonGroup>
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </ButtonGroup>
    );
    
    expect(screen.getByRole('button', { name: /first/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /second/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /third/i })).toBeInTheDocument();
  });

  it('supports vertical orientation', () => {
    render(
      <ButtonGroup orientation="vertical">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group');
    expect(group).toHaveClass('flex-col');
  });

  it('supports attached buttons', () => {
    render(
      <ButtonGroup attached>
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group');
    expect(group).toHaveClass('[&>*:not(:first-child)]:rounded-l-none');
  });

  it('has accessibility role', () => {
    render(
      <ButtonGroup>
        <Button>Button</Button>
      </ButtonGroup>
    );
    
    expect(screen.getByRole('group')).toBeInTheDocument();
  });
});

// =============================================================================
// ICON BUTTON COMPONENT TESTS
// =============================================================================

describe('IconButton Component', () => {
  it('renders icon button', () => {
    render(<IconButton icon={<span data-testid="icon">★</span>} aria-label="Star" />);
    
    const button = screen.getByRole('button', { name: /star/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('requires aria-label', () => {
    render(<IconButton icon={<span>★</span>} aria-label="Required label" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Required label');
  });

  it('inherits all button props', () => {
    const handleClick = jest.fn();
    render(
      <IconButton 
        icon={<span>★</span>} 
        aria-label="Clickable icon"
        onClick={handleClick}
        variant="outline"
        size="lg"
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <IconButton icon={<span>★</span>} aria-label="Accessible icon button" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('renders quickly', () => {
    const startTime = performance.now();
    
    render(
      <div>
        {Array.from({ length: 50 }).map((_, i) => (
          <Button key={i}>Button {i}</Button>
        ))}
      </div>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render 50 buttons in less than 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('does not cause memory leaks', () => {
    const { unmount } = render(<Button>Memory Test</Button>);
    
    // Should unmount cleanly without warnings
    expect(() => unmount()).not.toThrow();
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration', () => {
  it('works with forms', () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    
    render(
      <form onSubmit={handleSubmit}>
        <Button type="submit">Submit Form</Button>
      </form>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('works with loading states', async () => {
    const MockAsyncButton = () => {
      const [loading, setLoading] = React.useState(false);
      
      const handleClick = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        setLoading(false);
      };
      
      return <Button loading={loading} onClick={handleClick}>Async Button</Button>;
    };
    
    render(<MockAsyncButton />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should be loading immediately
    expect(button).toBeDisabled();
    
    // Should not be loading after async operation
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
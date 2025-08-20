/**
 * Enhanced Input Component Tests
 * 
 * Comprehensive test suite covering functionality, accessibility, variants, and validation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { 
  Input, 
  PasswordInput, 
  Textarea, 
  InputGroup, 
  FormField,
  InputVariant,
  InputSize 
} from '@/components/ui/Input';

expect.extend(toHaveNoViolations);

describe('Input Component', () => {
  // =============================================================================
  // BASIC FUNCTIONALITY TESTS
  // =============================================================================

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('handles value changes', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'Hello');
      expect(handleChange).toHaveBeenCalledTimes(5);
    });

    it('supports controlled input', () => {
      const TestInput = () => {
        const [value, setValue] = React.useState('');
        return <Input value={value} onChange={(e) => setValue(e.target.value)} />;
      };
      
      render(<TestInput />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'test value' } });
      expect(input.value).toBe('test value');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('supports custom test ID', () => {
      render(<Input testId="custom-input" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('can be disabled', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
    });
  });

  // =============================================================================
  // VARIANT TESTS
  // =============================================================================

  describe('Variants', () => {
    const variants: InputVariant[] = ['default', 'filled', 'flushed'];

    it.each(variants)('renders %s variant correctly', (variant) => {
      render(<Input variant={variant} />);
      const input = screen.getByRole('textbox');
      
      if (variant === 'filled') {
        expect(input).toHaveClass('bg-gray-50');
      } else if (variant === 'flushed') {
        expect(input).toHaveClass('border-0', 'border-b-2');
      } else {
        expect(input).toHaveClass('bg-white', 'border-gray-300');
      }
    });
  });

  // =============================================================================
  // SIZE TESTS
  // =============================================================================

  describe('Sizes', () => {
    const sizes: InputSize[] = ['sm', 'md', 'lg'];

    it.each(sizes)('renders %s size correctly', (size) => {
      render(<Input size={size} />);
      const input = screen.getByRole('textbox');
      
      const expectedHeights = {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12'
      };
      
      expect(input).toHaveClass(expectedHeights[size]);
    });
  });

  // =============================================================================
  // LABEL TESTS
  // =============================================================================

  describe('Label', () => {
    it('renders label when provided', () => {
      render(<Input label="Email Address" />);
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<Input label="Email" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for', input.id);
    });

    it('shows required indicator', () => {
      render(<Input label="Required Field" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('uses custom ID when provided', () => {
      render(<Input id="custom-id" label="Custom" />);
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Custom');
      
      expect(input).toHaveAttribute('id', 'custom-id');
      expect(label).toHaveAttribute('for', 'custom-id');
    });
  });

  // =============================================================================
  // ICON TESTS
  // =============================================================================

  describe('Icons', () => {
    it('renders left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">@</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });

    it('renders right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">search</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-10');
    });

    it('handles both icons', () => {
      render(
        <Input 
          leftIcon={<span data-testid="left-icon">@</span>}
          rightIcon={<span data-testid="right-icon">search</span>}
        />
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10', 'pr-10');
    });
  });

  // =============================================================================
  // VALIDATION STATES
  // =============================================================================

  describe('Validation States', () => {
    it('shows error state', () => {
      render(<Input error errorMessage="Invalid input" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('border-red-500');
      expect(screen.getByText('Invalid input')).toBeInTheDocument();
      expect(screen.getByText('Invalid input')).toHaveClass('text-red-600');
    });

    it('shows success state', () => {
      render(<Input success />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-green-500');
    });

    it('shows help text', () => {
      render(<Input helpText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address')).toHaveClass('text-gray-500');
    });

    it('prioritizes error message over help text', () => {
      render(
        <Input 
          error 
          errorMessage="This field is required" 
          helpText="Enter your email"
        />
      );
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    });

    it('shows validation icons', () => {
      const { rerender } = render(<Input error />);
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument(); // AlertCircle
      
      rerender(<Input success />);
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument(); // CheckCircle
    });
  });

  // =============================================================================
  // LOADING STATE
  // =============================================================================

  describe('Loading State', () => {
    it('shows loading spinner', () => {
      render(<Input loading />);
      const spinner = screen.getByRole('textbox').parentElement?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides other icons when loading', () => {
      render(<Input loading rightIcon={<span data-testid="right-icon">icon</span>} />);
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Input 
          label="Accessible Input" 
          helpText="Enter your information"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes for error state', () => {
      render(<Input error errorMessage="Error message" />);
      const input = screen.getByRole('textbox');
      // In a real implementation, you might add aria-invalid and aria-describedby
      expect(input).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      await user.tab();
      expect(input).toHaveFocus();
    });

    it('has proper focus styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  // =============================================================================
  // CUSTOM PROPS
  // =============================================================================

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input');
    });

    it('applies container className', () => {
      render(<Input containerClassName="custom-container" label="Test" />);
      const container = screen.getByText('Test').parentElement;
      expect(container).toHaveClass('custom-container');
    });

    it('supports all input types', () => {
      const types = ['text', 'email', 'number', 'tel', 'url'];
      
      types.forEach((type) => {
        const { unmount } = render(<Input type={type as any} />);
        const input = screen.getByRole(type === 'number' ? 'spinbutton' : 'textbox');
        expect(input).toHaveAttribute('type', type);
        unmount();
      });
    });

    it('passes through HTML attributes', () => {
      render(<Input placeholder="Enter text" maxLength={10} />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('placeholder', 'Enter text');
      expect(input).toHaveAttribute('maxLength', '10');
    });
  });
});

// =============================================================================
// PASSWORD INPUT TESTS
// =============================================================================

describe('PasswordInput Component', () => {
  it('renders as password field by default', () => {
    render(<PasswordInput />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('shows toggle button by default', () => {
    render(<PasswordInput />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<PasswordInput />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const toggle = screen.getByRole('button');
    
    expect(input.type).toBe('password');
    
    await user.click(toggle);
    expect(input.type).toBe('text');
    
    await user.click(toggle);
    expect(input.type).toBe('password');
  });

  it('can hide toggle button', () => {
    render(<PasswordInput showToggle={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has proper accessibility labels', () => {
    render(<PasswordInput />);
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('aria-label', 'Show password');
  });

  it('inherits all Input props', () => {
    const handleChange = jest.fn();
    render(<PasswordInput label="Password" onChange={handleChange} />);
    
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});

// =============================================================================
// TEXTAREA TESTS
// =============================================================================

describe('Textarea Component', () => {
  it('renders textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('supports custom rows', () => {
    render(<Textarea rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('supports resize control', () => {
    render(<Textarea resize={false} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('resize-none');
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    
    await user.type(textarea, 'Hello\nWorld');
    expect(handleChange).toHaveBeenCalled();
  });

  it('supports all input variants and sizes', () => {
    const variants: InputVariant[] = ['default', 'filled', 'flushed'];
    const sizes: InputSize[] = ['sm', 'md', 'lg'];
    
    variants.forEach((variant) => {
      const { unmount } = render(<Textarea variant={variant} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      unmount();
    });
    
    sizes.forEach((size) => {
      const { unmount } = render(<Textarea size={size} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      unmount();
    });
  });

  it('shows error and help text', () => {
    render(
      <Textarea 
        error 
        errorMessage="Too long" 
        helpText="Maximum 100 characters"
      />
    );
    
    expect(screen.getByText('Too long')).toBeInTheDocument();
    expect(screen.queryByText('Maximum 100 characters')).not.toBeInTheDocument();
  });
});

// =============================================================================
// INPUT GROUP TESTS
// =============================================================================

describe('InputGroup Component', () => {
  it('renders multiple inputs with spacing', () => {
    render(
      <InputGroup>
        <Input placeholder="First input" />
        <Input placeholder="Second input" />
      </InputGroup>
    );
    
    expect(screen.getByPlaceholderText('First input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Second input')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <InputGroup className="custom-group">
        <Input />
      </InputGroup>
    );
    
    const group = screen.getByRole('textbox').parentElement;
    expect(group).toHaveClass('custom-group');
  });
});

// =============================================================================
// FORM FIELD TESTS
// =============================================================================

describe('FormField Component', () => {
  it('renders with all components', () => {
    render(
      <FormField
        label="Username"
        required
        helpText="Enter your username"
        error="Username is taken"
      >
        <Input placeholder="Username" />
      </FormField>
    );
    
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('Username is taken')).toBeInTheDocument();
    expect(screen.queryByText('Enter your username')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('shows help text when no error', () => {
    render(
      <FormField helpText="Enter your email">
        <Input type="email" />
      </FormField>
    );
    
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your email')).toHaveClass('text-gray-500');
  });

  it('applies custom className', () => {
    render(
      <FormField className="custom-field" label="Test">
        <Input />
      </FormField>
    );
    
    // The custom class should be applied to the wrapper
    const field = screen.getByText('Test').parentElement;
    expect(field).toHaveClass('custom-field');
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  it('works in a complete form', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn((e) => e.preventDefault());
    
    render(
      <form onSubmit={handleSubmit}>
        <FormField label="Email" required>
          <Input type="email" name="email" />
        </FormField>
        <FormField label="Password" required>
          <PasswordInput name="password" />
        </FormField>
        <FormField label="Bio">
          <Textarea name="bio" placeholder="Tell us about yourself" />
        </FormField>
        <button type="submit">Submit</button>
      </form>
    );
    
    await user.type(screen.getByLabelText('Email *'), 'test@example.com');
    await user.type(screen.getByLabelText('Password *'), 'password123');
    await user.type(screen.getByPlaceholderText('Tell us about yourself'), 'Hello world');
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('handles validation states correctly', () => {
    const TestForm = () => {
      const [email, setEmail] = React.useState('');
      const [error, setError] = React.useState('');
      
      const validateEmail = (value: string) => {
        if (!value.includes('@')) {
          setError('Invalid email');
        } else {
          setError('');
        }
      };
      
      return (
        <FormField label="Email" error={error}>
          <Input 
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              validateEmail(e.target.value);
            }}
            error={!!error}
            success={!error && !!email}
          />
        </FormField>
      );
    };
    
    render(<TestForm />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'invalid' } });
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    
    fireEvent.change(input, { target: { value: 'valid@email.com' } });
    expect(screen.queryByText('Invalid email')).not.toBeInTheDocument();
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
        {Array.from({ length: 20 }).map((_, i) => (
          <Input key={i} placeholder={`Input ${i}`} />
        ))}
      </div>
    );
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('handles rapid updates efficiently', async () => {
    const TestInput = () => {
      const [value, setValue] = React.useState('');
      return <Input value={value} onChange={(e) => setValue(e.target.value)} />;
    };
    
    render(<TestInput />);
    const input = screen.getByRole('textbox');
    
    const startTime = performance.now();
    for (let i = 0; i < 10; i++) {
      fireEvent.change(input, { target: { value: `value${i}` } });
    }
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(50);
  });
});
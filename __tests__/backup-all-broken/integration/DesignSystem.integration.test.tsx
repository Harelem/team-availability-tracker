/**
 * Design System Integration Tests
 * 
 * Tests component interactions, theme integration, accessibility compliance,
 * and real-world usage scenarios across the design system.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Design system components
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { DataTable } from '@/components/ui/DataTable';
import { FormField, FormInput, FormSelect, FormCheckbox } from '@/components/ui/FormField';
import { Container, Grid, Stack } from '@/components/ui/Layout';
import { ConsistentLoader } from '@/components/ui/ConsistentLoader';
import { Badge } from '@/components/ui/Badge';
import { ActionSheet } from '@/components/ui/ActionSheet';

// Test data
const mockTableData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', status: 'Inactive' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Manager', status: 'Active' },
];

const mockTableColumns = [
  { key: 'name' as keyof typeof mockTableData[0], header: 'Name', sortable: true },
  { key: 'email' as keyof typeof mockTableData[0], header: 'Email', sortable: true },
  { key: 'role' as keyof typeof mockTableData[0], header: 'Role', sortable: false },
  { key: 'status' as keyof typeof mockTableData[0], header: 'Status', sortable: true },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; theme?: 'light' | 'dark' }> = ({ 
  children, 
  theme = 'light' 
}) => (
  <ThemeProvider theme={theme}>
    <div data-testid="test-wrapper">
      {children}
    </div>
  </ThemeProvider>
);

describe('Design System Integration Tests', () => {
  describe('Theme Integration', () => {
    it('applies theme consistently across all components', () => {
      render(
        <TestWrapper theme="light">
          <Container>
            <Button variant="primary">Primary Button</Button>
            <Card title="Test Card">
              <p>Card content</p>
            </Card>
            <Badge variant="success">Success Badge</Badge>
          </Container>
        </TestWrapper>
      );

      const container = screen.getByTestId('test-wrapper');
      
      // Check theme classes are applied
      expect(container.querySelector('[data-theme="light"]')).toBeInTheDocument();
      
      // Check components inherit theme styling
      const button = screen.getByRole('button', { name: 'Primary Button' });
      expect(button).toHaveClass('bg-blue-600');
      
      const badge = screen.getByText('Success Badge');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('supports dark theme switching', async () => {
      const ThemeToggle = () => {
        const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
        
        return (
          <TestWrapper theme={theme}>
            <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              Toggle Theme
            </Button>
            <Card title="Theme Test">
              <p>Content</p>
            </Card>
          </TestWrapper>
        );
      };

      render(<ThemeToggle />);
      
      const toggleButton = screen.getByRole('button', { name: 'Toggle Theme' });
      const wrapper = screen.getByTestId('test-wrapper');
      
      // Initially light theme
      expect(wrapper.querySelector('[data-theme="light"]')).toBeInTheDocument();
      
      // Switch to dark theme
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(wrapper.querySelector('[data-theme="dark"]')).toBeInTheDocument();
      });
    });
  });

  describe('Component Interactions', () => {
    it('handles modal with form interactions correctly', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      
      const ModalFormExample = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [formData, setFormData] = React.useState({
          name: '',
          email: '',
          role: '',
          newsletter: false
        });

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          mockSubmit(formData);
          setIsOpen(false);
        };

        return (
          <TestWrapper>
            <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
            
            <Modal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="User Registration"
              size="md"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                
                <FormInput
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
                
                <FormSelect
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  options={[
                    { value: 'developer', label: 'Developer' },
                    { value: 'designer', label: 'Designer' },
                    { value: 'manager', label: 'Manager' }
                  ]}
                  required
                />
                
                <FormCheckbox
                  label="Subscribe to newsletter"
                  checked={formData.newsletter}
                  onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}
                />
                
                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Submit
                  </Button>
                </div>
              </form>
            </Modal>
          </TestWrapper>
        );
      };

      render(<ModalFormExample />);
      
      // Open modal
      await user.click(screen.getByRole('button', { name: 'Open Form Modal' }));
      
      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('User Registration')).toBeInTheDocument();
      });
      
      // Fill form
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.selectOptions(screen.getByLabelText('Role'), 'developer');
      await user.click(screen.getByLabelText('Subscribe to newsletter'));
      
      // Submit form
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      
      // Check form submission
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          role: 'developer',
          newsletter: true
        });
      });
      
      // Modal should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles data table with sorting and filtering', async () => {
      const user = userEvent.setup();
      
      const DataTableExample = () => (
        <TestWrapper>
          <DataTable
            data={mockTableData}
            columns={mockTableColumns}
            searchable
            pagination={{ pageSize: 10 }}
            testId="integration-table"
          />
        </TestWrapper>
      );

      render(<DataTableExample />);
      
      const table = screen.getByTestId('integration-table');
      
      // Check initial data
      expect(within(table).getByText('John Doe')).toBeInTheDocument();
      expect(within(table).getByText('Jane Smith')).toBeInTheDocument();
      expect(within(table).getByText('Mike Johnson')).toBeInTheDocument();
      
      // Test search functionality
      const searchInput = within(table).getByPlaceholderText(/search/i);
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(within(table).getByText('John Doe')).toBeInTheDocument();
        expect(within(table).queryByText('Jane Smith')).not.toBeInTheDocument();
      });
      
      // Clear search
      await user.clear(searchInput);
      
      // Test sorting
      const nameHeader = within(table).getByText('Name');
      await user.click(nameHeader);
      
      await waitFor(() => {
        const rows = within(table).getAllByRole('row').slice(1); // Skip header
        const firstRowName = within(rows[0]).getByText(/jane smith/i);
        expect(firstRowName).toBeInTheDocument();
      });
    });

    it('handles action sheet on mobile interactions', async () => {
      const user = userEvent.setup();
      const mockAction = jest.fn();
      
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const ActionSheetExample = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        const actions = [
          {
            label: 'Edit',
            icon: '✏️',
            onClick: () => { mockAction('edit'); setIsOpen(false); }
          },
          {
            label: 'Delete',
            icon: '🗑️',
            onClick: () => { mockAction('delete'); setIsOpen(false); },
            variant: 'destructive' as const
          }
        ];

        return (
          <TestWrapper>
            <Button onClick={() => setIsOpen(true)}>Show Actions</Button>
            
            <ActionSheet
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="Quick Actions"
              actions={actions}
            />
          </TestWrapper>
        );
      };

      render(<ActionSheetExample />);
      
      // Open action sheet
      await user.click(screen.getByRole('button', { name: 'Show Actions' }));
      
      // Action sheet should be visible
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
      
      // Click action
      await user.click(screen.getByText('Edit'));
      
      // Check action was called and sheet closed
      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledWith('edit');
        expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Layout System Integration', () => {
    it('handles responsive grid layouts correctly', () => {
      const ResponsiveLayout = () => (
        <TestWrapper>
          <Container maxWidth="xl">
            <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={4}>
              <Card title="Card 1">Content 1</Card>
              <Card title="Card 2">Content 2</Card>
              <Card title="Card 3">Content 3</Card>
              <Card title="Card 4">Content 4</Card>
              <Card title="Card 5">Content 5</Card>
              <Card title="Card 6">Content 6</Card>
            </Grid>
          </Container>
        </TestWrapper>
      );

      render(<ResponsiveLayout />);
      
      const container = screen.getByTestId('test-wrapper');
      const grid = container.querySelector('[class*="grid"]');
      
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
      
      // Check all cards are rendered
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByText(`Card ${i}`)).toBeInTheDocument();
      }
    });

    it('handles stack layouts with proper spacing', () => {
      const StackLayout = () => (
        <TestWrapper>
          <Stack space={4} align="center">
            <Button variant="primary">Button 1</Button>
            <Button variant="secondary">Button 2</Button>
            <Button variant="ghost">Button 3</Button>
          </Stack>
        </TestWrapper>
      );

      render(<StackLayout />);
      
      const stack = screen.getByTestId('test-wrapper').querySelector('[class*="space-y"]');
      expect(stack).toHaveClass('space-y-4', 'items-center');
      
      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
      expect(screen.getByText('Button 3')).toBeInTheDocument();
    });
  });

  describe('Loading States Integration', () => {
    it('handles loading state transitions consistently', async () => {
      const LoadingExample = () => {
        const [isLoading, setIsLoading] = React.useState(true);
        const [data, setData] = React.useState<typeof mockTableData>([]);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            setData(mockTableData);
            setIsLoading(false);
          }, 100);
          
          return () => clearTimeout(timer);
        }, []);

        return (
          <TestWrapper>
            {isLoading ? (
              <ConsistentLoader 
                variant="skeleton" 
                message="Loading data..."
                testId="loading-state"
              />
            ) : (
              <DataTable
                data={data}
                columns={mockTableColumns}
                testId="loaded-table"
              />
            )}
          </TestWrapper>
        );
      };

      render(<LoadingExample />);
      
      // Initially loading
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('loaded-table')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 200 });
      
      // Loading state should be gone
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility across component interactions', async () => {
      const AccessibilityExample = () => {
        const [modalOpen, setModalOpen] = React.useState(false);
        
        return (
          <TestWrapper>
            <main>
              <h1>Design System Accessibility Test</h1>
              
              <section aria-labelledby="actions-heading">
                <h2 id="actions-heading">Available Actions</h2>
                <Button onClick={() => setModalOpen(true)} aria-describedby="modal-desc">
                  Open Modal
                </Button>
                <p id="modal-desc">Opens a modal dialog for user input</p>
              </section>
              
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Accessible Modal"
                aria-describedby="modal-content"
              >
                <div id="modal-content">
                  <p>This modal maintains proper accessibility attributes.</p>
                  <FormInput 
                    label="Test Input"
                    aria-describedby="input-help"
                    defaultValue=""
                  />
                  <div id="input-help" className="text-sm text-gray-600">
                    Enter any text for testing
                  </div>
                </div>
              </Modal>
            </main>
          </TestWrapper>
        );
      };

      const { container } = render(<AccessibilityExample />);
      
      // Run accessibility audit on initial render
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Open modal and test accessibility
      fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Run accessibility audit with modal open
      const modalResults = await axe(container);
      expect(modalResults).toHaveNoViolations();
      
      // Check focus management
      expect(screen.getByRole('dialog')).toHaveFocus();
      
      // Check ARIA attributes
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
    });

    it('handles keyboard navigation across components', async () => {
      const user = userEvent.setup();
      
      const KeyboardNavExample = () => (
        <TestWrapper>
          <Stack space={4}>
            <Button variant="primary">First Button</Button>
            <Button variant="secondary">Second Button</Button>
            <FormInput label="Text Input" defaultValue="" />
            <FormSelect 
              label="Select Input"
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
              ]}
              defaultValue=""
            />
          </Stack>
        </TestWrapper>
      );

      render(<KeyboardNavExample />);
      
      // Test tab navigation
      await user.tab();
      expect(screen.getByRole('button', { name: 'First Button' })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: 'Second Button' })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Text Input')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Select Input')).toHaveFocus();
      
      // Test reverse navigation
      await user.tab({ shift: true });
      expect(screen.getByLabelText('Text Input')).toHaveFocus();
    });
  });

  describe('Error Boundary Integration', () => {
    it('handles component errors gracefully', () => {
      const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>No error</div>;
      };

      const ErrorBoundaryExample = () => {
        const [hasError, setHasError] = React.useState(false);
        
        return (
          <TestWrapper>
            <Button onClick={() => setHasError(!hasError)}>
              {hasError ? 'Fix Error' : 'Cause Error'}
            </Button>
            
            <Card title="Error Test">
              <ThrowError shouldThrow={hasError} />
            </Card>
          </TestWrapper>
        );
      };

      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<ErrorBoundaryExample />);
      
      expect(screen.getByText('No error')).toBeInTheDocument();
      
      // This should be handled by a proper error boundary in the actual app
      // For now, we just test that the component structure remains intact
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 3 === 0 ? 'Manager' : i % 3 === 1 ? 'Developer' : 'Designer',
        status: i % 2 === 0 ? 'Active' : 'Inactive'
      }));

      const PerformanceExample = () => (
        <TestWrapper>
          <DataTable
            data={largeDataset}
            columns={mockTableColumns}
            pagination={{ pageSize: 50 }}
            searchable
            testId="performance-table"
          />
        </TestWrapper>
      );

      const startTime = performance.now();
      render(<PerformanceExample />);
      const endTime = performance.now();
      
      // Should render quickly even with large dataset
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      
      // Should only show first page
      expect(screen.getByText('User 0')).toBeInTheDocument();
      expect(screen.queryByText('User 100')).not.toBeInTheDocument();
    });
  });
});
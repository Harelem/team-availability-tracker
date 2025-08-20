/**
 * Design System Visual Regression Tests
 * 
 * Tests visual consistency and prevents unintended styling changes
 * across all design system components.
 */

import React from 'react';
import { render } from '@testing-library/react';

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

// Test wrapper
const VisualTestWrapper: React.FC<{ 
  children: React.ReactNode; 
  theme?: 'light' | 'dark';
  width?: number;
}> = ({ children, theme = 'light', width = 800 }) => (
  <div style={{ width: `${width}px`, padding: '20px', background: theme === 'dark' ? '#1f2937' : '#ffffff' }}>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </div>
);

describe('Design System Visual Regression Tests', () => {
  describe('Button Component Variants', () => {
    it('renders all button variants correctly', () => {
      const { container } = render(
        <VisualTestWrapper>
          <Stack space={4}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Button Variants
              </h3>
              <Stack space={3}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="primary" size="sm">Small Primary</Button>
                  <Button variant="secondary" size="md">Medium Secondary</Button>
                  <Button variant="ghost" size="lg">Large Ghost</Button>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="primary" disabled>Disabled Primary</Button>
                  <Button variant="secondary" loading>Loading Secondary</Button>
                  <Button variant="ghost" icon="🔍">With Icon</Button>
                </div>
              </Stack>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('button-variants');
    });

    it('renders button variants in dark theme', () => {
      const { container } = render(
        <VisualTestWrapper theme="dark">
          <Stack space={3}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('button-variants-dark');
    });
  });

  describe('Card Component Variants', () => {
    it('renders card variants and states', () => {
      const { container } = render(
        <VisualTestWrapper>
          <Grid cols={{ base: 1, md: 2 }} gap={4}>
            <Card title="Basic Card">
              <p>This is a basic card with title and content.</p>
            </Card>
            
            <Card 
              title="Interactive Card" 
              subtitle="Click me"
              interactive
              onClick={() => {}}
            >
              <p>This card is interactive and has a hover state.</p>
            </Card>
            
            <Card 
              variant="elevated"
              title="Elevated Card"
              headerAction={<Button size="sm" variant="ghost">Action</Button>}
            >
              <p>This card has elevation and a header action.</p>
            </Card>
            
            <Card 
              variant="outlined"
              title="Outlined Card"
              badge={{ text: "New", variant: "primary" }}
            >
              <p>This card has an outline style and badge.</p>
            </Card>
          </Grid>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('card-variants');
    });
  });

  describe('Form Component Variants', () => {
    it('renders form components with various states', () => {
      const { container } = render(
        <VisualTestWrapper>
          <Stack space={6}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Form Components
              </h3>
              
              <Stack space={4}>
                <FormInput
                  label="Default Input"
                  placeholder="Enter text..."
                  defaultValue=""
                />
                
                <FormInput
                  label="Input with Value"
                  defaultValue="Sample text content"
                />
                
                <FormInput
                  label="Required Input"
                  required
                  placeholder="Required field"
                  defaultValue=""
                />
                
                <FormInput
                  label="Input with Error"
                  error="This field is required"
                  defaultValue=""
                />
                
                <FormInput
                  label="Disabled Input"
                  disabled
                  defaultValue="Disabled content"
                />
                
                <FormSelect
                  label="Select Dropdown"
                  options={[
                    { value: '', label: 'Choose option...' },
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                  ]}
                  defaultValue=""
                />
                
                <div style={{ display: 'flex', gap: '24px' }}>
                  <FormCheckbox
                    label="Standard Checkbox"
                    defaultChecked={false}
                  />
                  
                  <FormCheckbox
                    label="Checked Checkbox"
                    defaultChecked={true}
                  />
                  
                  <FormCheckbox
                    label="Disabled Checkbox"
                    disabled
                    defaultChecked={false}
                  />
                </div>
              </Stack>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('form-components');
    });
  });

  describe('Badge Component Variants', () => {
    it('renders all badge variants and sizes', () => {
      const { container } = render(
        <VisualTestWrapper>
          <Stack space={4}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Badge Variants
              </h3>
              
              <Stack space={3}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge variant="primary" size="sm">Small</Badge>
                  <Badge variant="success" size="md">Medium</Badge>
                  <Badge variant="error" size="lg">Large</Badge>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge variant="primary" dot>With Dot</Badge>
                  <Badge variant="success" removable onRemove={() => {}}>Removable</Badge>
                  <Badge variant="info" icon="🔍">With Icon</Badge>
                </div>
              </Stack>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('badge-variants');
    });
  });

  describe('Table Component Variants', () => {
    it('renders table with data and various states', () => {
      const tableData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer', status: 'Active' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', status: 'Inactive' },
        { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Manager', status: 'Active' },
      ];

      const columns = [
        { key: 'name' as keyof typeof tableData[0], header: 'Name' },
        { key: 'email' as keyof typeof tableData[0], header: 'Email' },
        { key: 'role' as keyof typeof tableData[0], header: 'Role' },
        { key: 'status' as keyof typeof tableData[0], header: 'Status' },
      ];

      const { container } = render(
        <VisualTestWrapper width={900}>
          <Stack space={6}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Table Components
              </h3>
              
              <Table data={tableData} columns={columns} />
            </div>
            
            <div>
              <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                Data Table with Features
              </h4>
              
              <DataTable
                data={tableData}
                columns={columns.map(col => ({ ...col, sortable: true }))}
                searchable
                pagination={{ pageSize: 10 }}
              />
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('table-variants');
    });
  });

  describe('Loading Component Variants', () => {
    it('renders loading states and skeletons', () => {
      const { container } = render(
        <VisualTestWrapper>
          <Stack space={6}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Loading States
              </h3>
              
              <Grid cols={{ base: 1, md: 2 }} gap={6}>
                <div>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    Consistent Loaders
                  </h4>
                  
                  <Stack space={4}>
                    <ConsistentLoader variant="spinner" message="Loading data..." />
                    <ConsistentLoader variant="pulse" message="Processing..." />
                    <ConsistentLoader variant="skeleton" />
                  </Stack>
                </div>
                
                <div>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    Loading Skeletons
                  </h4>
                  
                  <Stack space={4}>
                    <LoadingSkeleton lines={3} />
                    <LoadingSkeleton lines={2} avatar />
                    <LoadingSkeleton lines={4} actions />
                  </Stack>
                </div>
              </Grid>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('loading-variants');
    });
  });

  describe('Layout Component System', () => {
    it('renders layout components with proper spacing', () => {
      const { container } = render(
        <VisualTestWrapper width={1000}>
          <Stack space={6}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Layout System
              </h3>
              
              <Container maxWidth="lg">
                <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={4}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <Card key={i} title={`Card ${i + 1}`}>
                      <p>Content for card {i + 1}</p>
                    </Card>
                  ))}
                </Grid>
              </Container>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                Stack Layout
              </h4>
              
              <Stack space={3} align="center">
                <Button variant="primary">First Item</Button>
                <Button variant="secondary">Second Item</Button>
                <Button variant="ghost">Third Item</Button>
              </Stack>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('layout-system');
    });
  });

  describe('Modal Component States', () => {
    it('renders modal in open state', () => {
      const { container } = render(
        <VisualTestWrapper width={1000}>
          <div style={{ position: 'relative', height: '600px' }}>
            {/* Modal backdrop and content */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              <div 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '500px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Modal Title
                  </h2>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    This is a modal dialog with form content
                  </p>
                </div>
                
                <Stack space={4}>
                  <FormInput label="Name" defaultValue="" />
                  <FormInput label="Email" type="email" defaultValue="" />
                  <FormSelect 
                    label="Role" 
                    options={[
                      { value: 'dev', label: 'Developer' },
                      { value: 'design', label: 'Designer' }
                    ]}
                    defaultValue=""
                  />
                  
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="primary">Save</Button>
                  </div>
                </Stack>
              </div>
            </div>
          </div>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('modal-open-state');
    });
  });

  describe('Action Sheet Mobile Component', () => {
    it('renders action sheet in open state', () => {
      const { container } = render(
        <VisualTestWrapper width={375}>
          <div style={{ position: 'relative', height: '600px' }}>
            {/* Action sheet backdrop */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center'
              }}
            >
              {/* Action sheet content */}
              <div 
                style={{
                  backgroundColor: 'white',
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px',
                  padding: '24px',
                  width: '100%',
                  maxHeight: '50%'
                }}
              >
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <div 
                    style={{
                      width: '32px',
                      height: '4px',
                      backgroundColor: '#d1d5db',
                      borderRadius: '2px',
                      margin: '0 auto 16px'
                    }}
                  />
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Quick Actions</h3>
                </div>
                
                <Stack space={3}>
                  <Button variant="ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    ✏️ Edit Item
                  </Button>
                  <Button variant="ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    📋 Copy Link
                  </Button>
                  <Button 
                    variant="ghost" 
                    style={{ 
                      width: '100%', 
                      justifyContent: 'flex-start',
                      color: '#dc2626'
                    }}
                  >
                    🗑️ Delete Item
                  </Button>
                </Stack>
              </div>
            </div>
          </div>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('action-sheet-mobile');
    });
  });

  describe('Responsive Breakpoints', () => {
    it('renders components at mobile viewport', () => {
      const { container } = render(
        <VisualTestWrapper width={375}>
          <Stack space={4}>
            <Card title="Mobile Card">
              <p>Content optimized for mobile</p>
              <div style={{ marginTop: '16px' }}>
                <Button variant="primary" style={{ width: '100%' }}>
                  Full Width Button
                </Button>
              </div>
            </Card>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <Badge variant="success">Mobile Badge 1</Badge>
              <Badge variant="warning">Mobile Badge 2</Badge>
              <Badge variant="error">Mobile Badge 3</Badge>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('mobile-viewport');
    });

    it('renders components at tablet viewport', () => {
      const { container } = render(
        <VisualTestWrapper width={768}>
          <Grid cols={{ base: 1, md: 2 }} gap={4}>
            <Card title="Tablet Card 1">
              <p>Content for tablet view</p>
            </Card>
            <Card title="Tablet Card 2">
              <p>Content for tablet view</p>
            </Card>
          </Grid>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('tablet-viewport');
    });

    it('renders components at desktop viewport', () => {
      const { container } = render(
        <VisualTestWrapper width={1200}>
          <Grid cols={{ base: 1, lg: 3 }} gap={6}>
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} title={`Desktop Card ${i + 1}`}>
                <p>Content optimized for desktop view</p>
                <div style={{ marginTop: '16px' }}>
                  <Button variant="primary">Action</Button>
                </div>
              </Card>
            ))}
          </Grid>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('desktop-viewport');
    });
  });

  describe('Error States', () => {
    it('renders error states consistently', () => {
      const { container } = render(
        <VisualTestWrapper>
          <Stack space={6}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
                Error States
              </h3>
              
              <Stack space={4}>
                <Card variant="outlined" title="Form Errors">
                  <Stack space={3}>
                    <FormInput 
                      label="Invalid Email"
                      error="Please enter a valid email address"
                      defaultValue="invalid-email"
                    />
                    
                    <FormInput
                      label="Required Field"
                      error="This field is required"
                      required
                      defaultValue=""
                    />
                  </Stack>
                </Card>
                
                <Card variant="outlined" title="Error Badge">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Badge variant="error">Error Status</Badge>
                    <Badge variant="warning">Warning Status</Badge>
                  </div>
                </Card>
                
                <Card variant="outlined" title="Error Button">
                  <Button variant="destructive">Delete Action</Button>
                </Card>
              </Stack>
            </div>
          </Stack>
        </VisualTestWrapper>
      );

      expect(container.firstChild).toMatchSnapshot('error-states');
    });
  });
});
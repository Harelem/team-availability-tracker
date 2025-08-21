# Design System Migration Guide

This guide provides step-by-step instructions for migrating existing components to use the new enhanced design system.

## Quick Start

### 1. Component Imports
Replace old component imports with new design system components:

```tsx
// Before
import { Card } from '@/components/ui/card';

// After
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stack, Flex, Container } from '@/components/ui/Layout';
```

### 2. Basic Layout Migration

Replace manual flex/grid layouts with semantic components:

```tsx
// Before
<div className="flex flex-col space-y-4">
  <div className="flex items-center justify-between">
    <h2>Title</h2>
    <button>Action</button>
  </div>
  <div>Content</div>
</div>

// After
<Stack spacing={4}>
  <Flex justify="between" align="center">
    <h2>Title</h2>
    <Button>Action</Button>
  </Flex>
  <div>Content</div>
</Stack>
```

## Component Migration Examples

### Button Migration

```tsx
// Before
<button
  onClick={handleClick}
  disabled={isLoading}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>

// After
<Button
  variant="primary"
  size="md"
  onClick={handleClick}
  loading={isLoading}
  loadingText="Loading..."
>
  Submit
</Button>
```

### Card Migration

```tsx
// Before
<div className="bg-white rounded-lg shadow-md border p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Title</h3>
  <p className="text-sm text-gray-600 mb-4">Card description</p>
  <div>Card content</div>
  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
    <button>Action</button>
  </div>
</div>

// After
<Card variant="default">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Form Migration

```tsx
// Before
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Email *
    </label>
    <input
      type="email"
      required
      className="w-full border border-gray-300 rounded-md px-4 py-2"
    />
    {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
  </div>
</div>

// After
<FormField
  label="Email"
  required
  error={error}
>
  <Input type="email" />
</FormField>
```

### Loading State Migration

```tsx
// Before
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-6 bg-gray-200 rounded mb-4"></div>
    <div className="h-4 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  </div>
) : (
  <div>Content</div>
)}

// After
{isLoading ? (
  <LoadingCard title description />
) : (
  <div>Content</div>
)}
```

### Badge Migration

```tsx
// Before
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
  {status}
</span>

// After
<Badge variant="primary" size="sm">
  {status}
</Badge>

// For status badges
<StatusBadge status="online" showText />
```

### Modal Migration

```tsx
// Before
{isOpen && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
    <div className="flex items-center justify-center min-h-full p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3>Modal Title</h3>
        <p>Modal content</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
)}

// After
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  size="md"
>
  <ModalBody>
    Modal content
  </ModalBody>
  <ModalFooter>
    <Button onClick={onClose}>Close</Button>
  </ModalFooter>
</Modal>
```

## Migration Patterns

### 1. Layout-First Approach

Start with layout components to establish structure:

```tsx
// Step 1: Add Container for consistent spacing
<Container size="xl">
  {/* existing content */}
</Container>

// Step 2: Replace flex layouts with Stack/Flex
<Stack spacing={6}>
  <Flex justify="between" align="center">
    {/* header content */}
  </Flex>
  {/* main content */}
</Stack>

// Step 3: Add responsive props as needed
<Stack spacing={{ base: 4, md: 6 }}>
  <Flex direction={{ base: 'col', md: 'row' }} gap={4}>
    {/* responsive content */}
  </Flex>
</Stack>
```

### 2. Component-by-Component Migration

Migrate components in this order for best results:

1. **Layout Components** (Container, Stack, Flex, Grid)
2. **Basic UI** (Button, Input, Card)
3. **Form Components** (FormField, FormInput, FormSelect)
4. **Complex Components** (Modal, DataTable, ActionSheet)
5. **Specialized Components** (Badge, Loading, Status indicators)

### 3. Props Mapping

Many props have direct mappings:

```tsx
// Size mapping
className="text-sm" → size="sm"
className="h-8" → size="sm"
className="h-10" → size="md"
className="h-12" → size="lg"

// Variant mapping
className="bg-blue-600" → variant="primary"
className="bg-gray-100" → variant="secondary"
className="border border-gray-300" → variant="outline"

// State mapping
disabled={true} → disabled={true}
className="opacity-50" → loading={true}
```

## Testing Migration

### 1. Visual Testing

Before and after screenshots to ensure visual consistency:

```tsx
// Add testId props for easier testing
<Button testId="submit-button" variant="primary">
  Submit
</Button>
```

### 2. Accessibility Testing

The new components include built-in accessibility:

```tsx
// Before: Manual ARIA attributes
<button
  aria-label="Close modal"
  aria-describedby="modal-description"
>
  Close
</button>

// After: Automatic accessibility
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  description="Modal description"
>
  {/* Accessibility handled automatically */}
</Modal>
```

## Common Patterns

### Loading States
```tsx
// Loading overlay
<LoadingOverlay loading={isLoading} message="Loading data...">
  <YourContent />
</LoadingOverlay>

// Loading skeletons
<LoadingTable rows={5} columns={4} />
<LoadingCard title description avatar />
```

### Error States
```tsx
<Card variant="error">
  <CardContent>
    <ErrorDisplay
      error={error}
      showRetry={true}
      onRetry={handleRetry}
    />
  </CardContent>
</Card>
```

### Interactive Elements
```tsx
<Card
  variant="interactive"
  onClick={handleClick}
  className="cursor-pointer hover:shadow-md"
>
  <CardContent>Interactive card content</CardContent>
</Card>
```

## Performance Considerations

### 1. Bundle Size
The new components are tree-shakeable:

```tsx
// Import only what you need
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
```

### 2. Re-renders
Use memoization for expensive operations:

```tsx
const memoizedProps = useMemo(() => ({
  variant: getVariantFromStatus(status),
  size: getSizeFromBreakpoint(breakpoint)
}), [status, breakpoint]);

return <Button {...memoizedProps}>Action</Button>;
```

## Migration Checklist

- [ ] Replace basic HTML elements with design system components
- [ ] Update layout from manual CSS to semantic layout components  
- [ ] Migrate form elements to FormField components
- [ ] Add proper loading and error states
- [ ] Update button styles to use variants
- [ ] Replace manual modals with Modal component
- [ ] Add accessibility testing
- [ ] Update component tests
- [ ] Verify responsive behavior
- [ ] Check bundle size impact

## Need Help?

For complex migrations or questions:

1. Check the component documentation in Storybook
2. Look at the enhanced component examples
3. Review the test files for usage patterns
4. Use the TypeScript types for guidance
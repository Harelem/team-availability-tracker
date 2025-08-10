# Button Component

A versatile, accessible button component with multiple variants, sizes, and states. Built with TypeScript and full accessibility support.

## Import

```typescript
import { Button } from '@/components/ui/Button';
import type { ButtonProps } from '@/components/ui/Button';
```

## Basic Usage

```typescript
<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'link' \| 'destructive'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable button interaction |
| `icon` | `string \| React.ReactNode` | - | Icon to display alongside text |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position of icon relative to text |
| `fullWidth` | `boolean` | `false` | Make button full width |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | `(event: MouseEvent) => void` | - | Click event handler |
| `onFocus` | `(event: FocusEvent) => void` | - | Focus event handler |
| `onBlur` | `(event: FocusEvent) => void` | - | Blur event handler |
| `className` | `string` | - | Additional CSS classes |
| `children` | `React.ReactNode` | - | Button content |
| `...rest` | `React.ButtonHTMLAttributes<HTMLButtonElement>` | - | All other button props |

### Variants

#### Primary
Main call-to-action button with high emphasis.
```typescript
<Button variant="primary">Primary Action</Button>
```

#### Secondary
Secondary action button with medium emphasis.
```typescript
<Button variant="secondary">Secondary Action</Button>
```

#### Ghost
Subtle button with minimal visual weight.
```typescript
<Button variant="ghost">Ghost Button</Button>
```

#### Link
Button styled as a link.
```typescript
<Button variant="link">Link Button</Button>
```

#### Destructive
Dangerous or destructive actions.
```typescript
<Button variant="destructive">Delete Item</Button>
```

### Sizes

#### Small (`sm`)
Compact button for tight spaces.
```typescript
<Button size="sm">Small Button</Button>
```

#### Medium (`md`)
Default button size for most use cases.
```typescript
<Button size="md">Medium Button</Button>
```

#### Large (`lg`)
Prominent button for important actions.
```typescript
<Button size="lg">Large Button</Button>
```

## Examples

### Loading State
```typescript
const [loading, setLoading] = useState(false);

const handleSave = async () => {
  setLoading(true);
  try {
    await saveData();
  } finally {
    setLoading(false);
  }
};

<Button 
  variant="primary" 
  loading={loading}
  onClick={handleSave}
>
  {loading ? 'Saving...' : 'Save Changes'}
</Button>
```

### With Icon
```typescript
<Button variant="primary" icon="🔍">
  Search
</Button>

<Button variant="secondary" icon={<SearchIcon />} iconPosition="left">
  Search with Component Icon
</Button>
```

### Full Width
```typescript
<div className="w-full max-w-md">
  <Button variant="primary" fullWidth>
    Full Width Button
  </Button>
</div>
```

### Form Buttons
```typescript
<form onSubmit={handleSubmit}>
  <div className="flex justify-end space-x-3">
    <Button type="button" variant="ghost" onClick={onCancel}>
      Cancel
    </Button>
    <Button type="submit" variant="primary">
      Submit
    </Button>
  </div>
</form>
```

### Disabled State
```typescript
<Button variant="primary" disabled>
  Disabled Button
</Button>

// Conditional disable
<Button 
  variant="primary" 
  disabled={!formValid}
  onClick={handleSubmit}
>
  Submit Form
</Button>
```

### Button Groups
```typescript
<div className="flex space-x-2">
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Save as Draft</Button>
  <Button variant="ghost">Cancel</Button>
</div>

// Vertical button group
<div className="flex flex-col space-y-2">
  <Button variant="primary">Option 1</Button>
  <Button variant="secondary">Option 2</Button>
  <Button variant="ghost">Option 3</Button>
</div>
```

## Accessibility

### Keyboard Support
- **Enter**: Activates the button
- **Space**: Activates the button
- **Tab**: Focuses the button (if not disabled)

### ARIA Attributes
The Button component automatically includes:
- `role="button"` (when not using native button element)
- `aria-disabled="true"` when disabled
- `aria-label` support for accessibility labels
- `aria-describedby` support for additional descriptions

### Screen Reader Support
```typescript
<Button 
  aria-label="Delete user John Doe"
  aria-describedby="delete-help"
  variant="destructive"
  onClick={handleDelete}
>
  Delete
</Button>
<div id="delete-help" className="sr-only">
  This action cannot be undone
</div>
```

## Styling

### Custom Styles
```typescript
// Using className prop
<Button 
  variant="primary" 
  className="shadow-lg hover:shadow-xl transition-shadow"
>
  Custom Styled Button
</Button>

// Using CSS modules or styled-components
const StyledButton = styled(Button)`
  background: linear-gradient(45deg, #purple-500, #pink-500);
  
  &:hover {
    background: linear-gradient(45deg, #purple-600, #pink-600);
  }
`;
```

### Theme Customization
```typescript
// Custom theme with button variants
const customTheme = {
  components: {
    Button: {
      variants: {
        gradient: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        neon: 'bg-black border border-green-400 text-green-400 hover:bg-green-400 hover:text-black',
      },
    },
  },
};
```

## Testing

### Unit Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

test('Button renders with correct text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});

test('Button handles click events', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();
  
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});

test('Button is disabled when disabled prop is true', () => {
  render(<Button disabled>Disabled</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
});

test('Button shows loading state', () => {
  render(<Button loading>Loading</Button>);
  expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
});
```

### Accessibility Testing
```typescript
import { axe } from 'jest-axe';

test('Button has no accessibility violations', async () => {
  const { container } = render(
    <Button variant="primary">Accessible Button</Button>
  );
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Testing
```typescript
test('Button renders all variants correctly', () => {
  const { container } = render(
    <div>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  );
  
  expect(container).toMatchSnapshot();
});
```

## Performance

### Bundle Size
- **Gzipped**: ~3KB
- **Minified**: ~8KB
- **Tree-shakeable**: Yes

### Rendering Performance
- **Average render time**: <2ms
- **Re-render optimization**: Uses React.forwardRef and memo where appropriate
- **Memory efficient**: No memory leaks in mount/unmount cycles

### Performance Tips
```typescript
// Use React.memo for buttons that don't change often
const MemoizedButton = React.memo(Button);

// Avoid creating new objects in render
const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);

<Button onClick={handleClick}>Optimized</Button>
```

## Migration

### From Legacy Button
```typescript
// Legacy button
<button className="btn btn-primary" onClick={handleClick}>
  Legacy Button
</button>

// Design system button
<Button variant="primary" onClick={handleClick}>
  Design System Button
</Button>
```

### Props Migration
| Legacy Prop | New Prop | Notes |
|-------------|----------|--------|
| `type="primary"` | `variant="primary"` | Renamed for clarity |
| `size="large"` | `size="lg"` | Shortened size names |
| `isLoading` | `loading` | Simplified name |
| `isDisabled` | `disabled` | Simplified name |
| `fullwidth` | `fullWidth` | Camel case |

## Troubleshooting

### Common Issues

#### Button not showing loading spinner
```typescript
// Make sure loading prop is passed
<Button loading={isLoading}>
  Submit
</Button>
```

#### Custom styles not applying
```typescript
// Ensure Tailwind classes are available or use !important
<Button className="!bg-purple-500">
  Custom Color
</Button>

// Or use CSS-in-JS solutions
const customStyles = {
  backgroundColor: 'purple',
};

<Button style={customStyles}>
  Custom Styled
</Button>
```

#### TypeScript errors
```typescript
// Import types explicitly if needed
import type { ButtonProps } from '@/components/ui/Button';

interface CustomButtonProps extends ButtonProps {
  customProp?: string;
}
```

## Related Components

- **[IconButton](./IconButton.md)**: Button optimized for icon-only usage
- **[ButtonGroup](./ButtonGroup.md)**: Component for grouping related buttons
- **[LoadingButton](./LoadingButton.md)**: Button with integrated loading states
- **[SplitButton](./SplitButton.md)**: Button with dropdown menu

---

The Button component is a foundational element of the design system, providing consistent interaction patterns and accessibility features across the application.
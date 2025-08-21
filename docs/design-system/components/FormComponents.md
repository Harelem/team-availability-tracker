# Form Components

A comprehensive set of form components with built-in validation, accessibility, and consistent styling. Includes inputs, selects, checkboxes, and more.

## Import

```typescript
import { 
  FormInput, 
  FormSelect, 
  FormCheckbox, 
  FormRadio,
  FormTextarea,
  FormPassword 
} from '@/components/ui/FormField';

import type { 
  FormInputProps, 
  FormSelectProps, 
  FormCheckboxProps 
} from '@/components/ui/FormField';
```

## FormInput

### Basic Usage
```typescript
<FormInput
  label="Full Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Enter your full name"
  required
/>
```

### API Reference
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Input label text |
| `value` | `string` | - | Input value |
| `onChange` | `(event: ChangeEvent<HTMLInputElement>) => void` | - | Change handler |
| `type` | `'text' \| 'email' \| 'tel' \| 'url' \| 'search'` | `'text'` | Input type |
| `placeholder` | `string` | - | Placeholder text |
| `error` | `string` | - | Error message to display |
| `helperText` | `string` | - | Helper text below input |
| `required` | `boolean` | `false` | Mark as required field |
| `disabled` | `boolean` | `false` | Disable the input |
| `readOnly` | `boolean` | `false` | Make input read-only |
| `autoComplete` | `string` | - | Autocomplete attribute |
| `maxLength` | `number` | - | Maximum character length |
| `minLength` | `number` | - | Minimum character length |
| `pattern` | `string` | - | Validation pattern (regex) |

### Examples
```typescript
// Email input with validation
<FormInput
  type="email"
  label="Email Address"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  helperText="We'll never share your email"
  required
  autoComplete="email"
/>

// Phone number input
<FormInput
  type="tel"
  label="Phone Number"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="+1 (555) 123-4567"
  pattern="[+]?[\d\s\(\)-]+"
/>

// Search input
<FormInput
  type="search"
  label="Search"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Search users..."
/>
```

## FormPassword

### Basic Usage
```typescript
<FormPassword
  label="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  showToggle
  required
/>
```

### API Reference
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showToggle` | `boolean` | `true` | Show password visibility toggle |
| `strengthMeter` | `boolean` | `false` | Show password strength indicator |
| All FormInput props | - | - | Inherits all FormInput props |

### Examples
```typescript
// Password with strength meter
<FormPassword
  label="New Password"
  value={newPassword}
  onChange={(e) => setNewPassword(e.target.value)}
  strengthMeter
  helperText="Must be at least 8 characters with mixed case"
  minLength={8}
  required
/>

// Confirm password
<FormPassword
  label="Confirm Password"
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  error={passwordsMatch ? undefined : "Passwords don't match"}
  showToggle={false}
  required
/>
```

## FormSelect

### Basic Usage
```typescript
<FormSelect
  label="Role"
  value={selectedRole}
  onChange={(e) => setSelectedRole(e.target.value)}
  options={[
    { value: '', label: 'Select a role...' },
    { value: 'admin', label: 'Administrator' },
    { value: 'user', label: 'User' },
    { value: 'viewer', label: 'Viewer' },
  ]}
  required
/>
```

### API Reference
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `Array<{ value: string, label: string, disabled?: boolean }>` | - | Select options |
| `multiple` | `boolean` | `false` | Allow multiple selections |
| `searchable` | `boolean` | `false` | Enable search functionality |
| `placeholder` | `string` | - | Placeholder text |
| All FormInput props except `type` | - | - | Inherits applicable FormInput props |

### Examples
```typescript
// Multiple select
<FormSelect
  label="Skills"
  value={selectedSkills}
  onChange={(e) => setSelectedSkills(Array.from(e.target.selectedOptions, option => option.value))}
  options={skillOptions}
  multiple
  helperText="Select all applicable skills"
/>

// Searchable select (requires custom implementation)
<FormSelect
  label="Country"
  value={selectedCountry}
  onChange={(e) => setSelectedCountry(e.target.value)}
  options={countryOptions}
  searchable
  placeholder="Search countries..."
/>

// Grouped options
<FormSelect
  label="Department"
  value={department}
  onChange={(e) => setDepartment(e.target.value)}
  options={[
    { value: '', label: 'Select department...' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'design', label: 'Design' },
    { value: 'product', label: 'Product' },
    { value: 'marketing', label: 'Marketing', disabled: true },
  ]}
/>
```

## FormCheckbox

### Basic Usage
```typescript
<FormCheckbox
  label="Subscribe to newsletter"
  checked={isSubscribed}
  onChange={(e) => setIsSubscribed(e.target.checked)}
/>
```

### API Reference
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Checkbox label |
| `checked` | `boolean` | - | Checked state |
| `onChange` | `(event: ChangeEvent<HTMLInputElement>) => void` | - | Change handler |
| `indeterminate` | `boolean` | `false` | Indeterminate state |
| `disabled` | `boolean` | `false` | Disable the checkbox |
| `error` | `string` | - | Error message |
| `helperText` | `string` | - | Helper text |
| `required` | `boolean` | `false` | Mark as required |

### Examples
```typescript
// Required checkbox (terms acceptance)
<FormCheckbox
  label="I agree to the Terms of Service and Privacy Policy"
  checked={acceptedTerms}
  onChange={(e) => setAcceptedTerms(e.target.checked)}
  required
  error={!acceptedTerms && submitted ? "Please accept the terms" : undefined}
/>

// Indeterminate checkbox (select all)
<FormCheckbox
  label="Select All"
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  onChange={handleSelectAll}
/>

// Checkbox group
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Notifications
  </label>
  <FormCheckbox
    label="Email notifications"
    checked={notifications.email}
    onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
  />
  <FormCheckbox
    label="SMS notifications"
    checked={notifications.sms}
    onChange={(e) => setNotifications(prev => ({ ...prev, sms: e.target.checked }))}
  />
  <FormCheckbox
    label="Push notifications"
    checked={notifications.push}
    onChange={(e) => setNotifications(prev => ({ ...prev, push: e.target.checked }))}
  />
</div>
```

## FormRadio

### Basic Usage
```typescript
<FormRadio
  name="theme"
  options={[
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'auto', label: 'Auto (System)' },
  ]}
  value={selectedTheme}
  onChange={(value) => setSelectedTheme(value)}
  label="Choose Theme"
/>
```

### API Reference
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Radio group name |
| `options` | `Array<{ value: string, label: string, disabled?: boolean }>` | - | Radio options |
| `value` | `string` | - | Selected value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `label` | `string` | - | Group label |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout orientation |
| `error` | `string` | - | Error message |
| `helperText` | `string` | - | Helper text |
| `required` | `boolean` | `false` | Mark as required |

### Examples
```typescript
// Horizontal radio group
<FormRadio
  name="account-type"
  label="Account Type"
  options={[
    { value: 'personal', label: 'Personal' },
    { value: 'business', label: 'Business' },
    { value: 'enterprise', label: 'Enterprise' },
  ]}
  value={accountType}
  onChange={setAccountType}
  orientation="horizontal"
  required
/>

// Radio with descriptions
<FormRadio
  name="plan"
  label="Choose Plan"
  options={[
    { 
      value: 'basic', 
      label: 'Basic Plan',
      description: 'Perfect for individuals' 
    },
    { 
      value: 'pro', 
      label: 'Pro Plan',
      description: 'Great for small teams' 
    },
    { 
      value: 'enterprise', 
      label: 'Enterprise Plan',
      description: 'For large organizations' 
    },
  ]}
  value={selectedPlan}
  onChange={setSelectedPlan}
/>
```

## FormTextarea

### Basic Usage
```typescript
<FormTextarea
  label="Comments"
  value={comments}
  onChange={(e) => setComments(e.target.value)}
  rows={4}
  placeholder="Enter your comments..."
/>
```

### API Reference
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `number` | `3` | Number of visible rows |
| `cols` | `number` | - | Number of visible columns |
| `resize` | `'none' \| 'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | Resize behavior |
| `autoResize` | `boolean` | `false` | Auto-resize to content |
| All FormInput props except `type` | - | - | Inherits applicable FormInput props |

### Examples
```typescript
// Auto-resizing textarea
<FormTextarea
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  autoResize
  maxLength={500}
  helperText={`${description.length}/500 characters`}
/>

// Fixed size textarea
<FormTextarea
  label="Code"
  value={code}
  onChange={(e) => setCode(e.target.value)}
  rows={10}
  resize="none"
  className="font-mono"
  placeholder="Enter your code here..."
/>
```

## Form Validation

### Built-in Validation
```typescript
// Email validation
<FormInput
  type="email"
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  error={emailError}
/>

// Pattern validation
<FormInput
  label="Phone"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
  title="Format: 123-456-7890"
  error={phoneError}
/>
```

### Custom Validation
```typescript
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : 'Invalid email format';
};

const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
  const newEmail = e.target.value;
  setEmail(newEmail);
  setEmailError(validateEmail(newEmail));
};

<FormInput
  type="email"
  label="Email"
  value={email}
  onChange={handleEmailChange}
  error={emailError}
  required
/>
```

### Form-level Validation
```typescript
interface FormData {
  name: string;
  email: string;
  role: string;
  acceptedTerms: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  role?: string;
  acceptedTerms?: string;
}

const validateForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {};
  
  if (!data.name.trim()) {
    errors.name = 'Name is required';
  }
  
  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (!data.role) {
    errors.role = 'Please select a role';
  }
  
  if (!data.acceptedTerms) {
    errors.acceptedTerms = 'You must accept the terms';
  }
  
  return errors;
};

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  const errors = validateForm(formData);
  setFormErrors(errors);
  
  if (Object.keys(errors).length === 0) {
    // Form is valid, submit data
    onSubmit(formData);
  }
};
```

## Accessibility

### Screen Reader Support
All form components include:
- Proper labeling with `<label>` elements
- Error messages associated with `aria-describedby`
- Required field indicators
- Helper text associations

### Keyboard Navigation
- **Tab**: Navigate between form fields
- **Space**: Toggle checkboxes and radio buttons
- **Enter**: Submit forms (when focused on submit button)
- **Arrow keys**: Navigate radio button groups

### Example Accessible Form
```typescript
<form onSubmit={handleSubmit} aria-labelledby="registration-title">
  <h2 id="registration-title">User Registration</h2>
  
  <FormInput
    label="Full Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    required
    error={errors.name}
    aria-describedby="name-help"
  />
  <div id="name-help" className="text-sm text-gray-600">
    Enter your first and last name
  </div>
  
  <FormInput
    type="email"
    label="Email Address"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
    error={errors.email}
    autoComplete="email"
  />
  
  <FormCheckbox
    label="I agree to the Terms of Service"
    checked={acceptedTerms}
    onChange={(e) => setAcceptedTerms(e.target.checked)}
    required
    error={errors.acceptedTerms}
    aria-describedby="terms-help"
  />
  <div id="terms-help" className="text-sm text-gray-600">
    Please read our <a href="/terms">Terms of Service</a>
  </div>
</form>
```

## Testing

### Unit Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from '@/components/ui/FormField';

test('FormInput displays error message', () => {
  render(
    <FormInput
      label="Email"
      value="invalid-email"
      onChange={() => {}}
      error="Invalid email format"
    />
  );
  
  expect(screen.getByText('Invalid email format')).toBeInTheDocument();
});

test('FormCheckbox toggles when clicked', async () => {
  const user = userEvent.setup();
  const handleChange = jest.fn();
  
  render(
    <FormCheckbox
      label="Accept terms"
      checked={false}
      onChange={handleChange}
    />
  );
  
  await user.click(screen.getByLabelText('Accept terms'));
  expect(handleChange).toHaveBeenCalledWith(
    expect.objectContaining({ target: expect.objectContaining({ checked: true }) })
  );
});
```

## Styling

### Custom Styles
```typescript
<FormInput
  label="Custom Styled Input"
  value={value}
  onChange={onChange}
  className="border-purple-300 focus:ring-purple-500"
/>
```

### Theme Customization
```typescript
const customFormTheme = {
  components: {
    FormInput: {
      base: 'rounded-lg border-2',
      variants: {
        error: 'border-red-500 focus:ring-red-200',
        success: 'border-green-500 focus:ring-green-200',
      },
    },
  },
};
```

## Migration

### From Native HTML Forms
```typescript
// Before
<label htmlFor="name">Name:</label>
<input 
  id="name"
  type="text" 
  value={name} 
  onChange={(e) => setName(e.target.value)}
  className="form-input"
/>
{nameError && <span className="error">{nameError}</span>}

// After
<FormInput
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={nameError}
/>
```

The form components provide a complete, accessible, and consistent form system for the Team Availability Tracker application.
/**
 * Enhanced FormField Component
 * 
 * A comprehensive form field component with validation, various input types,
 * and consistent styling. Builds on our base Input components.
 */

import React, { forwardRef, ReactNode } from 'react';
import { cx } from '@/design-system/theme';
import { Input, InputProps, Textarea, TextareaProps, PasswordInput, PasswordInputProps } from './Input';
import { Button } from './button';
import { Badge } from './badge';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface FormFieldProps {
  children: ReactNode;
  label?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  tooltip?: string;
  badge?: string;
  className?: string;
  fieldClassName?: string;
  testId?: string;
}

export interface FormInputProps extends Omit<InputProps, 'error' | 'success' | 'errorMessage' | 'helpText'> {
  label?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  tooltip?: string;
  badge?: string;
  fieldClassName?: string;
}

export interface FormTextareaProps extends Omit<TextareaProps, 'error' | 'success' | 'errorMessage' | 'helpText'> {
  label?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  tooltip?: string;
  badge?: string;
  fieldClassName?: string;
}

export interface FormPasswordProps extends Omit<PasswordInputProps, 'error' | 'success' | 'errorMessage' | 'helpText'> {
  label?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  tooltip?: string;
  badge?: string;
  fieldClassName?: string;
}

export interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  tooltip?: string;
  badge?: string;
  placeholder?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  fieldClassName?: string;
  testId?: string;
}

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label: string;
  description?: string;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  fieldClassName?: string;
  testId?: string;
}

export interface FormRadioGroupProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | string[];
  warning?: string;
  success?: string;
  info?: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  fieldClassName?: string;
  testId?: string;
}

export interface FormRadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  value: string;
  description?: string;
}

// =============================================================================
// FORM FIELD BASE COMPONENT
// =============================================================================

export const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  description,
  required = false,
  optional = false,
  error,
  warning,
  success,
  info,
  tooltip,
  badge,
  className,
  fieldClassName,
  testId
}) => {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;
  const hasSuccess = !!success && !hasError && !hasWarning;
  const hasInfo = !!info && !hasError && !hasWarning && !hasSuccess;

  const errorMessages = Array.isArray(error) ? error : error ? [error] : [];

  return (
    <div className={cx('space-y-1.5', className)} data-testid={testId}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
              {optional && !required && <span className="text-gray-400 ml-1">(optional)</span>}
            </label>
            {badge && (
              <Badge variant="secondary" size="sm">
                {badge}
              </Badge>
            )}
          </div>
          {tooltip && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 ml-2"
              title={tooltip}
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {/* Field wrapper */}
      <div className={fieldClassName}>
        {children}
      </div>

      {/* Messages */}
      <div className="space-y-1">
        {/* Error messages */}
        {hasError && errorMessages.map((message, index) => (
          <div key={index} className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        ))}

        {/* Warning message */}
        {hasWarning && (
          <div className="flex items-start gap-2 text-sm text-yellow-600">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        {/* Success message */}
        {hasSuccess && (
          <div className="flex items-start gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Info message */}
        {hasInfo && (
          <div className="flex items-start gap-2 text-sm text-blue-600">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{info}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// FORM INPUT COMPONENT
// =============================================================================

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      description,
      required = false,
      optional = false,
      error,
      warning,
      success,
      info,
      tooltip,
      badge,
      fieldClassName,
      testId,
      ...inputProps
    },
    ref
  ) => {
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <FormField
        label={label}
        description={description}
        required={required}
        optional={optional}
        error={error}
        warning={warning}
        success={success}
        info={info}
        tooltip={tooltip}
        badge={badge}
        fieldClassName={fieldClassName}
        testId={testId}
      >
        <Input
          ref={ref}
          error={hasError}
          success={hasSuccess}
          {...inputProps}
        />
      </FormField>
    );
  }
);

FormInput.displayName = 'FormInput';

// =============================================================================
// FORM TEXTAREA COMPONENT
// =============================================================================

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      description,
      required = false,
      optional = false,
      error,
      warning,
      success,
      info,
      tooltip,
      badge,
      fieldClassName,
      testId,
      ...textareaProps
    },
    ref
  ) => {
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <FormField
        label={label}
        description={description}
        required={required}
        optional={optional}
        error={error}
        warning={warning}
        success={success}
        info={info}
        tooltip={tooltip}
        badge={badge}
        fieldClassName={fieldClassName}
        testId={testId}
      >
        <Textarea
          ref={ref}
          error={hasError}
          success={hasSuccess}
          {...textareaProps}
        />
      </FormField>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// =============================================================================
// FORM PASSWORD COMPONENT
// =============================================================================

export const FormPassword = forwardRef<HTMLInputElement, FormPasswordProps>(
  (
    {
      label,
      description,
      required = false,
      optional = false,
      error,
      warning,
      success,
      info,
      tooltip,
      badge,
      fieldClassName,
      testId,
      ...passwordProps
    },
    ref
  ) => {
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <FormField
        label={label}
        description={description}
        required={required}
        optional={optional}
        error={error}
        warning={warning}
        success={success}
        info={info}
        tooltip={tooltip}
        badge={badge}
        fieldClassName={fieldClassName}
        testId={testId}
      >
        <PasswordInput
          ref={ref}
          error={hasError}
          success={hasSuccess}
          {...passwordProps}
        />
      </FormField>
    );
  }
);

FormPassword.displayName = 'FormPassword';

// =============================================================================
// FORM SELECT COMPONENT
// =============================================================================

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      description,
      required = false,
      optional = false,
      error,
      warning,
      success,
      info,
      tooltip,
      badge,
      placeholder,
      children,
      size = 'md',
      variant = 'default',
      fieldClassName,
      testId,
      className,
      ...selectProps
    },
    ref
  ) => {
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    // Size styles
    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-5 text-lg'
    };

    // Variant styles
    const variantClasses = {
      default: cx(
        'bg-white border-gray-300',
        'focus:border-blue-500 focus:ring-blue-500/20'
      ),
      filled: cx(
        'bg-gray-50 border-transparent',
        'focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
      )
    };

    const selectClasses = cx(
      'w-full border rounded-md transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
      sizeClasses[size],
      variantClasses[variant],
      hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
      hasSuccess ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' : '',
      className
    );

    return (
      <FormField
        label={label}
        description={description}
        required={required}
        optional={optional}
        error={error}
        warning={warning}
        success={success}
        info={info}
        tooltip={tooltip}
        badge={badge}
        fieldClassName={fieldClassName}
        testId={testId}
      >
        <select
          ref={ref}
          className={selectClasses}
          {...selectProps}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
      </FormField>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// =============================================================================
// FORM CHECKBOX COMPONENT
// =============================================================================

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    {
      label,
      description,
      error,
      warning,
      success,
      info,
      fieldClassName,
      testId,
      className,
      ...checkboxProps
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <FormField
        error={error}
        warning={warning}
        success={success}
        info={info}
        fieldClassName={fieldClassName}
        testId={testId}
      >
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            type="checkbox"
            className={cx(
              'mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500',
              hasError ? 'border-red-500 focus:ring-red-500' : '',
              className
            )}
            {...checkboxProps}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
        </div>
      </FormField>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// =============================================================================
// FORM RADIO GROUP COMPONENT
// =============================================================================

export const FormRadioGroup: React.FC<FormRadioGroupProps> = ({
  name,
  label,
  description,
  required = false,
  optional = false,
  error,
  warning,
  success,
  info,
  value,
  onChange,
  children,
  orientation = 'vertical',
  fieldClassName,
  testId
}) => {
  return (
    <FormField
      label={label}
      description={description}
      required={required}
      optional={optional}
      error={error}
      warning={warning}
      success={success}
      info={info}
      fieldClassName={fieldClassName}
      testId={testId}
    >
      <div className={cx(
        'space-y-2',
        orientation === 'horizontal' ? 'flex flex-wrap gap-4' : ''
      )}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement<FormRadioProps>(child)) {
            return React.cloneElement(child, {
              name,
              checked: value === child.props.value,
              onChange: () => onChange?.(child.props.value)
            });
          }
          return child;
        })}
      </div>
    </FormField>
  );
};

// =============================================================================
// FORM RADIO COMPONENT
// =============================================================================

export const FormRadio = forwardRef<HTMLInputElement, FormRadioProps>(
  (
    {
      label,
      value,
      description,
      className,
      ...radioProps
    },
    ref
  ) => {
    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="radio"
          value={value}
          className={cx(
            'mt-1 border-gray-300 text-blue-600 focus:ring-blue-500',
            className
          )}
          {...radioProps}
        />
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

FormRadio.displayName = 'FormRadio';

// =============================================================================
// FORM SECTION COMPONENT
// =============================================================================

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={cx('space-y-4', className)}>
      {(title || description) && (
        <div className="border-b border-gray-200 pb-3">
          {title && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  rightIcon={
                    <span className={cx('transition-transform', isCollapsed ? 'rotate-180' : '')}>
                      ▼
                    </span>
                  }
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </Button>
              )}
            </div>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      
      {(!collapsible || !isCollapsed) && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// FORM GROUP COMPONENT
// =============================================================================

export interface FormGroupProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  orientation = 'vertical',
  gap = 'md',
  className
}) => {
  const gapClasses = {
    sm: orientation === 'vertical' ? 'space-y-3' : 'space-x-3',
    md: orientation === 'vertical' ? 'space-y-4' : 'space-x-4',
    lg: orientation === 'vertical' ? 'space-y-6' : 'space-x-6'
  };

  return (
    <div className={cx(
      orientation === 'horizontal' ? 'flex space-y-0' : '',
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default FormField;
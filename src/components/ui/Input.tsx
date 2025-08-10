/**
 * Enhanced Input Component
 * 
 * A comprehensive input component with support for different variants, sizes,
 * icons, validation states, and full accessibility features.
 */

import React, { forwardRef, ReactNode, useState } from 'react';
import { cx } from '@/design-system/theme';
import { InputVariant, InputSize } from '@/design-system/variants';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { IconButton } from './button';

// =============================================================================
// TYPES
// =============================================================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: boolean;
  success?: boolean;
  errorMessage?: string;
  helpText?: string;
  label?: string;
  required?: boolean;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  testId?: string;
}

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  error?: boolean;
  success?: boolean;
  errorMessage?: string;
  helpText?: string;
  label?: string;
  required?: boolean;
  resize?: boolean;
  className?: string;
  containerClassName?: string;
  testId?: string;
}

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean;
}

// =============================================================================
// INPUT COMPONENT
// =============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      leftIcon,
      rightIcon,
      error = false,
      success = false,
      errorMessage,
      helpText,
      label,
      required = false,
      loading = false,
      className,
      containerClassName,
      testId,
      id,
      ...props
    },
    ref
  ) => {
    // Generate ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Base styles
    const baseClasses = cx(
      'w-full border transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
      'placeholder:text-gray-400'
    );

    // Variant styles
    const variantClasses = {
      default: cx(
        'bg-white border-gray-300 text-gray-900',
        'focus:border-blue-500 focus:ring-blue-500/20',
        'hover:border-gray-400'
      ),
      filled: cx(
        'bg-gray-50 border-transparent text-gray-900',
        'focus:bg-white focus:border-blue-500 focus:ring-blue-500/20',
        'hover:bg-gray-100'
      ),
      flushed: cx(
        'bg-transparent border-0 border-b-2 border-gray-300 text-gray-900',
        'rounded-none focus:border-blue-500 focus:ring-0',
        'hover:border-gray-400'
      )
    };

    // Size styles
    const sizeClasses = {
      sm: 'h-8 px-3 text-sm rounded-md',
      md: 'h-10 px-4 text-base rounded-md',
      lg: 'h-12 px-5 text-lg rounded-lg'
    };

    // State styles
    const stateClasses = cx(
      error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
      (success && !error) ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' : '',
      leftIcon ? 'pl-10' : '',
      (rightIcon || loading || error || success) ? 'pr-10' : ''
    );

    const inputClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      stateClasses,
      className
    );

    // Icon sizing based on input size
    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    return (
      <div className={cx('w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className={cx(
              'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400',
              iconSizes[size]
            )}>
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            data-testid={testId}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
            {loading && (
              <div className={cx('animate-spin rounded-full border-2 border-gray-300 border-t-blue-500', iconSizes[size])} />
            )}
            
            {!loading && error && (
              <AlertCircle className={cx('text-red-500', iconSizes[size])} />
            )}
            
            {!loading && !error && success && (
              <CheckCircle className={cx('text-green-500', iconSizes[size])} />
            )}
            
            {!loading && !error && !success && rightIcon && (
              <span className={cx('text-gray-400', iconSizes[size])}>
                {rightIcon}
              </span>
            )}
          </div>
        </div>

        {/* Help Text / Error Message */}
        {(helpText || errorMessage) && (
          <p className={cx(
            'mt-1 text-sm',
            error ? 'text-red-600' : 'text-gray-500'
          )}>
            {error ? errorMessage : helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// =============================================================================
// PASSWORD INPUT COMPONENT
// =============================================================================

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePassword = () => setShowPassword(prev => !prev);

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          showToggle ? (
            <IconButton
              icon={showPassword ? <EyeOff /> : <Eye />}
              variant="ghost"
              size="sm"
              onClick={togglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            />
          ) : undefined
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// =============================================================================
// TEXTAREA COMPONENT
// =============================================================================

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      size = 'md',
      error = false,
      success = false,
      errorMessage,
      helpText,
      label,
      required = false,
      resize = true,
      className,
      containerClassName,
      testId,
      id,
      rows = 3,
      ...props
    },
    ref
  ) => {
    // Generate ID if not provided
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Base styles
    const baseClasses = cx(
      'w-full border transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
      'placeholder:text-gray-400'
    );

    // Variant styles
    const variantClasses = {
      default: cx(
        'bg-white border-gray-300 text-gray-900',
        'focus:border-blue-500 focus:ring-blue-500/20',
        'hover:border-gray-400'
      ),
      filled: cx(
        'bg-gray-50 border-transparent text-gray-900',
        'focus:bg-white focus:border-blue-500 focus:ring-blue-500/20',
        'hover:bg-gray-100'
      ),
      flushed: cx(
        'bg-transparent border-0 border-b-2 border-gray-300 text-gray-900',
        'rounded-none focus:border-blue-500 focus:ring-0',
        'hover:border-gray-400'
      )
    };

    // Size styles
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-4 py-3 text-base rounded-md',
      lg: 'px-5 py-4 text-lg rounded-lg'
    };

    // State styles
    const stateClasses = cx(
      error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
      (success && !error) ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' : '',
      !resize ? 'resize-none' : ''
    );

    const textareaClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      stateClasses,
      className
    );

    return (
      <div className={cx('w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={textareaClasses}
          data-testid={testId}
          {...props}
        />

        {/* Help Text / Error Message */}
        {(helpText || errorMessage) && (
          <p className={cx(
            'mt-1 text-sm',
            error ? 'text-red-600' : 'text-gray-500'
          )}>
            {error ? errorMessage : helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// =============================================================================
// INPUT GROUP COMPONENT
// =============================================================================

export interface InputGroupProps {
  children: ReactNode;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ children, className }) => {
  return (
    <div className={cx('space-y-4', className)}>
      {children}
    </div>
  );
};

// =============================================================================
// FORM FIELD COMPONENT
// =============================================================================

export interface FormFieldProps {
  children: ReactNode;
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  required = false,
  error,
  helpText,
  className
}) => {
  return (
    <div className={cx('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {children}
      
      {(helpText || error) && (
        <p className={cx(
          'text-sm',
          error ? 'text-red-600' : 'text-gray-500'
        )}>
          {error || helpText}
        </p>
      )}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export type { InputVariant, InputSize };
export default Input;
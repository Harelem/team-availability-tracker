/**
 * Input Validation Utilities
 * 
 * Comprehensive validation functions for form inputs, API parameters,
 * and data integrity checks
 */

import { sanitizeInput, validateInput } from './security';

/**
 * Basic validation types
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

/**
 * String validation
 */
export function validateString(
  value: any,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): ValidationResult {
  const { required = false, minLength = 0, maxLength = 1000, pattern, allowEmpty = false } = options;

  // Type check
  if (typeof value !== 'string') {
    return { isValid: false, error: 'Value must be a string' };
  }

  // Required check
  if (required && (!value || value.trim().length === 0)) {
    return { isValid: false, error: 'Value is required' };
  }

  // Empty check
  if (!allowEmpty && value.length === 0 && !required) {
    return { isValid: true, sanitizedValue: '' };
  }

  // Security validation
  if (!validateInput(value)) {
    return { isValid: false, error: 'Value contains potentially unsafe content' };
  }

  // Length validation
  if (value.length < minLength) {
    return { isValid: false, error: `Value must be at least ${minLength} characters long` };
  }

  if (value.length > maxLength) {
    return { isValid: false, error: `Value must be no more than ${maxLength} characters long` };
  }

  // Pattern validation
  if (pattern && !pattern.test(value)) {
    return { isValid: false, error: 'Value does not match required pattern' };
  }

  return { isValid: true, sanitizedValue: sanitizeInput(value) };
}

/**
 * Number validation
 */
export function validateNumber(
  value: any,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult {
  const { required = false, min, max, integer = false } = options;

  // Handle empty/undefined
  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Value is required' };
    }
    return { isValid: true, sanitizedValue: undefined };
  }

  // Convert to number
  const numValue = Number(value);

  // Type check
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Value must be a valid number' };
  }

  // Integer check
  if (integer && !Number.isInteger(numValue)) {
    return { isValid: false, error: 'Value must be an integer' };
  }

  // Range validation
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }

  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `Value must be no more than ${max}` };
  }

  return { isValid: true, sanitizedValue: numValue };
}

/**
 * Email validation
 */
export function validateEmail(value: any, required: boolean = false): ValidationResult {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const stringResult = validateString(value, {
    required,
    maxLength: 254,
    pattern: emailRegex
  });

  if (!stringResult.isValid) {
    return { ...stringResult, error: 'Please enter a valid email address' };
  }

  return stringResult;
}

/**
 * Team member ID validation
 */
export function validateMemberId(value: any): ValidationResult {
  const result = validateNumber(value, {
    required: true,
    min: 1,
    integer: true
  });

  if (!result.isValid) {
    return { ...result, error: 'Invalid team member ID' };
  }

  return result;
}

/**
 * Team ID validation
 */
export function validateTeamId(value: any): ValidationResult {
  const result = validateNumber(value, {
    required: true,
    min: 1,
    integer: true
  });

  if (!result.isValid) {
    return { ...result, error: 'Invalid team ID' };
  }

  return result;
}

/**
 * Date validation
 */
export function validateDate(value: any, required: boolean = false): ValidationResult {
  if (!value) {
    if (required) {
      return { isValid: false, error: 'Date is required' };
    }
    return { isValid: true, sanitizedValue: undefined };
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  // Check for reasonable date range (not too far in past/future)
  const now = new Date();
  const minDate = new Date(2020, 0, 1); // January 1, 2020
  const maxDate = new Date(now.getFullYear() + 5, 11, 31); // 5 years from now

  if (date < minDate || date > maxDate) {
    return { isValid: false, error: 'Date must be within a reasonable range' };
  }

  return { isValid: true, sanitizedValue: date.toISOString().split('T')[0] };
}

/**
 * Hours validation (for scheduling)
 */
export function validateHours(value: any): ValidationResult {
  const result = validateNumber(value, {
    required: true,
    min: 0,
    max: 24
  });

  if (!result.isValid) {
    return { ...result, error: 'Hours must be between 0 and 24' };
  }

  return result;
}

/**
 * Percentage validation
 */
export function validatePercentage(value: any): ValidationResult {
  const result = validateNumber(value, {
    required: true,
    min: 0,
    max: 100
  });

  if (!result.isValid) {
    return { ...result, error: 'Percentage must be between 0 and 100' };
  }

  return result;
}

/**
 * Sprint number validation
 */
export function validateSprintNumber(value: any): ValidationResult {
  const result = validateNumber(value, {
    required: true,
    min: 1,
    max: 999,
    integer: true
  });

  if (!result.isValid) {
    return { ...result, error: 'Sprint number must be between 1 and 999' };
  }

  return result;
}

/**
 * User role validation
 */
export function validateUserRole(value: any): ValidationResult {
  const validRoles = ['team', 'manager', 'coo'];

  const stringResult = validateString(value, { required: true });

  if (!stringResult.isValid) {
    return stringResult;
  }

  if (!validRoles.includes(stringResult.sanitizedValue!)) {
    return { isValid: false, error: 'Invalid user role' };
  }

  return { isValid: true, sanitizedValue: stringResult.sanitizedValue };
}

/**
 * Template name validation
 */
export function validateTemplateName(value: any): ValidationResult {
  return validateString(value, {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/
  });
}

/**
 * Complex object validation
 */
export interface TeamMemberData {
  id?: number;
  name: string;
  hebrew?: string;
  email?: string;
  role?: string;
  teamId: number;
}

export function validateTeamMemberData(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid team member data' };
  }

  // Validate required fields
  const nameResult = validateString(data.name, { required: true, maxLength: 100 });
  if (!nameResult.isValid) {
    return { ...nameResult, error: `Name: ${nameResult.error}` };
  }

  const teamIdResult = validateTeamId(data.teamId);
  if (!teamIdResult.isValid) {
    return { ...teamIdResult, error: `Team ID: ${teamIdResult.error}` };
  }

  // Validate optional fields
  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid) {
      return { ...emailResult, error: `Email: ${emailResult.error}` };
    }
  }

  if (data.role) {
    const roleResult = validateUserRole(data.role);
    if (!roleResult.isValid) {
      return { ...roleResult, error: `Role: ${roleResult.error}` };
    }
  }

  if (data.hebrew) {
    const hebrewResult = validateString(data.hebrew, { maxLength: 100 });
    if (!hebrewResult.isValid) {
      return { ...hebrewResult, error: `Hebrew name: ${hebrewResult.error}` };
    }
  }

  // Return sanitized data
  const sanitizedData: TeamMemberData = {
    name: nameResult.sanitizedValue!,
    teamId: teamIdResult.sanitizedValue!
  };

  if (data.id) {
    const idResult = validateMemberId(data.id);
    if (idResult.isValid) {
      sanitizedData.id = idResult.sanitizedValue!;
    }
  }

  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (emailResult.isValid) {
      sanitizedData.email = emailResult.sanitizedValue!;
    }
  }

  if (data.role) {
    const roleResult = validateUserRole(data.role);
    if (roleResult.isValid) {
      sanitizedData.role = roleResult.sanitizedValue!;
    }
  }

  if (data.hebrew) {
    const hebrewResult = validateString(data.hebrew, { maxLength: 100 });
    if (hebrewResult.isValid) {
      sanitizedData.hebrew = hebrewResult.sanitizedValue!;
    }
  }

  return { isValid: true, sanitizedValue: sanitizedData };
}

/**
 * Availability data validation
 */
export interface AvailabilityData {
  memberId: number;
  date: string;
  hours: number;
  notes?: string;
}

export function validateAvailabilityData(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid availability data' };
  }

  // Validate required fields
  const memberIdResult = validateMemberId(data.memberId);
  if (!memberIdResult.isValid) {
    return { ...memberIdResult, error: `Member ID: ${memberIdResult.error}` };
  }

  const dateResult = validateDate(data.date, true);
  if (!dateResult.isValid) {
    return { ...dateResult, error: `Date: ${dateResult.error}` };
  }

  const hoursResult = validateHours(data.hours);
  if (!hoursResult.isValid) {
    return { ...hoursResult, error: `Hours: ${hoursResult.error}` };
  }

  // Validate optional fields
  let notesResult: ValidationResult | undefined;
  if (data.notes) {
    notesResult = validateString(data.notes, { maxLength: 500 });
    if (!notesResult.isValid) {
      return { ...notesResult, error: `Notes: ${notesResult.error}` };
    }
  }

  // Return sanitized data
  const sanitizedData: AvailabilityData = {
    memberId: memberIdResult.sanitizedValue!,
    date: dateResult.sanitizedValue!,
    hours: hoursResult.sanitizedValue!
  };

  if (notesResult?.sanitizedValue) {
    sanitizedData.notes = notesResult.sanitizedValue;
  }

  return { isValid: true, sanitizedValue: sanitizedData };
}

/**
 * Bulk validation helper
 */
export function validateArray<T>(
  items: any[],
  validator: (item: any) => ValidationResult,
  maxItems: number = 1000
): ValidationResult {
  if (!Array.isArray(items)) {
    return { isValid: false, error: 'Value must be an array' };
  }

  if (items.length > maxItems) {
    return { isValid: false, error: `Too many items (maximum: ${maxItems})` };
  }

  const sanitizedItems: T[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const result = validator(items[i]);
    if (!result.isValid) {
      return { isValid: false, error: `Item ${i + 1}: ${result.error}` };
    }
    sanitizedItems.push(result.sanitizedValue);
  }

  return { isValid: true, sanitizedValue: sanitizedItems };
}

/**
 * API parameter validation helper
 */
export function validateApiParams(
  params: Record<string, any>,
  schema: Record<string, (value: any) => ValidationResult>
): ValidationResult {
  const sanitizedParams: Record<string, any> = {};

  for (const [key, validator] of Object.entries(schema)) {
    const result = validator(params[key]);
    if (!result.isValid) {
      return { isValid: false, error: `Parameter '${key}': ${result.error}` };
    }
    
    if (result.sanitizedValue !== undefined) {
      sanitizedParams[key] = result.sanitizedValue;
    }
  }

  return { isValid: true, sanitizedValue: sanitizedParams };
}

/**
 * URL validation for redirect security
 * Prevents open redirect vulnerabilities and XSS attacks
 */
export function validateRedirectUrl(url: string): boolean {
  try {
    // Basic type and existence checks
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Trim whitespace
    const trimmedUrl = url.trim();
    
    // Prevent javascript:, data:, and other dangerous protocols
    if (/^(javascript:|data:|vbscript:|file:|ftp:)/i.test(trimmedUrl)) {
      return false;
    }

    // Allow relative URLs (same origin)
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
      // Additional validation for relative URLs
      if (trimmedUrl.includes('..') && !trimmedUrl.startsWith('../')) {
        return false; // Prevent path traversal in middle of URL
      }
      return true;
    }

    // For absolute URLs, validate them properly
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      const parsedUrl = new URL(trimmedUrl);
      
      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Basic hostname validation (no obvious malicious patterns)
      if (parsedUrl.hostname.length === 0) {
        return false;
      }
      
      return true;
    }

    // Reject all other formats
    return false;
  } catch (error) {
    // URL parsing failed or other error
    console.warn('URL validation failed:', url, error);
    return false;
  }
}
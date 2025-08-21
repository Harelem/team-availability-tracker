/**
 * Input Validation and Sanitization
 * Prevents SQL injection, XSS, and ensures data integrity
 */

interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  errors: string[];
}

/**
 * Sanitizes and validates team member names
 * Prevents SQL injection and ensures consistency
 */
export function validateTeamMemberName(name: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    errors: []
  };

  // Basic validation
  if (!name || typeof name !== 'string') {
    result.errors.push('Name is required and must be a string');
    return result;
  }

  // Trim whitespace
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    result.errors.push('Name cannot be empty');
    return result;
  }

  if (trimmed.length > 100) {
    result.errors.push('Name must be less than 100 characters');
    return result;
  }

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(;|--|\*|\/\*|\*\/)/,
    /('|"|`)/,
    /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(trimmed)) {
      result.errors.push('Name contains potentially dangerous characters');
      return result;
    }
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(trimmed)) {
      result.errors.push('Name contains potentially dangerous script content');
      return result;
    }
  }

  // Sanitize: Remove dangerous characters but keep Hebrew and English
  const sanitized = trimmed
    .replace(/[<>\"\'`]/g, '') // Remove dangerous HTML/JS chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (sanitized.length === 0) {
    result.errors.push('Name becomes empty after sanitization');
    return result;
  }

  // Validate character set (Hebrew, English, common punctuation)
  const allowedCharsPattern = /^[\u0590-\u05FF\u200F\u200E\s\w\.\-\']+$/;
  if (!allowedCharsPattern.test(sanitized)) {
    result.errors.push('Name contains unsupported characters');
    return result;
  }

  result.isValid = true;
  result.sanitized = sanitized;
  return result;
}

/**
 * Validates Hebrew name field
 */
export function validateHebrewName(hebrew: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    errors: []
  };

  if (!hebrew || typeof hebrew !== 'string') {
    result.errors.push('Hebrew name is required');
    return result;
  }

  const trimmed = hebrew.trim();

  if (trimmed.length === 0) {
    result.errors.push('Hebrew name cannot be empty');
    return result;
  }

  if (trimmed.length > 100) {
    result.errors.push('Hebrew name must be less than 100 characters');
    return result;
  }

  // Hebrew character validation (including RTL marks)
  const hebrewPattern = /^[\u0590-\u05FF\u200F\u200E\s\.\-\']+$/;
  if (!hebrewPattern.test(trimmed)) {
    result.errors.push('Hebrew name contains invalid characters');
    return result;
  }

  // Basic sanitization
  const sanitized = trimmed
    .replace(/[<>\"\'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  result.isValid = true;
  result.sanitized = sanitized;
  return result;
}

/**
 * Validates email addresses
 */
export function validateEmail(email?: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true, // Email is optional
    errors: []
  };

  if (!email) {
    result.sanitized = undefined;
    return result;
  }

  if (typeof email !== 'string') {
    result.errors.push('Email must be a string');
    result.isValid = false;
    return result;
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    result.sanitized = undefined;
    return result;
  }

  // Basic email validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    result.errors.push('Invalid email format');
    result.isValid = false;
    return result;
  }

  if (trimmed.length > 254) {
    result.errors.push('Email is too long');
    result.isValid = false;
    return result;
  }

  result.sanitized = trimmed;
  return result;
}

/**
 * Normalizes name for uniqueness checking
 * Removes case, whitespace, and diacritics differences
 */
export function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics
    .normalize('NFKD');
}

/**
 * Validates team member data for creation/update
 */
export interface TeamMemberInput {
  name: string;
  hebrew: string;
  email?: string;
  teamId: number;
  isManager?: boolean;
}

export interface ValidatedTeamMemberData {
  name: string;
  hebrew: string;
  email?: string;
  teamId: number;
  isManager: boolean;
  normalizedName: string; // For uniqueness checking
}

export function validateTeamMemberData(input: TeamMemberInput): {
  isValid: boolean;
  data?: ValidatedTeamMemberData;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate name
  const nameValidation = validateTeamMemberName(input.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors.map(err => `Name: ${err}`));
  }

  // Validate Hebrew name
  const hebrewValidation = validateHebrewName(input.hebrew);
  if (!hebrewValidation.isValid) {
    errors.push(...hebrewValidation.errors.map(err => `Hebrew: ${err}`));
  }

  // Validate email
  const emailValidation = validateEmail(input.email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors.map(err => `Email: ${err}`));
  }

  // Validate team ID
  if (!Number.isInteger(input.teamId) || input.teamId <= 0) {
    errors.push('Team ID must be a positive integer');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const validatedData: ValidatedTeamMemberData = {
    name: nameValidation.sanitized!,
    hebrew: hebrewValidation.sanitized!,
    email: emailValidation.sanitized,
    teamId: input.teamId,
    isManager: Boolean(input.isManager),
    normalizedName: normalizeNameForComparison(nameValidation.sanitized!)
  };

  return { isValid: true, data: validatedData, errors: [] };
}

/**
 * Sanitizes reason text for schedule entries
 */
export function validateReasonText(reason?: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: []
  };

  if (!reason) {
    result.sanitized = undefined;
    return result;
  }

  if (typeof reason !== 'string') {
    result.errors.push('Reason must be a string');
    result.isValid = false;
    return result;
  }

  const trimmed = reason.trim();

  if (trimmed.length === 0) {
    result.sanitized = undefined;
    return result;
  }

  if (trimmed.length > 500) {
    result.errors.push('Reason must be less than 500 characters');
    result.isValid = false;
    return result;
  }

  // Basic sanitization - allow Hebrew, English, common punctuation
  const sanitized = trimmed
    .replace(/[<>]/g, '') // Remove basic HTML chars
    .replace(/\s+/g, ' ')
    .trim();

  result.sanitized = sanitized;
  return result;
}
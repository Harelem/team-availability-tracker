/**
 * Environment Variable Validation and Security
 * Ensures sensitive keys are properly configured and validates environment setup
 */

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  // Server-side only variables (not exposed to client)
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

/**
 * Validates environment variables for security and completeness
 */
export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    securityIssues: []
  };

  const env: EnvConfig = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET
  };

  // Check for required client-side variables
  if (!env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here') {
    result.errors.push('NEXT_PUBLIC_SUPABASE_URL is missing or using placeholder value');
    result.isValid = false;
  }

  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your_supabase_anon_key_here') {
    result.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or using placeholder value');
    result.isValid = false;
  }

  // Security validations
  if (env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    result.securityIssues.push('Supabase URL should use HTTPS for security');
  }

  // Check for development/test keys in production
  if (process.env.NODE_ENV === 'production') {
    if (env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') || env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1')) {
      result.securityIssues.push('Production environment using localhost Supabase URL');
      result.isValid = false;
    }

    if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
      result.warnings.push('Supabase anon key seems unusually short for production');
    }
  }

  // Check for server-side keys (should not be exposed to client)
  if (typeof window !== 'undefined') {
    // Client-side check
    if ((window as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY) {
      result.securityIssues.push('CRITICAL: Service role key exposed to client-side');
      result.isValid = false;
    }
  }

  // Validate URL format
  if (env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    } catch {
      result.errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
      result.isValid = false;
    }
  }

  // Check for common security misconfigurations
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Valid Supabase anon keys can start with 'sb-' (new format) or 'eyJ' (JWT format)
    if (!key.startsWith('sb-') && !key.startsWith('eyJ')) {
      result.warnings.push('Supabase anon key format seems unusual');
    }
  }

  return result;
}

/**
 * Gets validated environment configuration
 * Throws error if critical validation fails
 */
export function getValidatedEnvironment(): EnvConfig {
  const validation = validateEnvironment();
  
  if (!validation.isValid) {
    const errorMessage = [
      'Environment validation failed:',
      ...validation.errors.map(err => `  - ${err}`),
      ...validation.securityIssues.map(issue => `  - SECURITY: ${issue}`)
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  if (validation.warnings.length > 0) {
    console.warn('Environment warnings:', validation.warnings);
  }

  if (validation.securityIssues.length > 0) {
    console.error('Security issues detected:', validation.securityIssues);
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET
  };
}

/**
 * Runtime environment check for startup validation
 */
export function validateEnvironmentOnStartup(): void {
  const validation = validateEnvironment();
  
  if (!validation.isValid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    validation.securityIssues.forEach(issue => console.error(`  - SECURITY: ${issue}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Critical environment validation failed in production');
    } else {
      console.warn('⚠️  Development mode: continuing despite environment issues');
    }
  }

  if (validation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Environment warnings:', validation.warnings);
  }

  if (validation.securityIssues.length > 0) {
    console.error('🔒 Security issues detected:');
    validation.securityIssues.forEach(issue => console.error(`  - ${issue}`));
  }

  if (validation.isValid && validation.warnings.length === 0 && validation.securityIssues.length === 0) {
    console.log('✅ Environment validation passed');
  }
}

/**
 * Sanitizes environment values for logging (removes sensitive data)
 */
export function sanitizeEnvForLogging(env: EnvConfig): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? 
      env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/\/[^.]+/, '//***') : 'not set',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      `${env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 8)}...***` : 'not set',
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? '[REDACTED]' : 'not set',
    DATABASE_URL: env.DATABASE_URL ? '[REDACTED]' : 'not set',
    AUTH_SECRET: env.AUTH_SECRET ? '[REDACTED]' : 'not set'
  };
}
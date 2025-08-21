/**
 * Security Utilities
 * 
 * Comprehensive security functions for input validation, sanitization,
 * URL validation, and XSS prevention
 */

/**
 * Input validation and sanitization
 */
export function validateInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  if (input.length > 1000) return false; // Prevent DoS
  if (/<script|javascript:|on\w+=/i.test(input)) return false; // XSS protection
  return true;
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+=/gi, '')
    // Remove SQL injection attempts
    .replace(/\b(DROP|ALTER|DELETE|UPDATE|INSERT|CREATE|EXEC|EXECUTE)\b/gi, '')
    // Escape quotes
    .replace(/'/g, "''")
    // Remove dangerous characters
    .replace(/[;\\]/g, '')
    // Remove comment indicators
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Trim whitespace
    .trim();
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * URL validation and redirect security
 */
export function isValidUrl(input: string): boolean {
  try {
    const urlObj = new URL(input);
    const allowedProtocols = ['http:', 'https:'];
    return allowedProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

export function isInternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function validateRedirectUrl(url: string): boolean {
  // Allow only internal URLs or relative paths
  if (url.startsWith('/')) {
    // Relative path - check for path traversal
    return !url.includes('../') && !url.includes('..\\');
  }
  
  // For absolute URLs, must be internal
  return isInternalUrl(url);
}

/**
 * Content Security Policy helpers
 */
export function generateNonce(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for server-side or older browsers
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createCSPHeader(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'" + (nonce ? ` 'nonce-${nonce}'` : " 'unsafe-inline'"),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' wss: https:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'"
  ];
  
  return directives.join('; ');
}

/**
 * Authentication and authorization helpers
 */
export function validateJWTStructure(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Validate header
    const header = JSON.parse(atob(parts[0]));
    if (!header.alg || !header.typ) return false;
    
    // Validate payload structure
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp || !payload.iat) return false;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return false;
    
    return true;
  } catch {
    return false;
  }
}

export function validateUserRole(user: any, requiredRole: string): boolean {
  if (!user || !user.role) return false;
  
  const rolePriority: Record<string, number> = {
    'team': 1,
    'manager': 2,
    'coo': 3
  };
  
  const userPriority = rolePriority[user.role] || 0;
  const requiredPriority = rolePriority[requiredRole] || 0;
  
  return userPriority >= requiredPriority;
}

/**
 * Rate limiting helpers
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, []);
    }
    
    const clientRequests = this.requests.get(clientId)!;
    
    // Remove old requests outside the window
    const validRequests = clientRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    return true;
  }
  
  getRemainingRequests(clientId: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const clientRequests = this.requests.get(clientId) || [];
    const validRequests = clientRequests.filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

/**
 * Data validation helpers
 */
export function validatePayloadSize(data: any, maxSizeBytes: number = 1024 * 1024): boolean {
  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    return sizeInBytes <= maxSizeBytes;
  } catch {
    return false;
  }
}

export function sanitizePersonalData(data: any): any {
  const sensitiveFields = ['socialSecurityNumber', 'password', 'token', 'secret', 'apiKey'];
  const result = { ...data };
  
  sensitiveFields.forEach(field => {
    if (field in result) {
      delete result[field];
    }
  });
  
  // Partially redact phone numbers
  if (result.phoneNumber && typeof result.phoneNumber === 'string') {
    result.phoneNumber = result.phoneNumber.replace(/\d/g, 'X');
  }
  
  // Redact addresses
  if (result.address) {
    result.address = '[REDACTED]';
  }
  
  return result;
}

/**
 * Error handling security
 */
export function sanitizeError(error: Error): string {
  // Remove sensitive information from error messages
  const sensitivePatterns = [
    /password.*[=:]\s*\S+/gi,
    /token.*[=:]\s*\S+/gi,
    /secret.*[=:]\s*\S+/gi,
    /SELECT.*FROM.*WHERE/gi,
    /INSERT.*INTO/gi,
    /UPDATE.*SET/gi,
    /DELETE.*FROM/gi
  ];
  
  let sanitized = error.message;
  
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

/**
 * CSRF Protection
 */
export function generateCSRFToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function validateCSRFToken(requestToken: string, sessionToken: string): boolean {
  return requestToken === sessionToken && requestToken.length >= 32;
}

/**
 * Cookie security helpers
 */
export interface SecureCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

export function getSecureCookieOptions(isProduction: boolean = process.env.NODE_ENV === 'production'): SecureCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/'
  };
}
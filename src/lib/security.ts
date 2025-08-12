/**
 * Security Middleware and Utilities
 * 
 * Enhanced security functions for Next.js API routes and middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCSPHeader, validateJWTStructure, RateLimiter, sanitizeError } from '@/utils/security';

/**
 * Security headers configuration
 */
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  return {
    // Content Security Policy
    'Content-Security-Policy': createCSPHeader(nonce),
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // HTTP Strict Transport Security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Prevent DNS prefetching
    'X-DNS-Prefetch-Control': 'off',
    
    // Remove server signature
    'Server': '',
    
    // Cache control for sensitive pages
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

/**
 * Rate limiting instances
 */
const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
const authRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes

/**
 * Enhanced API route wrapper with security features
 */
export function withSecurity(handler: Function, options: {
  requireAuth?: boolean;
  rateLimiter?: 'api' | 'auth' | 'none';
  validateInput?: boolean;
} = {}) {
  return async (req: NextRequest) => {
    try {
      // Apply security headers
      const response = new NextResponse();
      const securityHeaders = getSecurityHeaders();
      
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Rate limiting
      if (options.rateLimiter !== 'none') {
        const clientId = (req as any).ip || req.headers.get('x-forwarded-for') || 'unknown';
        const limiter = options.rateLimiter === 'auth' ? authRateLimiter : apiRateLimiter;
        
        if (!limiter.isAllowed(clientId)) {
          return new NextResponse('Rate limit exceeded', { 
            status: 429,
            headers: securityHeaders
          });
        }
      }

      // Authentication check
      if (options.requireAuth) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new NextResponse('Unauthorized', { 
            status: 401,
            headers: securityHeaders
          });
        }

        const token = authHeader.substring(7);
        if (!validateJWTStructure(token)) {
          return new NextResponse('Invalid token', { 
            status: 401,
            headers: securityHeaders
          });
        }
      }

      // Input validation
      if (options.validateInput && req.method === 'POST') {
        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
          return new NextResponse('Request too large', { 
            status: 413,
            headers: securityHeaders
          });
        }
      }

      // Call the actual handler
      const result = await handler(req);
      
      // Apply security headers to the result
      if (result instanceof NextResponse) {
        Object.entries(securityHeaders).forEach(([key, value]) => {
          result.headers.set(key, value);
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Security middleware error:', sanitizeError(error as Error));
      
      return new NextResponse('Internal Server Error', { 
        status: 500,
        headers: getSecurityHeaders()
      });
    }
  };
}

/**
 * CSRF Protection middleware
 */
export function validateCSRF(req: NextRequest): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true; // Safe methods don't need CSRF protection
  }

  const token = req.headers.get('x-csrf-token') || req.headers.get('csrf-token');
  const cookie = req.cookies.get('csrf-token');
  
  if (!token || !cookie || token !== cookie.value) {
    return false;
  }

  return true;
}

/**
 * Input sanitization middleware
 */
export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized: any = Array.isArray(body) ? [] : {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Basic sanitization
      sanitized[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * SQL Injection protection for database queries
 */
export function sanitizeForDatabase(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comment start
    .replace(/\*\//g, '') // Remove SQL block comment end
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bUPDATE\b/gi, '') // Remove UPDATE keyword
    .replace(/\bINSERT\b/gi, '') // Remove INSERT keyword
    .replace(/\bEXEC\b/gi, '') // Remove EXEC keyword
    .replace(/\bUNION\b/gi, ''); // Remove UNION keyword
}

/**
 * API Response sanitization
 */
export function sanitizeApiResponse(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'hash',
    'ssn', 'socialSecurityNumber', 'creditCard',
    'apiKey', 'privateKey', 'accessToken', 'refreshToken'
  ];

  const sanitized = JSON.parse(JSON.stringify(data));

  function removeSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveData);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          cleaned[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          cleaned[key] = removeSensitiveData(value);
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    }

    return obj;
  }

  return removeSensitiveData(sanitized);
}

/**
 * Secure cookie options generator
 */
export function getSecureCookieOptions(isProduction: boolean = process.env.NODE_ENV === 'production') {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  };
}

/**
 * Security audit logger
 */
export function logSecurityEvent(event: {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_request' | 'csrf_violation';
  ip?: string;
  userAgent?: string;
  details?: any;
}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type: event.type,
    ip: event.ip || 'unknown',
    userAgent: event.userAgent || 'unknown',
    details: event.details ? sanitizeApiResponse(event.details) : {}
  };

  // In production, this would go to a security monitoring system
  console.warn('SECURITY_EVENT:', JSON.stringify(logEntry));
  
  // TODO: Integrate with security monitoring service
  // await sendToSecurityMonitoring(logEntry);
}

/**
 * Request validation helper
 */
export function validateRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  
  if (!origin) {
    // Allow requests without origin (direct API calls, mobile apps)
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const expectedOrigins = [
      `https://${host}`,
      `http://${host}`, // For development
      'http://localhost:3000', // Development
      'https://localhost:3000' // Development with HTTPS
    ];

    return expectedOrigins.includes(origin) || 
           (process.env.NODE_ENV !== 'production' && originUrl.hostname === 'localhost');
  } catch {
    return false;
  }
}

/**
 * Content Type validation
 */
export function validateContentType(req: NextRequest, expectedTypes: string[] = ['application/json']): boolean {
  const contentType = req.headers.get('content-type');
  
  if (!contentType) {
    return req.method === 'GET' || req.method === 'HEAD';
  }

  return expectedTypes.some(type => contentType.includes(type));
}
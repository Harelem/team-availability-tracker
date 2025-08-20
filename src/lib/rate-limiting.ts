/**
 * Advanced Rate Limiting Utilities
 * Provides flexible rate limiting for different use cases
 */

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  keyGenerator?: (identifier: string) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  totalRequests: number
}

// In-memory storage for rate limits (use Redis in production)
const rateLimitStorage = new Map<string, {
  requests: number
  resetTime: number
  firstRequestTime: number
}>()

/**
 * Advanced rate limiter with configurable options
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (id: string) => `rate_limit:${id}`,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  /**
   * Check if request is allowed
   */
  checkLimit(identifier: string): RateLimitResult {
    const key = this.config.keyGenerator(identifier)
    const now = Date.now()
    
    // Clean expired entries
    this.cleanExpiredEntries()
    
    const existing = rateLimitStorage.get(key)
    
    if (!existing || now >= existing.resetTime) {
      // New window
      const resetTime = now + this.config.windowMs
      rateLimitStorage.set(key, {
        requests: 1,
        resetTime,
        firstRequestTime: now
      })
      
      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
        totalRequests: 1
      }
    }
    
    // Existing window
    if (existing.requests >= this.config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: existing.resetTime,
        totalRequests: existing.requests
      }
    }
    
    // Increment and allow
    existing.requests++
    rateLimitStorage.set(key, existing)
    
    return {
      success: true,
      remaining: this.config.maxRequests - existing.requests,
      resetTime: existing.resetTime,
      totalRequests: existing.requests
    }
  }

  /**
   * Record a request (for conditional counting)
   */
  recordRequest(identifier: string, wasSuccessful: boolean = true): void {
    if (
      (this.config.skipSuccessfulRequests && wasSuccessful) ||
      (this.config.skipFailedRequests && !wasSuccessful)
    ) {
      return
    }

    // Just check limit to record the request
    this.checkLimit(identifier)
  }

  /**
   * Get current status without incrementing
   */
  getStatus(identifier: string): RateLimitResult | null {
    const key = this.config.keyGenerator(identifier)
    const now = Date.now()
    const existing = rateLimitStorage.get(key)
    
    if (!existing || now >= existing.resetTime) {
      return null
    }
    
    return {
      success: existing.requests < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - existing.requests),
      resetTime: existing.resetTime,
      totalRequests: existing.requests
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator(identifier)
    rateLimitStorage.delete(key)
  }

  /**
   * Clean expired entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now()
    for (const [key, data] of rateLimitStorage) {
      if (now >= data.resetTime) {
        rateLimitStorage.delete(key)
      }
    }
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API requests
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: (ip) => `api:${ip}`
  }),

  // Sensitive operations (create, update, delete)
  sensitive: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (ip) => `sensitive:${ip}`
  }),

  // Authentication attempts
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (ip) => `auth:${ip}`,
    skipSuccessfulRequests: true // Only count failed attempts
  }),

  // Team member operations
  teamMember: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    keyGenerator: (ip) => `team_member:${ip}`
  }),

  // Schedule updates
  scheduleUpdate: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // Allow more for bulk updates
    keyGenerator: (ip) => `schedule:${ip}`
  }),

  // Export operations
  export: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // Limit expensive export operations
    keyGenerator: (ip) => `export:${ip}`
  })
}

/**
 * Middleware helper for Next.js API routes
 */
export function withRateLimit(limiter: RateLimiter) {
  return function(handler: any) {
    return async function(req: any, res: any) {
      // Get client IP
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 'unknown'

      const result = limiter.checkLimit(ip)

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', limiter['config'].maxRequests)
      res.setHeader('X-RateLimit-Remaining', result.remaining)
      res.setHeader('X-RateLimit-Reset', result.resetTime)

      if (!result.success) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        })
      }

      return handler(req, res)
    }
  }
}

/**
 * Get rate limiting statistics for monitoring
 */
export function getRateLimitStats() {
  const now = Date.now()
  let totalEntries = 0
  let activeEntries = 0
  let expiredEntries = 0

  for (const [key, data] of rateLimitStorage) {
    totalEntries++
    if (now < data.resetTime) {
      activeEntries++
    } else {
      expiredEntries++
    }
  }

  return {
    totalEntries,
    activeEntries,
    expiredEntries,
    memoryUsage: rateLimitStorage.size
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStorage(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [key, data] of rateLimitStorage) {
    if (now >= data.resetTime) {
      rateLimitStorage.delete(key)
      cleaned++
    }
  }

  return cleaned
}

// Auto-cleanup every 5 minutes in browser environment
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupRateLimitStorage()
  }, 5 * 60 * 1000)
}
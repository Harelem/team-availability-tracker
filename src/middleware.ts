import { NextRequest, NextResponse } from 'next/server'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // requests per window
const STRICT_RATE_LIMIT_MAX_REQUESTS = 10 // for sensitive endpoints

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Get client IP address for rate limiting
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP.trim()
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }
  
  // Fallback to connection remote address
  return (request as any).ip || 'unknown'
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(ip: string, limit: number): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rate_limit:${ip}`
  
  // Clean up expired entries
  for (const [storeKey, data] of rateLimitStore) {
    if (now > data.resetTime) {
      rateLimitStore.delete(storeKey)
    }
  }
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    // New window
    const resetTime = now + RATE_LIMIT_WINDOW
    rateLimitStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }
  
  // Existing window
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  // Increment counter
  current.count++
  rateLimitStore.set(key, current)
  
  return { allowed: true, remaining: limit - current.count, resetTime: current.resetTime }
}

/**
 * Create rate limit response
 */
function createRateLimitResponse(remaining: number, resetTime: number): NextResponse {
  const response = NextResponse.json(
    { 
      error: 'Rate limit exceeded', 
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    },
    { status: 429 }
  )
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetTime.toString())
  response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString())
  
  return response
}

/**
 * Enhanced security headers
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  // Get the current URL for CSP
  const url = new URL(request.url)
  const origin = `${url.protocol}//${url.host}`
  
  // Content Security Policy - strict but functional
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ].join('; ')
  
  // Security headers
  response.headers.set('Content-Security-Policy', cspDirectives)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()')
  
  // Strict Transport Security (HTTPS only)
  if (url.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  
  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientIP = getClientIP(request)
  
  // Skip rate limiting for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/manifest.json') ||
    pathname.includes('.svg') ||
    pathname.includes('.png') ||
    pathname.includes('.jpg') ||
    pathname.includes('.jpeg') ||
    pathname.includes('.gif') ||
    pathname.includes('.webp') ||
    pathname.includes('.ico')
  ) {
    return NextResponse.next()
  }
  
  // Determine rate limit based on endpoint sensitivity
  let maxRequests = RATE_LIMIT_MAX_REQUESTS
  
  // Stricter limits for sensitive endpoints
  if (
    pathname.startsWith('/api/admin') ||
    pathname.includes('/delete') ||
    pathname.includes('/create') ||
    pathname.includes('/update') ||
    pathname.includes('/auth')
  ) {
    maxRequests = STRICT_RATE_LIMIT_MAX_REQUESTS
  }
  
  // Check rate limit
  const { allowed, remaining, resetTime } = checkRateLimit(clientIP, maxRequests)
  
  if (!allowed) {
    console.warn(`🚫 Rate limit exceeded for IP: ${clientIP}, path: ${pathname}`)
    return createRateLimitResponse(remaining, resetTime)
  }
  
  // Create response
  const response = NextResponse.next()
  
  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetTime.toString())
  
  // Add security headers
  addSecurityHeaders(response, request)
  
  // Log for monitoring (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔒 Request from ${clientIP} to ${pathname} - ${remaining} requests remaining`)
  }
  
  return response
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
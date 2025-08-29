/**
 * Next.js Security Configuration
 * Enhanced security headers and configurations
 */

const securityHeaders = [
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // XSS Protection (legacy but still useful)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Referrer Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Permissions Policy (Feature Policy)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()'
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for development
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' wss: https:",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  },
  // HSTS (HTTP Strict Transport Security)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  }
];

module.exports = {
  securityHeaders,
  
  // Security-related Next.js config
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      },
      {
        source: '/api/(.*)',
        headers: [
          ...securityHeaders,
          // Additional API-specific headers
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      }
    ];
  },

  // Security configurations
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Compress responses
  compress: true,
  
  // Security for static files
  async rewrites() {
    return [
      // Hide sensitive files
      {
        source: '/.env',
        destination: '/404'
      },
      {
        source: '/.env.local',
        destination: '/404'
      },
      {
        source: '/.env.production',
        destination: '/404'
      }
    ];
  }
};
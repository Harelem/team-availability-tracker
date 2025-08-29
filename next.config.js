/** @type {import('next').NextConfig} */
const { securityHeaders } = require('./next.config.security');

const nextConfig = {
  // Enable experimental features for performance
  experimental: {
    optimizePackageImports: [
      'react'
    ]
  },

  // OPTIMIZED: Enable turbo mode for faster builds
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Transpile packages for optimization
  transpilePackages: ['react', 'framer-motion'],
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // OPTIMIZED: Enhanced webpack optimizations for TTI and mobile performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // OPTIMIZED: Aggressive chunk splitting for faster loading
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 100000, // Limit chunk size to 100KB for faster loading
        cacheGroups: {
          // Critical vendor chunk - keep small
          critical_vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'critical-vendor',
            priority: 30,
            reuseExistingChunk: true,
          },
          // UI library chunk
          ui_vendor: {
            test: /[\\/]node_modules[\\/](lucide-react|framer-motion)[\\/]/,
            name: 'ui-vendor',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Regular vendor chunk
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            reuseExistingChunk: true,
            maxSize: 80000, // Keep vendor chunks under 80KB
          },
          // Critical component chunk (dashboard components)
          critical_components: {
            test: /[\\/]src[\\/]components[\\/](PersonalDashboard|ManagerDashboard|TeamSelectionScreen)\.tsx$/,
            name: 'critical-components',
            priority: 18,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Other component chunk
          components: {
            test: /[\\/]src[\\/]components[\\/]/,
            name: 'components',
            priority: 15,
            minChunks: 1,
            reuseExistingChunk: true,
            maxSize: 60000, // Smaller component chunks
          },
          // Utils chunk for utility functions
          utils: {
            test: /[\\/]src[\\/](utils|lib)[\\/]/,
            name: 'utils',
            priority: 10,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Default chunk
          default: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            maxSize: 50000, // Keep default chunks small
          },
        },
      };

      // OPTIMIZED: Enhanced tree shaking and optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.minimize = true;
      
      // OPTIMIZED: Module concatenation for smaller bundles
      config.optimization.concatenateModules = true;
    }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      },
      // Cache static assets
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Cache fonts
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Cache scripts  
      {
        source: '/scripts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400'
          }
        ]
      }
    ];
  },

  // Enable gzip compression
  compress: true,

  // Disable powered by header
  poweredByHeader: false,

  // Enable strict mode for better performance
  reactStrictMode: true,

  // Temporarily disable ESLint during build for CI/CD
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
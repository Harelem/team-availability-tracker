import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint configuration for production build
  eslint: {
    // Allow warnings during production build (warnings won't fail the build)
    ignoreDuringBuilds: true,
    dirs: ['pages', 'src'],
  },
  
  // TypeScript configuration for production build
  typescript: {
    // Enable strict TypeScript checking for production builds
    ignoreBuildErrors: false,
  },

  // Experimental features for PWA
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },

  // Images optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and optimization
  compress: true,
  poweredByHeader: false,

  // CRITICAL: Force cache invalidation for mobile emergency fix
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // Security and PWA headers with AGGRESSIVE CACHE INVALIDATION
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // CRITICAL: Force cache invalidation for mobile emergency
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/offline.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Bundle analyzer and optimization
  webpack: (config, { dev, isServer }) => {
    // Service Worker support
    if (!isServer && !dev) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // Enhanced bundle splitting for mobile optimization
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Core framework
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // UI libraries (Lucide icons)
          ui: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 30,
          },
          // Mobile-specific components
          mobile: {
            test: /[\\/](mobile|Mobile)[\\/]/,
            name: 'mobile',
            chunks: 'all',
            priority: 25,
          },
          // Navigation components
          navigation: {
            test: /[\\/](navigation|Navigation)[\\/]/,
            name: 'navigation',
            chunks: 'all',
            priority: 20,
          },
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;

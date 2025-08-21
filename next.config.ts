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

  // Enhanced experimental features for hydration consistency and performance
  experimental: {
    // Web Vitals tracking for performance monitoring
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'FCP', 'TTFB'],
    
    // Hydration optimization features - optimize imports for key packages
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tooltip', '@supabase/supabase-js', 'date-fns', 'recharts', 'zustand', 'clsx', 'tailwind-merge'],
    
    // Simplified experimental features for production stability
    webpackBuildWorker: true,
    optimizeCss: true,
    strictNextHead: true,
    serverMinification: true,
  },
  
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
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
  
  // Optimized build ID generation for better caching
  generateBuildId: async () => {
    // Use environment-based build ID for better cache control
    const buildTimestamp = process.env.BUILD_TIMESTAMP || Date.now().toString();
    const nodeEnv = process.env.NODE_ENV || 'development';
    return `${nodeEnv}-${buildTimestamp}`;
  },
  
  // React strict mode for better hydration consistency
  reactStrictMode: true,
  
  // Enable compiler optimizations for better performance
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
    // Styled-components support for better SSR
    styledComponents: true,
  },
  
  // Development optimization - reduce prefetching to improve performance
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 1,
  },
  
  
  
  // Performance-optimized headers (security headers now handled by middleware)
  async headers() {
    return [
      {
        // Main application routes - simplified caching for production stability
        source: '/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)',
        headers: [
          // Simplified cache control for HTML pages
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
      {
        // API routes - no caching for dynamic content
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
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
        // Static assets - aggressive caching
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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

  // Enhanced webpack optimization for SSR/CSR consistency and hydration
  webpack: (config, { dev, isServer, webpack }) => {
    // Service Worker and Node.js polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }

    // Hydration consistency optimizations
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_IS_SERVER': JSON.stringify(isServer.toString()),
        'process.env.NEXT_IS_DEV': JSON.stringify(dev.toString()),
      })
    );

    // Simplified bundle splitting for production stability
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Essential framework chunks only
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Next.js framework
            nextjs: {
              test: /[\\/]node_modules[\\/]next[\\/]/,
              name: 'nextjs',
              chunks: 'all',
              priority: 25,
            },
            // Main vendor libraries
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Common application code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Development optimizations for faster builds and better HMR
    if (dev) {
      // Disable filesystem cache to prevent webpack cache errors
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;

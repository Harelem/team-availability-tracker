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
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tooltip'],
    
    // Enhanced webpack build cache for faster builds
    webpackBuildWorker: true,
    
    // Optimize CSS for better performance
    optimizeCss: true,
    
    // React strict mode enforcement for better hydration consistency
    strictNextHead: true,
    
    // Optimize server-side rendering
    serverMinification: true,
    
    // Memory optimization for better build performance
    memoryBasedWorkersCount: true,
    
    // Enable TypeScript plugin for better development experience
    typedRoutes: false,
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
  
  // Development optimization
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Security and performance-optimized headers
  async headers() {
    return [
      {
        // Main application routes - optimized caching for better performance
        source: '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          // Optimized cache control for HTML pages
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
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

    // Enhanced bundle splitting for optimal hydration and performance
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            // React framework - highest priority for hydration consistency
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 50,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Next.js framework
            nextjs: {
              test: /[\\/]node_modules[\\/]next[\\/]/,
              name: 'nextjs',
              chunks: 'all',
              priority: 45,
              enforce: true,
            },
            // Supabase and database libraries
            database: {
              test: /[\\/]node_modules[\\/](@supabase|postgres)[\\/]/,
              name: 'database',
              chunks: 'all',
              priority: 40,
            },
            // UI and design system libraries
            ui: {
              test: /[\\/]node_modules[\\/](lucide-react|@radix-ui|clsx|tailwind-merge)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 35,
            },
            // Date and utility libraries
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|lodash)[\\/]/,
              name: 'utils',
              chunks: 'all',
              priority: 30,
            },
            // Charts and visualization
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 25,
            },
            // Application-specific chunks
            navigation: {
              test: /[\\/]src[\\/]components[\\/]navigation[\\/]/,
              name: 'navigation',
              chunks: 'all',
              priority: 20,
              minChunks: 1,
            },
            dashboard: {
              test: /[\\/]src[\\/]components[\\/].*Dashboard/,
              name: 'dashboard',
              chunks: 'all',
              priority: 18,
              minChunks: 1,
            },
            // Vendor libraries
            vendor: {
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
        // Optimize module concatenation for better performance
        concatenateModules: true,
        // Optimize side effects
        sideEffects: false,
      };
    }

    // Development optimizations for faster builds and better HMR
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    return config;
  },
};

export default nextConfig;

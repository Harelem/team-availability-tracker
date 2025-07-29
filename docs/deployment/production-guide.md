# Production Deployment Guide

Comprehensive guide for deploying the Team Availability Tracker to production environments.

## 📋 Table of Contents

- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [PWA Configuration](#pwa-configuration)
- [Deployment Platforms](#deployment-platforms)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## ✅ Pre-deployment Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Bundle size optimized (`npm run analyze`)
- [ ] Accessibility audit passed
- [ ] Performance audit completed

### Security
- [ ] Environment variables secured
- [ ] API keys and secrets configured
- [ ] CORS settings configured
- [ ] CSP headers implemented
- [ ] Security headers configured

### PWA Requirements
- [ ] Service worker registered
- [ ] Web app manifest configured
- [ ] Icons generated (all sizes)
- [ ] Offline functionality tested
- [ ] Push notifications configured

### Analytics & Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring enabled
- [ ] Analytics integration tested
- [ ] Logging configured

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret"

# PWA & Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:your-email@domain.com"

# Analytics (Optional)
NEXT_PUBLIC_GA_ID="GA-XXXXXXXX-X"
SENTRY_DSN="your-sentry-dsn"

# API Configuration
API_BASE_URL="https://api.your-domain.com"
REDIS_URL="redis://username:password@host:port"
```

### Environment-specific Configurations

#### Development
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
LOG_LEVEL=debug
```

#### Staging
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=staging
LOG_LEVEL=info
```

#### Production
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
LOG_LEVEL=warn
```

## 🗄️ Database Setup

### Supabase Configuration

1. **Create Supabase Project**
   ```bash
   # Using Supabase CLI
   supabase init
   supabase start
   supabase db push
   ```

2. **Run Migrations**
   ```sql
   -- Create tables for team availability tracking
   -- See: /database/migrations/
   ```

3. **Set up Row Level Security (RLS)**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
   ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
   ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
   
   -- Create policies for data access
   -- See: /database/policies/
   ```

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_schedule_entries_date ON schedule_entries(date);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_performance_metrics_team_date ON performance_metrics(team_id, period_start);
```

## 📱 PWA Configuration

### Web App Manifest
```json
{
  "name": "Team Availability Tracker",
  "short_name": "TeamTracker",
  "description": "Track team availability and performance",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "View Schedule",
      "short_name": "Schedule",
      "description": "View team schedule",
      "url": "/schedule",
      "icons": [{ "src": "/icons/shortcut-schedule.png", "sizes": "96x96" }]
    }
  ]
}
```

### Service Worker Caching Strategy
```javascript
// Configure workbox caching
const cacheConfig = {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 300 // 5 minutes
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 86400 // 24 hours
        }
      }
    }
  ]
};
```

## 🚀 Deployment Platforms

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   ```bash
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_ANON_KEY production
   # Add all required environment variables
   ```

4. **Custom Domain**
   ```bash
   vercel domains add your-domain.com
   ```

### Netlify Deployment

1. **Build Configuration** (`netlify.toml`)
   ```toml
   [build]
     command = "npm run build"
     publish = "out"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"
       X-XSS-Protection = "1; mode=block"
   ```

2. **Deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=out
   ```

### Self-hosted (Docker)

1. **Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   FROM node:18-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/out ./out
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/package.json ./package.json
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       env_file:
         - .env.production
     
     redis:
       image: redis:alpine
       ports:
         - "6379:6379"
   ```

## ⚡ Performance Optimization

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeImages: true
  },
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/webp', 'image/avif']
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  swcMinify: true
};
```

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze

# Check for large dependencies
npx bundle-analyzer
```

### Image Optimization
```bash
# Generate optimized images
npm run generate-icons
npm run optimize-images
```

### CDN Configuration
- Use CDN for static assets
- Configure proper cache headers
- Enable Brotli/Gzip compression

## 🔒 Security Considerations

### Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

### Content Security Policy
```javascript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-analytics.com;
  child-src *.youtube.com *.google.com *.twitter.com;
  style-src 'self' 'unsafe-inline' *.googleapis.com;
  img-src * blob: data:;
  media-src 'none';
  connect-src *;
  font-src 'self' *.googleapis.com *.gstatic.com;
`;
```

### Environment Security
- Use secrets management (AWS Secrets Manager, Azure Key Vault)
- Rotate API keys regularly
- Enable audit logging
- Use least-privilege access principles

## 📊 Monitoring & Maintenance

### Error Tracking (Sentry)
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: 0.1,
  beforeSend: (event) => {
    // Filter out noise
    if (event.exception) {
      const error = event.exception.values[0];
      if (error.type === 'ChunkLoadError') {
        return null;
      }
    }
    return event;
  }
});
```

### Performance Monitoring
```javascript
// lib/monitoring.js
export const trackPerformance = () => {
  if (typeof window !== 'undefined') {
    // Core Web Vitals
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }
};
```

### Health Checks
```javascript
// pages/api/health.js
export default function handler(req, res) {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: 'OK', // Add actual DB check
      redis: 'OK',     // Add actual Redis check
      external_apis: 'OK'
    }
  };
  
  res.status(200).json(healthcheck);
}
```

### Backup Strategy
```bash
# Database backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated backups with cron
0 2 * * * /path/to/backup-script.sh
```

## 🚨 Troubleshooting

### Common Issues

#### PWA Installation Issues
```javascript
// Debug PWA installation
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('SW registered'))
    .catch(error => console.error('SW registration failed', error));
}
```

#### Performance Issues
```bash
# Check bundle size
npm run analyze

# Lighthouse audit
lighthouse https://your-domain.com --output html

# Performance profiling
npm run dev -- --profile
```

#### Database Connection Issues
```javascript
// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('teams').select('count');
    if (error) throw error;
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};
```

### Log Analysis
```bash
# Production logs
vercel logs your-deployment-url

# Filter errors
vercel logs --follow | grep ERROR

# Performance logs
vercel logs --follow | grep "response time"
```

### Rollback Strategy
```bash
# Vercel rollback
vercel rollback

# Docker rollback
docker-compose down
docker-compose up -d previous-version
```

## 📈 Post-deployment Checklist

### Verification
- [ ] Application loads correctly
- [ ] PWA installation works
- [ ] Push notifications functional
- [ ] Database connections established
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Analytics tracking active

### Performance
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals passing
- [ ] Bundle size optimized
- [ ] Images compressed
- [ ] CDN configured

### Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] API rate limiting active
- [ ] Error tracking configured
- [ ] Logs monitoring setup

### Monitoring
- [ ] Uptime monitoring configured
- [ ] Error alerts setup
- [ ] Performance monitoring active
- [ ] Backup strategy implemented
- [ ] Health checks running

---

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Supabase Production Guide](https://supabase.com/docs/guides/hosting/overview)
- [Web Performance Optimization](https://web.dev/fast/)

For support and questions, refer to the main [README](../README.md) or create an issue in the repository.
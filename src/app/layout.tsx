import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalLiveRegions } from "@/components/accessibility/ScreenReaderAnnouncements";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Team Availability Tracker",
    template: "%s | Team Availability Tracker"
  },
  description: "Track team availability, manage schedules, and analyze performance across your organization",
  keywords: ["team management", "availability tracking", "schedule management", "workforce analytics"],
  authors: [{ name: "Team Tracker" }],
  creator: "Team Tracker",
  publisher: "Team Tracker",
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Team Tracker",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://teamtracker.app",
    siteName: "Team Availability Tracker",
    title: "Team Availability Tracker",
    description: "Track team availability, manage schedules, and analyze performance",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Team Availability Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Availability Tracker",
    description: "Track team availability, manage schedules, and analyze performance",
    images: ["/images/twitter-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png", 
        sizes: "16x16",
        url: "/favicon-16x16.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Team Tracker" />
        <meta name="application-name" content="Team Tracker" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Accessibility enhancements */}
        <meta name="color-scheme" content="light dark" />
        
        {/* Performance hints */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Aggressive Cache Control Meta Tags for Mobile */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Service Worker registration script with aggressive cache invalidation */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  // Force unregister existing service workers first
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.unregister();
                    });
                  }).then(function() {
                    // Register new service worker with cache-busting parameter
                    const swUrl = '/sw.js?v=' + Date.now();
                    navigator.serviceWorker.register(swUrl)
                      .then(function(registration) {
                        console.log('SW registered with cache-bust: ', registration);
                        
                        // Listen for service worker updates
                        registration.addEventListener('updatefound', function() {
                          const newWorker = registration.installing;
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              console.log('New SW version available, updating...');
                              newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                          });
                        });
                        
                        // Listen for messages from service worker
                        navigator.serviceWorker.addEventListener('message', function(event) {
                          if (event.data.type === 'CACHE_UPDATED') {
                            console.log('Cache updated, forcing page refresh...');
                            window.location.reload(true);
                          }
                        });
                        
                        // Force refresh on mobile devices
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
                        if (isMobile && registration.active) {
                          registration.active.postMessage({ 
                            type: 'CACHE_CLEAR',
                            payload: { forceMobileRefresh: true }
                          });
                        }
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                });
              }
              
              // Force page refresh on browser back/forward for mobile cache issues
              window.addEventListener('pageshow', function(event) {
                if (event.persisted) {
                  console.log('Page loaded from cache, forcing refresh on mobile...');
                  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
                  if (isMobile) {
                    window.location.reload(true);
                  }
                }
              });
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Skip links for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link"
          data-skip-link="true"
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="skip-link"
        >
          Skip to navigation
        </a>
        
        {/* Main application content */}
        <div id="root" className="min-h-screen">
          <main id="main-content" role="main" tabIndex={-1}>
            {children}
          </main>
        </div>
        
        {/* Global accessibility live regions */}
        <GlobalLiveRegions />
        
        {/* Performance monitoring initialization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize performance monitoring
              if (typeof window !== 'undefined' && 'performance' in window) {
                // Mark the app as loaded
                performance.mark('app-loaded');
                
                // Monitor Core Web Vitals
                if ('PerformanceObserver' in window) {
                  try {
                    // Track Long Tasks
                    const longTaskObserver = new PerformanceObserver((list) => {
                      list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) {
                          console.warn('Long task detected:', entry.duration + 'ms');
                        }
                      });
                    });
                    longTaskObserver.observe({entryTypes: ['longtask']});
                  } catch (e) {
                    // Long task observer not supported
                  }
                }
              }
            `,
          }}
        />
        
        {/* Accessibility preferences initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Apply saved accessibility preferences immediately to prevent flash
              try {
                const prefs = localStorage.getItem('accessibility-preferences');
                if (prefs) {
                  const preferences = JSON.parse(prefs);
                  const root = document.documentElement;
                  
                  if (preferences.highContrast) {
                    root.classList.add('high-contrast');
                  }
                  
                  if (preferences.reducedMotion) {
                    root.classList.add('reduce-motion');
                  }
                  
                  if (preferences.darkMode) {
                    root.classList.add('dark');
                  }
                  
                  if (preferences.fontSize) {
                    root.setAttribute('data-font-size', preferences.fontSize);
                  }
                  
                  if (preferences.colorBlindMode && preferences.colorBlindMode !== 'none') {
                    root.setAttribute('data-colorblind-mode', preferences.colorBlindMode);
                  }
                  
                  if (preferences.focusIndicators) {
                    root.setAttribute('data-focus-mode', preferences.focusIndicators);
                  }
                }
                
                // Respect system preferences
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                  document.documentElement.classList.add('reduce-motion');
                }
                
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {
                console.warn('Error applying accessibility preferences:', e);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

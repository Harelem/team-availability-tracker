import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalLiveRegions } from "@/components/accessibility/ScreenReaderAnnouncements";
import LazyVersionDisplay from "@/components/LazyVersionDisplay";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { MobileNavigationProvider } from "@/components/navigation/MobileNavigationProvider";
import GlobalMobileNavigation from "@/components/navigation/GlobalMobileNavigation";
import EmergencyMobileWrapper from "@/components/EmergencyMobileWrapper";
import { HydrationProvider } from "@/components/HydrationSafeWrapper";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'),
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
  minimumScale: 1,
  interactiveWidget: "resizes-content",
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
        
        {/* Optimized Cache Control for Performance */}
        <meta httpEquiv="Cache-Control" content="public, max-age=3600, stale-while-revalidate=86400" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* Service Worker temporarily disabled to fix production JS loading conflicts */}
        {/* <script src="/scripts/service-worker-init.js" defer></script> */}
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
        
        {/* Main application content with error boundary */}
        <div id="root" className="min-h-screen">
          <main id="main-content" role="main" tabIndex={-1}>
            <HydrationProvider>
              <AppStateProvider>
                <MobileNavigationProvider>
                  <PageErrorBoundary>
                    <EmergencyMobileWrapper hideOnRoutes={['/login', '/signup', '/onboarding']}>
                      {children}
                    </EmergencyMobileWrapper>
                  </PageErrorBoundary>
                  
                  {/* Global Mobile Navigation - Fallback for desktop */}
                  <GlobalMobileNavigation 
                    hideOnRoutes={['/login', '/signup', '/onboarding']}
                  />
                </MobileNavigationProvider>
              </AppStateProvider>
            </HydrationProvider>
          </main>
        </div>
        
        {/* Global accessibility live regions */}
        <GlobalLiveRegions />
        
        {/* Version display for mobile emergency debugging */}
        <LazyVersionDisplay />
        
        {/* Performance monitoring initialization script - external file for security */}
        <script src="/scripts/performance-monitor.js" defer></script>
        
        {/* Accessibility preferences initialization - external file for security */}
        <script src="/scripts/accessibility-init.js" defer></script>
        
        {/* Mobile touch and viewport optimization initialization */}
        <script src="/scripts/mobile-touch-init.js" defer></script>
      </body>
    </html>
  );
}

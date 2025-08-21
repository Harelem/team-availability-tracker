'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/useIsMobile';

// Lazy load the MobileAppNavigation component for better performance
const MobileAppNavigation = dynamic(
  () => import('./MobileAppNavigation'),
  {
    loading: () => null, // No loading spinner for navigation
    ssr: false, // Client-side only for better performance
  }
);

interface GlobalMobileNavigationProps {
  hideOnRoutes?: string[];
  className?: string;
}

/**
 * Global Mobile Navigation Component
 * Displays app-wide mobile navigation across all pages
 */
export default function GlobalMobileNavigation({
  hideOnRoutes = [],
  className = ''
}: GlobalMobileNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, isLoading: mobileLoading } = useIsMobile();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Memoize the check for whether navigation should be hidden
  const shouldHide = useMemo(() => 
    hideOnRoutes.some(route => pathname?.startsWith(route)) || mobileLoading,
    [hideOnRoutes, pathname, mobileLoading]
  );

  // Memoize the executive navigation check
  const showExecutive = useMemo(() => 
    pathname?.includes('/executive') || false,
    [pathname]
  );

  // Memoized navigation handlers to prevent re-creation
  const handleNavigateHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleNavigateTeams = useCallback(() => {
    router.push('/?tab=teams');
  }, [router]);

  const handleNavigateExecutive = useCallback(() => {
    router.push('/executive');
  }, [router]);

  // Settings navigation removed in v2.2 for cleaner mobile experience
  // const handleNavigateSettings = useCallback(() => {
  //   // Settings not implemented yet - show a helpful message
  //   alert('Settings page coming soon! For now, use the menu in the top-left corner for options.');
  // }, []);

  const handleNavigateProfile = useCallback(() => {
    // Profile not implemented yet - show a helpful message  
    alert('Profile page coming soon! User info is shown in the navigation header.');
  }, []);

  // Get current user context (this would come from auth context in real app)
  useEffect(() => {
    // In a real app, this would get user from auth context
    // For now, we'll leave it null and let individual pages handle user context
    setCurrentUser(null);
  }, []);

  // Only show on mobile devices and when not on excluded routes
  if (!isMobile || shouldHide) {
    return null;
  }

  return (
    <MobileAppNavigation
      currentUser={currentUser as any}
      currentPage={pathname || undefined}
      showExecutive={showExecutive}
      onNavigateHome={handleNavigateHome}
      onNavigateTeams={handleNavigateTeams}
      onNavigateExecutive={handleNavigateExecutive}
      onNavigateProfile={handleNavigateProfile}
      className={className}
    />
  );
}
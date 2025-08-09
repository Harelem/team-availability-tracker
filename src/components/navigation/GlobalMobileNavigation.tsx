'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import MobileAppNavigation from './MobileAppNavigation';

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
  const { isMobile, isLoading: mobileLoading } = useIsMobile();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Check if navigation should be hidden on current route
  const shouldHide = hideOnRoutes.some(route => pathname.startsWith(route)) || mobileLoading;

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

  // Determine if we should show executive navigation
  const showExecutive = pathname.includes('/executive');

  return (
    <MobileAppNavigation
      currentUser={currentUser}
      currentPage={pathname}
      showExecutive={showExecutive}
      onNavigateHome={() => {
        window.location.href = '/';
      }}
      onNavigateTeams={() => {
        window.location.href = '/?tab=teams';
      }}
      onNavigateExecutive={() => {
        window.location.href = '/executive';
      }}
      onNavigateSettings={() => {
        window.location.href = '/settings';
      }}
      onNavigateProfile={() => {
        window.location.href = '/profile';
      }}
      onLogout={() => {
        // Handle global logout - will be implemented with auth system
        console.log('Logout requested from mobile navigation');
      }}
      className={className}
    />
  );
}
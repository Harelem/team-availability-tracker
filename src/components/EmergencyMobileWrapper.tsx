'use client';

import { useIsMobileSimple } from '@/hooks/useIsMobileSimple';
import EmergencyMobileMenu from './EmergencyMobileMenu';
import { usePathname } from 'next/navigation';

interface EmergencyMobileWrapperProps {
  children: React.ReactNode;
  hideOnRoutes?: string[];
}

/**
 * Emergency Mobile Wrapper Component
 * Conditionally shows emergency mobile navigation for mobile devices
 * while preserving desktop functionality
 */
export default function EmergencyMobileWrapper({ 
  children, 
  hideOnRoutes = ['/login', '/signup', '/onboarding'] 
}: EmergencyMobileWrapperProps) {
  const { isMobile, isClient } = useIsMobileSimple();
  const pathname = usePathname();
  
  // Check if navigation should be hidden on current route
  const shouldHide = hideOnRoutes.some(route => pathname?.startsWith(route));
  
  // Show emergency mobile menu only on mobile devices and when not on excluded routes
  const showEmergencyMenu = isClient && isMobile && !shouldHide;
  
  return (
    <>
      {/* Emergency Mobile Menu for mobile devices */}
      {showEmergencyMenu && <EmergencyMobileMenu />}
      
      {/* Main content with appropriate padding for mobile menu */}
      <div 
        className={showEmergencyMenu ? 'pt-16' : ''}
        style={{
          paddingTop: showEmergencyMenu ? '64px' : undefined,
          minHeight: '100vh'
        }}
      >
        {children}
      </div>
    </>
  );
}
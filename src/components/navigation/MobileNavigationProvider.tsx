'use client';

import React from 'react';
import { NavigationProvider } from '@/contexts/NavigationContext';

interface MobileNavigationProviderProps {
  children: React.ReactNode;
}

/**
 * Mobile Navigation Provider Wrapper
 * This component wraps the NavigationProvider and adds mobile-specific enhancements
 */
export function MobileNavigationProvider({ children }: MobileNavigationProviderProps) {
  return (
    <NavigationProvider initialPage={typeof window !== 'undefined' ? window.location.pathname : '/'}>
      {children}
    </NavigationProvider>
  );
}

export default MobileNavigationProvider;
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Navigation state types
export interface NavigationState {
  currentPage: string;
  previousPage: string | null;
  isNavigationOpen: boolean;
  navigationHistory: string[];
  breadcrumbs: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

export interface NavigationContextType {
  // Navigation state
  state: NavigationState;
  
  // Navigation actions
  navigateTo: (page: string, options?: { updateHistory?: boolean; replace?: boolean }) => void;
  goBack: () => void;
  openNavigation: () => void;
  closeNavigation: () => void;
  toggleNavigation: () => void;
  
  // Breadcrumb management
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (breadcrumb: BreadcrumbItem) => void;
  
  // History management
  clearHistory: () => void;
  canGoBack: () => boolean;
}

// Create context with default values
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Default navigation state
const defaultNavigationState: NavigationState = {
  currentPage: '/',
  previousPage: null,
  isNavigationOpen: false,
  navigationHistory: [],
  breadcrumbs: []
};

interface NavigationProviderProps {
  children: ReactNode;
  initialPage?: string;
}

export function NavigationProvider({ children, initialPage = '/' }: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>({
    ...defaultNavigationState,
    currentPage: initialPage,
    navigationHistory: [initialPage]
  });

  // Navigate to a new page
  const navigateTo = useCallback((page: string, options: { updateHistory?: boolean; replace?: boolean } = {}) => {
    const { updateHistory = true, replace = false } = options;
    
    setState(prevState => {
      const newHistory = replace 
        ? [...prevState.navigationHistory.slice(0, -1), page]
        : updateHistory 
        ? [...prevState.navigationHistory, page]
        : prevState.navigationHistory;

      return {
        ...prevState,
        previousPage: prevState.currentPage,
        currentPage: page,
        navigationHistory: newHistory,
        isNavigationOpen: false // Close navigation when navigating
      };
    });
  }, []);

  // Go back to previous page
  const goBack = useCallback(() => {
    setState(prevState => {
      if (prevState.navigationHistory.length <= 1) {
        return prevState; // Can't go back further
      }

      const newHistory = prevState.navigationHistory.slice(0, -1);
      const previousPage = newHistory[newHistory.length - 1];

      return {
        ...prevState,
        previousPage: prevState.currentPage,
        currentPage: previousPage || '',
        navigationHistory: newHistory,
        isNavigationOpen: false
      };
    });
  }, []);

  // Navigation menu controls
  const openNavigation = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isNavigationOpen: true
    }));
  }, []);

  const closeNavigation = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isNavigationOpen: false
    }));
  }, []);

  const toggleNavigation = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isNavigationOpen: !prevState.isNavigationOpen
    }));
  }, []);

  // Breadcrumb management
  const setBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    setState(prevState => ({
      ...prevState,
      breadcrumbs
    }));
  }, []);

  const addBreadcrumb = useCallback((breadcrumb: BreadcrumbItem) => {
    setState(prevState => ({
      ...prevState,
      breadcrumbs: [...prevState.breadcrumbs, breadcrumb]
    }));
  }, []);

  // History management
  const clearHistory = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      navigationHistory: [prevState.currentPage],
      previousPage: null
    }));
  }, []);

  const canGoBack = useCallback(() => {
    return state.navigationHistory.length > 1;
  }, [state.navigationHistory.length]);

  const contextValue: NavigationContextType = {
    state,
    navigateTo,
    goBack,
    openNavigation,
    closeNavigation,
    toggleNavigation,
    setBreadcrumbs,
    addBreadcrumb,
    clearHistory,
    canGoBack
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hook to use navigation context
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  
  return context;
}

// Navigation page constants
export const NAVIGATION_PAGES = {
  HOME: '/',
  TEAM_SELECTION: '/team-selection',
  TEAM_DASHBOARD: '/team-dashboard',
  PERSONAL_DASHBOARD: '/personal-dashboard',
  MANAGER_DASHBOARD: '/manager-dashboard',
  EXECUTIVE_DASHBOARD: '/executive',
  SETTINGS: '/settings',
  PROFILE: '/profile'
} as const;

export type NavigationPage = typeof NAVIGATION_PAGES[keyof typeof NAVIGATION_PAGES];
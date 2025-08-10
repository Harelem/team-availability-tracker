/**
 * Design System Theme Provider
 * 
 * Provides theme context and utilities for consistent theming across the application.
 * Supports light/dark modes and custom theme configurations.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { designTokens, colors, type DesignTokens } from './tokens';

// =============================================================================
// THEME TYPES
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: typeof colors.primary;
  secondary: typeof colors.secondary;
  success: typeof colors.success;
  warning: typeof colors.warning;
  error: typeof colors.error;
  info: typeof colors.info;
  gray: typeof colors.gray;
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
    gradient: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    link: string;
    linkHover: string;
  };
  border: {
    light: string;
    medium: string;
    dark: string;
    focus: string;
  };
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  tokens: DesignTokens;
}

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    gray: colors.gray,
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      overlay: 'rgba(0, 0, 0, 0.5)',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
      inverse: '#ffffff',
      link: '#2563eb',
      linkHover: '#1d4ed8'
    },
    border: {
      light: '#e5e7eb',
      medium: '#d1d5db',
      dark: '#9ca3af',
      focus: '#3b82f6'
    }
  },
  tokens: designTokens
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    gray: colors.gray,
    background: {
      primary: '#111827',
      secondary: '#1f2937',
      tertiary: '#374151',
      overlay: 'rgba(0, 0, 0, 0.75)',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      inverse: '#111827',
      link: '#60a5fa',
      linkHover: '#93c5fd'
    },
    border: {
      light: '#374151',
      medium: '#4b5563',
      dark: '#6b7280',
      focus: '#60a5fa'
    }
  },
  tokens: designTokens
};

// =============================================================================
// THEME CONTEXT
// =============================================================================

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
  isLight: boolean;
  colors: ThemeColors;
  tokens: DesignTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// THEME PROVIDER
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultMode = 'system',
  storageKey = 'team-tracker-theme'
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Determine the actual theme based on mode
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);
  const currentTheme = isDark ? darkTheme : lightTheme;

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as ThemeMode;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setModeState(stored);
      }
    }
  }, [storageKey]);

  // Monitor system theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemPrefersDark(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        setSystemPrefersDark(e.matches);
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Update document classes when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;

      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');

      // Add current theme class
      const themeClass = isDark ? 'dark' : 'light';
      root.classList.add(themeClass);
      body.classList.add(themeClass);

      // Set CSS custom properties for colors
      const cssVariables = {
        '--color-primary': currentTheme.colors.primary[500],
        '--color-primary-50': currentTheme.colors.primary[50],
        '--color-primary-100': currentTheme.colors.primary[100],
        '--color-primary-500': currentTheme.colors.primary[500],
        '--color-primary-600': currentTheme.colors.primary[600],
        '--color-primary-700': currentTheme.colors.primary[700],
        '--color-background-primary': currentTheme.colors.background.primary,
        '--color-background-secondary': currentTheme.colors.background.secondary,
        '--color-background-tertiary': currentTheme.colors.background.tertiary,
        '--color-text-primary': currentTheme.colors.text.primary,
        '--color-text-secondary': currentTheme.colors.text.secondary,
        '--color-text-tertiary': currentTheme.colors.text.tertiary,
        '--color-border-light': currentTheme.colors.border.light,
        '--color-border-medium': currentTheme.colors.border.medium,
        '--color-border-focus': currentTheme.colors.border.focus,
      };

      Object.entries(cssVariables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  }, [isDark, currentTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newMode);
    }
  };

  const toggleMode = () => {
    if (mode === 'system') {
      setMode(systemPrefersDark ? 'light' : 'dark');
    } else {
      setMode(mode === 'light' ? 'dark' : 'light');
    }
  };

  const contextValue: ThemeContextType = {
    theme: currentTheme,
    mode,
    setMode,
    toggleMode,
    isDark,
    isLight: !isDark,
    colors: currentTheme.colors,
    tokens: currentTheme.tokens
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// THEME HOOK
// =============================================================================

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// =============================================================================
// THEME UTILITIES
// =============================================================================

export const getThemeColor = (colorPath: string, theme: Theme): string => {
  const parts = colorPath.split('.');
  let current: any = theme.colors;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return colorPath; // Return original if path doesn't exist
    }
  }
  
  return typeof current === 'string' ? current : colorPath;
};

export const createThemeAwareStyle = (
  lightStyles: React.CSSProperties,
  darkStyles: React.CSSProperties
) => {
  return (theme: Theme): React.CSSProperties => {
    return theme.mode === 'dark' ? darkStyles : lightStyles;
  };
};

// =============================================================================
// CSS-IN-JS UTILITIES
// =============================================================================

export const tw = (strings: TemplateStringsArray, ...values: any[]): string => {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] || '');
  }, '');
};

export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Theme-aware class builder
export const buildThemeClasses = (
  baseClasses: string,
  lightClasses: string,
  darkClasses: string
): string => {
  return cx(
    baseClasses,
    `light:${lightClasses}`,
    `dark:${darkClasses}`
  );
};

// =============================================================================
// COMPONENT THEME HELPERS
// =============================================================================

export const getComponentVariant = (
  variant: string,
  variants: Record<string, any>,
  fallback = 'default'
): any => {
  return variants[variant] || variants[fallback] || {};
};

export const getComponentSize = (
  size: string,
  sizes: Record<string, any>,
  fallback = 'md'
): any => {
  return sizes[size] || sizes[fallback] || {};
};

// =============================================================================
// ACCESSIBILITY HELPERS
// =============================================================================

export const getContrastColor = (backgroundColor: string, theme: Theme): string => {
  // Simple contrast calculation - in a real app, you might want a more sophisticated algorithm
  const isDarkBackground = backgroundColor.includes('dark') || 
                          backgroundColor.includes('900') || 
                          backgroundColor.includes('800');
  
  return isDarkBackground ? theme.colors.text.inverse : theme.colors.text.primary;
};

export const getFocusRingClasses = (color = 'primary'): string => {
  return `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`;
};

// =============================================================================
// RESPONSIVE HELPERS
// =============================================================================

export function getResponsiveValue<T>(
  value: T | { xs?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T },
  breakpoint: keyof typeof designTokens.breakpoints = 'md'
): T {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const responsiveValue = value as any;
    return responsiveValue[breakpoint] || responsiveValue.md || responsiveValue.xs || value;
  }
  return value as T;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

// Types already exported above
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Safelist dynamic classes that are constructed programmatically
  safelist: [
    // Color variants used dynamically
    'bg-blue-50',
    'bg-blue-100',
    'bg-blue-500',
    'bg-blue-600',
    'bg-green-50',
    'bg-green-100',
    'bg-green-500',
    'bg-green-600',
    'bg-yellow-50',
    'bg-yellow-100',
    'bg-yellow-500',
    'bg-yellow-600',
    'bg-red-50',
    'bg-red-100',
    'bg-red-500',
    'bg-red-600',
    'bg-purple-50',
    'bg-purple-100',
    'bg-purple-500',
    'bg-purple-600',
    'bg-gray-50',
    'bg-gray-100',
    'bg-gray-200',
    'bg-gray-300',

    // Text colors
    'text-blue-600',
    'text-blue-700',
    'text-blue-800',
    'text-green-600',
    'text-green-700',
    'text-green-800',
    'text-yellow-600',
    'text-yellow-700',
    'text-yellow-800',
    'text-red-600',
    'text-red-700',
    'text-red-800',
    'text-purple-600',
    'text-purple-700',
    'text-purple-800',
    'text-gray-500',
    'text-gray-600',
    'text-gray-700',
    'text-gray-800',
    'text-gray-900',

    // Border colors
    'border-blue-200',
    'border-blue-300',
    'border-green-200',
    'border-green-300',
    'border-yellow-200',
    'border-yellow-300',
    'border-red-200',
    'border-red-300',
    'border-purple-200',
    'border-purple-300',
    'border-gray-200',
    'border-gray-300',
  ],
  theme: {
    extend: {
      // Custom colors from your design system
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          light: '#dbeafe',   // blue-50
          dark: '#1e40af',    // blue-800
        },
        secondary: {
          DEFAULT: '#8b5cf6', // purple-500
          light: '#f3e8ff',   // purple-50
          dark: '#5b21b6',    // purple-800
        },
        success: {
          DEFAULT: '#10b981', // green-500
          light: '#d1fae5',   // green-50
          dark: '#065f46',    // green-800
        },
        warning: {
          DEFAULT: '#f59e0b', // yellow-500
          light: '#fef3c7',   // yellow-50
          dark: '#92400e',    // yellow-800
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          light: '#fee2e2',   // red-50
          dark: '#991b1b',    // red-800
        },
      },
      // Custom spacing for consistent touch targets
      spacing: {
        '11': '44px',  // iOS minimum touch target
        '12': '48px',  // Android recommended touch target
        '14': '56px',  // Large touch target
        '18': '72px',  // Extra large touch target
      },
      // Custom min-height for mobile optimization
      minHeight: {
        '11': '44px',
        '12': '48px',
        '14': '56px',
      },
      minWidth: {
        '11': '44px',
        '12': '48px',
        '14': '56px',
      },
      // Animation speeds
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

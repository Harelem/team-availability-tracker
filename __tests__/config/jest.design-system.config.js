/**
 * Jest Configuration for Design System Tests
 * 
 * Specialized Jest configuration for design system integration,
 * visual regression, and performance testing.
 */

const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/designSystemTestSetup.ts',
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/__tests__/**/*.spec.{ts,tsx}',
  ],
  
  // Module paths and aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  
  // File extensions to resolve
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/design-system',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/components/ui/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/ui/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Test categories
  projects: [
    // Unit tests for individual components
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/__tests__/components/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/designSystemTestSetup.ts'],
      testEnvironment: 'jsdom',
    },
    
    // Integration tests
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/designSystemTestSetup.ts'],
      testEnvironment: 'jsdom',
      testTimeout: 10000, // Longer timeout for integration tests
    },
    
    // Visual regression tests
    {
      displayName: 'Visual Tests',
      testMatch: ['<rootDir>/__tests__/visual/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/designSystemTestSetup.ts'],
      testEnvironment: 'jsdom',
      snapshotSerializers: ['jest-serializer-html'],
    },
    
    // Performance tests
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/designSystemTestSetup.ts'],
      testEnvironment: 'jsdom',
      testTimeout: 30000, // Longer timeout for performance tests
    },
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/config/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/config/globalTeardown.js',
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Performance and optimization
  maxWorkers: '50%', // Use half the available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Error handling
  errorOnDeprecated: true,
  verbose: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // Mock patterns
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage/design-system/html-report',
      filename: 'design-system-test-report.html',
      expand: true,
      hideIcon: true,
      pageTitle: 'Design System Test Results',
    }],
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage/design-system',
      outputName: 'junit.xml',
    }],
  ],
  
  // Custom test runner for specific test types
  runner: '@jest/test-runner',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Snapshot configuration
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  
  // Timing and performance
  slowTestThreshold: 5, // Tests taking longer than 5s are considered slow
  
  // Custom Jest extensions
  prettierPath: require.resolve('prettier'),
};
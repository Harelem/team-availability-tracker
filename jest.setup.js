// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Add custom jest matchers from jest-dom
// import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

// Mock Date.now() for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z')
global.Date.now = jest.fn(() => mockDate.getTime())

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.log in tests but keep error and warn for debugging
  log: jest.fn(),
  error: console.error,
  warn: console.warn,
  info: jest.fn(),
  debug: jest.fn(),
}
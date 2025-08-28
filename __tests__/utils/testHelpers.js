/**
 * Test Helper Utilities
 * Common testing utilities and setup functions
 */

export function setupTestEnvironment() {
  // Basic test environment setup
  // This can be expanded with additional test utilities as needed
  
  // Mock console methods to reduce noise in tests
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
  
  // Setup localStorage mock
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });
  
  // Setup sessionStorage mock
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  });
}

export function createMockUser(email = 'test@example.com') {
  return {
    id: 'test-user-id',
    email,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

export function createMockProfile(overrides = {}) {
  return {
    id: 'test-profile-id',
    full_name: 'Test User',
    team: 'Development',
    ...overrides,
  };
}

export function waitForLoadingToFinish() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
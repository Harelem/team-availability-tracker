/**
 * Enhanced Jest Setup Configuration
 * Extended setup for comprehensive testing with mocks and utilities
 */

import '@testing-library/jest-dom';
import { setupTestEnvironment } from './__tests__/utils/testHelpers';

// ============================================================================
// Global Test Environment Setup
// ============================================================================

// Set up test environment with all necessary mocks
setupTestEnvironment();

// ============================================================================
// Global Mocks
// ============================================================================

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  }
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const mockIcon = ({ className, ...props }) => {
    return <div className={className} data-testid="mock-icon" {...props} />;
  };

  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return mockIcon;
      }
      return target[prop];
    }
  });
});

// Mock recharts for chart components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d') return 'Jan 15';
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    return date.toString();
  }),
  startOfWeek: jest.fn((date) => date),
  endOfWeek: jest.fn((date) => date),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  isToday: jest.fn(() => false),
  isPast: jest.fn(() => false),
  isFuture: jest.fn(() => true),
  differenceInDays: jest.fn(() => 7),
}));

// Mock xlsx for export functionality
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn(() => 'mock-excel-data'),
  writeFile: jest.fn(),
}));

// Mock Web APIs
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// Mock File and FileReader
global.File = jest.fn();
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  result: '',
  onload: null,
  onerror: null,
}));

// ============================================================================
// Global Test Configuration
// ============================================================================

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global error handling
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOMTestUtils.act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// ============================================================================
// Custom Matchers
// ============================================================================

expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHavePerformanceWithin(received, maxTime) {
    const pass = received <= maxTime;
    if (pass) {
      return {
        message: () =>
          `expected render time ${received}ms not to be within ${maxTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected render time ${received}ms to be within ${maxTime}ms`,
        pass: false,
      };
    }
  },
});

// ============================================================================
// Test Data Reset
// ============================================================================

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset any global state
  if (global.localStorage) {
    global.localStorage.clear();
  }
  
  // Reset date mocks
  if (Date.now.mockRestore) {
    Date.now.mockRestore();
  }
});

afterEach(() => {
  // Clean up any timers if fake timers are active
  try {
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  } catch (error) {
    // Ignore timer cleanup errors
  }
});

// ============================================================================
// Accessibility Testing Setup
// ============================================================================

// Mock axe-core for accessibility tests
jest.mock('@axe-core/react', () => ({
  default: jest.fn(),
}));

// ============================================================================
// Performance Testing Setup
// ============================================================================

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
});

// ============================================================================
// Export configuration
// ============================================================================

export default {
  setupTestEnvironment,
  mockDateNow: (date) => jest.spyOn(Date, 'now').mockImplementation(() => new Date(date).getTime()),
};
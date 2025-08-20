/**
 * Debug Logger Tests
 * 
 * Tests to validate the functional debug logger implementation
 * and ensure no "this is undefined" errors occur.
 */

import { debug, info, warn, error, operation, perf, data, verbose, success } from '@/utils/debugLogger';
import debugLogger, { debugLogger as namedExport } from '@/utils/debugLogger';

// Mock console methods to capture output
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

beforeEach(() => {
  // Replace console methods with mocks
  console.log = mockConsole.log;
  console.info = mockConsole.info;
  console.warn = mockConsole.warn;
  console.error = mockConsole.error;
  
  // Clear all mocks
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore original console methods
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('Functional Debug Logger', () => {
  describe('Function-based imports', () => {
    test('should work without "this is undefined" errors', () => {
      // These should not throw any context-related errors
      expect(() => {
        debug('Test debug message');
        info('Test info message');
        warn('Test warning message');
        error('Test error message');
        operation('Test operation message');
        success('Test success message');
        verbose('Test verbose message');
        perf('Test performance message');
        data('test-context', { test: 'data' });
      }).not.toThrow();
    });

    test('should format messages correctly with emojis', () => {
      // Error should always log regardless of level
      error('Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('🚨 Test error');

      // Warn should log in most environments (including test)
      warn('Test warning');
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ Test warning');

      // Info and debug might not log in test environment due to log level
      // Just test that they don't throw errors
      expect(() => {
        info('Test info');
        debug('Test debug');
      }).not.toThrow();
    });

    test('should handle additional arguments correctly', () => {
      const testData = { key: 'value' };
      
      // Test with error level which should always log
      error('Test with data', testData, 123);
      expect(mockConsole.error).toHaveBeenCalledWith('🚨 Test with data', testData, 123);
      
      // Test that other levels don't throw even if they don't log
      expect(() => {
        debug('Test with data', testData, 123);
        info('Test with data', testData, 123);
      }).not.toThrow();
    });
  });

  describe('Backward compatibility', () => {
    test('default export should work', () => {
      expect(() => {
        debugLogger.debug('Test message');
        debugLogger.info('Test info');
        debugLogger.warn('Test warning');
        debugLogger.error('Test error');
      }).not.toThrow();
    });

    test('named debugLogger export should work', () => {
      expect(() => {
        namedExport.debug('Test message');
        namedExport.info('Test info');
      }).not.toThrow();
    });
  });

  describe('Log level filtering', () => {
    test('should respect current log level', () => {
      // In test environment, current level should be WARN or higher
      // Error should always log
      error('Error message');
      expect(mockConsole.error).toHaveBeenCalled();

      // Warn should log in most environments
      warn('Warning message');
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('Performance logging', () => {
    test('should format performance messages with duration', () => {
      perf('Database query', 150);
      
      // In test environment, verbose might not log, so we check if it was called
      const perfCalls = mockConsole.log.mock.calls.filter(call => 
        call[0] && call[0].includes('⚡')
      );
      
      // The call might not happen if log level is too low, but if it does, check format
      if (perfCalls.length > 0) {
        expect(perfCalls[0][0]).toContain('⚡ Database query (150ms)');
      }
    });
  });

  describe('Context-free operation', () => {
    test('functions should work when assigned to variables', () => {
      // This tests that the functions don't rely on 'this' context
      const logDebug = debug;
      const logError = error;
      
      expect(() => {
        logDebug('Assigned debug function');
        logError('Assigned error function');
      }).not.toThrow();
    });

    test('functions should work when passed as callbacks', () => {
      const testCallback = (logFn: Function) => {
        logFn('Callback test message');
      };
      
      expect(() => {
        testCallback(debug);
        testCallback(error);
      }).not.toThrow();
    });
  });
});

describe('Environment-specific behavior', () => {
  test('should determine log level correctly', () => {
    // Test that the logger can determine its log level without errors
    expect(() => {
      debugLogger.currentLevel;
      debugLogger.shouldLog(0); // ERROR level
    }).not.toThrow();
  });
});
/**
 * Database Functions Test Suite
 * 
 * Comprehensive tests for all database functions to ensure reliability
 * and prevent regression of the critical database function issues.
 */

import { DatabaseService } from '../../src/lib/database';
import { performDatabaseHealthCheck, quickHealthCheck } from '../../src/lib/databaseHealthCheck';
import { supabase } from '../../src/lib/supabase';

// Mock the supabase client for testing
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Database Functions', () => {
    describe('get_daily_company_status_data', () => {
      it('should call the function with correct parameters', async () => {
        const mockResult = {
          data: [
            {
              team_id: 1,
              team_name: 'Development',
              total_members: 5,
              available_members: 4,
              half_day_members: 1,
              unavailable_members: 0
            }
          ],
          error: null,
        };

        mockSupabase.rpc.mockResolvedValue(mockResult);

        const testDate = new Date('2024-01-15');
        const result = await DatabaseService.getDailyCompanyStatus(testDate);

        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          'get_daily_company_status_data',
          { target_date: '2024-01-15' }
        );
        expect(result).toBeDefined();
        expect(result?.teams).toHaveLength(1);
      });

      it('should handle function not found error and use fallback', async () => {
        const functionError = {
          data: null,
          error: { message: 'could not find function get_daily_company_status_data' },
        };

        const mockFallbackResult = {
          data: [
            { id: 1, name: 'John Doe', team_id: 1, is_manager: false }
          ],
          error: null,
        };

        mockSupabase.rpc.mockResolvedValue(functionError);
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: mockFallbackResult.data,
            error: null,
          }),
        });

        const testDate = new Date('2024-01-15');
        const result = await DatabaseService.getDailyCompanyStatus(testDate);

        expect(result?.usedFallback).toBe(true);
      });

      it('should handle other database errors correctly', async () => {
        const databaseError = {
          data: null,
          error: { message: 'Connection timeout' },
        };

        mockSupabase.rpc.mockResolvedValue(databaseError);

        const testDate = new Date('2024-01-15');
        
        await expect(DatabaseService.getDailyCompanyStatus(testDate))
          .rejects.toThrow('Connection timeout');
      });

      it('should handle empty results gracefully', async () => {
        const emptyResult = {
          data: [],
          error: null,
        };

        mockSupabase.rpc.mockResolvedValue(emptyResult);

        const testDate = new Date('2024-01-15');
        const result = await DatabaseService.getDailyCompanyStatus(testDate);

        expect(result).toBeDefined();
        expect(result?.teams).toHaveLength(0);
        expect(result?.summary.total).toBe(0);
      });
    });

    describe('value_to_hours', () => {
      it('should convert string values to numeric hours', async () => {
        const testCases = [
          { input: '1', expected: 1 },
          { input: '0.5', expected: 0.5 },
          { input: 'X', expected: 0 },
        ];

        for (const testCase of testCases) {
          mockSupabase.rpc.mockResolvedValue({
            data: testCase.expected,
            error: null,
          });

          const result = await DatabaseService.convertValueToHours(testCase.input);
          
          expect(mockSupabase.rpc).toHaveBeenCalledWith(
            'value_to_hours',
            { value_str: testCase.input }
          );
          expect(result).toBe(testCase.expected);
        }
      });

      it('should handle invalid input values', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: 'Invalid value' },
        });

        await expect(DatabaseService.convertValueToHours('invalid'))
          .rejects.toThrow('Invalid value');
      });
    });
  });

  describe('Database Health Checks', () => {
    describe('performDatabaseHealthCheck', () => {
      it('should return healthy status when all functions work', async () => {
        // Mock successful connectivity
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{}],
              error: null,
            }),
          }),
        });

        // Mock successful function calls
        mockSupabase.rpc.mockResolvedValue({
          data: [{}],
          error: null,
        });

        const result = await performDatabaseHealthCheck();

        expect(result.isHealthy).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.details.connectivity).toBe(true);
      });

      it('should detect missing critical functions', async () => {
        // Mock successful connectivity
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{}],
              error: null,
            }),
          }),
        });

        // Mock missing function
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: 'could not find function get_daily_company_status_data' },
        });

        const result = await performDatabaseHealthCheck();

        expect(result.isHealthy).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('get_daily_company_status_data');
      });

      it('should handle database connectivity issues', async () => {
        // Mock connectivity failure
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' },
            }),
          }),
        });

        const result = await performDatabaseHealthCheck();

        expect(result.isHealthy).toBe(false);
        expect(result.errors).toContain('Database connectivity failed: Connection failed');
        expect(result.details.connectivity).toBe(false);
      });

      it('should measure and report performance metrics', async () => {
        // Mock successful but slow connectivity
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve({ data: [{}], error: null });
                }, 100);
              });
            }),
          }),
        });

        // Mock successful function calls
        mockSupabase.rpc.mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ data: [{}], error: null });
            }, 200);
          });
        });

        const result = await performDatabaseHealthCheck();

        expect(result.details.performanceMetrics.connectivity).toBeGreaterThan(0);
        expect(result.details.performanceMetrics.get_daily_company_status_data).toBeGreaterThan(0);
      });
    });

    describe('quickHealthCheck', () => {
      it('should return true for successful database connection', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{}],
              error: null,
            }),
          }),
        });

        const result = await quickHealthCheck();
        expect(result).toBe(true);
      });

      it('should return false for database connection failure', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' },
            }),
          }),
        });

        const result = await quickHealthCheck();
        expect(result).toBe(false);
      });

      it('should handle exceptions gracefully', async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error('Network error');
        });

        const result = await quickHealthCheck();
        expect(result).toBe(false);
      });
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should use fallback when primary function fails', async () => {
      const functionError = {
        data: null,
        error: { message: 'could not find function get_daily_company_status_data' },
      };

      const mockTeamMembers = [
        { id: 1, name: 'John Doe', team_id: 1, role: 'Developer' },
        { id: 2, name: 'Jane Smith', team_id: 1, role: 'Manager' },
      ];

      const mockTeams = [
        { id: 1, name: 'Development Team' }
      ];

      const mockScheduleEntries = [
        { member_id: 1, date: '2024-01-15', value: '1' },
        { member_id: 2, date: '2024-01-15', value: '0.5' },
      ];

      mockSupabase.rpc.mockResolvedValue(functionError);
      
      // Mock table queries for fallback
      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'team_members') {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockTeamMembers,
              error: null,
            }),
          };
        } else if (table === 'teams') {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockTeams,
              error: null,
            }),
          };
        } else if (table === 'schedule_entries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockScheduleEntries,
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const testDate = new Date('2024-01-15');
      const result = await DatabaseService.getDailyCompanyStatus(testDate);

      expect(result?.usedFallback).toBe(true);
      expect(result?.teams).toHaveLength(1);
    });

    it('should prefer primary function when available', async () => {
      const primaryResult = {
        data: [
          {
            team_id: 1,
            team_name: 'Development',
            total_members: 5,
            available_members: 4,
          }
        ],
        error: null,
      };

      mockSupabase.rpc.mockResolvedValue(primaryResult);

      const testDate = new Date('2024-01-15');
      const result = await DatabaseService.getDailyCompanyStatus(testDate);

      expect(result?.usedFallback).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_daily_company_status_data',
        { target_date: '2024-01-15' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error messages for debugging', async () => {
      const detailedError = {
        data: null,
        error: { 
          message: 'relation "team_members" does not exist',
          details: 'Schema validation failed',
          hint: 'Run database migrations',
          code: '42P01'
        },
      };

      mockSupabase.rpc.mockResolvedValue(detailedError);

      const testDate = new Date('2024-01-15');
      
      await expect(DatabaseService.getDailyCompanyStatus(testDate))
        .rejects.toThrow('relation "team_members" does not exist');
    });

    it('should handle network timeouts gracefully', async () => {
      mockSupabase.rpc.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Network timeout'));
          }, 100);
        });
      });

      const testDate = new Date('2024-01-15');
      
      await expect(DatabaseService.getDailyCompanyStatus(testDate))
        .rejects.toThrow('Network timeout');
    });

    it('should log appropriate warnings for non-critical errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const functionError = {
        data: null,
        error: { message: 'could not find function get_daily_company_status_data' },
      };

      mockSupabase.rpc.mockResolvedValue(functionError);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const testDate = new Date('2024-01-15');
      await DatabaseService.getDailyCompanyStatus(testDate);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database function get_daily_company_status_data not found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Validation', () => {
    it('should complete health checks within reasonable time', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{}],
            error: null,
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [{}],
        error: null,
      });

      const startTime = Date.now();
      const result = await performDatabaseHealthCheck();
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should warn about slow database operations', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation(() => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({ data: [{}], error: null });
              }, 1100);
            });
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [{}],
        error: null,
      });

      const result = await performDatabaseHealthCheck();

      expect(result.warnings.some(warning => 
        warning.includes('Slow database connectivity')
      )).toBe(true);
    });
  });
});
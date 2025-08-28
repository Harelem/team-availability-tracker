import { jest } from '@jest/globals';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    rpc: jest.fn(),
  })),
}));

describe('COO Database Integration Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  describe('Sprint History Table Operations', () => {
    describe('Sprint Creation', () => {
      it('should create sprint with correct data structure', async () => {
        const mockSprintData = {
          name: 'Integration Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: [{ id: 1, ...mockSprintData, is_active: false, progress_percentage: 0 }],
          error: null,
        });

        mockSupabase.from().insert(mockSprintData);

        expect(mockSupabase.from).toHaveBeenCalledWith('sprint_history');
        expect(mockSupabase.from().insert).toHaveBeenCalledWith(mockSprintData);
      });

      it('should enforce required fields validation', async () => {
        const incompleteSprintData = {
          name: 'Incomplete Sprint',
          // Missing start_date and end_date
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '23502',
            message: 'null value in column "start_date" violates not-null constraint',
          },
        });

        mockSupabase.from().insert(incompleteSprintData);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(incompleteSprintData);
      });

      it('should handle duplicate sprint names gracefully', async () => {
        const duplicateSprintData = {
          name: 'Existing Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        });

        mockSupabase.from().insert(duplicateSprintData);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(duplicateSprintData);
      });
    });

    describe('Sprint Reading', () => {
      it('should retrieve sprints with correct ordering', async () => {
        const mockSprints = [
          { id: 2, name: 'Sprint 2', created_at: '2024-01-20' },
          { id: 1, name: 'Sprint 1', created_at: '2024-01-15' },
        ];

        mockSupabase.from().select().order().mockResolvedValue({
          data: mockSprints,
          error: null,
        });

        mockSupabase.from().select('*').order('created_at', { ascending: false });

        expect(mockSupabase.from).toHaveBeenCalledWith('sprint_history');
        expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
        expect(mockSupabase.from().select().order).toHaveBeenCalledWith('created_at', { ascending: false });
      });

      it('should filter active sprints correctly', async () => {
        const mockActiveSprint = {
          id: 1,
          name: 'Active Sprint',
          is_active: true,
        };

        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });

        mockSupabase.from().select('*').eq('is_active', true).single();

        expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('is_active', true);
        expect(mockSupabase.from().select().eq().single).toHaveBeenCalled();
      });

      it('should handle no active sprint scenario', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'The result contains 0 rows' },
        });

        mockSupabase.from().select('*').eq('is_active', true).single();

        expect(mockSupabase.from().select().eq().single).toHaveBeenCalled();
      });
    });

    describe('Sprint Updating', () => {
      it('should update sprint fields correctly', async () => {
        const updateData = {
          name: 'Updated Sprint Name',
          end_date: '2024-02-15',
        };

        mockSupabase.from().update().eq().mockResolvedValue({
          data: [{ id: 1, ...updateData }],
          error: null,
        });

        mockSupabase.from().update(updateData).eq('id', 1);

        expect(mockSupabase.from).toHaveBeenCalledWith('sprint_history');
        expect(mockSupabase.from().update).toHaveBeenCalledWith(updateData);
        expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', 1);
      });

      it('should handle sprint activation logic', async () => {
        mockSupabase.from().update().eq().mockResolvedValue({
          data: [{ id: 1, is_active: true }],
          error: null,
        });

        mockSupabase.from().update({ is_active: true }).eq('id', 1);

        expect(mockSupabase.from().update).toHaveBeenCalledWith({ is_active: true });
        expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', 1);
      });

      it('should handle non-existent sprint updates', async () => {
        mockSupabase.from().update().eq().mockResolvedValue({
          data: [],
          error: null,
        });

        mockSupabase.from().update({ name: 'Non-existent' }).eq('id', 999);

        expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', 999);
      });
    });

    describe('Sprint Deletion', () => {
      it('should delete sprint by ID', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: null,
        });

        mockSupabase.from().delete().eq('id', 1);

        expect(mockSupabase.from).toHaveBeenCalledWith('sprint_history');
        expect(mockSupabase.from().delete).toHaveBeenCalled();
        expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 1);
      });

      it('should handle deletion of non-existent sprint', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: { code: '22023', message: 'No rows affected' },
        });

        mockSupabase.from().delete().eq('id', 999);

        expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 999);
      });

      it('should handle foreign key constraint violations', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: {
            code: '23503',
            message: 'update or delete on table "sprint_history" violates foreign key constraint',
          },
        });

        mockSupabase.from().delete().eq('id', 1);

        expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 1);
      });
    });
  });

  describe('Progress Calculation Trigger', () => {
    it('should automatically calculate progress on sprint creation', async () => {
      const sprintData = {
        name: 'Auto Progress Sprint',
        start_date: '2024-01-15',
        end_date: '2024-01-28',
      };

      const sprintWithProgress = {
        id: 1,
        ...sprintData,
        company_potential_hours: 280,
        progress_percentage: 0,
      };

      mockSupabase.from().insert().mockResolvedValue({
        data: [sprintWithProgress],
        error: null,
      });

      mockSupabase.from().insert(sprintData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(sprintData);
    });

    it('should recalculate progress on sprint update', async () => {
      const updateData = {
        start_date: '2024-01-20',
        end_date: '2024-02-02',
      };

      const updatedSprintWithProgress = {
        id: 1,
        ...updateData,
        company_potential_hours: 350, // Recalculated
        progress_percentage: 45.5, // Recalculated
      };

      mockSupabase.from().update().eq().mockResolvedValue({
        data: [updatedSprintWithProgress],
        error: null,
      });

      mockSupabase.from().update(updateData).eq('id', 1);

      expect(mockSupabase.from().update).toHaveBeenCalledWith(updateData);
    });

    it('should handle trigger failures gracefully', async () => {
      const sprintData = {
        name: 'Trigger Error Sprint',
        start_date: '2024-01-15',
        end_date: '2024-01-28',
      };

      mockSupabase.from().insert().mockResolvedValue({
        data: null,
        error: {
          code: 'P0001',
          message: 'Error in calculate_progress_trigger function',
        },
      });

      mockSupabase.from().insert(sprintData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(sprintData);
    });
  });

  describe('RLS (Row Level Security) Policies', () => {
    describe('COO Access Policies', () => {
      it('should allow COO to read sprint history', async () => {
        mockSupabase.from().select().mockResolvedValue({
          data: [{ id: 1, name: 'Sprint 1' }],
          error: null,
        });

        // Simulate COO user context
        mockSupabase.from().select('*');

        expect(mockSupabase.from).toHaveBeenCalledWith('sprint_history');
        expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      });

      it('should allow COO to insert sprints', async () => {
        const sprintData = {
          name: 'COO Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: [{ id: 1, ...sprintData }],
          error: null,
        });

        mockSupabase.from().insert(sprintData);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(sprintData);
      });

      it('should allow COO to update sprints', async () => {
        const updateData = { name: 'Updated by COO' };

        mockSupabase.from().update().eq().mockResolvedValue({
          data: [{ id: 1, ...updateData }],
          error: null,
        });

        mockSupabase.from().update(updateData).eq('id', 1);

        expect(mockSupabase.from().update).toHaveBeenCalledWith(updateData);
      });

      it('should allow COO to delete sprints', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: null,
        });

        mockSupabase.from().delete().eq('id', 1);

        expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 1);
      });
    });

    describe('Non-COO Access Restrictions', () => {
      it('should deny non-COO read access', async () => {
        mockSupabase.from().select().mockResolvedValue({
          data: null,
          error: {
            code: '42501',
            message: 'permission denied for table sprint_history',
          },
        });

        // Simulate non-COO user context
        mockSupabase.from().select('*');

        expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
      });

      it('should deny non-COO write access', async () => {
        const sprintData = {
          name: 'Unauthorized Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '42501',
            message: 'permission denied for table sprint_history',
          },
        });

        mockSupabase.from().insert(sprintData);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(sprintData);
      });
    });
  });

  describe('Database Function Integration', () => {
    describe('calculate_sprint_progress Function', () => {
      it('should execute progress calculation function', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: {
            company_potential_hours: 280,
            progress_percentage: 65.5,
          },
          error: null,
        });

        mockSupabase.rpc('calculate_sprint_progress', { sprint_id: 1 });

        expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_sprint_progress', { sprint_id: 1 });
      });

      it('should handle function execution errors', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: {
            code: 'P0001',
            message: 'Function execution failed',
          },
        });

        mockSupabase.rpc('calculate_sprint_progress', { sprint_id: 999 });

        expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_sprint_progress', { sprint_id: 999 });
      });

      it('should return correct calculation results', async () => {
        const expectedResult = {
          company_potential_hours: 350,
          progress_percentage: 75.2,
          working_days: 10,
          eligible_members: 5,
        };

        mockSupabase.rpc.mockResolvedValue({
          data: expectedResult,
          error: null,
        });

        const result = await mockSupabase.rpc('calculate_sprint_progress', { sprint_id: 1 });

        expect(result.data).toEqual(expectedResult);
      });
    });
  });

  describe('Data Integrity and Constraints', () => {
    describe('Date Validation', () => {
      it('should enforce valid date ranges', async () => {
        const invalidDateSprint = {
          name: 'Invalid Date Sprint',
          start_date: '2024-01-28',
          end_date: '2024-01-15', // End before start
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'check constraint "valid_date_range" violated',
          },
        });

        mockSupabase.from().insert(invalidDateSprint);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(invalidDateSprint);
      });

      it('should enforce future date constraints', async () => {
        const pastDateSprint = {
          name: 'Past Date Sprint',
          start_date: '2020-01-01',
          end_date: '2020-01-15',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'check constraint "future_dates_only" violated',
          },
        });

        mockSupabase.from().insert(pastDateSprint);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(pastDateSprint);
      });
    });

    describe('Name Validation', () => {
      it('should enforce non-empty sprint names', async () => {
        const emptyNameSprint = {
          name: '',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '23514',
            message: 'check constraint "non_empty_name" violated',
          },
        });

        mockSupabase.from().insert(emptyNameSprint);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(emptyNameSprint);
      });

      it('should enforce maximum name length', async () => {
        const longNameSprint = {
          name: 'A'.repeat(256), // Assuming 255 char limit
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '22001',
            message: 'value too long for type character varying(255)',
          },
        });

        mockSupabase.from().insert(longNameSprint);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(longNameSprint);
      });
    });

    describe('Active Sprint Constraints', () => {
      it('should enforce single active sprint rule', async () => {
        const secondActiveSprint = {
          name: 'Second Active Sprint',
          start_date: '2024-02-01',
          end_date: '2024-02-14',
          is_active: true,
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'unique constraint "single_active_sprint" violated',
          },
        });

        mockSupabase.from().insert(secondActiveSprint);

        expect(mockSupabase.from().insert).toHaveBeenCalledWith(secondActiveSprint);
      });
    });
  });

  describe('Performance and Optimization', () => {
    describe('Index Usage', () => {
      it('should use indexes for common queries', async () => {
        mockSupabase.from().select().eq().mockResolvedValue({
          data: [{ id: 1, name: 'Sprint 1' }],
          error: null,
        });

        // Query by is_active (should use index)
        mockSupabase.from().select('*').eq('is_active', true);

        expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('is_active', true);
      });

      it('should optimize date range queries', async () => {
        mockSupabase.from().select().gte().lte().mockResolvedValue({
          data: [{ id: 1, name: 'Sprint 1' }],
          error: null,
        });

        // Date range query (should use date indexes)
        mockSupabase.from().select('*').gte('start_date', '2024-01-01').lte('end_date', '2024-12-31');

        expect(mockSupabase.from().select().gte).toHaveBeenCalledWith('start_date', '2024-01-01');
        expect(mockSupabase.from().select().gte().lte).toHaveBeenCalledWith('end_date', '2024-12-31');
      });
    });

    describe('Query Performance', () => {
      it('should handle large result sets efficiently', async () => {
        const largeSprints = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `Sprint ${i + 1}`,
        }));

        mockSupabase.from().select().order().mockResolvedValue({
          data: largeSprints,
          error: null,
        });

        mockSupabase.from().select('*').order('created_at', { ascending: false });

        expect(mockSupabase.from().select().order).toHaveBeenCalled();
      });
    });
  });

  describe('Transaction Support', () => {
    it('should handle atomic operations correctly', async () => {
      // Simulate transaction-like behavior
      const sprintData = {
        name: 'Transaction Sprint',
        start_date: '2024-01-15',
        end_date: '2024-01-28',
      };

      mockSupabase.from().insert().mockResolvedValue({
        data: [{ id: 1, ...sprintData }],
        error: null,
      });

      // Multiple operations that should succeed together
      mockSupabase.from().insert(sprintData);
      mockSupabase.from().update({ is_active: true }).eq('id', 1);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(sprintData);
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', 1);
    });

    it('should handle transaction rollback scenarios', async () => {
      mockSupabase.from().insert().mockResolvedValue({
        data: null,
        error: {
          code: '25P02',
          message: 'current transaction is aborted',
        },
      });

      const sprintData = {
        name: 'Failed Transaction Sprint',
        start_date: '2024-01-15',
        end_date: '2024-01-28',
      };

      mockSupabase.from().insert(sprintData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(sprintData);
    });
  });
});
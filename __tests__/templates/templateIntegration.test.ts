import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DatabaseService } from '../../src/lib/database';
import { 
  AvailabilityTemplate, 
  CreateTemplateRequest, 
  WeeklyPattern,
  TemplateFilters 
} from '../../src/types/templateTypes';

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        or: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              range: jest.fn()
            }))
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            range: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    sql: jest.fn((query) => query)
  }
}));

describe('Template System Integration', () => {
  const sampleTemplate: AvailabilityTemplate = {
    id: 'test-id-1',
    name: 'Full Week Template',
    description: 'Standard full-time work week',
    pattern: { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 },
    isPublic: true,
    createdBy: 1,
    teamId: 1,
    usageCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const samplePattern: WeeklyPattern = {
    mon: 1, tue: 0.5, wed: 1, thu: 0.5, fri: 1, sat: 0, sun: 0,
    reason: 'Flexible schedule'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('Template CRUD Operations', () => {
    test('creates template with valid data', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      // Mock successful creation
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                ...sampleTemplate,
                is_public: sampleTemplate.isPublic,
                created_by: sampleTemplate.createdBy,
                team_id: sampleTemplate.teamId,
                usage_count: sampleTemplate.usageCount,
                created_at: sampleTemplate.createdAt,
                updated_at: sampleTemplate.updatedAt
              },
              error: null
            })
          })
        })
      });

      const createRequest: CreateTemplateRequest = {
        name: sampleTemplate.name,
        description: sampleTemplate.description,
        pattern: sampleTemplate.pattern,
        isPublic: sampleTemplate.isPublic,
        teamId: sampleTemplate.teamId,
        createdBy: sampleTemplate.createdBy
      };

      const result = await DatabaseService.createTemplate(createRequest);
      
      expect(result).toBeDefined();
      expect(result?.name).toBe(sampleTemplate.name);
      expect(result?.pattern).toEqual(sampleTemplate.pattern);
      
      expect(supabase.from).toHaveBeenCalledWith('availability_templates');
    });

    test('retrieves templates with filters', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      // Mock query chain
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [sampleTemplate],
          error: null,
          count: 1
        })
      };
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const filters: TemplateFilters = {
        teamId: 1,
        isPublic: true,
        searchQuery: 'Full',
        sortBy: 'usage_count',
        sortOrder: 'desc'
      };

      const result = await DatabaseService.getAvailabilityTemplates({
        filters,
        limit: 10,
        offset: 0
      });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].name).toBe(sampleTemplate.name);
      expect(result.totalCount).toBe(1);
      
      expect(mockQuery.eq).toHaveBeenCalledWith('team_id', 1);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%Full%,description.ilike.%Full%');
      expect(mockQuery.order).toHaveBeenCalledWith('usage_count', { ascending: false });
    });

    test('updates template successfully', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      const updatedTemplate = {
        ...sampleTemplate,
        name: 'Updated Template Name',
        description: 'Updated description'
      };

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...updatedTemplate,
                  is_public: updatedTemplate.isPublic,
                  created_by: updatedTemplate.createdBy,
                  team_id: updatedTemplate.teamId,
                  usage_count: updatedTemplate.usageCount,
                  created_at: updatedTemplate.createdAt,
                  updated_at: updatedTemplate.updatedAt
                },
                error: null
              })
            })
          })
        })
      });

      const result = await DatabaseService.updateTemplate({
        id: sampleTemplate.id,
        name: 'Updated Template Name',
        description: 'Updated description'
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Template Name');
      expect(result?.description).toBe('Updated description');
    });

    test('deletes template successfully', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      const result = await DatabaseService.deleteTemplate(sampleTemplate.id);
      
      expect(result).toBe(true);
    });

    test('increments template usage count', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      await DatabaseService.incrementTemplateUsage(sampleTemplate.id);
      
      const mockUpdate = supabase.from().update;
      expect(mockUpdate).toHaveBeenCalledWith({
        usage_count: expect.any(String) // Should be SQL increment
      });
    });
  });

  describe('Error Handling', () => {
    test('handles database errors gracefully', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
            count: 0
          })
        })
      });

      const result = await DatabaseService.getAvailabilityTemplates();
      
      expect(result.templates).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    test('handles missing Supabase configuration', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      const result = await DatabaseService.getAvailabilityTemplates();
      
      expect(result.templates).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    test('returns null for failed template creation', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Creation failed' }
            })
          })
        })
      });

      const createRequest: CreateTemplateRequest = {
        name: 'Test Template',
        pattern: samplePattern
      };

      const result = await DatabaseService.createTemplate(createRequest);
      
      expect(result).toBeNull();
    });
  });

  describe('Data Transformation', () => {
    test('correctly transforms database response to template format', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      const dbResponse = {
        id: 'test-id',
        name: 'Test Template',
        description: 'Test Description',
        pattern: { mon: 1, tue: 0.5, wed: 1, thu: 0, fri: 1, sat: 0, sun: 0 },
        is_public: true,
        created_by: 2,
        team_id: 3,
        usage_count: 15,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [dbResponse],
            error: null,
            count: 1
          })
        })
      });

      const result = await DatabaseService.getAvailabilityTemplates();
      
      expect(result.templates).toHaveLength(1);
      const template = result.templates[0];
      
      expect(template.id).toBe(dbResponse.id);
      expect(template.name).toBe(dbResponse.name);
      expect(template.description).toBe(dbResponse.description);
      expect(template.pattern).toEqual(dbResponse.pattern);
      expect(template.isPublic).toBe(dbResponse.is_public);
      expect(template.createdBy).toBe(dbResponse.created_by);
      expect(template.teamId).toBe(dbResponse.team_id);
      expect(template.usageCount).toBe(dbResponse.usage_count);
      expect(template.createdAt).toBe(dbResponse.created_at);
      expect(template.updatedAt).toBe(dbResponse.updated_at);
    });

    test('transforms create request to database format', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: sampleTemplate,
            error: null
          })
        })
      });

      supabase.from.mockReturnValue({
        insert: mockInsert
      });

      const createRequest: CreateTemplateRequest = {
        name: 'New Template',
        description: 'Template description',
        pattern: samplePattern,
        isPublic: true,
        teamId: 5,
        createdBy: 10
      };

      await DatabaseService.createTemplate(createRequest);
      
      expect(mockInsert).toHaveBeenCalledWith([{
        name: createRequest.name,
        description: createRequest.description,
        pattern: createRequest.pattern,
        is_public: createRequest.isPublic,
        team_id: createRequest.teamId,
        created_by: createRequest.createdBy
      }]);
    });
  });

  describe('Query Optimization', () => {
    test('applies pagination correctly', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      const mockRange = jest.fn().mockResolvedValue({
        data: [sampleTemplate],
        error: null,
        count: 100
      });
      
      const mockQuery = {
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            range: mockRange
          })
        })
      };
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const result = await DatabaseService.getAvailabilityTemplates({
        limit: 10,
        offset: 20
      });

      expect(mockRange).toHaveBeenCalledWith(20, 29); // offset to offset + limit - 1
      expect(result.hasMore).toBe(true); // 30 loaded out of 100 total
    });

    test('builds complex filter queries', async () => {
      const { supabase } = require('../../src/lib/supabase');
      
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [sampleTemplate],
          error: null,
          count: 1
        })
      };
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const filters: TemplateFilters = {
        teamId: 1,
        createdBy: 2,
        isPublic: false,
        searchQuery: 'test search',
        sortBy: 'name',
        sortOrder: 'asc'
      };

      await DatabaseService.getAvailabilityTemplates({ filters });

      expect(mockQuery.eq).toHaveBeenCalledWith('team_id', 1);
      expect(mockQuery.eq).toHaveBeenCalledWith('created_by', 2);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_public', false);
      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test search%,description.ilike.%test search%');
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });
});
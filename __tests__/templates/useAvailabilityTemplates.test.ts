import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { useAvailabilityTemplates, convertPatternToScheduleFormat, extractPatternFromSchedule } from '../../src/hooks/useAvailabilityTemplates';
import { DatabaseService } from '../../src/lib/database';
import { 
  AvailabilityTemplate, 
  CreateTemplateRequest, 
  WeeklyPattern 
} from '../../src/types/templateTypes';

// Mock the DatabaseService
jest.mock('../../src/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('useAvailabilityTemplates', () => {
  const mockTemplate: AvailabilityTemplate = {
    id: '123',
    name: 'Test Template',
    description: 'A test template',
    pattern: { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 },
    isPublic: false,
    createdBy: 1,
    teamId: 1,
    usageCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDatabaseService.getAvailabilityTemplates.mockResolvedValue({
      templates: [mockTemplate],
      totalCount: 1,
      hasMore: false
    });
    
    mockDatabaseService.createTemplate.mockResolvedValue(mockTemplate);
    mockDatabaseService.updateTemplate.mockResolvedValue(mockTemplate);
    mockDatabaseService.deleteTemplate.mockResolvedValue(true);
    mockDatabaseService.incrementTemplateUsage.mockResolvedValue();
  });

  describe('hook initialization', () => {
    test('loads templates on mount when autoLoad is true', async () => {
      renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        autoLoad: true 
      }));

      await waitFor(() => {
        expect(mockDatabaseService.getAvailabilityTemplates).toHaveBeenCalledWith({
          filters: {
            teamId: 1,
            createdBy: undefined,
            sortBy: 'usage_count',
            sortOrder: 'desc'
          },
          includeUsage: true,
          includeCreatorInfo: true
        });
      });
    });

    test('does not load templates on mount when autoLoad is false', () => {
      renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        autoLoad: false 
      }));

      expect(mockDatabaseService.getAvailabilityTemplates).not.toHaveBeenCalled();
    });

    test('applies initial filters correctly', async () => {
      renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        createdBy: 2,
        initialFilters: { 
          isPublic: true,
          searchQuery: 'test',
          sortBy: 'name',
          sortOrder: 'asc'
        },
        autoLoad: true 
      }));

      await waitFor(() => {
        expect(mockDatabaseService.getAvailabilityTemplates).toHaveBeenCalledWith({
          filters: {
            teamId: 1,
            createdBy: 2,
            isPublic: true,
            searchQuery: 'test',
            sortBy: 'name',
            sortOrder: 'asc'
          },
          includeUsage: true,
          includeCreatorInfo: true
        });
      });
    });
  });

  describe('template operations', () => {
    test('saveTemplate creates new template', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      const templateData: CreateTemplateRequest = {
        name: 'New Template',
        pattern: { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 },
        isPublic: false,
        createdBy: 1
      };

      await act(async () => {
        const savedTemplate = await result.current.saveTemplate(templateData);
        expect(savedTemplate).toEqual(mockTemplate);
      });

      expect(mockDatabaseService.createTemplate).toHaveBeenCalledWith(templateData);
    });

    test('saveTemplate validates required fields', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      const templateData: CreateTemplateRequest = {
        name: '', // Empty name should fail
        pattern: { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 }
      };

      await act(async () => {
        await expect(result.current.saveTemplate(templateData)).rejects.toThrow('Template name is required');
      });

      expect(mockDatabaseService.createTemplate).not.toHaveBeenCalled();
    });

    test('updateTemplate updates existing template', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      const updateData = {
        id: '123',
        name: 'Updated Template'
      };

      await act(async () => {
        const updatedTemplate = await result.current.updateTemplate(updateData);
        expect(updatedTemplate).toEqual(mockTemplate);
      });

      expect(mockDatabaseService.updateTemplate).toHaveBeenCalledWith(updateData);
    });

    test('updateTemplate validates required fields', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      const updateData = {
        id: '',
        name: 'Updated Template'
      };

      await act(async () => {
        await expect(result.current.updateTemplate(updateData)).rejects.toThrow('Template ID is required for updates');
      });

      expect(mockDatabaseService.updateTemplate).not.toHaveBeenCalled();
    });

    test('deleteTemplate removes template', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      // First add a template to state
      act(() => {
        result.current.templates.push(mockTemplate);
      });

      await act(async () => {
        const success = await result.current.deleteTemplate('123');
        expect(success).toBe(true);
      });

      expect(mockDatabaseService.deleteTemplate).toHaveBeenCalledWith('123');
    });

    test('useTemplate increments usage count', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      // Set initial templates state
      act(() => {
        result.current.templates.push(mockTemplate);
      });

      await act(async () => {
        await result.current.useTemplate('123');
      });

      expect(mockDatabaseService.incrementTemplateUsage).toHaveBeenCalledWith('123');
    });
  });

  describe('error handling', () => {
    test('handles database errors gracefully', async () => {
      mockDatabaseService.getAvailabilityTemplates.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { result } = renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        autoLoad: true 
      }));

      await waitFor(() => {
        expect(result.current.error).toBe('Database connection failed');
        expect(result.current.templates).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('clearError resets error state', async () => {
      mockDatabaseService.getAvailabilityTemplates.mockRejectedValue(
        new Error('Test error')
      );

      const { result } = renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        autoLoad: true 
      }));

      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    test('saveTemplate handles database errors', async () => {
      mockDatabaseService.createTemplate.mockRejectedValue(
        new Error('Save failed')
      );

      const { result } = renderHook(() => useAvailabilityTemplates({ 
        autoLoad: false 
      }));

      const templateData: CreateTemplateRequest = {
        name: 'Test Template',
        pattern: { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 }
      };

      await act(async () => {
        await expect(result.current.saveTemplate(templateData)).rejects.toThrow('Save failed');
      });

      expect(result.current.error).toBe('Save failed');
    });
  });

  describe('loading states', () => {
    test('sets loading state during template fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockDatabaseService.getAvailabilityTemplates.mockReturnValue(promise);

      const { result } = renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        autoLoad: true 
      }));

      // Initially loading should be true
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      act(() => {
        resolvePromise!({
          templates: [mockTemplate],
          totalCount: 1,
          hasMore: false
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('refetch functionality', () => {
    test('refetch reloads templates', async () => {
      const { result } = renderHook(() => useAvailabilityTemplates({ 
        teamId: 1,
        autoLoad: false 
      }));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockDatabaseService.getAvailabilityTemplates).toHaveBeenCalledTimes(1);
    });
  });
});

describe('utility functions', () => {
  describe('convertPatternToScheduleFormat', () => {
    test('converts pattern to schedule format', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 0.5, wed: 1, thu: 0, fri: 0.5, sat: 0, sun: 0,
        reason: 'Test reason'
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
      ];

      const result = convertPatternToScheduleFormat(pattern, 1, weekDays);

      expect(result['2024-01-08']).toEqual({ value: '1', reason: 'Test reason' }); // Monday
      expect(result['2024-01-09']).toEqual({ value: '0.5', reason: 'Test reason' }); // Tuesday
      expect(result['2024-01-10']).toEqual({ value: '1', reason: 'Test reason' }); // Wednesday
      expect(result['2024-01-11']).toBeUndefined(); // Thursday (0 value)
    });

    test('handles pattern without reason', () => {
      const pattern: WeeklyPattern = {
        mon: 1, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
      ];

      const result = convertPatternToScheduleFormat(pattern, 1, weekDays);

      expect(result['2024-01-08']).toEqual({ value: '1', reason: undefined });
    });
  });

  describe('extractPatternFromSchedule', () => {
    test('extracts pattern from schedule data', () => {
      const scheduleData = {
        '2024-01-07': { value: '0' as const }, // Sunday - will be ignored (0)
        '2024-01-08': { value: '1' as const, reason: 'Full day' }, // Monday
        '2024-01-09': { value: '0.5' as const, reason: 'Half day' }, // Tuesday
        '2024-01-10': { value: 'X' as const, reason: 'Sick' }, // Wednesday
        '2024-01-11': { value: '1' as const }, // Thursday
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
        new Date('2024-01-12'), // Friday
        new Date('2024-01-13'), // Saturday
      ];

      const result = extractPatternFromSchedule(scheduleData, weekDays);

      expect(result.sun).toBe(0);
      expect(result.mon).toBe(1);
      expect(result.tue).toBe(0.5);
      expect(result.wed).toBe(0); // X treated as 0 for template purposes
      expect(result.thu).toBe(1);
      expect(result.fri).toBe(0); // No entry
      expect(result.sat).toBe(0); // No entry
      expect(result.reason).toBe('Full day'); // First reason found
    });

    test('handles empty schedule data', () => {
      const scheduleData = {};
      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
        new Date('2024-01-12'), // Friday
        new Date('2024-01-13'), // Saturday
      ];

      const result = extractPatternFromSchedule(scheduleData, weekDays);

      expect(result).toEqual({
        sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0
      });
    });
  });
});
import { useState, useEffect, useCallback } from 'react';
import { 
  AvailabilityTemplate, 
  CreateTemplateRequest, 
  UpdateTemplateRequest, 
  TemplateFilters, 
  TemplateQueryOptions,
  UseAvailabilityTemplatesReturn,
  WeeklyPattern
} from '@/types/templateTypes';
import { DatabaseService } from '@/lib/database';

interface UseAvailabilityTemplatesProps {
  teamId?: number;
  createdBy?: number;
  initialFilters?: TemplateFilters;
  autoLoad?: boolean;
}

export const useAvailabilityTemplates = ({
  teamId,
  createdBy,
  initialFilters,
  autoLoad = true
}: UseAvailabilityTemplatesProps = {}): UseAvailabilityTemplatesReturn => {
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge filters with props and defaults
  const getFilters = useCallback((): TemplateFilters => {
    return {
      teamId,
      createdBy,
      ...initialFilters,
      sortBy: initialFilters?.sortBy || 'usage_count',
      sortOrder: initialFilters?.sortOrder || 'desc'
    };
  }, [teamId, createdBy, initialFilters]);

  // Load templates from database
  const loadTemplates = useCallback(async (filters?: TemplateFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryOptions: TemplateQueryOptions = {
        filters: filters || getFilters(),
        includeUsage: true,
        includeCreatorInfo: true
      };

      const result = await DatabaseService.getAvailabilityTemplates(queryOptions);
      setTemplates(result.templates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      setError(errorMessage);
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getFilters]);

  // Save a new template
  const saveTemplate = useCallback(async (template: CreateTemplateRequest): Promise<AvailabilityTemplate> => {
    setError(null);

    try {
      // Validate template
      if (!template.name?.trim()) {
        throw new Error('Template name is required');
      }

      if (!template.pattern) {
        throw new Error('Template pattern is required');
      }

      // Add default created_by if not provided
      const templateData: CreateTemplateRequest = {
        ...template,
        createdBy: template.createdBy || createdBy,
        teamId: template.teamId || teamId
      };

      const savedTemplate = await DatabaseService.createTemplate(templateData);
      
      if (!savedTemplate) {
        throw new Error('Failed to create template');
      }

      // Add to local state
      setTemplates(prev => [savedTemplate, ...prev]);

      return savedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [createdBy, teamId]);

  // Update an existing template
  const updateTemplate = useCallback(async (update: UpdateTemplateRequest): Promise<AvailabilityTemplate> => {
    setError(null);

    try {
      // Validate required fields
      if (!update.id) {
        throw new Error('Template ID is required for updates');
      }

      if (update.name !== undefined && !update.name.trim()) {
        throw new Error('Template name cannot be empty');
      }

      const updatedTemplate = await DatabaseService.updateTemplate(update);
      
      if (!updatedTemplate) {
        throw new Error('Failed to update template');
      }

      // Update local state
      setTemplates(prev => prev.map(template => 
        template.id === update.id ? updatedTemplate : template
      ));

      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Delete a template
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    setError(null);

    try {
      const success = await DatabaseService.deleteTemplate(templateId);
      
      if (!success) {
        throw new Error('Failed to delete template');
      }

      // Remove from local state
      setTemplates(prev => prev.filter(template => template.id !== templateId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Use a template (apply pattern and increment usage)
  const useTemplate = useCallback(async (templateId: string): Promise<void> => {
    setError(null);

    try {
      // Increment usage count in database
      await DatabaseService.incrementTemplateUsage(templateId);

      // Update local state to reflect new usage count
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, usageCount: template.usageCount + 1 }
          : template
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record template usage';
      setError(errorMessage);
      console.error('Error recording template usage:', err);
    }
  }, []);

  // Refetch templates
  const refetch = useCallback(async (): Promise<void> => {
    await loadTemplates();
  }, [loadTemplates]);

  // Clear error state
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Load templates on mount if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad, loadTemplates]);

  return {
    templates,
    isLoading,
    error,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    refetch,
    clearError
  };
};

// Helper hook for getting a specific template by ID
export const useAvailabilityTemplate = (templateId: string) => {
  const [template, setTemplate] = useState<AvailabilityTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await DatabaseService.getTemplateById(templateId);
      setTemplate(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load template';
      setError(errorMessage);
      console.error('Error loading template:', err);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  return {
    template,
    isLoading,
    error,
    refetch: loadTemplate
  };
};

// Utility function to convert template pattern to schedule data format
export const convertPatternToScheduleFormat = (
  pattern: WeeklyPattern,
  memberId: number,
  weekDays: Date[]
): Record<string, { value: '1' | '0.5' | 'X'; reason?: string }> => {
  const scheduleData: Record<string, { value: '1' | '0.5' | 'X'; reason?: string }> = {};
  
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu'] as const; // Israeli work week
  
  weekDays.forEach((date, index) => {
    if (index < dayKeys.length) {
      const dayKey = dayKeys[index];
      const value = pattern[dayKey];
      const dateKey = date.toISOString().split('T')[0];
      
      if (value === 1) {
        scheduleData[dateKey] = { value: '1', reason: pattern.reason };
      } else if (value === 0.5) {
        scheduleData[dateKey] = { value: '0.5', reason: pattern.reason };
      } else if (value === 0) {
        // Don't add entry for 0 values (no work)
      }
    }
  });
  
  return scheduleData;
};

// Utility function to extract pattern from current schedule
export const extractPatternFromSchedule = (
  scheduleData: Record<string, { value: '1' | '0.5' | 'X'; reason?: string }>,
  weekDays: Date[]
): WeeklyPattern => {
  const pattern: WeeklyPattern = {
    sun: 0,
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0
  };
  
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const; // Full week for pattern extraction
  
  weekDays.forEach((date, index) => {
    if (index < dayKeys.length) {
      const dayKey = dayKeys[index];
      const dateKey = date.toISOString().split('T')[0];
      const entry = scheduleData[dateKey];
      
      if (entry) {
        if (entry.value === '1') {
          pattern[dayKey] = 1;
        } else if (entry.value === '0.5') {
          pattern[dayKey] = 0.5;
        } else if (entry.value === 'X') {
          pattern[dayKey] = 0; // Treat sick days as no work for template purposes
        }
        
        // Use first reason found as the pattern reason
        if (entry.reason && !pattern.reason) {
          pattern.reason = entry.reason;
        }
      }
    }
  });
  
  return pattern;
};
/**
 * Sprint Progress Consolidation Tests
 * Verifies that sprint progress conflicts have been resolved
 */

import { render, screen, waitFor } from '@testing-library/react';
import { SprintProgressValidator } from '@/utils/sprintProgressValidation';
import UnifiedSprintProgress from '@/components/UnifiedSprintProgress';
import { useUnifiedSprintData } from '@/hooks/useUnifiedSprintData';

// Mock the database service
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getCurrentGlobalSprint: jest.fn()
  }
}));

// Mock the sprint calculations
jest.mock('@/lib/sprintCalculations', () => ({
  SprintCalculations: {
    calculateSprintProgress: jest.fn(),
    calculateDaysRemaining: jest.fn()
  }
}));

describe('Sprint Progress Consolidation', () => {
  const mockSprintData = {
    id: 1,
    current_sprint_number: 5,
    sprint_start_date: '2024-07-29',
    sprint_end_date: '2024-08-09',
    sprint_length_weeks: 2,
    created_at: '2024-07-29T00:00:00Z',
    updated_at: '2024-07-29T00:00:00Z'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock current date to be in the middle of sprint
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-08-02')); // 4 days into 11-day sprint
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('UnifiedSprintProgress Component', () => {
    it('should render without errors', () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);
      SprintCalculations.calculateSprintProgress.mockReturnValue(36); // 4/11 days ≈ 36%
      SprintCalculations.calculateDaysRemaining.mockReturnValue(7);

      render(<UnifiedSprintProgress variant="full" />);
      
      // Should show loading initially, then sprint data
      expect(screen.getByText(/Loading sprint data/)).toBeInTheDocument();
    });

    it('should handle error states gracefully', async () => {
      const { DatabaseService } = require('@/lib/database');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(null);

      render(<UnifiedSprintProgress variant="full" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading sprint data/)).toBeInTheDocument();
      });
    });

    it('should display unified progress data correctly', async () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);
      SprintCalculations.calculateSprintProgress.mockReturnValue(36);
      SprintCalculations.calculateDaysRemaining.mockReturnValue(7);

      render(<UnifiedSprintProgress variant="minimal" />);
      
      await waitFor(() => {
        expect(screen.getByText('36%')).toBeInTheDocument();
        expect(screen.getByText('ספרינט')).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Progress Validation', () => {
    it('should validate sprint progress correctly', async () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);
      SprintCalculations.calculateSprintProgress.mockReturnValue(36);
      SprintCalculations.calculateDaysRemaining.mockReturnValue(7);

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.isValid).toBe(true);
      expect(validation.sprintData).toBeTruthy();
      expect(validation.sprintData?.timeProgress).toBe(36);
      expect(validation.sprintData?.daysRemaining).toBe(7);
      expect(validation.dataSource).toBe('global_sprint_settings');
      expect(validation.calculationMethod).toBe('SprintCalculations.calculateSprintProgress');
    });

    it('should detect invalid sprint dates', async () => {
      const { DatabaseService } = require('@/lib/database');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue({
        ...mockSprintData,
        sprint_start_date: '2024-08-10',
        sprint_end_date: '2024-08-09' // End before start
      });

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Sprint start date must be before end date');
    });

    it('should validate component consistency', async () => {
      const consistency = await SprintProgressValidator.validateComponentConsistency();
      
      expect(consistency.isConsistent).toBe(true);
      
      // Check that GlobalSprintDashboard is marked as inactive
      const globalDashboard = consistency.components.find(c => c.name === 'GlobalSprintDashboard');
      expect(globalDashboard?.isActive).toBe(false);
      expect(globalDashboard?.dataSource).toContain('REMOVED');
      
      // Check that active components use UnifiedSprintProgress
      const activeComponents = consistency.components.filter(c => c.isActive);
      activeComponents.forEach(component => {
        expect(
          component.dataSource.includes('UnifiedSprintProgress') ||
          component.dataSource.includes('SprintCalculations')
        ).toBe(true);
      });
    });

    it('should generate comprehensive validation report', async () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);
      SprintCalculations.calculateSprintProgress.mockReturnValue(36);
      SprintCalculations.calculateDaysRemaining.mockReturnValue(7);

      const report = await SprintProgressValidator.generateValidationReport();
      
      expect(report).toContain('Sprint Progress Validation Report');
      expect(report).toContain('✅ VALID');
      expect(report).toContain('✅ CONSISTENT');
      expect(report).toContain('Sprint progress consolidation is complete');
      expect(report).toContain('Removed GlobalSprintDashboard');
      expect(report).toContain('Created UnifiedSprintProgress component');
    });
  });

  describe('Data Source Consolidation', () => {
    it('should use single source of truth (global_sprint_settings)', async () => {
      const { DatabaseService } = require('@/lib/database');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.dataSource).toBe('global_sprint_settings');
      expect(DatabaseService.getCurrentGlobalSprint).toHaveBeenCalled();
    });

    it('should use standardized calculation method', async () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);
      SprintCalculations.calculateSprintProgress.mockReturnValue(36);

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.calculationMethod).toBe('SprintCalculations.calculateSprintProgress');
      expect(SprintCalculations.calculateSprintProgress).toHaveBeenCalledWith(
        mockSprintData.sprint_start_date,
        mockSprintData.sprint_end_date
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing sprint data', async () => {
      const { DatabaseService } = require('@/lib/database');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(null);

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No current sprint found in global_sprint_settings table');
      expect(validation.sprintData).toBeNull();
    });

    it('should handle invalid progress values', async () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprintData);
      SprintCalculations.calculateSprintProgress.mockReturnValue(150); // Invalid > 100%
      SprintCalculations.calculateDaysRemaining.mockReturnValue(7);

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid time progress: 150% (must be 0-100%)');
    });

    it('should warn about long sprint durations', async () => {
      const { DatabaseService } = require('@/lib/database');
      const { SprintCalculations } = require('@/lib/sprintCalculations');
      
      DatabaseService.getCurrentGlobalSprint.mockResolvedValue({
        ...mockSprintData,
        sprint_start_date: '2024-07-01',
        sprint_end_date: '2024-10-01' // 3 months
      });
      SprintCalculations.calculateSprintProgress.mockReturnValue(50);
      SprintCalculations.calculateDaysRemaining.mockReturnValue(45);

      const validation = await SprintProgressValidator.validateSprintProgress();
      
      expect(validation.warnings).toContain('Sprint duration exceeds 12 weeks, consider shorter sprints');
    });
  });
});

describe('Integration Tests', () => {
  it('should ensure no GlobalSprintDashboard references remain', () => {
    // This test ensures the component was properly removed
    expect(() => require('@/components/GlobalSprintDashboard')).toThrow();
  });

  it('should ensure all sprint progress displays use unified data', async () => {
    const consistency = await SprintProgressValidator.validateComponentConsistency();
    
    // All active components should use unified data source
    const activeComponents = consistency.components.filter(c => c.isActive);
    expect(activeComponents.length).toBeGreaterThan(0);
    
    activeComponents.forEach(component => {
      expect(
        component.dataSource.includes('UnifiedSprintProgress') ||
        component.dataSource.includes('SprintCalculations')
      ).toBe(true);
    });
  });
});
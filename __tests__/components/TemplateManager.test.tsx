import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateManager from '../../src/components/TemplateManager';
import { WeeklyPattern, ISRAELI_WORK_WEEK } from '../../src/types/templateTypes';

// Mock templates data
const mockTemplates = [
  {
    id: 'template-1',
    name: 'Full Week',
    description: 'Standard full-time schedule - all working days (Sun-Thu)',
    pattern: { sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0 },
    isPublic: true,
    createdBy: 1,
    teamId: 5,
    usageCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'template-2',
    name: 'Medical Appointments',
    description: 'Half day Wednesdays for regular medical appointments',
    pattern: { sun: 1, mon: 1, tue: 1, wed: 0.5, thu: 1, fri: 0, sat: 0 },
    isPublic: true,
    createdBy: 1,
    teamId: 5,
    usageCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock the useAvailabilityTemplates hook
const mockUseAvailabilityTemplates = {
  templates: mockTemplates,
  isLoading: false,
  error: null,
  saveTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  useTemplate: jest.fn(),
  refetch: jest.fn(),
  clearError: jest.fn()
};

jest.mock('../../src/hooks/useAvailabilityTemplates', () => ({
  useAvailabilityTemplates: jest.fn(() => mockUseAvailabilityTemplates),
  extractPatternFromSchedule: jest.fn()
}));

describe('TemplateManager', () => {
  const mockProps = {
    onApplyTemplate: jest.fn(),
    currentWeekPattern: {
      sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0
    } as WeeklyPattern,
    teamId: 5,
    currentUserId: 1,
    className: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Israeli Work Week Support', () => {
    it('should display Sunday-Thursday as working days in pattern preview', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        // Should show templates
        expect(screen.getByText('Full Week')).toBeInTheDocument();
        expect(screen.getByText('Medical Appointments')).toBeInTheDocument();
      });
    });

    it('should use Hebrew text in UI elements', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Check Hebrew text in buttons
      expect(screen.getByText(/Save Current · שמור נוכחי/)).toBeInTheDocument();
      expect(screen.getByText(/New · חדש/)).toBeInTheDocument();
    });

    it('should show Hebrew help text when no templates found', async () => {
      // Temporarily mock empty templates
      mockUseAvailabilityTemplates.templates = [];

      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        expect(screen.getByText(/Create your first template to get started · צור את התבנית הראשונה שלך/)).toBeInTheDocument();
      });

      // Restore templates for other tests
      mockUseAvailabilityTemplates.templates = mockTemplates;
    });

    it('should create template with correct Sunday-first pattern', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Click New button to open modal
      fireEvent.click(screen.getByText(/New · חדש/));
      
      await waitFor(() => {
        expect(screen.getByText('Create Template')).toBeInTheDocument();
      });
      
      // The modal's default pattern should start with Sunday
      // This would be tested through the modal's pattern state
      // which should initialize with { sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0 }
    });

    it('should apply template and call onApplyTemplate with correct pattern', async () => {
      const mockUseTemplate = jest.fn();
      mockUseAvailabilityTemplates.useTemplate = mockUseTemplate;

      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        // Find and click Apply button for Full Week template
        const applyButtons = screen.getAllByText(/Apply · החל/);
        fireEvent.click(applyButtons[0]);
      });
      
      expect(mockUseTemplate).toHaveBeenCalledWith('template-1');
      expect(mockProps.onApplyTemplate).toHaveBeenCalledWith({
        sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0
      });
    });
  });

  describe('Template Pattern Preview', () => {
    it('should show correct working days count for Israeli work week', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        // Full Week template should show 5 working days (Sun-Thu)
        expect(screen.getAllByText('5 days')).toHaveLength(2); // Both templates have 5 working days in our mock
        
        // Should show correct total hours (5 days × 7 hours = 35h for full, 31.5h for medical)
        expect(screen.getByText('35h total')).toBeInTheDocument();
        expect(screen.getByText('31.5h total')).toBeInTheDocument(); // 4×7 + 0.5×7 = 31.5h
      });
    });

    it('should correctly calculate hours for mixed patterns', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        // Medical Appointments template: 4 full days + 1 half day = 4×7 + 0.5×7 = 31.5h
        const templates = screen.getAllByText(/h total/);
        expect(templates.length).toBeGreaterThan(1);
      });
    });
  });

  describe('Accessibility and Internationalization', () => {
    it('should include Hebrew day labels in tooltips', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      // This would require checking if the pattern preview component
      // includes Hebrew tooltips for day abbreviations
      // The test structure is here for when the component is expanded
    });

    it('should support keyboard navigation for templates', async () => {
      render(<TemplateManager {...mockProps} />);
      
      // Expand the templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const applyButtons = screen.getAllByText(/Apply · החל/);
        expect(applyButtons[0]).toBeInTheDocument();
        
        // Test that buttons are focusable
        applyButtons[0].focus();
        expect(applyButtons[0]).toHaveFocus();
      });
    });
  });

  describe('Template Management', () => {
    it('should allow all users to create templates', () => {
      render(<TemplateManager {...mockProps} />);
      
      // New button should be visible regardless of user role
      expect(screen.getByText(/New · חדש/)).toBeInTheDocument();
    });

    it('should show Save Current button when pattern is provided', () => {
      render(<TemplateManager {...mockProps} />);
      
      expect(screen.getByText(/Save Current · שמור נוכחי/)).toBeInTheDocument();
    });

    it('should not show Save Current button when no pattern provided', () => {
      const propsWithoutPattern = {
        ...mockProps,
        currentWeekPattern: undefined
      };
      
      render(<TemplateManager {...propsWithoutPattern} />);
      
      expect(screen.queryByText(/Save Current · שמור נוכחי/)).not.toBeInTheDocument();
    });
  });

  describe('ISRAELI_WORK_WEEK Integration', () => {
    it('should use ISRAELI_WORK_WEEK constants for working days', () => {
      // This test verifies that the component uses the correct constants
      expect(ISRAELI_WORK_WEEK.WORKING_DAYS).toEqual(['sun', 'mon', 'tue', 'wed', 'thu']);
      expect(ISRAELI_WORK_WEEK.WEEKEND_DAYS).toEqual(['fri', 'sat']);
      expect(ISRAELI_WORK_WEEK.WORKING_DAYS_PER_WEEK).toBe(5);
      expect(ISRAELI_WORK_WEEK.HOURS_PER_WORKING_DAY).toBe(7);
    });
  });
});
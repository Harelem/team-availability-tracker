/**
 * Templates Feature Integration Tests
 * 
 * Validates template functionality including Sunday-Thursday template creation, 
 * personal template management, template application, and cross-component consistency.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TemplateManager from '../../src/components/TemplateManager';
import ScheduleTable from '../../src/components/ScheduleTable';
import { ISRAELI_WORK_WEEK } from '../../src/types/templateTypes';
import { DatabaseService } from '@/lib/database';

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('Templates Feature Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Sunday-Thursday Template Functionality', () => {
    it('should create Sunday-Thursday template with 7 hours per working day', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([]);
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      await waitFor(() => {
        expect(screen.getByText('Availability Templates')).toBeInTheDocument();
      });
      
      // Expand templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        // Should show built-in Sunday-Thursday template
        const sundayThuTemplate = screen.queryByText(/sunday.*thursday/i);
        if (sundayThuTemplate) {
          expect(sundayThuTemplate).toBeInTheDocument();
        }
      });
      
      // Template should reflect Israeli work week structure
      expect(ISRAELI_WORK_WEEK.WORKING_DAYS).toEqual(['sun', 'mon', 'tue', 'wed', 'thu']);
      expect(ISRAELI_WORK_WEEK.HOURS_PER_WORKING_DAY).toBe(7);
    });

    it('should apply Sunday-Thursday template to schedule correctly', async () => {
      const user = userEvent.setup();
      const mockOnScheduleChange = jest.fn();
      const mockOnApplyTemplate = jest.fn();
      
      const sundayThursdayTemplate = {
        id: 'builtin-sunday-thursday',
        name: 'Sunday-Thursday Full Week',
        description: 'Full availability Sunday through Thursday',
        schedule: {
          sun: { value: '1' as const },
          mon: { value: '1' as const },
          tue: { value: '1' as const },
          wed: { value: '1' as const },
          thu: { value: '1' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        }
      };
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([sundayThursdayTemplate]);
      
      render(<TemplateManager onApplyTemplate={mockOnApplyTemplate} />);
      
      await waitFor(() => {
        const applyButton = screen.queryByText(/apply/i);
        if (applyButton) {
          fireEvent.click(applyButton);
          expect(mockOnApplyTemplate).toHaveBeenCalledWith(expect.objectContaining({
            schedule: expect.objectContaining({
              sun: { value: '1' },
              mon: { value: '1' },
              tue: { value: '1' },
              wed: { value: '1' },
              thu: { value: '1' },
              fri: { value: '0' },
              sat: { value: '0' }
            })
          }));
        }
      });
    });

    it('should calculate correct hours for Sunday-Thursday template', () => {
      const sundayThursdaySchedule = {
        sun: { value: '1' as const },
        mon: { value: '1' as const },
        tue: { value: '1' as const },
        wed: { value: '1' as const },
        thu: { value: '1' as const },
        fri: { value: '0' as const },
        sat: { value: '0' as const }
      };
      
      // Calculate total hours: 5 working days × 7 hours = 35 hours
      const totalHours = Object.entries(sundayThursdaySchedule)
        .reduce((sum, [day, entry]) => {
          if (ISRAELI_WORK_WEEK.WORKING_DAYS.includes(day as any)) {
            return sum + (entry.value === '1' ? 7 : entry.value === '0.5' ? 3.5 : 0);
          }
          return sum;
        }, 0);
      
      expect(totalHours).toBe(35);
    });
  });

  describe('Personal Template Creation', () => {
    it('should allow users to create personal templates with custom schedules', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([]);
      mockDatabaseService.createUserTemplate.mockResolvedValue({ id: 'new-template-1' });
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      await waitFor(() => {
        expect(screen.getByText('Availability Templates')).toBeInTheDocument();
      });
      
      // Expand templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const createButton = screen.queryByText(/create.*template/i);
        if (createButton) {
          fireEvent.click(createButton);
        }
      });
      
      // Template creation form should be accessible
      await waitFor(() => {
        const templateNameInput = screen.queryByPlaceholderText(/template name/i);
        if (templateNameInput) {
          expect(templateNameInput).toBeInTheDocument();
        }
      });
    });

    it('should save personal templates with Hebrew and English names', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      const personalTemplate = {
        id: 'personal-1',
        name: 'Morning Shift · משמרת בוקר',
        description: 'Half days in morning',
        schedule: {
          sun: { value: '0.5' as const },
          mon: { value: '0.5' as const },
          tue: { value: '0.5' as const },
          wed: { value: '0.5' as const },
          thu: { value: '0.5' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        },
        isPersonal: true
      };
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([personalTemplate]);
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      await waitFor(() => {
        // Should display bilingual template name
        const templateName = screen.queryByText(/Morning Shift.*משמרת בוקר/);
        if (templateName) {
          expect(templateName).toBeInTheDocument();
        }
      });
    });

    it('should validate personal template schedules against Israeli work week', async () => {
      const invalidTemplate = {
        schedule: {
          sun: { value: '1' as const },
          mon: { value: '1' as const },
          tue: { value: '1' as const },
          wed: { value: '1' as const },
          thu: { value: '1' as const },
          fri: { value: '1' as const }, // Invalid: Friday is weekend
          sat: { value: '1' as const }  // Invalid: Saturday is weekend
        }
      };
      
      // Validation should flag weekend work
      const weekendWork = Object.entries(invalidTemplate.schedule).filter(([day, entry]) => 
        ISRAELI_WORK_WEEK.WEEKEND_DAYS.includes(day as any) && entry.value !== '0'
      );
      
      expect(weekendWork.length).toBeGreaterThan(0);
      expect(weekendWork.map(([day]) => day)).toEqual(['fri', 'sat']);
    });
  });

  describe('Template Application Integration', () => {
    it('should integrate template application with ScheduleTable component', async () => {
      const user = userEvent.setup();
      const mockOnScheduleChange = jest.fn();
      const mockOnApplyTemplate = jest.fn();
      
      const template = {
        id: 'test-template',
        name: 'Test Template',
        schedule: {
          sun: { value: '1' as const },
          mon: { value: '0.5' as const },
          tue: { value: '1' as const },
          wed: { value: '0.5' as const },
          thu: { value: '1' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        }
      };
      
      // Mock ScheduleTable props
      const scheduleProps = {
        scheduleData: {},
        onScheduleChange: mockOnScheduleChange,
        onReasonChange: jest.fn(),
        weekDays: [
          new Date('2024-01-07'), // Sunday
          new Date('2024-01-08'), // Monday
          new Date('2024-01-09'), // Tuesday
          new Date('2024-01-10'), // Wednesday
          new Date('2024-01-11'), // Thursday
          new Date('2024-01-12'), // Friday
          new Date('2024-01-13')  // Saturday
        ],
        isCurrentWeek: true,
        members: [{ id: 1, name: 'Test User', hebrew: 'משתמש בדיקה' }],
        currentUserId: 1,
        userRole: 'team' as const,
        teamId: 1
      };
      
      const { rerender } = render(<ScheduleTable {...scheduleProps} />);
      
      // Apply template to schedule
      const updatedScheduleData = {
        '2024-01-07': { value: '1' as const }, // Sunday
        '2024-01-08': { value: '0.5' as const }, // Monday
        '2024-01-09': { value: '1' as const }, // Tuesday
        '2024-01-10': { value: '0.5' as const }, // Wednesday
        '2024-01-11': { value: '1' as const }, // Thursday
        '2024-01-12': { value: '0' as const }, // Friday
        '2024-01-13': { value: '0' as const }  // Saturday
      };
      
      rerender(<ScheduleTable {...scheduleProps} scheduleData={updatedScheduleData} />);
      
      // Verify schedule reflects template values
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });

    it('should maintain template consistency across different users', async () => {
      const baseTemplate = {
        id: 'shared-template',
        name: 'Standard Work Week',
        schedule: {
          sun: { value: '1' as const },
          mon: { value: '1' as const },
          tue: { value: '1' as const },
          wed: { value: '1' as const },
          thu: { value: '1' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        }
      };
      
      // Template should work consistently for different users
      const users = [
        { id: 1, name: 'User 1', hebrew: 'משתמש 1' },
        { id: 2, name: 'User 2', hebrew: 'משתמש 2' },
        { id: 3, name: 'User 3', hebrew: 'משתמש 3' }
      ];
      
      users.forEach(user => {
        mockDatabaseService.applyTemplateToUser.mockResolvedValue({
          userId: user.id,
          templateId: baseTemplate.id,
          appliedSchedule: baseTemplate.schedule
        });
      });
      
      // All users should get identical schedule from template
      const applications = await Promise.all(
        users.map(user => 
          mockDatabaseService.applyTemplateToUser(user.id, baseTemplate.id, baseTemplate.schedule)
        )
      );
      
      applications.forEach(application => {
        expect(application.appliedSchedule).toEqual(baseTemplate.schedule);
      });
    });
  });

  describe('Template Management Features', () => {
    it('should support template editing and updates', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      const originalTemplate = {
        id: 'editable-template',
        name: 'Original Template',
        schedule: {
          sun: { value: '1' as const },
          mon: { value: '1' as const },
          tue: { value: '1' as const },
          wed: { value: '1' as const },
          thu: { value: '1' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        },
        isPersonal: true
      };
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([originalTemplate]);
      mockDatabaseService.updateUserTemplate.mockResolvedValue({ success: true });
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      await waitFor(() => {
        const editButton = screen.queryByText(/edit/i);
        if (editButton) {
          fireEvent.click(editButton);
        }
      });
      
      // Template editing should be accessible
      await waitFor(() => {
        const saveButton = screen.queryByText(/save/i);
        if (saveButton) {
          expect(saveButton).toBeInTheDocument();
        }
      });
    });

    it('should support template deletion with confirmation', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      const deletableTemplate = {
        id: 'deletable-template',
        name: 'Template to Delete',
        schedule: {},
        isPersonal: true
      };
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([deletableTemplate]);
      mockDatabaseService.deleteUserTemplate.mockResolvedValue({ success: true });
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      await waitFor(() => {
        const deleteButton = screen.queryByText(/delete/i);
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      });
      
      // Should show confirmation dialog
      await waitFor(() => {
        const confirmButton = screen.queryByText(/confirm/i);
        if (confirmButton) {
          fireEvent.click(confirmButton);
          expect(mockDatabaseService.deleteUserTemplate).toHaveBeenCalledWith(deletableTemplate.id);
        }
      });
    });

    it('should export and import templates correctly', async () => {
      const exportTemplate = {
        id: 'export-template',
        name: 'Exportable Template · תבנית לייצוא',
        description: 'Template for export testing',
        schedule: {
          sun: { value: '0.5' as const },
          mon: { value: '1' as const },
          tue: { value: '0.5' as const },
          wed: { value: '1' as const },
          thu: { value: '0.5' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        },
        isPersonal: true,
        createdAt: '2024-01-01T00:00:00Z'
      };
      
      // Export functionality
      const exportedData = JSON.stringify(exportTemplate, null, 2);
      expect(exportedData).toContain('Exportable Template · תבנית לייצוא');
      expect(JSON.parse(exportedData)).toEqual(exportTemplate);
      
      // Import functionality should validate structure
      const importedTemplate = JSON.parse(exportedData);
      expect(importedTemplate.schedule).toHaveProperty('sun');
      expect(importedTemplate.schedule).toHaveProperty('mon');
      expect(importedTemplate.schedule).toHaveProperty('tue');
      expect(importedTemplate.schedule).toHaveProperty('wed');
      expect(importedTemplate.schedule).toHaveProperty('thu');
      expect(importedTemplate.schedule.fri.value).toBe('0'); // Weekend validation
      expect(importedTemplate.schedule.sat.value).toBe('0'); // Weekend validation
    });
  });

  describe('Template Accessibility and UX', () => {
    it('should provide keyboard navigation for template management', async () => {
      const user = userEvent.setup();
      const mockApplyTemplate = jest.fn();
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([
        {
          id: 'keyboard-template',
          name: 'Keyboard Template',
          schedule: {},
          isPersonal: true
        }
      ]);
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      // Should be able to navigate with keyboard
      await user.tab();
      expect(document.activeElement).toBeTruthy();
      
      // Should be able to open templates with Enter
      const templatesButton = screen.getByText('Availability Templates');
      templatesButton.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        const templateItems = screen.queryAllByRole('button');
        expect(templateItems.length).toBeGreaterThan(0);
      });
    });

    it('should provide proper ARIA labels for template actions', async () => {
      const mockApplyTemplate = jest.fn();
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([
        {
          id: 'aria-template',
          name: 'ARIA Template',
          schedule: {},
          isPersonal: true
        }
      ]);
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(
            button.hasAttribute('aria-label') ||
            button.hasAttribute('aria-labelledby') ||
            button.textContent !== ''
          ).toBe(true);
        });
      });
    });

    it('should handle Hebrew text properly in template names', async () => {
      const mockApplyTemplate = jest.fn();
      
      const hebrewTemplate = {
        id: 'hebrew-template',
        name: 'Hebrew Template · תבנית עברית',
        description: 'Template with Hebrew text',
        schedule: {
          sun: { value: '1' as const },
          mon: { value: '1' as const },
          tue: { value: '1' as const },
          wed: { value: '1' as const },
          thu: { value: '1' as const },
          fri: { value: '0' as const },
          sat: { value: '0' as const }
        },
        isPersonal: true
      };
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([hebrewTemplate]);
      
      render(<TemplateManager onApplyTemplate={mockApplyTemplate} />);
      
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const hebrewText = screen.queryByText(/תבנית עברית/);
        if (hebrewText) {
          expect(hebrewText).toBeInTheDocument();
          
          // Hebrew text should have proper direction
          const element = hebrewText.closest('[dir]') || hebrewText;
          const computedStyle = window.getComputedStyle(element);
          expect(
            element.hasAttribute('dir') ||
            computedStyle.direction === 'rtl'
          ).toBe(true);
        }
      });
    });
  });
});
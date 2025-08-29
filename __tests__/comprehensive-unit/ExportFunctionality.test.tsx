/**
 * Comprehensive Unit Tests - Export Functionality
 * Tests CSV/Excel generation for different date ranges and user roles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ExportModal from '@/components/EnhancedExportModal';
import { DatabaseService } from '@/lib/database';

// Mock dependencies
jest.mock('@/lib/database');
jest.mock('@/lib/exportService');
jest.mock('@/utils/enhancedExcelGeneration');

const mockExportService = {
  exportToCSV: jest.fn(),
  exportToExcel: jest.fn(),
  generateReport: jest.fn()
};

const mockScheduleData = [
  {
    id: 1,
    user_id: 1,
    date: '2024-01-17',
    value: 7,
    absence_reason: null,
    profiles: { full_name: 'Ido Keller', team: 'Development-Tal' }
  },
  {
    id: 2,
    user_id: 1,
    date: '2024-01-18',
    value: 3.5,
    absence_reason: 'Personal',
    profiles: { full_name: 'Ido Keller', team: 'Development-Tal' }
  }
];

describe('Export Functionality - Comprehensive Tests', () => {
  let mockDatabaseService: jest.Mocked<typeof DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DatabaseService
    mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
    mockDatabaseService.getScheduleEntries = jest.fn().mockResolvedValue(mockScheduleData);
    mockDatabaseService.getCurrentSprint = jest.fn().mockResolvedValue({
      id: 1,
      sprint_start_date: '2024-01-15',
      sprint_end_date: '2024-01-28'
    });

    // Mock export services
    require('@/lib/exportService').exportToCSV = mockExportService.exportToCSV;
    require('@/lib/exportService').exportToExcel = mockExportService.exportToExcel;
    require('@/utils/enhancedExcelGeneration').generateReport = mockExportService.generateReport;
  });

  describe('Date Range Selection', () => {
    it('exports current week data correctly', async () => {
      const user = userEvent.setup();
      mockExportService.exportToCSV.mockResolvedValue('csv-content');

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select current week
      const currentWeekOption = screen.getByLabelText('Current Week');
      await user.click(currentWeekOption);
      
      // Select CSV format
      const csvOption = screen.getByLabelText('CSV');
      await user.click(csvOption);
      
      // Click export
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockExportService.exportToCSV).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              date: expect.stringMatching(/2024-01-\d{2}/)
            })
          ]),
          expect.objectContaining({
            dateRange: 'current-week',
            team: 'Development-Tal'
          })
        );
      });
    });

    it('exports current sprint data correctly', async () => {
      const user = userEvent.setup();
      mockExportService.exportToExcel.mockResolvedValue(new Blob());

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select current sprint
      const sprintOption = screen.getByLabelText('Current Sprint');
      await user.click(sprintOption);
      
      // Select Excel format
      const excelOption = screen.getByLabelText('Excel');
      await user.click(excelOption);
      
      // Click export
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-15',
            endDate: '2024-01-28',
            team: 'Development-Tal'
          })
        );
      });
    });

    it('handles custom date range selection', async () => {
      const user = userEvent.setup();
      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select custom range
      const customOption = screen.getByLabelText('Custom Range');
      await user.click(customOption);
      
      // Should show date pickers
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      
      // Set custom dates
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-01');
      
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-01-31');
      
      // Export button should be enabled
      const exportButton = screen.getByText('Export');
      expect(exportButton).not.toBeDisabled();
    });

    it('validates custom date range input', async () => {
      const user = userEvent.setup();
      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select custom range
      const customOption = screen.getByLabelText('Custom Range');
      await user.click(customOption);
      
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      // Set invalid range (end before start)
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-31');
      
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-01-01');
      
      await user.tab(); // Trigger validation
      
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
      
      const exportButton = screen.getByText('Export');
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Export Formats', () => {
    it('generates CSV export correctly', async () => {
      const user = userEvent.setup();
      const mockCSVContent = 'Name,Date,Hours,Reason\nIdo Keller,2024-01-17,7,\nIdo Keller,2024-01-18,3.5,Personal';
      mockExportService.exportToCSV.mockResolvedValue(mockCSVContent);

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select CSV format
      const csvOption = screen.getByLabelText('CSV');
      await user.click(csvOption);
      
      // Click export
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockExportService.exportToCSV).toHaveBeenCalledWith(
          mockScheduleData,
          expect.objectContaining({
            format: 'csv',
            includeHeaders: true,
            includeReasons: true
          })
        );
      });
    });

    it('generates Excel export with formatting', async () => {
      const user = userEvent.setup();
      const mockExcelBlob = new Blob(['excel-content'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      mockExportService.exportToExcel.mockResolvedValue(mockExcelBlob);

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select Excel format
      const excelOption = screen.getByLabelText('Excel');
      await user.click(excelOption);
      
      // Enable advanced formatting
      const formattingOption = screen.getByLabelText('Include Charts');
      await user.click(formattingOption);
      
      // Click export
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockExportService.exportToExcel).toHaveBeenCalledWith(
          mockScheduleData,
          expect.objectContaining({
            format: 'excel',
            includeCharts: true,
            includeFormatting: true
          })
        );
      });
    });

    it('generates comprehensive report format', async () => {
      const user = userEvent.setup();
      const mockReport = { 
        summary: { totalHours: 140, utilization: 0.85 },
        data: mockScheduleData
      };
      mockExportService.generateReport.mockResolvedValue(mockReport);

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select report format
      const reportOption = screen.getByLabelText('Detailed Report');
      await user.click(reportOption);
      
      // Click export
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockExportService.generateReport).toHaveBeenCalledWith(
          mockScheduleData,
          expect.objectContaining({
            format: 'report',
            includeSummary: true,
            includeAnalytics: true
          })
        );
      });
    });
  });

  describe('Permission-Based Export', () => {
    it('allows regular user to export their own data only', async () => {
      const user = userEvent.setup();
      const mockUserData = mockScheduleData.filter(entry => entry.user_id === 1);
      mockDatabaseService.getScheduleEntries.mockResolvedValue(mockUserData);

      render(
        <ExportModal 
          team="Development-Tal" 
          isOpen={true} 
          onClose={jest.fn()} 
          userRole="member"
          userId={1}
        />
      );
      
      // Regular user should see limited options
      expect(screen.getByText('Export My Data')).toBeInTheDocument();
      expect(screen.queryByText('Export Team Data')).not.toBeInTheDocument();
      
      // Export should only include user's data
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 1,
            team: 'Development-Tal'
          })
        );
      });
    });

    it('allows manager to export team data', async () => {
      const user = userEvent.setup();
      render(
        <ExportModal 
          team="Development-Tal" 
          isOpen={true} 
          onClose={jest.fn()} 
          userRole="manager"
        />
      );
      
      // Manager should see team export options
      expect(screen.getByText('Export Team Data')).toBeInTheDocument();
      expect(screen.getByText('Include All Team Members')).toBeInTheDocument();
      
      // Should have access to advanced options
      expect(screen.getByText('Include Analytics')).toBeInTheDocument();
      expect(screen.getByText('Include Progress Metrics')).toBeInTheDocument();
    });

    it('allows COO to export company-wide data', async () => {
      const user = userEvent.setup();
      render(
        <ExportModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userRole="coo"
        />
      );
      
      // COO should see all export options
      expect(screen.getByText('Export Company Data')).toBeInTheDocument();
      expect(screen.getByText('All Teams')).toBeInTheDocument();
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      
      // Should have access to advanced analytics
      expect(screen.getByText('Cross-Team Comparison')).toBeInTheDocument();
      expect(screen.getByText('Capacity Planning')).toBeInTheDocument();
    });
  });

  describe('Export Options', () => {
    it('allows customization of included data', async () => {
      const user = userEvent.setup();
      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Should show data inclusion options
      expect(screen.getByLabelText('Include Headers')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Absence Reasons')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Team Names')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Progress Metrics')).toBeInTheDocument();
      
      // Toggle options
      const reasonsOption = screen.getByLabelText('Include Absence Reasons');
      await user.click(reasonsOption);
      
      const metricsOption = screen.getByLabelText('Include Progress Metrics');
      await user.click(metricsOption);
      
      // Export with custom options
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockExportService.exportToCSV).toHaveBeenCalledWith(
          mockScheduleData,
          expect.objectContaining({
            includeReasons: false,
            includeMetrics: true
          })
        );
      });
    });

    it('handles file naming options', async () => {
      const user = userEvent.setup();
      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Should show file naming option
      const customNameInput = screen.getByLabelText('Custom Filename');
      await user.clear(customNameInput);
      await user.type(customNameInput, 'Team_Schedule_January');
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(mockExportService.exportToCSV).toHaveBeenCalledWith(
          mockScheduleData,
          expect.objectContaining({
            filename: 'Team_Schedule_January'
          })
        );
      });
    });
  });

  describe('Export Progress and Status', () => {
    it('shows progress indicator during export', async () => {
      const user = userEvent.setup();
      mockExportService.exportToCSV.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('csv-content'), 1000))
      );

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      // Should show progress indicator
      expect(screen.getByTestId('export-progress')).toBeInTheDocument();
      expect(screen.getByText('Generating export...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByTestId('export-progress')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('handles export success correctly', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      mockExportService.exportToCSV.mockResolvedValue('csv-content');

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={mockOnClose} />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
        expect(screen.getByText('Download')).toBeInTheDocument();
      });
      
      // Click download
      const downloadButton = screen.getByText('Download');
      await user.click(downloadButton);
      
      // Modal should close after download
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles export errors gracefully', async () => {
      const user = userEvent.setup();
      mockExportService.exportToCSV.mockRejectedValue(new Error('Export failed'));

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText('Export failed')).toBeInTheDocument();
        expect(screen.getByText('Please try again')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      // Should allow retry
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Large Dataset Export', () => {
    it('handles large dataset export efficiently', async () => {
      const user = userEvent.setup();
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        user_id: (i % 40) + 1,
        date: `2024-01-${String((i % 31) + 1).padStart(2, '0')}`,
        value: 7,
        absence_reason: null,
        profiles: { full_name: `User ${(i % 40) + 1}`, team: 'Development-Tal' }
      }));

      mockDatabaseService.getScheduleEntries.mockResolvedValue(largeDataset);
      mockExportService.exportToCSV.mockResolvedValue('large-csv-content');

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      // Should handle large dataset without timing out
      await waitFor(() => {
        expect(mockExportService.exportToCSV).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number)
            })
          ]),
          expect.any(Object)
        );
      }, { timeout: 10000 });
    });

    it('shows appropriate warnings for large exports', async () => {
      const user = userEvent.setup();
      mockDatabaseService.getScheduleEntries.mockResolvedValue(
        Array.from({ length: 5000 }, (_, i) => ({ id: i + 1 }))
      );

      render(<ExportModal team="Development-Tal" isOpen={true} onClose={jest.fn()} />);
      
      // Select a large date range
      const customOption = screen.getByLabelText('Custom Range');
      await user.click(customOption);
      
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      await user.clear(startDateInput);
      await user.type(startDateInput, '2023-01-01');
      
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-12-31');
      
      // Should show warning about large dataset
      await waitFor(() => {
        expect(screen.getByText(/This export may take several minutes/)).toBeInTheDocument();
      });
    });
  });
});
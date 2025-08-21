/**
 * Export utilities for generating CSV and Excel files
 */

import * as XLSX from 'xlsx';
import { ExportData, TeamMember, WeekData, WorkOption } from '@/types';
import { formatDate, getWeekDays } from './dateUtils';
import { CalculationService } from '@/lib/calculationService';

const workOptions: WorkOption[] = [
  { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

/**
 * Calculate weekly hours for a team member using standardized calculation service
 */
export const calculateMemberHours = (
  memberId: number,
  scheduleData: WeekData,
  weekDays: Date[]
): number => {
  const memberScheduleEntries = scheduleData[memberId] || {};
  
  try {
    const result = CalculationService.calculateWeeklyHours({
      scheduleEntries: memberScheduleEntries,
      weekStartDate: weekDays[0] || new Date(),
    });
    
    return result.totalHours;
  } catch (error) {
    console.error(`Error calculating hours for member ${memberId}:`, error);
    return 0;
  }
};

/**
 * Calculate total team hours for a given period
 */
export const calculateTeamHours = (
  members: TeamMember[],
  scheduleData: WeekData,
  weekDays: Date[]
): number => {
  return members.reduce((total, member) => 
    total + calculateMemberHours(member.id, scheduleData, weekDays), 0
  );
};

/**
 * Generate enhanced CSV content for week export
 */
export const generateWeekCSV = (exportData: ExportData): string => {
  const lines: string[] = [];
  const weekDays = getWeekDays(new Date(exportData.dateRange.split(' - ')[0]));
  
  // Header information
  lines.push(`Export Type: ${exportData.exportType}`);
  lines.push(`Team: ${exportData.teamName}`);
  lines.push(`Date Range: ${exportData.dateRange}`);
  lines.push(`Generated: ${exportData.generatedAt.toLocaleString()} by ${exportData.generatedBy}`);
  lines.push(''); // Empty line
  
  // Statistics summary
  if (exportData.statistics) {
    lines.push('SUMMARY STATISTICS:');
    lines.push(`Total Team Hours: ${exportData.statistics.totalHours}h`);
    lines.push(`Average per Member: ${exportData.statistics.averageHours}h`);
    lines.push(`Team Capacity: ${exportData.statistics.capacityHours}h`);
    lines.push(`Utilization: ${exportData.statistics.utilizationPercentage}%`);
    lines.push(''); // Empty line
  }
  
  // Column headers
  const headers = [
    'Name',
    'Hebrew Name', 
    'Role',
    ...dayNames.map((day, index) => `${day} (${formatDate(weekDays[index])})`),
    'Weekly Hours',
    'Capacity %'
  ];
  lines.push(headers.join(','));
  
  // Data rows
  exportData.members.forEach(member => {
    const row = [
      `"${member.name}"`,
      `"${member.hebrew}"`,
      member.isManager ? 'Manager' : 'Employee'
    ];
    
    // Daily data
    let memberTotal = 0;
    weekDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const entry = exportData.scheduleData[member.id]?.[dateKey];
      if (entry) {
        const option = workOptions.find(opt => opt.value === entry.value);
        const hours = option?.hours || 0;
        memberTotal += hours;
        
        let cellValue = `${entry.value} (${hours}h)`;
        if (entry.reason) {
          cellValue += ` - ${entry.reason}`;
        }
        row.push(`"${cellValue}"`);
      } else {
        row.push('""');
      }
    });
    
    // Weekly total and capacity percentage
    row.push(`${memberTotal}h`);
    const capacityPercentage = Math.round((memberTotal / 35) * 100); // 35h = 5 days * 7h
    row.push(`${capacityPercentage}%`);
    
    lines.push(row.join(','));
  });
  
  // Team totals row
  const totalsRow = ['TEAM TOTAL', '', ''];
  weekDays.forEach(date => {
    const dayTotal = exportData.members.reduce((total, member) => {
      const dateKey = date.toISOString().split('T')[0];
      const entry = exportData.scheduleData[member.id]?.[dateKey];
      const option = workOptions.find(opt => opt.value === entry?.value);
      return total + (option ? option.hours : 0);
    }, 0);
    totalsRow.push(`${dayTotal}h`);
  });
  
  const teamTotal = calculateTeamHours(exportData.members, exportData.scheduleData, weekDays);
  totalsRow.push(`${teamTotal}h`);
  totalsRow.push(''); // Empty capacity % for totals
  
  lines.push(totalsRow.join(','));
  
  return lines.join('\n');
};

/**
 * Generate enhanced CSV content for sprint export
 */
export const generateSprintCSV = (
  exportData: ExportData,
  sprintData: {
    sprintNumber: number;
    sprintLength: number;
    weeklyBreakdown?: unknown[];
  }
): string => {
  const lines: string[] = [];
  
  // Header information
  lines.push(`Export Type: Sprint ${sprintData.sprintNumber} (${exportData.dateRange})`);
  lines.push(`Team: ${exportData.teamName}`);
  lines.push(`Sprint Length: ${sprintData.sprintLength} week${sprintData.sprintLength !== 1 ? 's' : ''}`);
  lines.push(`Generated: ${exportData.generatedAt.toLocaleString()} by ${exportData.generatedBy}`);
  lines.push(''); // Empty line
  
  // Sprint statistics
  if (exportData.statistics) {
    lines.push('SPRINT SUMMARY:');
    lines.push(`Total Sprint Hours: ${exportData.statistics.totalHours}h`);
    lines.push(`Sprint Capacity: ${exportData.statistics.capacityHours}h`);
    lines.push(`Utilization: ${exportData.statistics.utilizationPercentage}%`);
    lines.push(''); // Empty line
  }
  
  // Use week export format for custom ranges
  // NOTE: Weekly breakdown feature deferred to future release
  const csvContent = generateWeekCSV(exportData);
  const csvLines = csvContent.split('\n');
  
  // Skip the original header and add our sprint header
  lines.push(...csvLines.slice(5)); // Skip first 5 lines (original header)
  
  return lines.join('\n');
};

/**
 * Generate Excel file from CSV content
 */
export const generateExcelFromCSV = (
  csvContent: string,
  sheetName: string = 'Team Availability'
): XLSX.WorkBook => {
  const lines = csvContent.split('\n');
  const worksheetData: unknown[][] = [];
  
  lines.forEach(line => {
    if (line.trim()) {
      // Simple CSV parsing - split by comma but handle quoted fields
      const row = line.split(',').map(cell => 
        cell.startsWith('"') && cell.endsWith('"') 
          ? cell.slice(1, -1) 
          : cell
      );
      worksheetData.push(row);
    }
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Auto-size columns
  const columnWidths: { width: number }[] = [];
  if (worksheetData.length > 0) {
    for (let i = 0; i < worksheetData[0].length; i++) {
      const maxLength = Math.max(
        ...worksheetData.map(row => (row[i] || '').toString().length)
      );
      columnWidths.push({ width: Math.min(maxLength + 2, 30) });
    }
    ws['!cols'] = columnWidths;
  }
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
};

/**
 * Download file with given content and filename
 */
export const downloadFile = (content: string, filename: string, format: 'csv' | 'excel' = 'excel'): void => {
  if (format === 'csv') {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  } else {
    const wb = generateExcelFromCSV(content, 'Team Availability');
    XLSX.writeFile(wb, filename);
  }
};

/**
 * Calculate export statistics with error handling
 */
export const calculateExportStatistics = (
  members: TeamMember[],
  scheduleData: WeekData,
  weekDays: Date[]
): {
  totalHours: number;
  averageHours: number;
  utilizationPercentage: number;
  capacityHours: number;
} => {
  // Input validation
  if (!Array.isArray(members)) {
    console.error('Invalid members array in calculateExportStatistics');
    return { totalHours: 0, averageHours: 0, utilizationPercentage: 0, capacityHours: 0 };
  }
  
  if (!scheduleData || typeof scheduleData !== 'object') {
    console.error('Invalid scheduleData in calculateExportStatistics');
    return { totalHours: 0, averageHours: 0, utilizationPercentage: 0, capacityHours: 0 };
  }
  
  if (!Array.isArray(weekDays) || weekDays.length === 0) {
    console.error('Invalid weekDays array in calculateExportStatistics');
    return { totalHours: 0, averageHours: 0, utilizationPercentage: 0, capacityHours: 0 };
  }

  try {
    const totalHours = calculateTeamHours(members, scheduleData, weekDays);
    const averageHours = members.length > 0 ? Math.round(totalHours / members.length) : 0;
    const capacityHours = members.length * weekDays.length * 7; // 7 hours per day
    const utilizationPercentage = capacityHours > 0 
      ? Math.round((totalHours / capacityHours) * 100) 
      : 0;
    
    // Validate results
    if (isNaN(totalHours) || isNaN(averageHours) || isNaN(utilizationPercentage) || isNaN(capacityHours)) {
      console.error('NaN values detected in export statistics calculation');
      return { totalHours: 0, averageHours: 0, utilizationPercentage: 0, capacityHours: 0 };
    }
    
    return {
      totalHours: Math.max(0, totalHours),
      averageHours: Math.max(0, averageHours),
      utilizationPercentage: Math.max(0, Math.min(100, utilizationPercentage)),
      capacityHours: Math.max(0, capacityHours)
    };
  } catch (error) {
    console.error('Error calculating export statistics:', error);
    return { totalHours: 0, averageHours: 0, utilizationPercentage: 0, capacityHours: 0 };
  }
};
/**
 * Enhanced Excel Generation for Export System
 * Supports sprint analysis, custom date ranges, and enhanced reporting
 */

import * as XLSX from 'xlsx';
import { 
  EnhancedExportData, 
  EnhancedExportConfig, 
  DateRangeInfo, 
  ExportStatistics,
  SprintExportInfo,
  DetailedTeamScheduleData,
  DetailedMemberScheduleData
} from '@/types';
import { DatabaseService } from '@/lib/database';
import { 
  getEnhancedExportDateRange,
  generateEnhancedExportFilename,
  formatDateDisplay,
  calculateWorkingDays
} from '@/utils/enhancedDateUtils';

/**
 * Generate enhanced Excel workbook with sprint analysis and custom ranges
 */
export const generateEnhancedExcelWorkbook = async (
  config: EnhancedExportConfig,
  userRole: 'coo' | 'manager',
  generatedBy: string,
  teamName?: string,
  selectedTeamId?: number
): Promise<{ workbook: XLSX.WorkBook; filename: string }> => {
  console.log('📊 Starting enhanced Excel generation...', { config, userRole, teamName });
  
  try {
    // Step 1: Calculate date range
    const dateRange = await getEnhancedExportDateRange(
      config.exportType,
      config.customStartDate,
      config.customEndDate
    );
    
    console.log('📅 Date range calculated:', dateRange);
    
    // Step 2: Gather export data
    const exportData = await gatherEnhancedExportData(
      config,
      dateRange,
      userRole,
      generatedBy,
      selectedTeamId
    );
    
    console.log('📋 Export data gathered:', {
      teams: exportData.teams.length,
      totalMembers: exportData.statistics.totalMembers,
      workingDays: exportData.dateRange.workingDays
    });
    
    // Step 3: Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Enhanced Summary
    const summarySheet = createEnhancedSummarySheet(exportData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Export Summary");
    
    // Sheet 2: Team Details
    if (config.includeDetailedSchedule) {
      const teamDetailsSheet = createEnhancedTeamDetailsSheet(exportData);
      XLSX.utils.book_append_sheet(workbook, teamDetailsSheet, "Team Details");
    }
    
    // Sheet 3: Sprint Analysis (for sprint exports)
    if (config.includeSprintAnalysis && exportData.sprintInfo) {
      const sprintAnalysisSheet = createSprintAnalysisSheet(exportData);
      XLSX.utils.book_append_sheet(workbook, sprintAnalysisSheet, "Sprint Analysis");
    }
    
    // Sheet 4: Utilization Analysis
    if (config.includeUtilizationAnalysis) {
      const utilizationSheet = createUtilizationAnalysisSheet(exportData);
      XLSX.utils.book_append_sheet(workbook, utilizationSheet, "Utilization Analysis");
    }
    
    // Sheet 5: Cross-Team Comparison (COO only)
    if (config.includeCrossTeamComparison && userRole === 'coo') {
      const comparisonSheet = createCrossTeamComparisonSheet(exportData);
      XLSX.utils.book_append_sheet(workbook, comparisonSheet, "Team Comparison");
    }
    
    // Generate enhanced filename
    const filename = generateEnhancedExportFilename(
      config.exportType,
      userRole,
      teamName,
      dateRange.start,
      dateRange.end
    );
    
    console.log('✅ Enhanced Excel workbook generated successfully:', filename);
    
    return { workbook, filename };
    
  } catch (error) {
    console.error('❌ Error generating enhanced Excel workbook:', error);
    throw new Error(`Enhanced Excel generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Gather comprehensive export data
 */
const gatherEnhancedExportData = async (
  config: EnhancedExportConfig,
  dateRange: DateRangeInfo,
  userRole: 'coo' | 'manager',
  generatedBy: string,
  selectedTeamId?: number
): Promise<EnhancedExportData> => {
  console.log('📊 Gathering enhanced export data...');
  
  try {
    // Fetch detailed company data (will be filtered for managers)
    const detailedData = await DatabaseService.getDetailedCompanyScheduleData(
      dateRange.start,
      dateRange.end
    );
    
    if (!detailedData) {
      throw new Error('No data available for the selected date range');
    }
    
    // Filter teams for managers
    let teams = detailedData.teams;
    if (userRole === 'manager' && selectedTeamId) {
      teams = teams.filter(team => team.teamId === selectedTeamId);
    }
    
    console.log(`📋 Filtered teams: ${teams.length} team(s)`);
    
    // Calculate statistics
    const statistics = calculateEnhancedStatistics(teams, dateRange);
    
    // Get sprint info for sprint exports
    let sprintInfo: SprintExportInfo | undefined;
    if (config.exportType.includes('sprint')) {
      sprintInfo = await getSprintExportInfo(config.exportType, dateRange);
    }
    
    const exportData: EnhancedExportData = {
      config,
      dateRange,
      teams,
      scheduleEntries: [], // Will be populated from teams data
      statistics,
      sprintInfo,
      userRole,
      generatedBy,
      generatedAt: new Date()
    };
    
    console.log('✅ Enhanced export data gathered successfully');
    return exportData;
    
  } catch (error) {
    console.error('❌ Error gathering enhanced export data:', error);
    throw error;
  }
};

/**
 * Create enhanced summary sheet
 */
const createEnhancedSummarySheet = (exportData: EnhancedExportData): XLSX.WorkSheet => {
  const data: unknown[][] = [];
  
  try {
    // Header section
    data.push(['TEAM AVAILABILITY TRACKER - ENHANCED EXPORT']);
    data.push(['']);
    data.push(['Generated:', exportData.generatedAt.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })]);
    data.push(['Export Type:', exportData.dateRange.description]);
    data.push(['Date Range:', `${formatDateDisplay(new Date(exportData.dateRange.start))} - ${formatDateDisplay(new Date(exportData.dateRange.end))}`]);
    data.push(['Duration:', `${exportData.dateRange.totalDays} total days (${exportData.dateRange.workingDays} working days)`]);
    data.push(['Generated by:', `${exportData.generatedBy} (${exportData.userRole.toUpperCase()})`]);
    data.push(['']);
    
    // Export summary
    data.push(['EXPORT SUMMARY:']);
    data.push(['Teams Included:', exportData.statistics.totalTeams]);
    data.push(['Total Team Members:', exportData.statistics.totalMembers]);
    data.push(['Export Period Days:', exportData.statistics.exportPeriodDays]);
    data.push(['Working Days:', exportData.statistics.exportWorkingDays]);
    data.push(['']);
    
    // Capacity overview
    data.push(['CAPACITY OVERVIEW:']);
    data.push(['Total Potential Hours:', `${exportData.statistics.totalPotentialHours}h`]);
    data.push(['Total Actual Hours:', `${exportData.statistics.totalActualHours}h`]);
    data.push(['Overall Utilization:', `${exportData.statistics.overallUtilization}%`]);
    data.push(['Capacity Gap:', `${exportData.statistics.totalPotentialHours - exportData.statistics.totalActualHours}h`]);
    data.push(['']);
    
    // Team performance summary
    data.push(['TEAM PERFORMANCE:']);
    data.push(['High Performing Teams (85-100%):', exportData.statistics.highPerformingTeams]);
    data.push(['Under-Performing Teams (<85%):', exportData.statistics.underPerformingTeams]);
    data.push(['Over-Capacity Teams (>100%):', exportData.statistics.overCapacityTeams]);
    data.push(['']);
    
    // Sprint information (if applicable)
    if (exportData.sprintInfo) {
      data.push(['SPRINT INFORMATION:']);
      data.push(['Sprint Number:', exportData.sprintInfo.sprintNumber]);
      data.push(['Sprint Duration:', `${exportData.sprintInfo.lengthWeeks} weeks`]);
      data.push(['Sprint Period:', `${formatDateDisplay(new Date(exportData.sprintInfo.startDate))} - ${formatDateDisplay(new Date(exportData.sprintInfo.endDate))}`]);
      data.push(['Sprint Working Days:', exportData.sprintInfo.totalWorkingDays]);
      data.push(['Sprint Status:', exportData.sprintInfo.isActive ? 'Active' : 'Completed']);
      data.push(['']);
    }
    
    // Export configuration
    data.push(['EXPORT CONFIGURATION:']);
    data.push(['Include Detailed Schedules:', exportData.config.includeDetailedSchedule ? 'Yes' : 'No']);
    data.push(['Include Sprint Analysis:', exportData.config.includeSprintAnalysis ? 'Yes' : 'No']);
    data.push(['Include Reasons:', exportData.config.includeReasons ? 'Yes' : 'No']);
    data.push(['Include Utilization Analysis:', exportData.config.includeUtilizationAnalysis ? 'Yes' : 'No']);
    if (exportData.userRole === 'coo') {
      data.push(['Include Cross-Team Comparison:', exportData.config.includeCrossTeamComparison ? 'Yes' : 'No']);
    }
    
  } catch (error) {
    console.error('Error creating enhanced summary sheet:', error);
    data.push(['Error generating summary data']);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyEnhancedSheetFormatting(ws, data);
  return ws;
};

/**
 * Create enhanced team details sheet
 */
const createEnhancedTeamDetailsSheet = (exportData: EnhancedExportData): XLSX.WorkSheet => {
  const data: unknown[][] = [];
  
  try {
    // Header
    data.push(['DETAILED TEAM SCHEDULES']);
    data.push(['']);
    data.push([`Period: ${exportData.dateRange.description}`]);
    data.push([`Working Days: ${exportData.dateRange.workingDays} days`]);
    data.push(['']);
    
    // Process each team
    exportData.teams.forEach((team, teamIndex) => {
      // Team header
      data.push([`${team.teamName.toUpperCase()}`]);
      data.push([`Team Size: ${team.members.length} members`]);
      data.push(['']);
      
      // Column headers
      const headers = [
        'Name',
        'Hebrew Name',
        'Role',
        ...exportData.dateRange.weekDays.map(dateStr => {
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dateDisplay = formatDateDisplay(date);
          return `${dayName} (${dateDisplay})`;
        }),
        'Total Hours',
        'Utilization %'
      ];
      
      if (exportData.config.includeReasons) {
        headers.push('Reasons');
      }
      
      data.push(headers);
      
      // Process each team member
      team.members.forEach(member => {
        const memberRow = createEnhancedMemberRow(member, exportData.dateRange.weekDays, exportData.config.includeReasons);
        data.push(memberRow);
      });
      
      // Team totals
      data.push(['']);
      const teamTotalRow = ['TEAM TOTALS:', '', '', 
        ...exportData.dateRange.weekDays.map(() => ''), 
        `${team.teamTotals.actualHours}h`,
        `${team.teamTotals.utilization}%`
      ];
      if (exportData.config.includeReasons) {
        teamTotalRow.push('');
      }
      data.push(teamTotalRow);
      
      const teamCapacityRow = ['TEAM CAPACITY:', '', '', 
        ...exportData.dateRange.weekDays.map(() => ''), 
        `${team.teamTotals.potentialHours}h`,
        '100%'
      ];
      if (exportData.config.includeReasons) {
        teamCapacityRow.push('');
      }
      data.push(teamCapacityRow);
      
      // Space between teams
      if (teamIndex < exportData.teams.length - 1) {
        data.push(['']);
        data.push(['']);
      }
    });
    
  } catch (error) {
    console.error('Error creating enhanced team details sheet:', error);
    data.push(['Error generating team details data']);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyEnhancedSheetFormatting(ws, data);
  return ws;
};

/**
 * Create sprint analysis sheet
 */
const createSprintAnalysisSheet = (exportData: EnhancedExportData): XLSX.WorkSheet => {
  const data: unknown[][] = [];
  
  try {
    if (!exportData.sprintInfo) {
      data.push(['Sprint analysis not available']);
      const ws = XLSX.utils.aoa_to_sheet(data);
      return ws;
    }
    
    // Header
    data.push(['SPRINT ANALYSIS']);
    data.push(['']);
    data.push([`Sprint ${exportData.sprintInfo.sprintNumber} Analysis`]);
    data.push([`Period: ${formatDateDisplay(new Date(exportData.sprintInfo.startDate))} - ${formatDateDisplay(new Date(exportData.sprintInfo.endDate))}`]);
    data.push([`Duration: ${exportData.sprintInfo.lengthWeeks} weeks (${exportData.sprintInfo.totalWorkingDays} working days)`]);
    data.push(['']);
    
    // Sprint metrics
    data.push(['SPRINT METRICS:']);
    data.push(['Metric', 'Value', 'Target', 'Status']);
    data.push(['Total Potential Hours', `${exportData.statistics.totalPotentialHours}h`, `${exportData.statistics.totalPotentialHours}h`, '100%']);
    data.push(['Total Actual Hours', `${exportData.statistics.totalActualHours}h`, `${Math.round(exportData.statistics.totalPotentialHours * 0.85)}h`, exportData.statistics.overallUtilization >= 85 ? 'On Track' : 'Below Target']);
    data.push(['Sprint Utilization', `${exportData.statistics.overallUtilization}%`, '85%', exportData.statistics.overallUtilization >= 85 ? 'Good' : 'Needs Attention']);
    data.push(['']);
    
    // Team performance in sprint
    data.push(['TEAM SPRINT PERFORMANCE:']);
    data.push(['Team', 'Members', 'Potential Hours', 'Actual Hours', 'Utilization %', 'Sprint Status']);
    
    exportData.teams.forEach(team => {
      const utilizationStatus = team.teamTotals.utilization >= 100 ? 'Over-capacity' :
                              team.teamTotals.utilization >= 85 ? 'Optimal' :
                              team.teamTotals.utilization >= 70 ? 'Good' : 'Below Target';
      
      data.push([
        team.teamName,
        team.members.length,
        `${team.teamTotals.potentialHours}h`,
        `${team.teamTotals.actualHours}h`,
        `${team.teamTotals.utilization}%`,
        utilizationStatus
      ]);
    });
    
    data.push(['']);
    
    // Sprint insights
    data.push(['SPRINT INSIGHTS:']);
    const insights = generateSprintInsights(exportData);
    insights.forEach(insight => {
      data.push([`• ${insight}`]);
    });
    
  } catch (error) {
    console.error('Error creating sprint analysis sheet:', error);
    data.push(['Error generating sprint analysis data']);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyEnhancedSheetFormatting(ws, data);
  return ws;
};

/**
 * Create utilization analysis sheet
 */
const createUtilizationAnalysisSheet = (exportData: EnhancedExportData): XLSX.WorkSheet => {
  const data: unknown[][] = [];
  
  try {
    // Header
    data.push(['UTILIZATION ANALYSIS']);
    data.push(['']);
    data.push([`Analysis Period: ${exportData.dateRange.description}`]);
    data.push(['']);
    
    // Daily utilization breakdown
    data.push(['DAILY UTILIZATION BREAKDOWN:']);
    data.push(['Date', 'Day', 'Total Hours', 'Potential Hours', 'Utilization %', 'Status']);
    
    exportData.dateRange.weekDays.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Calculate daily totals across all teams
      const dailyActual = exportData.teams.reduce((total, team) => {
        return total + team.members.reduce((memberTotal, member) => {
          const daySchedule = member.dailySchedule?.[dateStr];
          if (daySchedule && daySchedule.value) {
            return memberTotal + getHoursFromValue(daySchedule.value);
          }
          return memberTotal;
        }, 0);
      }, 0);
      
      const dailyPotential = exportData.statistics.totalMembers * 7; // 7 hours per day
      const dailyUtilization = dailyPotential > 0 ? Math.round((dailyActual / dailyPotential) * 100) : 0;
      const status = dailyUtilization >= 85 ? 'Good' : dailyUtilization >= 70 ? 'Fair' : 'Low';
      
      data.push([
        formatDateDisplay(date),
        dayName,
        `${dailyActual}h`,
        `${dailyPotential}h`,
        `${dailyUtilization}%`,
        status
      ]);
    });
    
    data.push(['']);
    
    // Team utilization ranking
    data.push(['TEAM UTILIZATION RANKING:']);
    data.push(['Rank', 'Team', 'Utilization %', 'Actual Hours', 'Potential Hours', 'Performance']);
    
    const sortedTeams = [...exportData.teams].sort((a, b) => b.teamTotals.utilization - a.teamTotals.utilization);
    sortedTeams.forEach((team, index) => {
      const performance = team.teamTotals.utilization >= 100 ? 'Over-capacity' :
                         team.teamTotals.utilization >= 85 ? 'Excellent' :
                         team.teamTotals.utilization >= 70 ? 'Good' : 'Needs Improvement';
      
      data.push([
        index + 1,
        team.teamName,
        `${team.teamTotals.utilization}%`,
        `${team.teamTotals.actualHours}h`,
        `${team.teamTotals.potentialHours}h`,
        performance
      ]);
    });
    
  } catch (error) {
    console.error('Error creating utilization analysis sheet:', error);
    data.push(['Error generating utilization analysis data']);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyEnhancedSheetFormatting(ws, data);
  return ws;
};

/**
 * Create cross-team comparison sheet (COO only)
 */
const createCrossTeamComparisonSheet = (exportData: EnhancedExportData): XLSX.WorkSheet => {
  const data: unknown[][] = [];
  
  try {
    // Header
    data.push(['CROSS-TEAM COMPARISON']);
    data.push(['']);
    data.push([`Comparison Period: ${exportData.dateRange.description}`]);
    data.push([`Total Teams: ${exportData.statistics.totalTeams}`]);
    data.push(['']);
    
    // Team comparison table
    data.push(['TEAM PERFORMANCE COMPARISON:']);
    data.push(['Team', 'Members', 'Potential Hours', 'Actual Hours', 'Utilization %', 'Efficiency Score', 'Recommendations']);
    
    exportData.teams.forEach(team => {
      const efficiencyScore = calculateEfficiencyScore(team);
      const recommendations = generateTeamRecommendations(team);
      
      data.push([
        team.teamName,
        team.members.length,
        `${team.teamTotals.potentialHours}h`,
        `${team.teamTotals.actualHours}h`,
        `${team.teamTotals.utilization}%`,
        efficiencyScore,
        recommendations.join('; ')
      ]);
    });
    
    data.push(['']);
    
    // Company insights
    data.push(['COMPANY-WIDE INSIGHTS:']);
    const companyInsights = generateCompanyInsights(exportData);
    companyInsights.forEach(insight => {
      data.push([`• ${insight}`]);
    });
    
  } catch (error) {
    console.error('Error creating cross-team comparison sheet:', error);
    data.push(['Error generating cross-team comparison data']);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  applyEnhancedSheetFormatting(ws, data);
  return ws;
};

/**
 * Helper functions
 */
const createEnhancedMemberRow = (member: DetailedMemberScheduleData, weekDays: string[], includeReasons: boolean): (string | number)[] => {
  const dailyValues: string[] = [];
  const reasons: string[] = [];
  
  weekDays.forEach(dateStr => {
    const daySchedule = member.dailySchedule?.[dateStr];
    
    if (daySchedule && daySchedule.value) {
      dailyValues.push(daySchedule.value);
      
      if (includeReasons && daySchedule.reason && (daySchedule.value === '0.5' || daySchedule.value === 'X')) {
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        reasons.push(`${dayName}: ${daySchedule.reason}`);
      }
    } else {
      dailyValues.push('');
    }
  });
  
  const memberTotal = member.weeklyTotals?.actualHours || 0;
  const memberPotential = weekDays.length * 7;
  const memberUtilization = memberPotential > 0 ? Math.round((memberTotal / memberPotential) * 100) : 0;
  
  const row = [
    member.memberName || 'Unknown',
    member.memberHebrew || '',
    member.isManager ? 'Manager' : 'Employee',
    ...dailyValues,
    `${memberTotal}h`,
    `${memberUtilization}%`
  ];
  
  if (includeReasons) {
    row.push(reasons.join(' | '));
  }
  
  return row;
};

const calculateEnhancedStatistics = (teams: DetailedTeamScheduleData[], dateRange: DateRangeInfo): ExportStatistics => {
  const totalMembers = teams.reduce((sum, team) => sum + team.members.length, 0);
  const totalPotentialHours = teams.reduce((sum, team) => sum + team.teamTotals.potentialHours, 0);
  const totalActualHours = teams.reduce((sum, team) => sum + team.teamTotals.actualHours, 0);
  const overallUtilization = totalPotentialHours > 0 ? Math.round((totalActualHours / totalPotentialHours) * 100) : 0;
  
  const highPerformingTeams = teams.filter(team => team.teamTotals.utilization >= 85 && team.teamTotals.utilization <= 100).length;
  const underPerformingTeams = teams.filter(team => team.teamTotals.utilization < 85).length;
  const overCapacityTeams = teams.filter(team => team.teamTotals.utilization > 100).length;
  
  return {
    totalTeams: teams.length,
    totalMembers,
    totalPotentialHours,
    totalActualHours,
    overallUtilization,
    exportPeriodDays: dateRange.totalDays,
    exportWorkingDays: dateRange.workingDays,
    highPerformingTeams,
    underPerformingTeams,
    overCapacityTeams
  };
};

const getSprintExportInfo = async (exportType: string, dateRange: DateRangeInfo): Promise<SprintExportInfo | undefined> => {
  try {
    const sprint = await DatabaseService.getCurrentGlobalSprint();
    if (!sprint) return undefined;
    
    let sprintNumber = sprint.current_sprint_number;
    let startDate = sprint.sprint_start_date;
    let endDate = dateRange.end;
    
    if (exportType === 'previous-sprint') {
      sprintNumber = sprint.current_sprint_number - 1;
      startDate = dateRange.start;
      endDate = dateRange.end;
    }
    
    const workingDays = calculateWorkingDays(startDate, endDate);
    
    return {
      sprintNumber,
      startDate,
      endDate,
      lengthWeeks: sprint.sprint_length_weeks,
      isActive: exportType === 'current-sprint',
      totalWorkingDays: workingDays
    };
  } catch (error) {
    console.error('Error getting sprint export info:', error);
    return undefined;
  }
};

const getHoursFromValue = (value: string): number => {
  switch (value) {
    case '1': return 7;
    case '0.5': return 3.5;
    case 'X': return 0;
    default: return 0;
  }
};

const calculateEfficiencyScore = (team: DetailedTeamScheduleData): string => {
  const utilization = team.teamTotals.utilization;
  if (utilization >= 95 && utilization <= 100) return 'A+';
  if (utilization >= 85 && utilization < 95) return 'A';
  if (utilization >= 75 && utilization < 85) return 'B';
  if (utilization >= 65 && utilization < 75) return 'C';
  return 'D';
};

const generateTeamRecommendations = (team: DetailedTeamScheduleData): string[] => {
  const recommendations: string[] = [];
  const utilization = team.teamTotals.utilization;
  
  if (utilization > 100) {
    recommendations.push('Consider workload redistribution');
    recommendations.push('Monitor for burnout risk');
  } else if (utilization < 70) {
    recommendations.push('Identify capacity optimization opportunities');
    recommendations.push('Consider additional project assignments');
  } else if (utilization >= 85 && utilization <= 100) {
    recommendations.push('Excellent performance - maintain current approach');
  }
  
  return recommendations;
};

const generateSprintInsights = (exportData: EnhancedExportData): string[] => {
  const insights: string[] = [];
  const stats = exportData.statistics;
  
  if (stats.overallUtilization >= 85) {
    insights.push(`Strong sprint performance with ${stats.overallUtilization}% utilization`);
  } else {
    insights.push(`Sprint utilization at ${stats.overallUtilization}% - below target of 85%`);
  }
  
  if (stats.highPerformingTeams > 0) {
    insights.push(`${stats.highPerformingTeams} team(s) performing optimally`);
  }
  
  if (stats.underPerformingTeams > 0) {
    insights.push(`${stats.underPerformingTeams} team(s) need attention for capacity optimization`);
  }
  
  if (stats.overCapacityTeams > 0) {
    insights.push(`${stats.overCapacityTeams} team(s) operating over capacity - monitor for sustainability`);
  }
  
  return insights;
};

const generateCompanyInsights = (exportData: EnhancedExportData): string[] => {
  const insights: string[] = [];
  const stats = exportData.statistics;
  
  insights.push(`Company-wide utilization: ${stats.overallUtilization}%`);
  insights.push(`Total capacity: ${stats.totalPotentialHours}h across ${stats.totalMembers} members`);
  
  if (stats.totalTeams > 1) {
    const avgTeamSize = Math.round(stats.totalMembers / stats.totalTeams);
    insights.push(`Average team size: ${avgTeamSize} members`);
  }
  
  const capacityGap = stats.totalPotentialHours - stats.totalActualHours;
  if (capacityGap > 0) {
    insights.push(`Unused capacity: ${capacityGap}h available for additional work`);
  }
  
  return insights;
};

const applyEnhancedSheetFormatting = (ws: XLSX.WorkSheet, data: unknown[][]): void => {
  try {
    // Set column widths
    const columnWidths: { width: number }[] = [];
    if (data.length > 0) {
      for (let i = 0; i < (data[0] as unknown[]).length; i++) {
        const maxLength = Math.max(
          ...data.map(row => ((row as unknown[])[i] || '').toString().length)
        );
        columnWidths.push({ width: Math.min(Math.max(maxLength + 2, 12), 50) });
      }
      ws['!cols'] = columnWidths;
    }
  } catch (error) {
    console.warn('Error applying enhanced sheet formatting:', error);
  }
};

/**
 * Download enhanced Excel file
 */
export const downloadEnhancedExcelFile = (workbook: XLSX.WorkBook, filename: string): void => {
  try {
    XLSX.writeFile(workbook, filename);
    console.log('✅ Enhanced Excel file downloaded successfully:', filename);
  } catch (error) {
    console.error('❌ Error downloading enhanced Excel file:', error);
    throw new Error('Failed to download enhanced Excel file');
  }
};
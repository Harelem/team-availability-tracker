/**
 * Excel Export Service
 * 
 * Provides functions to export dashboard data to properly formatted Excel files
 * instead of JSON files.
 */

import * as XLSX from 'xlsx';
import { COODashboardData, CompanyAnalytics, Alert } from '@/types';

export interface ExportData {
  [sheetName: string]: any[];
}

/**
 * Export data to Excel file with multiple sheets
 */
export const exportToExcel = async (
  data: ExportData,
  filename: string
): Promise<void> => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Add each sheet
    Object.entries(data).forEach(([sheetName, sheetData]) => {
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      
      // Auto-size columns
      const colWidths = [];
      if (sheetData.length > 0) {
        const headers = Object.keys(sheetData[0]);
        headers.forEach((header, index) => {
          const maxLength = Math.max(
            header.length,
            ...sheetData.map(row => String(row[header] || '').length)
          );
          colWidths[index] = { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
        });
        worksheet['!cols'] = colWidths;
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Failed to export Excel file');
  }
};

/**
 * Export analytics data to Excel with formatted sheets
 */
export const exportAnalyticsToExcel = async (
  dashboardData: COODashboardData,
  companyAnalytics?: CompanyAnalytics | null,
  alerts?: Alert[] | null,
  generatedBy: string = 'COO Dashboard'
): Promise<void> => {
  try {
    const exportData: ExportData = {};
    
    // Company Overview Sheet
    exportData['Company Overview'] = [{
      'Metric': 'Total Workforce',
      'Value': dashboardData.companyOverview.totalMembers,
      'Unit': 'members'
    }, {
      'Metric': 'Total Teams',
      'Value': dashboardData.companyOverview.totalTeams,
      'Unit': 'teams'
    }, {
      'Metric': 'Weekly Potential',
      'Value': dashboardData.companyOverview.weeklyPotential,
      'Unit': 'hours'
    }, {
      'Metric': 'Current Utilization',
      'Value': dashboardData.companyOverview.currentUtilization,
      'Unit': 'percentage'
    }, {
      'Metric': 'Capacity Gap',
      'Value': dashboardData.companyOverview.capacityGap,
      'Unit': 'hours'
    }];
    
    // Team Comparison Sheet
    exportData['Team Comparison'] = dashboardData.teamComparison.map(team => ({
      'Team ID': team.teamId,
      'Team Name': team.teamName,
      'Member Count': team.memberCount,
      'Weekly Potential (hours)': team.weeklyPotential,
      'Actual Hours': team.actualHours,
      'Utilization (%)': team.utilization,
      'Capacity Gap (hours)': team.capacityGap,
      'Capacity Status': team.capacityStatus
    }));
    
    // Sprint Analytics Sheet
    exportData['Sprint Analytics'] = [{
      'Current Sprint Number': dashboardData.sprintAnalytics.currentSprintNumber,
      'Sprint Weeks': dashboardData.sprintAnalytics.sprintWeeks,
      'Sprint Potential (hours)': dashboardData.sprintAnalytics.sprintPotential,
      'Sprint Actual (hours)': dashboardData.sprintAnalytics.sprintActual,
      'Sprint Utilization (%)': dashboardData.sprintAnalytics.sprintUtilization
    }];
    
    // Sprint Weekly Breakdown
    if (dashboardData.sprintAnalytics.weeklyBreakdown?.length > 0) {
      exportData['Sprint Weekly'] = dashboardData.sprintAnalytics.weeklyBreakdown.map(week => ({
        'Week': week.week,
        'Potential (hours)': week.potential,
        'Actual (hours)': week.actual,
        'Utilization (%)': week.utilization
      }));
    }
    
    // Capacity Forecast Sheet
    if (dashboardData.capacityForecast) {
      exportData['Capacity Forecast'] = [{
        'Next Week - Potential (hours)': dashboardData.capacityForecast.nextWeekProjection.potentialHours,
        'Next Week - Projected (hours)': dashboardData.capacityForecast.nextWeekProjection.projectedActual,
        'Next Week - Utilization (%)': dashboardData.capacityForecast.nextWeekProjection.expectedUtilization,
        'Next Week - Confidence (%)': dashboardData.capacityForecast.nextWeekProjection.confidenceLevel,
        'Next Sprint - Potential (hours)': dashboardData.capacityForecast.nextSprintProjection.sprintPotential,
        'Next Sprint - Projected (hours)': dashboardData.capacityForecast.nextSprintProjection.projectedOutcome
      }];
    }
    
    // Company Analytics Sheet (if available)
    if (companyAnalytics) {
      exportData['Performance Metrics'] = [{
        'Overall Performance Score (%)': companyAnalytics.performance.companyWideMetrics.overallPerformanceScore,
        'Average Utilization (%)': companyAnalytics.performance.companyWideMetrics.averageUtilization,
        'Teams Analyzed': companyAnalytics.performance.reportingPeriod.teamsAnalyzed,
        'Analysis Start Date': companyAnalytics.performance.reportingPeriod.startDate,
        'Analysis End Date': companyAnalytics.performance.reportingPeriod.endDate
      }];
      
      // Performance Distribution
      exportData['Performance Distribution'] = [{
        'Excellent (%)': companyAnalytics.performance.performanceDistribution.excellent,
        'Good (%)': companyAnalytics.performance.performanceDistribution.good,
        'Satisfactory (%)': companyAnalytics.performance.performanceDistribution.satisfactory,
        'Needs Improvement (%)': companyAnalytics.performance.performanceDistribution.needsImprovement,
        'Poor (%)': companyAnalytics.performance.performanceDistribution.poor
      }];
      
      // Team Comparisons
      if (companyAnalytics.performance.teamComparisons?.length > 0) {
        exportData['Team Performance'] = companyAnalytics.performance.teamComparisons.map(team => ({
          'Team ID': team.teamId,
          'Team Name': team.teamName,
          'Baseline Performance': team.baselinePerformance,
          'Current Performance': team.currentPerformance,
          'Relative Performance': team.relativePerformance,
          'Performance Trend': team.performanceTrend
        }));
      }
    }
    
    // Alerts Sheet (if available)
    if (alerts && alerts.length > 0) {
      exportData['Critical Alerts'] = alerts.map(alert => ({
        'Alert ID': alert.id,
        'Title': alert.title,
        'Description': alert.description,
        'Severity': alert.severity,
        'Type': alert.type,
        'Affected Entity': alert.affectedEntity.name,
        'Entity Type': alert.affectedEntity.type,
        'Created Date': new Date(alert.createdAt).toLocaleDateString(),
        'Is Resolved': alert.isResolved ? 'Yes' : 'No',
        'Metric Value': alert.metricValue || 'N/A',
        'Threshold': alert.threshold || 'N/A'
      }));
    }
    
    // Optimization Recommendations Sheet
    if (dashboardData.optimizationRecommendations?.length > 0) {
      exportData['Recommendations'] = dashboardData.optimizationRecommendations.map((rec, index) => ({
        'Recommendation #': index + 1,
        'Description': rec
      }));
    }
    
    // Metadata Sheet
    exportData['Export Info'] = [{
      'Generated By': generatedBy,
      'Generated At': new Date().toLocaleString(),
      'Export Type': 'COO Analytics Report',
      'Data Period': `Sprint ${dashboardData.sprintAnalytics.currentSprintNumber}`,
      'Total Teams': dashboardData.companyOverview.totalTeams,
      'Total Members': dashboardData.companyOverview.totalMembers
    }];
    
    const filename = `COO_Analytics_Report_${new Date().toISOString().split('T')[0]}`;
    await exportToExcel(exportData, filename);
    
  } catch (error) {
    console.error('Error exporting analytics to Excel:', error);
    throw error;
  }
};

/**
 * Export team data to Excel
 */
export const exportTeamDataToExcel = async (
  teamData: any,
  teamName: string
): Promise<void> => {
  try {
    const exportData: ExportData = {};
    
    // Team Info Sheet
    exportData['Team Info'] = [{
      'Team Name': teamData.teamInfo?.name || teamName,
      'Description': teamData.teamInfo?.description || 'N/A',
      'Member Count': teamData.teamInfo?.memberCount || 0,
      'Manager': teamData.teamInfo?.managerName || 'N/A'
    }];
    
    // Current Sprint Sheet
    if (teamData.currentSprint) {
      exportData['Current Sprint'] = [{
        'Sprint Number': teamData.currentSprint.sprintNumber,
        'Length (weeks)': teamData.currentSprint.lengthWeeks,
        'Days Remaining': teamData.currentSprint.daysRemaining,
        'Potential Hours': teamData.currentSprint.potentialHours,
        'Planned Hours': teamData.currentSprint.plannedHours,
        'Completion (%)': teamData.currentSprint.completionPercentage,
        'Health Status': teamData.currentSprint.healthStatus
      }];
    }
    
    // Team Members Sheet
    if (teamData.members?.length > 0) {
      exportData['Team Members'] = teamData.members.map((member: any) => ({
        'Member ID': member.id,
        'Name': member.name,
        'Hebrew Name': member.hebrew || 'N/A',
        'Is Manager': member.isManager ? 'Yes' : 'No',
        'Current Week Status': member.currentWeekStatus,
        'Current Week Hours': member.currentWeekHours,
        'Sprint Progress (%)': member.individualCompletionPercentage,
        'Last Activity': member.lastActivityTimestamp ? 
          new Date(member.lastActivityTimestamp).toLocaleDateString() : 'N/A'
      }));
    }
    
    // Team Statistics Sheet
    if (teamData.statistics) {
      exportData['Team Statistics'] = [{
        'Average Utilization (%)': teamData.statistics.averageUtilization,
        'Most Productive Day': teamData.statistics.mostProductiveDay,
        'Team Ranking': teamData.statistics.comparisonToOtherTeams?.rank || 'N/A',
        'Trend Indicator': teamData.statistics.trendIndicator,
        'Trend Percentage (%)': teamData.statistics.trendPercentage || 0
      }];
      
      // Top Absence Reasons
      if (teamData.statistics.topAbsenceReasons?.length > 0) {
        exportData['Absence Reasons'] = teamData.statistics.topAbsenceReasons.map((reason: any, index: number) => ({
          'Rank': index + 1,
          'Reason': reason.reason,
          'Count': reason.count,
          'Percentage (%)': reason.percentage
        }));
      }
    }
    
    // Recent Activity Sheet
    if (teamData.recentActivity?.length > 0) {
      exportData['Recent Activity'] = teamData.recentActivity.map((activity: any) => ({
        'Activity ID': activity.id,
        'Description': activity.description,
        'Details': activity.details || 'N/A',
        'User': activity.userName || 'System',
        'Timestamp': new Date(activity.timestamp).toLocaleString(),
        'Type': activity.type || 'N/A'
      }));
    }
    
    // Pending Entries Sheet
    if (teamData.pendingEntries?.length > 0) {
      exportData['Pending Items'] = teamData.pendingEntries.map((entry: any, index: number) => ({
        'Item #': index + 1,
        'Member Name': entry.memberName,
        'Description': entry.description,
        'Priority': entry.priority,
        'Due Date': entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : 'N/A'
      }));
    }
    
    const filename = `Team_${teamName.replace(/\s+/g, '_')}_Export_${new Date().toISOString().split('T')[0]}`;
    await exportToExcel(exportData, filename);
    
  } catch (error) {
    console.error('Error exporting team data to Excel:', error);
    throw error;
  }
};

export default {
  exportToExcel,
  exportAnalyticsToExcel,
  exportTeamDataToExcel
};
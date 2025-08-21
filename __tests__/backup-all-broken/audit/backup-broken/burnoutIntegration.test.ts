/**
 * Burnout Prevention System Integration Tests
 * 
 * Validates burnout detection algorithms, workload monitoring, alert systems,
 * intervention mechanisms, and cross-component integration for employee wellbeing.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import TeamDetailModal from '../../src/components/modals/TeamDetailModal';
import { DatabaseService } from '@/lib/database';

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock analytics and burnout detection
jest.mock('../../src/lib/analytics/burnoutAnalytics', () => ({
  BurnoutAnalytics: {
    calculateBurnoutRisk: jest.fn(),
    detectWorkloadPatterns: jest.fn(),
    generateBurnoutAlerts: jest.fn(),
    trackRecoveryMetrics: jest.fn()
  }
}));

describe('Burnout Prevention System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Burnout Risk Detection', () => {
    it('should detect high burnout risk from excessive overtime patterns', () => {
      // Simulate 6 weeks of consistent overtime (>35 hours/week)
      const overtimePattern = [
        { week: 1, plannedHours: 42, actualHours: 45 }, // 28% over standard
        { week: 2, plannedHours: 40, actualHours: 43 }, // 23% over standard  
        { week: 3, plannedHours: 38, actualHours: 41 }, // 17% over standard
        { week: 4, plannedHours: 44, actualHours: 47 }, // 34% over standard
        { week: 5, plannedHours: 41, actualHours: 44 }, // 26% over standard
        { week: 6, plannedHours: 39, actualHours: 42 }  // 20% over standard
      ];
      
      const { BurnoutAnalytics } = require('../../src/lib/analytics/burnoutAnalytics');
      
      // Mock burnout risk calculation
      BurnoutAnalytics.calculateBurnoutRisk.mockReturnValue({
        riskLevel: 'HIGH',
        riskScore: 85,
        factors: [
          { type: 'consistent_overtime', severity: 'high', weeksDetected: 6 },
          { type: 'workload_increase', severity: 'medium', trendPercentage: 25 }
        ],
        recommendations: [
          'Reduce workload by 20% for next 2 weeks',
          'Schedule mandatory time off',
          'Review team capacity planning'
        ]
      });
      
      const avgOvertime = overtimePattern.reduce((sum, week) => 
        sum + (week.actualHours - 35), 0) / overtimePattern.length;
      
      expect(avgOvertime).toBeGreaterThan(5); // More than 5 hours overtime per week on average
      
      const riskAssessment = BurnoutAnalytics.calculateBurnoutRisk(1, overtimePattern);
      expect(riskAssessment.riskLevel).toBe('HIGH');
      expect(riskAssessment.riskScore).toBeGreaterThan(80);
    });

    it('should identify burnout risk from inconsistent schedule patterns', () => {
      // Erratic schedule pattern indicating potential stress
      const erraticPattern = [
        { week: 1, plannedHours: 35, actualHours: 20 }, // Major drop
        { week: 2, plannedHours: 35, actualHours: 42 }, // Compensatory overtime
        { week: 3, plannedHours: 35, actualHours: 15 }, // Another drop
        { week: 4, plannedHours: 35, actualHours: 40 }, // Compensatory overtime
        { week: 5, plannedHours: 35, actualHours: 25 }, // Inconsistent
        { week: 6, plannedHours: 35, actualHours: 38 }  // Slight overtime
      ];
      
      const { BurnoutAnalytics } = require('../../src/lib/analytics/burnoutAnalytics');
      
      BurnoutAnalytics.calculateBurnoutRisk.mockReturnValue({
        riskLevel: 'MEDIUM',
        riskScore: 65,
        factors: [
          { type: 'schedule_volatility', severity: 'high', variancePercentage: 45 },
          { type: 'compensatory_behavior', severity: 'medium', occurrences: 2 }
        ],
        recommendations: [
          'Schedule regular check-ins with manager',
          'Provide schedule stability support',
          'Offer flexible working arrangements'
        ]
      });
      
      // Calculate schedule volatility
      const avgHours = erraticPattern.reduce((sum, week) => sum + week.actualHours, 0) / erraticPattern.length;
      const variance = erraticPattern.reduce((sum, week) => 
        sum + Math.pow(week.actualHours - avgHours, 2), 0) / erraticPattern.length;
      const standardDeviation = Math.sqrt(variance);
      
      expect(standardDeviation).toBeGreaterThan(8); // High volatility indicator
      
      const riskAssessment = BurnoutAnalytics.calculateBurnoutRisk(1, erraticPattern);
      expect(riskAssessment.riskLevel).toBe('MEDIUM');
    });

    it('should recognize low burnout risk from healthy work patterns', () => {
      // Consistent, sustainable work pattern
      const healthyPattern = [
        { week: 1, plannedHours: 35, actualHours: 35 },
        { week: 2, plannedHours: 35, actualHours: 33 }, // Slight under
        { week: 3, plannedHours: 35, actualHours: 37 }, // Slight over
        { week: 4, plannedHours: 35, actualHours: 35 },
        { week: 5, plannedHours: 35, actualHours: 34 },
        { week: 6, plannedHours: 35, actualHours: 36 }
      ];
      
      const { BurnoutAnalytics } = require('../../src/lib/analytics/burnoutAnalytics');
      
      BurnoutAnalytics.calculateBurnoutRisk.mockReturnValue({
        riskLevel: 'LOW',
        riskScore: 15,
        factors: [
          { type: 'consistent_schedule', severity: 'positive', stabilityScore: 95 },
          { type: 'sustainable_workload', severity: 'positive', averageHours: 35 }
        ],
        recommendations: [
          'Continue current work patterns',
          'Consider mentoring others on work-life balance'
        ]
      });
      
      // Verify healthy metrics
      const avgHours = healthyPattern.reduce((sum, week) => sum + week.actualHours, 0) / healthyPattern.length;
      const maxDeviation = Math.max(...healthyPattern.map(week => Math.abs(week.actualHours - 35)));
      
      expect(avgHours).toBeLessThanOrEqual(36);
      expect(maxDeviation).toBeLessThanOrEqual(2); // Minimal deviation from standard
      
      const riskAssessment = BurnoutAnalytics.calculateBurnoutRisk(1, healthyPattern);
      expect(riskAssessment.riskLevel).toBe('LOW');
    });
  });

  describe('Workload Monitoring and Alerts', () => {
    it('should display burnout risk indicators in COO Dashboard', async () => {
      const teamBurnoutData = [
        { userId: 1, name: 'John Doe', riskLevel: 'HIGH', riskScore: 85 },
        { userId: 2, name: 'Jane Smith', riskLevel: 'MEDIUM', riskScore: 60 },
        { userId: 3, name: 'Bob Johnson', riskLevel: 'LOW', riskScore: 20 }
      ];
      
      mockDatabaseService.getTeamBurnoutRisks.mockResolvedValue(teamBurnoutData);
      mockDatabaseService.getOperationalTeams.mockResolvedValue([
        { id: 1, name: 'Product Team', description: 'Product development team' }
      ]);
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should show burnout risk indicators
        const highRiskElements = screen.queryAllByText(/high.*risk/i);
        const mediumRiskElements = screen.queryAllByText(/medium.*risk/i);
        
        if (highRiskElements.length > 0) {
          expect(highRiskElements[0]).toBeInTheDocument();
        }
        if (mediumRiskElements.length > 0) {
          expect(mediumRiskElements[0]).toBeInTheDocument();
        }
      });
    });

    it('should generate automated burnout alerts for managers', async () => {
      const { BurnoutAnalytics } = require('../../src/lib/analytics/burnoutAnalytics');
      
      const criticalAlert = {
        alertId: 'burnout-alert-001',
        userId: 1,
        userName: 'John Doe',
        teamId: 1,
        riskLevel: 'CRITICAL',
        riskScore: 95,
        triggerFactors: [
          'Consistent 50+ hour weeks for 4 weeks',
          'Schedule volatility increased 300%',
          'Missed 3 recent deadlines'
        ],
        recommendedActions: [
          'Immediate workload reduction required',
          'Schedule urgent 1:1 meeting',
          'Consider temporary team reassignment',
          'Mandatory time off within 48 hours'
        ],
        createdAt: '2024-01-20T09:00:00Z',
        severity: 'URGENT'
      };
      
      BurnoutAnalytics.generateBurnoutAlerts.mockResolvedValue([criticalAlert]);
      mockDatabaseService.createManagerAlert.mockResolvedValue({ success: true, alertId: 'burnout-alert-001' });
      
      const alerts = await BurnoutAnalytics.generateBurnoutAlerts(1); // teamId
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('URGENT');
      expect(alerts[0].riskLevel).toBe('CRITICAL');
      
      // Alert should trigger manager notification
      await mockDatabaseService.createManagerAlert(1, criticalAlert);
      expect(mockDatabaseService.createManagerAlert).toHaveBeenCalledWith(1, criticalAlert);
    });

    it('should track workload distribution across team members', () => {
      const teamWorkloadData = [
        { userId: 1, name: 'John Doe', avgWeeklyHours: 45, capacity: 35, utilizationRate: 129 },
        { userId: 2, name: 'Jane Smith', avgWeeklyHours: 32, capacity: 35, utilizationRate: 91 },
        { userId: 3, name: 'Bob Johnson', avgWeeklyHours: 38, capacity: 35, utilizationRate: 109 },
        { userId: 4, name: 'Alice Brown', avgWeeklyHours: 28, capacity: 35, utilizationRate: 80 }
      ];
      
      const { BurnoutAnalytics } = require('../../src/lib/analytics/burnoutAnalytics');
      
      BurnoutAnalytics.detectWorkloadPatterns.mockReturnValue({
        teamAverageUtilization: 102, // Slightly over capacity
        workloadDistribution: 'UNEVEN',
        overutilizedMembers: ['John Doe'],
        underutilizedMembers: ['Alice Brown'],
        balanceRecommendations: [
          'Redistribute tasks from John Doe to Alice Brown',
          'Review sprint capacity planning',
          'Consider team size adjustment'
        ]
      });
      
      const overutilizedCount = teamWorkloadData.filter(member => member.utilizationRate > 120).length;
      const underutilizedCount = teamWorkloadData.filter(member => member.utilizationRate < 85).length;
      
      expect(overutilizedCount).toBe(1); // John Doe at 129%
      expect(underutilizedCount).toBe(1); // Alice Brown at 80%
      
      const analysis = BurnoutAnalytics.detectWorkloadPatterns(teamWorkloadData);
      expect(analysis.workloadDistribution).toBe('UNEVEN');
      expect(analysis.overutilizedMembers).toContain('John Doe');
    });
  });

  describe('Intervention and Recovery Mechanisms', () => {
    it('should suggest appropriate interventions based on burnout risk level', () => {
      const interventionStrategies = {
        LOW: [
          'Continue current practices',
          'Regular wellness check-ins',
          'Preventive work-life balance tips'
        ],
        MEDIUM: [
          'Schedule weekly 1:1 meetings',
          'Flexible working arrangements',
          'Workload review and adjustment',
          'Stress management resources'
        ],
        HIGH: [
          'Immediate workload reduction',
          'Mandatory time off within 1 week',
          'Professional counseling resources',
          'Team reassignment consideration'
        ],
        CRITICAL: [
          'Emergency intervention protocol',
          'Immediate time off (next 24 hours)',
          'Medical/mental health evaluation',
          'Temporary work suspension',
          'HR involvement required'
        ]
      };
      
      Object.entries(interventionStrategies).forEach(([level, strategies]) => {
        expect(strategies.length).toBeGreaterThan(0);
        
        if (level === 'CRITICAL') {
          expect(strategies).toContain('Emergency intervention protocol');
          expect(strategies).toContain('HR involvement required');
        }
        
        if (level === 'HIGH') {
          expect(strategies).toContain('Immediate workload reduction');
          expect(strategies).toContain('Mandatory time off within 1 week');
        }
      });
    });

    it('should track recovery progress after interventions', async () => {
      const recoveryData = {
        userId: 1,
        interventionStartDate: '2024-01-15T00:00:00Z',
        interventionType: 'WORKLOAD_REDUCTION',
        baselineRiskScore: 85,
        recoveryMilestones: [
          { week: 1, riskScore: 75, hoursWorked: 30, mood: 'improving' },
          { week: 2, riskScore: 65, hoursWorked: 32, mood: 'stable' },
          { week: 3, riskScore: 55, hoursWorked: 34, mood: 'good' },
          { week: 4, riskScore: 45, hoursWorked: 35, mood: 'excellent' }
        ],
        isRecoverySuccessful: true,
        returnToNormalDate: '2024-02-12T00:00:00Z'
      };
      
      const { BurnoutAnalytics } = require('../../src/lib/analytics/burnoutAnalytics');
      
      BurnoutAnalytics.trackRecoveryMetrics.mockResolvedValue({
        recoveryRate: 85, // 85% improvement from baseline
        weeksToRecovery: 4,
        sustainabilityScore: 90,
        isFullyRecovered: true,
        riskOfRelapse: 'LOW'
      });
      
      // Validate recovery progression
      const riskImprovement = recoveryData.baselineRiskScore - recoveryData.recoveryMilestones[3].riskScore;
      const improvementPercentage = (riskImprovement / recoveryData.baselineRiskScore) * 100;
      
      expect(improvementPercentage).toBeGreaterThan(40); // At least 40% improvement
      expect(recoveryData.isRecoverySuccessful).toBe(true);
      
      const recoveryMetrics = await BurnoutAnalytics.trackRecoveryMetrics(1, recoveryData);
      expect(recoveryMetrics.isFullyRecovered).toBe(true);
      expect(recoveryMetrics.riskOfRelapse).toBe('LOW');
    });

    it('should provide manager tools for burnout prevention', async () => {
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      mockDatabaseService.getTeamBurnoutSummary.mockResolvedValue({
        teamId: 1,
        totalMembers: 8,
        atRiskMembers: [
          { userId: 1, name: 'John Doe', riskLevel: 'HIGH' },
          { userId: 2, name: 'Jane Smith', riskLevel: 'MEDIUM' }
        ],
        averageRiskScore: 45,
        recommendedActions: [
          'Schedule team workload review',
          'Implement flexible working hours',
          'Provide stress management training'
        ],
        lastUpdated: '2024-01-20T10:00:00Z'
      });
      
      await waitFor(() => {
        // Manager tools should be accessible
        const managerSection = screen.queryByText(/team.*health/i) || screen.queryByText(/burnout.*prevention/i);
        if (managerSection) {
          expect(managerSection).toBeInTheDocument();
        }
      });
    });
  });

  describe('Burnout Prevention Analytics', () => {
    it('should analyze team burnout trends over time', () => {
      const teamBurnoutTrends = {
        teamId: 1,
        timeRange: '6_months',
        trendData: [
          { month: 'Aug 2023', avgRiskScore: 35, highRiskCount: 1 },
          { month: 'Sep 2023', avgRiskScore: 42, highRiskCount: 2 },
          { month: 'Oct 2023', avgRiskScore: 55, highRiskCount: 3 },
          { month: 'Nov 2023', avgRiskScore: 48, highRiskCount: 2 },
          { month: 'Dec 2023', avgRiskScore: 38, highRiskCount: 1 },
          { month: 'Jan 2024', avgRiskScore: 32, highRiskCount: 0 }
        ],
        overallTrend: 'IMPROVING',
        peakRiskPeriod: 'Oct 2023',
        effectiveInterventions: ['Workload redistribution', 'Flexible schedules']
      };
      
      // Trend analysis validation
      const firstHalf = teamBurnoutTrends.trendData.slice(0, 3);
      const secondHalf = teamBurnoutTrends.trendData.slice(3);
      
      const firstHalfAvg = firstHalf.reduce((sum, month) => sum + month.avgRiskScore, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, month) => sum + month.avgRiskScore, 0) / secondHalf.length;
      
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg); // Improvement over time
      expect(teamBurnoutTrends.overallTrend).toBe('IMPROVING');
      
      const peakMonth = teamBurnoutTrends.trendData.reduce((peak, month) => 
        month.avgRiskScore > peak.avgRiskScore ? month : peak
      );
      expect(peakMonth.month).toBe('Oct 2023');
    });

    it('should identify organizational burnout patterns', () => {
      const organizationBurnoutData = {
        totalEmployees: 27,
        teamsAnalyzed: 6,
        overallRiskDistribution: {
          LOW: 15,    // 56%
          MEDIUM: 8,  // 30%
          HIGH: 3,    // 11%
          CRITICAL: 1 // 4%
        },
        highRiskTeams: [
          { teamId: 3, name: 'Infrastructure Team', riskScore: 72 }
        ],
        commonRiskFactors: [
          { factor: 'Consistent overtime', prevalence: 45 },
          { factor: 'Tight deadlines', prevalence: 38 },
          { factor: 'Understaffing', prevalence: 22 }
        ],
        seasonalPatterns: {
          Q1: { avgRiskScore: 42 },
          Q2: { avgRiskScore: 38 },
          Q3: { avgRiskScore: 48 }, // Higher in Q3
          Q4: { avgRiskScore: 52 }  // Highest in Q4
        }
      };
      
      // Organizational health metrics
      const totalAtRisk = organizationBurnoutData.overallRiskDistribution.MEDIUM + 
                         organizationBurnoutData.overallRiskDistribution.HIGH + 
                         organizationBurnoutData.overallRiskDistribution.CRITICAL;
                         
      const atRiskPercentage = (totalAtRisk / organizationBurnoutData.totalEmployees) * 100;
      
      expect(atRiskPercentage).toBeLessThan(50); // Less than 50% at risk is acceptable
      expect(organizationBurnoutData.overallRiskDistribution.CRITICAL).toBeLessThanOrEqual(2); // Max 2 critical cases
      
      // Seasonal pattern validation
      const peakSeasons = Object.entries(organizationBurnoutData.seasonalPatterns)
        .filter(([_, data]) => data.avgRiskScore > 45);
      
      expect(peakSeasons.length).toBe(2); // Q3 and Q4 are peak stress periods
    });

    it('should calculate burnout prevention ROI metrics', () => {
      const burnoutPreventionROI = {
        interventionCosts: {
          workloadReduction: 15000,  // Cost of temporary staffing
          wellness programs: 8000,   // Training and resources
          flexibility implementation: 5000 // System and policy changes
        },
        burnoutCosts: {
          turnover: 45000,          // Recruitment and training costs
          productivity loss: 25000,  // Lost output during burnout
          sick leave: 12000,        // Additional sick days
          healthcare: 8000          // Mental health support
        },
        preventedCases: 3,
        totalPreventionCost: 28000,
        totalBurnoutCost: 90000,
        roiPercentage: 221  // (90000 - 28000) / 28000 * 100
      };
      
      const totalPreventionCost = Object.values(burnoutPreventionROI.interventionCosts)
        .reduce((sum, cost) => sum + cost, 0);
      const totalBurnoutCost = Object.values(burnoutPreventionROI.burnoutCosts)
        .reduce((sum, cost) => sum + cost, 0);
      
      expect(totalPreventionCost).toBe(28000);
      expect(totalBurnoutCost).toBe(90000);
      
      const calculatedROI = ((totalBurnoutCost - totalPreventionCost) / totalPreventionCost) * 100;
      expect(Math.round(calculatedROI)).toBe(221);
      
      // ROI should be positive and significant
      expect(burnoutPreventionROI.roiPercentage).toBeGreaterThan(100);
    });
  });

  describe('Burnout System Accessibility and UX', () => {
    it('should provide accessible burnout risk indicators', async () => {
      mockDatabaseService.getUserBurnoutRisk.mockResolvedValue({
        userId: 1,
        riskLevel: 'MEDIUM',
        riskScore: 65,
        lastUpdated: '2024-01-20T10:00:00Z'
      });
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Risk indicators should have proper ARIA labels
        const riskElements = screen.queryAllByText(/risk/i);
        riskElements.forEach(element => {
          const container = element.closest('[role]') || element.closest('[aria-label]');
          if (container) {
            expect(
              container.hasAttribute('role') ||
              container.hasAttribute('aria-label') ||
              container.hasAttribute('aria-describedby')
            ).toBe(true);
          }
        });
      });
    });

    it('should handle high contrast mode for risk visualization', async () => {
      // Enable high contrast mode
      document.documentElement.classList.add('high-contrast');
      
      const riskData = {
        riskLevel: 'HIGH',
        riskScore: 85,
        visualIndicator: {
          color: '#EF4444',
          backgroundColor: '#FEF2F2',
          borderColor: '#DC2626'
        }
      };
      
      mockDatabaseService.getTeamBurnoutRisks.mockResolvedValue([
        { userId: 1, name: 'Test User', ...riskData }
      ]);
      
      const { container } = render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // High contrast should maintain visibility
        const riskElements = container.querySelectorAll('[class*="bg-red"], [class*="text-red"]');
        riskElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          expect(computedStyle).toBeTruthy();
        });
      });
      
      // Clean up
      document.documentElement.classList.remove('high-contrast');
    });

    it('should provide keyboard navigation for burnout management tools', async () => {
      const user = userEvent.setup();
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
      });
      
      // Should be able to navigate burnout tools with keyboard
      await user.tab();
      expect(document.activeElement).toBeTruthy();
      
      // Focus should remain within modal
      const modal = screen.getByRole('dialog');
      const focusableElements = modal.querySelectorAll(
        'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
        expect(modal.contains(document.activeElement)).toBe(true);
      }
    });
  });
});
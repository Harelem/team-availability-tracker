/**
 * Intelligent Alert System with Automated Insights
 * 
 * Monitors team performance, capacity, and health metrics to generate
 * proactive alerts and actionable insights for management decision-making.
 */

import { Team, TeamMember, CurrentGlobalSprint } from '@/types';
import { dataProcessor, HistoricalDataPoint } from './dataProcessor';
import { predictiveAnalytics, CapacityForecast, BurnoutRiskAssessment } from './predictiveAnalytics';
import { performanceMetrics, TeamPerformanceMetrics } from './performanceMetrics';
import { anomalyDetector, riskAssessment } from './mlModels';

// Alert System Interfaces
export interface Alert {
  id: string;
  timestamp: string;
  type: AlertType;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  affectedEntity: {
    type: 'team' | 'member' | 'company';
    id: number;
    name: string;
  };
  metrics: AlertMetrics;
  recommendations: AlertRecommendation[];
  automatedActions: AutomatedAction[];
  escalationPath: EscalationStep[];
  expirationDate: string;
  status: AlertStatus;
  confidence: number; // 0-1 confidence in the alert
  tags: string[];
  relatedAlerts: string[];
}

export type AlertType = 
  | 'capacity_warning' 
  | 'burnout_risk' 
  | 'performance_decline' 
  | 'anomaly_detected' 
  | 'resource_shortage' 
  | 'delivery_risk'
  | 'team_instability'
  | 'quality_degradation'
  | 'planning_inaccuracy'
  | 'utilization_imbalance';

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type AlertCategory = 'capacity' | 'performance' | 'team_health' | 'delivery' | 'quality' | 'planning';

export type AlertStatus = 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';

export interface AlertMetrics {
  currentValue: number;
  threshold: number;
  historicalAverage: number;
  trend: 'improving' | 'declining' | 'stable';
  deviationPercentage: number;
  impactScore: number; // 0-1 business impact
}

export interface AlertRecommendation {
  priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  action: string;
  rationale: string;
  expectedImpact: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  timeToImplement: string;
  dependencies: string[];
  successCriteria: string[];
  assignedTo?: string;
}

export interface AutomatedAction {
  type: 'notification' | 'escalation' | 'report_generation' | 'resource_adjustment';
  description: string;
  triggeredAt: string;
  status: 'pending' | 'completed' | 'failed';
  parameters: { [key: string]: any };
  result?: string;
}

export interface EscalationStep {
  level: number;
  triggerCondition: string;
  escalateTo: string[];
  timeDelay: number; // Hours before escalation
  notificationMethod: 'email' | 'slack' | 'dashboard' | 'all';
}

export interface AlertConfiguration {
  type: AlertType;
  enabled: boolean;
  thresholds: { [key: string]: number };
  checkFrequency: number; // Minutes between checks
  suppressionRules: SuppressionRule[];
  escalationRules: EscalationRule[];
  automatedResponses: AutomatedResponse[];
}

export interface SuppressionRule {
  condition: string;
  duration: number; // Hours to suppress
  reason: string;
}

export interface EscalationRule {
  condition: string;
  delay: number; // Hours before escalation
  escalateTo: string[];
}

export interface AutomatedResponse {
  condition: string;
  action: string;
  parameters: { [key: string]: any };
}

export interface AlertingContext {
  currentSprint: CurrentGlobalSprint | null;
  recentAlerts: Alert[];
  teamConfigurations: { [teamId: number]: AlertConfiguration[] };
  globalThresholds: { [key: string]: number };
  businessHours: {
    start: string;
    end: string;
    timezone: string;
    workDays: number[];
  };
}

export interface InsightSummary {
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
    description: string;
  };
  keyInsights: KeyInsight[];
  trendAnalysis: TrendInsight[];
  predictiveInsights: PredictiveInsight[];
  actionableRecommendations: ActionableRecommendation[];
  riskAssessment: CompanyRiskAssessment;
  performanceSummary: PerformanceSummary;
  alertSummary: AlertSummaryStats;
}

export interface KeyInsight {
  category: 'capacity' | 'performance' | 'team_health' | 'delivery' | 'quality';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  supportingData: { [key: string]: any };
  timeframe: string;
  affectedTeams: string[];
}

export interface TrendInsight {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  significance: 'high' | 'medium' | 'low';
  timeRange: string;
  forecast: number[];
  implications: string[];
}

export interface PredictiveInsight {
  prediction: string;
  probability: number;
  timeHorizon: string;
  impactArea: string[];
  confidenceLevel: number;
  mitigationOptions: string[];
  earlyWarningSignals: string[];
}

export interface ActionableRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  expectedOutcome: string;
  implementationSteps: string[];
  timeline: string;
  resourceRequirements: string[];
  successMetrics: string[];
  riskFactors: string[];
}

export interface CompanyRiskAssessment {
  overallRisk: number; // 0-1
  riskCategories: {
    delivery: number;
    capacity: number;
    teamHealth: number;
    quality: number;
    performance: number;
  };
  topRisks: {
    description: string;
    probability: number;
    impact: number;
    mitigationStatus: 'none' | 'planned' | 'in_progress' | 'completed';
  }[];
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  nextReviewDate: string;
}

export interface PerformanceSummary {
  companyScore: number;
  teamScores: { teamId: number; teamName: string; score: number }[];
  topPerformers: string[];
  needsAttention: string[];
  improvementAreas: string[];
  successStories: string[];
}

export interface AlertSummaryStats {
  totalAlertsGenerated: number;
  alertsBySeverity: { [severity: string]: number };
  alertsByCategory: { [category: string]: number };
  avgResolutionTime: number;
  falsePositiveRate: number;
  actionTakenRate: number;
  trendComparison: {
    previousPeriod: number;
    changePercent: number;
  };
}

/**
 * Main Intelligent Alert System
 */
export class IntelligentAlertSystem {
  private alerts: Map<string, Alert> = new Map();
  private configurations: AlertConfiguration[] = [];
  private context: AlertingContext;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.context = this.initializeDefaultContext();
    this.initializeDefaultConfigurations();
  }

  /**
   * Main monitoring loop - checks for conditions and generates alerts
   */
  async runMonitoringCycle(): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    try {
      // Get current team data
      const processedTeams = await dataProcessor.processAllTeams();
      
      for (const teamData of processedTeams) {
        // Check each alert type for this team
        for (const config of this.configurations) {
          if (!config.enabled) continue;

          const alerts = await this.checkAlertCondition(config, teamData);
          newAlerts.push(...alerts);
        }
      }

      // Company-wide alerts
      const companyAlerts = await this.checkCompanyWideAlerts(processedTeams);
      newAlerts.push(...companyAlerts);

      // Process and store new alerts
      for (const alert of newAlerts) {
        await this.processNewAlert(alert);
      }

      // Clean up expired alerts
      this.cleanupExpiredAlerts();

      return newAlerts;
    } catch (error) {
      console.error('Error in monitoring cycle:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive insights summary
   */
  async generateInsights(startDate: Date, endDate: Date): Promise<InsightSummary> {
    const cacheKey = `insights_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = this.getCached<InsightSummary>(cacheKey);
    if (cached) return cached;

    try {
      // Gather data for analysis
      const processedTeams = await dataProcessor.processAllTeams();
      const teamPerformances = await Promise.all(
        processedTeams.map(team => performanceMetrics.calculateTeamPerformance(team.teamId.toString()))
      );

      // Generate different types of insights
      const keyInsights = await this.generateKeyInsights(teamPerformances);
      const trendAnalysis = await this.generateTrendInsights(processedTeams);
      const predictiveInsights = await this.generatePredictiveInsights(teamPerformances);
      const actionableRecommendations = this.generateActionableRecommendations(teamPerformances);
      const riskAssessment = this.assessCompanyRisks(teamPerformances);
      const performanceSummary = this.summarizePerformance(teamPerformances);
      const alertSummary = this.generateAlertSummary(startDate, endDate);

      const summary: InsightSummary = {
        generatedAt: new Date().toISOString(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          description: this.describePeriod(startDate, endDate)
        },
        keyInsights,
        trendAnalysis,
        predictiveInsights,
        actionableRecommendations,
        riskAssessment,
        performanceSummary,
        alertSummary
      };

      this.setCached(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  /**
   * Get active alerts with filtering and sorting options
   */
  getActiveAlerts(filters?: {
    severity?: AlertSeverity[];
    category?: AlertCategory[];
    teamId?: number;
    memberId?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values()).filter(alert => alert.status === 'active');

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }
      if (filters.category) {
        alerts = alerts.filter(alert => filters.category!.includes(alert.category));
      }
      if (filters.teamId) {
        alerts = alerts.filter(alert => 
          alert.affectedEntity.type === 'team' && alert.affectedEntity.id === filters.teamId
        );
      }
      if (filters.memberId) {
        alerts = alerts.filter(alert => 
          alert.affectedEntity.type === 'member' && alert.affectedEntity.id === filters.memberId
        );
      }
    }

    // Sort by severity and timestamp
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    // Would log acknowledgment in real implementation
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    // Would log resolution in real implementation
    return true;
  }

  // Private helper methods

  private async checkAlertCondition(config: AlertConfiguration, teamData: any): Promise<Alert[]> {
    const alerts: Alert[] = [];

    switch (config.type) {
      case 'capacity_warning':
        alerts.push(...await this.checkCapacityWarnings(teamData, config));
        break;
      case 'burnout_risk':
        alerts.push(...await this.checkBurnoutRisks(teamData, config));
        break;
      case 'performance_decline':
        alerts.push(...await this.checkPerformanceDecline(teamData, config));
        break;
      case 'anomaly_detected':
        alerts.push(...await this.checkAnomalies(teamData, config));
        break;
      case 'utilization_imbalance':
        alerts.push(...await this.checkUtilizationImbalance(teamData, config));
        break;
      // Add other alert type checks...
    }

    return alerts.filter(alert => !this.isAlertSuppressed(alert, config));
  }

  private async checkCapacityWarnings(teamData: any, config: AlertConfiguration): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const threshold = config.thresholds.utilizationThreshold || 95;

    if (teamData.avgUtilization > threshold) {
      const alert = await this.createAlert({
        type: 'capacity_warning',
        severity: teamData.avgUtilization > 110 ? 'critical' : 'high',
        category: 'capacity',
        title: 'Team Capacity Warning',
        description: `Team ${teamData.teamName} is operating at ${teamData.avgUtilization.toFixed(1)}% utilization`,
        affectedEntity: {
          type: 'team',
          id: teamData.teamId,
          name: teamData.teamName
        },
        metrics: {
          currentValue: teamData.avgUtilization,
          threshold,
          historicalAverage: 85, // Would calculate from historical data
          trend: 'declining',
          deviationPercentage: ((teamData.avgUtilization - threshold) / threshold) * 100,
          impactScore: 0.8
        }
      });

      alerts.push(alert);
    }

    return alerts;
  }

  private async checkBurnoutRisks(teamData: any, config: AlertConfiguration): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Check team-level burnout risk
    if (teamData.historicalData && teamData.historicalData.length > 0) {
      const members = [...new Set(teamData.historicalData.map((d: HistoricalDataPoint) => d.memberId))];
      
      for (const memberId of members) {
        try {
          const burnoutAssessment = await predictiveAnalytics.assessBurnoutRisk(String(memberId));
          
          if (burnoutAssessment.riskScore > 0.7) {
            const alert = await this.createAlert({
              type: 'burnout_risk',
              severity: burnoutAssessment.riskLevel === 'critical' ? 'critical' : 'high',
              category: 'team_health',
              title: 'High Burnout Risk Detected',
              description: `${burnoutAssessment.memberName} shows ${burnoutAssessment.riskLevel} burnout risk`,
              affectedEntity: {
                type: 'member',
                id: Number(memberId),
                name: burnoutAssessment.memberName
              },
              metrics: {
                currentValue: burnoutAssessment.riskScore,
                threshold: 0.7,
                historicalAverage: 0.3,
                trend: 'declining',
                deviationPercentage: 100,
                impactScore: 0.9
              }
            });

            alerts.push(alert);
          }
        } catch (error) {
          // Handle insufficient data gracefully
          if (error instanceof Error && error.message.includes('Insufficient data for burnout risk assessment')) {
            console.warn(`Skipping burnout risk assessment for member ${memberId}: insufficient historical data`);
          } else {
            console.error(`Error checking burnout risk for member ${memberId}:`, error);
          }
        }
      }
    }

    return alerts;
  }

  private async checkPerformanceDecline(teamData: any, config: AlertConfiguration): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    try {
      const performance = await performanceMetrics.calculateTeamPerformance(teamData.teamId.toString());
      
      if (performance.overallScore.composite < 70) {
        const alert = await this.createAlert({
          type: 'performance_decline',
          severity: performance.overallScore.composite < 60 ? 'high' : 'medium',
          category: 'performance',
          title: 'Team Performance Decline',
          description: `Team ${teamData.teamName} performance score dropped to ${performance.overallScore.composite}`,
          affectedEntity: {
            type: 'team',
            id: teamData.teamId,
            name: teamData.teamName
          },
          metrics: {
            currentValue: performance.overallScore.composite,
            threshold: 70,
            historicalAverage: 80,
            trend: 'declining',
            deviationPercentage: 15,
            impactScore: 0.7
          }
        });

        alerts.push(alert);
      }
    } catch (error) {
      console.error(`Error checking performance for team ${teamData.teamId}:`, error);
    }

    return alerts;
  }

  private async checkAnomalies(teamData: any, config: AlertConfiguration): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    if (teamData.historicalData && teamData.historicalData.length > 5) {
      const utilizations = teamData.historicalData.map((d: HistoricalDataPoint) => d.utilization);
      const anomalies = anomalyDetector.detectZScoreAnomalies(utilizations);
      
      const recentAnomalies = anomalies.slice(-3).filter(a => a.isAnomaly && a.severity === 'high');
      
      if (recentAnomalies.length > 0) {
        const alert = await this.createAlert({
          type: 'anomaly_detected',
          severity: 'medium',
          category: 'performance',
          title: 'Performance Anomaly Detected',
          description: `Unusual utilization patterns detected in team ${teamData.teamName}`,
          affectedEntity: {
            type: 'team',
            id: teamData.teamId,
            name: teamData.teamName
          },
          metrics: {
            currentValue: recentAnomalies[0].anomalyScore,
            threshold: 0.7,
            historicalAverage: 0.1,
            trend: 'stable',
            deviationPercentage: 200,
            impactScore: 0.5
          }
        });

        alerts.push(alert);
      }
    }

    return alerts;
  }

  private async checkUtilizationImbalance(teamData: any, config: AlertConfiguration): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    if (teamData.historicalData && teamData.historicalData.length > 0) {
      // Check for utilization imbalance across team members
      const memberUtilizations = new Map<number, number[]>();
      
      teamData.historicalData.forEach((d: HistoricalDataPoint) => {
        if (!memberUtilizations.has(d.memberId)) {
          memberUtilizations.set(d.memberId, []);
        }
        memberUtilizations.get(d.memberId)!.push(d.utilization);
      });

      const avgUtilizations = Array.from(memberUtilizations.entries()).map(([memberId, utilizations]) => {
        const avg = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
        return { memberId, avg };
      });

      if (avgUtilizations.length > 1) {
        const maxUtil = Math.max(...avgUtilizations.map(m => m.avg));
        const minUtil = Math.min(...avgUtilizations.map(m => m.avg));
        const imbalance = maxUtil - minUtil;

        if (imbalance > 30) { // 30% difference is significant
          const alert = await this.createAlert({
            type: 'utilization_imbalance',
            severity: imbalance > 50 ? 'high' : 'medium',
            category: 'capacity',
            title: 'Team Utilization Imbalance',
            description: `Significant utilization imbalance in team ${teamData.teamName} (${imbalance.toFixed(1)}% difference)`,
            affectedEntity: {
              type: 'team',
              id: teamData.teamId,
              name: teamData.teamName
            },
            metrics: {
              currentValue: imbalance,
              threshold: 30,
              historicalAverage: 15,
              trend: 'stable',
              deviationPercentage: 100,
              impactScore: 0.6
            }
          });

          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  private async checkCompanyWideAlerts(teamsData: any[]): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Check overall company utilization
    const totalUtilization = teamsData.reduce((sum, team) => sum + team.avgUtilization, 0) / teamsData.length;
    
    if (totalUtilization > 90) {
      const alert = await this.createAlert({
        type: 'capacity_warning',
        severity: 'high',
        category: 'capacity',
        title: 'Company-Wide Capacity Strain',
        description: `Overall company utilization at ${totalUtilization.toFixed(1)}%`,
        affectedEntity: {
          type: 'company',
          id: 0,
          name: 'Company'
        },
        metrics: {
          currentValue: totalUtilization,
          threshold: 90,
          historicalAverage: 80,
          trend: 'stable',
          deviationPercentage: 12,
          impactScore: 0.9
        }
      });

      alerts.push(alert);
    }

    return alerts;
  }

  private async createAlert(alertData: Partial<Alert>): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      type: alertData.type!,
      severity: alertData.severity!,
      category: alertData.category!,
      title: alertData.title!,
      description: alertData.description!,
      affectedEntity: alertData.affectedEntity!,
      metrics: alertData.metrics!,
      recommendations: this.generateRecommendations(alertData.type!, alertData.metrics!),
      automatedActions: [],
      escalationPath: this.generateEscalationPath(alertData.severity!),
      expirationDate: this.calculateExpirationDate(alertData.type!),
      status: 'active',
      confidence: 0.85, // Default confidence
      tags: this.generateTags(alertData.type!, alertData.category!),
      relatedAlerts: []
    };

    return alert;
  }

  private async processNewAlert(alert: Alert): Promise<void> {
    // Check for duplicate alerts
    const existingAlert = this.findSimilarAlert(alert);
    if (existingAlert) {
      // Update existing alert instead of creating new one
      this.updateExistingAlert(existingAlert, alert);
      return;
    }

    // Store the alert
    this.alerts.set(alert.id, alert);

    // Execute automated actions
    await this.executeAutomatedActions(alert);

    // Update context
    this.context.recentAlerts.push(alert);
    if (this.context.recentAlerts.length > 100) {
      this.context.recentAlerts = this.context.recentAlerts.slice(-100);
    }
  }

  // Additional helper methods for insights generation...
  
  private async generateKeyInsights(teamPerformances: TeamPerformanceMetrics[]): Promise<KeyInsight[]> {
    const insights: KeyInsight[] = [];

    // Identify top performing teams
    const topPerformers = teamPerformances
      .filter(t => t.overallScore.composite > 85)
      .sort((a, b) => b.overallScore.composite - a.overallScore.composite)
      .slice(0, 3);

    if (topPerformers.length > 0) {
      insights.push({
        category: 'performance',
        title: 'High Performing Teams Identified',
        description: `${topPerformers.length} teams are performing exceptionally well with scores above 85`,
        impact: 'medium',
        confidence: 0.9,
        supportingData: {
          teams: topPerformers.map(t => ({ name: t.teamName, score: t.overallScore.composite }))
        },
        timeframe: 'Current month',
        affectedTeams: topPerformers.map(t => t.teamName)
      });
    }

    // Identify capacity risks
    const overUtilizedTeams = teamPerformances.filter(t => 
      t.utilizationMetrics.currentUtilization > 95
    );

    if (overUtilizedTeams.length > 0) {
      insights.push({
        category: 'capacity',
        title: 'Capacity Stress Detected',
        description: `${overUtilizedTeams.length} teams are operating above optimal capacity`,
        impact: 'high',
        confidence: 0.85,
        supportingData: {
          teams: overUtilizedTeams.map(t => ({ 
            name: t.teamName, 
            utilization: t.utilizationMetrics.currentUtilization 
          }))
        },
        timeframe: 'Current sprint',
        affectedTeams: overUtilizedTeams.map(t => t.teamName)
      });
    }

    return insights;
  }

  private async generateTrendInsights(teamsData: any[]): Promise<TrendInsight[]> {
    // Mock trend analysis - in real implementation would analyze historical trends
    return [
      {
        metric: 'Company Utilization',
        direction: 'up',
        magnitude: 0.15,
        significance: 'medium',
        timeRange: 'Last 3 months',
        forecast: [82, 85, 87],
        implications: ['Increased delivery capacity', 'Potential burnout risk if sustained']
      },
      {
        metric: 'Team Velocity',
        direction: 'stable',
        magnitude: 0.05,
        significance: 'low',
        timeRange: 'Last 6 sprints',
        forecast: [42, 43, 42],
        implications: ['Consistent delivery pace', 'Good predictability for planning']
      }
    ];
  }

  private async generatePredictiveInsights(teamPerformances: TeamPerformanceMetrics[]): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    // Predict potential burnout risks
    const highRiskTeams = teamPerformances.filter(t => 
      t.predictiveMetrics.burnoutRisk.teamLevel > 0.6
    );

    if (highRiskTeams.length > 0) {
      insights.push({
        prediction: 'Potential team burnout within next 4-6 weeks',
        probability: 0.75,
        timeHorizon: '4-6 weeks',
        impactArea: ['Team performance', 'Quality', 'Delivery timeline'],
        confidenceLevel: 0.8,
        mitigationOptions: [
          'Reduce sprint capacity by 15-20%',
          'Implement mandatory time off',
          'Redistribute workload across teams'
        ],
        earlyWarningSignals: [
          'Sustained high utilization',
          'Declining velocity consistency',
          'Increased defect rates'
        ]
      });
    }

    return insights;
  }

  // Utility methods
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendations(alertType: AlertType, metrics: AlertMetrics): AlertRecommendation[] {
    // Return type-specific recommendations
    const baseRecommendations: { [key in AlertType]: AlertRecommendation[] } = {
      capacity_warning: [{
        priority: 'immediate',
        action: 'Reduce sprint capacity by 15-20%',
        rationale: 'High utilization leads to burnout and quality issues',
        expectedImpact: 'Improved team sustainability and quality',
        estimatedEffort: 'low',
        timeToImplement: '1 sprint',
        dependencies: ['Stakeholder buy-in'],
        successCriteria: ['Utilization below 95%', 'Maintained velocity']
      }],
      burnout_risk: [{
        priority: 'immediate',
        action: 'Schedule immediate one-on-one with team member',
        rationale: 'Early intervention prevents burnout and turnover',
        expectedImpact: 'Reduced burnout risk and improved retention',
        estimatedEffort: 'low',
        timeToImplement: '1 week',
        dependencies: ['Manager availability'],
        successCriteria: ['Reduced stress indicators', 'Improved work-life balance']
      }],
      // Add other alert type recommendations...
      performance_decline: [],
      anomaly_detected: [],
      resource_shortage: [],
      delivery_risk: [],
      team_instability: [],
      quality_degradation: [],
      planning_inaccuracy: [],
      utilization_imbalance: []
    };

    return baseRecommendations[alertType] || [];
  }

  private generateEscalationPath(severity: AlertSeverity): EscalationStep[] {
    const paths: { [key in AlertSeverity]: EscalationStep[] } = {
      info: [],
      low: [{
        level: 1,
        triggerCondition: '24 hours without acknowledgment',
        escalateTo: ['team_lead'],
        timeDelay: 24,
        notificationMethod: 'email'
      }],
      medium: [{
        level: 1,
        triggerCondition: '4 hours without acknowledgment',
        escalateTo: ['team_lead'],
        timeDelay: 4,
        notificationMethod: 'email'
      }, {
        level: 2,
        triggerCondition: '12 hours without resolution',
        escalateTo: ['department_manager'],
        timeDelay: 12,
        notificationMethod: 'all'
      }],
      high: [{
        level: 1,
        triggerCondition: '1 hour without acknowledgment',
        escalateTo: ['team_lead', 'department_manager'],
        timeDelay: 1,
        notificationMethod: 'all'
      }, {
        level: 2,
        triggerCondition: '4 hours without resolution',
        escalateTo: ['coo', 'vp_engineering'],
        timeDelay: 4,
        notificationMethod: 'all'
      }],
      critical: [{
        level: 1,
        triggerCondition: 'Immediate',
        escalateTo: ['team_lead', 'department_manager', 'coo'],
        timeDelay: 0,
        notificationMethod: 'all'
      }]
    };

    return paths[severity];
  }

  private calculateExpirationDate(alertType: AlertType): string {
    const expirationHours: { [key in AlertType]: number } = {
      capacity_warning: 168, // 1 week
      burnout_risk: 72, // 3 days
      performance_decline: 336, // 2 weeks
      anomaly_detected: 48, // 2 days
      resource_shortage: 168, // 1 week
      delivery_risk: 120, // 5 days
      team_instability: 240, // 10 days
      quality_degradation: 120, // 5 days
      planning_inaccuracy: 72, // 3 days
      utilization_imbalance: 168 // 1 week
    };

    const expiration = new Date();
    expiration.setHours(expiration.getHours() + expirationHours[alertType]);
    return expiration.toISOString();
  }

  private generateTags(alertType: AlertType, category: AlertCategory): string[] {
    return [`type:${alertType}`, `category:${category}`, 'auto-generated'];
  }

  private initializeDefaultContext(): AlertingContext {
    return {
      currentSprint: null,
      recentAlerts: [],
      teamConfigurations: {},
      globalThresholds: {
        utilizationWarning: 90,
        utilizationCritical: 105,
        velocityDecline: 0.15,
        burnoutRisk: 0.7
      },
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'Asia/Jerusalem',
        workDays: [0, 1, 2, 3, 4] // Sunday through Thursday
      }
    };
  }

  private initializeDefaultConfigurations(): void {
    this.configurations = [
      {
        type: 'capacity_warning',
        enabled: true,
        thresholds: { utilizationThreshold: 95 },
        checkFrequency: 60, // Check every hour
        suppressionRules: [],
        escalationRules: [],
        automatedResponses: []
      },
      {
        type: 'burnout_risk',
        enabled: true,
        thresholds: { riskThreshold: 0.7 },
        checkFrequency: 180, // Check every 3 hours
        suppressionRules: [],
        escalationRules: [],
        automatedResponses: []
      },
      // Add other default configurations...
    ];
  }

  // Additional utility methods...
  private isAlertSuppressed(alert: Alert, config: AlertConfiguration): boolean {
    return false; // Simplified - would check suppression rules
  }

  private findSimilarAlert(alert: Alert): Alert | null {
    return null; // Simplified - would find similar existing alerts
  }

  private updateExistingAlert(existing: Alert, newAlert: Alert): void {
    // Update existing alert with new data
    existing.metrics = newAlert.metrics;
    existing.timestamp = newAlert.timestamp;
  }

  private async executeAutomatedActions(alert: Alert): Promise<void> {
    // Execute any automated actions for this alert
  }

  private cleanupExpiredAlerts(): void {
    const now = new Date();
    for (const [id, alert] of this.alerts.entries()) {
      if (new Date(alert.expirationDate) < now) {
        this.alerts.delete(id);
      }
    }
  }

  private generateActionableRecommendations(teamPerformances: TeamPerformanceMetrics[]): ActionableRecommendation[] {
    // Generate company-wide actionable recommendations
    return [];
  }

  private assessCompanyRisks(teamPerformances: TeamPerformanceMetrics[]): CompanyRiskAssessment {
    // Assess overall company risk
    return {
      overallRisk: 0.3,
      riskCategories: {
        delivery: 0.25,
        capacity: 0.4,
        teamHealth: 0.2,
        quality: 0.15,
        performance: 0.3
      },
      topRisks: [],
      riskTrend: 'stable',
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private summarizePerformance(teamPerformances: TeamPerformanceMetrics[]): PerformanceSummary {
    return {
      companyScore: 78,
      teamScores: teamPerformances.map(t => ({
        teamId: t.teamId,
        teamName: t.teamName,
        score: t.overallScore.composite
      })),
      topPerformers: [],
      needsAttention: [],
      improvementAreas: [],
      successStories: []
    };
  }

  private generateAlertSummary(startDate: Date, endDate: Date): AlertSummaryStats {
    return {
      totalAlertsGenerated: 15,
      alertsBySeverity: { critical: 1, high: 3, medium: 7, low: 4 },
      alertsByCategory: { capacity: 5, performance: 4, team_health: 3, quality: 2, delivery: 1 },
      avgResolutionTime: 4.2,
      falsePositiveRate: 0.12,
      actionTakenRate: 0.87,
      trendComparison: {
        previousPeriod: 12,
        changePercent: 25
      }
    };
  }

  private describePeriod(startDate: Date, endDate: Date): string {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays <= 7) return 'Weekly Report';
    if (diffDays <= 31) return 'Monthly Report';
    if (diffDays <= 93) return 'Quarterly Report';
    return 'Long-term Analysis';
  }
}

// Export singleton instance
export const alertSystem = new IntelligentAlertSystem();
/**
 * Database Monitoring and Error Tracking Service
 * 
 * This service provides comprehensive monitoring capabilities for database health,
 * performance metrics, error tracking, and automated alerting to prevent and
 * quickly resolve database-related issues.
 */

import { supabase } from './supabase';
import { performDatabaseHealthCheck, HealthCheckResult } from './databaseHealthCheck';

export interface DatabaseMetrics {
  timestamp: string;
  connectivity: boolean;
  responseTime: number;
  queryPerformance: {
    [functionName: string]: number;
  };
  errorCount: number;
  warningCount: number;
  healthScore: number; // 0-100 score based on overall health
}

export interface DatabaseError {
  id: string;
  timestamp: string;
  type: 'critical' | 'warning' | 'info';
  category: 'connectivity' | 'function_missing' | 'performance' | 'schema' | 'permission';
  message: string;
  details?: any;
  resolved: boolean;
  resolvedAt?: string;
  context?: {
    url?: string;
    userId?: string;
    feature?: string;
    stackTrace?: string;
  };
}

export interface MonitoringAlert {
  id: string;
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendations: string[];
  affectedFeatures: string[];
  estimatedImpact: 'critical' | 'high' | 'medium' | 'low';
}

export class DatabaseMonitoringService {
  private static instance: DatabaseMonitoringService;
  private metrics: DatabaseMetrics[] = [];
  private errors: DatabaseError[] = [];
  private alerts: MonitoringAlert[] = [];
  private maxMetricsHistory = 100;
  private maxErrorHistory = 50;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): DatabaseMonitoringService {
    if (!DatabaseMonitoringService.instance) {
      DatabaseMonitoringService.instance = new DatabaseMonitoringService();
    }
    return DatabaseMonitoringService.instance;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('Database monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting database monitoring service...');

    // Immediate first check
    this.performMonitoringCheck();

    // Set up periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('⏹️ Database monitoring service stopped');
  }

  /**
   * Perform a monitoring check and update metrics
   */
  private async performMonitoringCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const healthResult = await performDatabaseHealthCheck();
      const endTime = Date.now();

      // Create metrics record
      const metrics: DatabaseMetrics = {
        timestamp: new Date().toISOString(),
        connectivity: healthResult.details.connectivity,
        responseTime: endTime - startTime,
        queryPerformance: healthResult.details.performanceMetrics,
        errorCount: healthResult.errors.length,
        warningCount: healthResult.warnings.length,
        healthScore: this.calculateHealthScore(healthResult)
      };

      this.addMetrics(metrics);

      // Process errors and warnings
      this.processHealthCheckResults(healthResult);

      // Check for alert conditions
      this.evaluateAlertConditions(healthResult, metrics);

      // Log monitoring status
      if (metrics.healthScore < 70) {
        console.warn(`⚠️ Database health score: ${metrics.healthScore}/100`);
      }

    } catch (error) {
      console.error('Error during monitoring check:', error);
      this.recordError({
        type: 'warning',
        category: 'connectivity',
        message: `Monitoring check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  }

  /**
   * Calculate overall health score from health check results
   */
  private calculateHealthScore(healthResult: HealthCheckResult): number {
    let score = 100;

    // Deduct points for errors
    score -= healthResult.errors.length * 20;

    // Deduct points for warnings
    score -= healthResult.warnings.length * 5;

    // Deduct points for poor connectivity
    if (!healthResult.details.connectivity) {
      score -= 30;
    }

    // Deduct points for poor performance
    const avgPerformance = Object.values(healthResult.details.performanceMetrics).reduce((a, b) => a + b, 0) / 
                          Math.max(1, Object.keys(healthResult.details.performanceMetrics).length);
    
    if (avgPerformance > 2000) {
      score -= 15;
    } else if (avgPerformance > 1000) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Process health check results and create error records
   */
  private processHealthCheckResults(healthResult: HealthCheckResult): void {
    // Process errors
    healthResult.errors.forEach(error => {
      this.recordError({
        type: 'critical',
        category: this.categorizeError(error),
        message: error,
        context: {
          feature: 'health_check'
        }
      });
    });

    // Process warnings
    healthResult.warnings.forEach(warning => {
      this.recordError({
        type: 'warning',
        category: this.categorizeError(warning),
        message: warning,
        context: {
          feature: 'health_check'
        }
      });
    });
  }

  /**
   * Categorize error messages
   */
  private categorizeError(message: string): DatabaseError['category'] {
    if (message.includes('could not find function')) return 'function_missing';
    if (message.includes('connectivity') || message.includes('connection')) return 'connectivity';
    if (message.includes('performance') || message.includes('slow')) return 'performance';
    if (message.includes('column') || message.includes('table') || message.includes('schema')) return 'schema';
    if (message.includes('permission') || message.includes('policy') || message.includes('RLS')) return 'permission';
    return 'connectivity';
  }

  /**
   * Evaluate conditions that should trigger alerts
   */
  private evaluateAlertConditions(healthResult: HealthCheckResult, metrics: DatabaseMetrics): void {
    // Critical function missing alert
    if (healthResult.errors.some(error => error.includes('get_daily_company_status_data'))) {
      this.createAlert({
        severity: 'high',
        title: 'Critical Database Function Missing',
        description: 'The get_daily_company_status_data function is missing, causing COO Dashboard failures.',
        recommendations: [
          'Apply SQL migration: sql/enhance-daily-company-status.sql',
          'Verify database connectivity',
          'Run validation script: npm run db:validate'
        ],
        affectedFeatures: ['COO Dashboard', 'Daily Status Reports'],
        estimatedImpact: 'critical'
      });
    }

    // Performance degradation alert
    const avgPerformance = Object.values(metrics.queryPerformance).reduce((a, b) => a + b, 0) / 
                          Math.max(1, Object.keys(metrics.queryPerformance).length);
    
    if (avgPerformance > 3000) {
      this.createAlert({
        severity: 'medium',
        title: 'Database Performance Degradation',
        description: `Average query performance is ${avgPerformance}ms, which may impact user experience.`,
        recommendations: [
          'Check database indexes',
          'Review query optimization',
          'Monitor database load',
          'Consider scaling resources'
        ],
        affectedFeatures: ['All Dashboard Features'],
        estimatedImpact: 'medium'
      });
    }

    // Health score dropping alert
    if (metrics.healthScore < 50) {
      this.createAlert({
        severity: 'high',
        title: 'Database Health Score Critical',
        description: `Overall database health score is ${metrics.healthScore}/100, indicating serious issues.`,
        recommendations: [
          'Run comprehensive database verification',
          'Check all error logs',
          'Apply pending migrations',
          'Contact database administrator'
        ],
        affectedFeatures: ['Entire Application'],
        estimatedImpact: 'critical'
      });
    }
  }

  /**
   * Record a database error
   */
  recordError(errorData: Omit<DatabaseError, 'id' | 'timestamp' | 'resolved'>): void {
    const error: DatabaseError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...errorData
    };

    this.errors.unshift(error);

    // Limit error history
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(0, this.maxErrorHistory);
    }

    // Log error based on type
    if (error.type === 'critical') {
      console.error(`🚨 Critical Database Error: ${error.message}`);
    } else if (error.type === 'warning') {
      console.warn(`⚠️ Database Warning: ${error.message}`);
    } else {
      console.info(`ℹ️ Database Info: ${error.message}`);
    }
  }

  /**
   * Create a monitoring alert
   */
  private createAlert(alertData: Omit<MonitoringAlert, 'id' | 'timestamp'>): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(alert => 
      alert.title === alertData.title && 
      alert.severity === alertData.severity
    );

    if (existingAlert) {
      console.log(`Alert already exists: ${alertData.title}`);
      return;
    }

    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...alertData
    };

    this.alerts.unshift(alert);

    // Log alert
    console.warn(`🚨 Database Alert [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.warn(`   ${alert.description}`);
    console.warn(`   Recommended actions: ${alert.recommendations.join(', ')}`);
  }

  /**
   * Add metrics to history
   */
  private addMetrics(metrics: DatabaseMetrics): void {
    this.metrics.unshift(metrics);

    // Limit metrics history
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(0, this.maxMetricsHistory);
    }
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    isActive: boolean;
    lastCheck?: string;
    currentHealthScore?: number;
    activeAlerts: number;
    totalErrors: number;
    totalWarnings: number;
  } {
    const latestMetrics = this.metrics[0];
    
    return {
      isActive: this.isMonitoring,
      lastCheck: latestMetrics?.timestamp,
      currentHealthScore: latestMetrics?.healthScore,
      activeAlerts: this.alerts.length,
      totalErrors: this.errors.filter(e => e.type === 'critical' && !e.resolved).length,
      totalWarnings: this.errors.filter(e => e.type === 'warning' && !e.resolved).length
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): DatabaseMetrics[] {
    return limit ? this.metrics.slice(0, limit) : this.metrics;
  }

  /**
   * Get error history
   */
  getErrorHistory(limit?: number): DatabaseError[] {
    return limit ? this.errors.slice(0, limit) : this.errors;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): MonitoringAlert[] {
    return this.alerts;
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error && !error.resolved) {
      error.resolved = true;
      error.resolvedAt = new Date().toISOString();
      console.log(`✅ Resolved database error: ${error.message}`);
      return true;
    }
    return false;
  }

  /**
   * Clear an alert
   */
  clearAlert(alertId: string): boolean {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex >= 0) {
      const alert = this.alerts[alertIndex];
      this.alerts.splice(alertIndex, 1);
      console.log(`✅ Cleared database alert: ${alert.title}`);
      return true;
    }
    return false;
  }

  /**
   * Generate monitoring report
   */
  generateReport(): {
    summary: object;
    metrics: DatabaseMetrics[];
    errors: DatabaseError[];
    alerts: MonitoringAlert[];
    recommendations: string[];
  } {
    const status = this.getMonitoringStatus();
    const recentMetrics = this.getMetricsHistory(10);
    const recentErrors = this.getErrorHistory(20);
    
    // Generate recommendations based on patterns
    const recommendations: string[] = [];
    
    if (status.totalErrors > 0) {
      recommendations.push('Address critical database errors immediately');
    }
    
    if (status.currentHealthScore && status.currentHealthScore < 80) {
      recommendations.push('Investigate factors reducing database health score');
    }
    
    if (recentErrors.some(e => e.category === 'function_missing')) {
      recommendations.push('Apply missing SQL migrations');
    }
    
    if (recentErrors.some(e => e.category === 'performance')) {
      recommendations.push('Optimize database queries and consider indexing');
    }

    return {
      summary: {
        generatedAt: new Date().toISOString(),
        monitoringStatus: status,
        healthTrend: this.calculateHealthTrend(recentMetrics),
        criticalIssues: recentErrors.filter(e => e.type === 'critical' && !e.resolved).length
      },
      metrics: recentMetrics,
      errors: recentErrors,
      alerts: this.alerts,
      recommendations
    };
  }

  /**
   * Calculate health trend from recent metrics
   */
  private calculateHealthTrend(metrics: DatabaseMetrics[]): 'improving' | 'stable' | 'degrading' | 'insufficient_data' {
    if (metrics.length < 3) {
      return 'insufficient_data';
    }

    const recent = metrics.slice(0, 3);
    const older = metrics.slice(3, 6);

    if (older.length < 2) {
      return 'insufficient_data';
    }

    const recentAvg = recent.reduce((sum, m) => sum + m.healthScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.healthScore, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'degrading';
    return 'stable';
  }

  /**
   * Export monitoring data for external analysis
   */
  exportData(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      monitoring: this.getMonitoringStatus(),
      metrics: this.metrics,
      errors: this.errors,
      alerts: this.alerts
    }, null, 2);
  }
}
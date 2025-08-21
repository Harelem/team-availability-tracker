/**
 * Performance & Security Monitoring Dashboard
 * 
 * Real-time monitoring and reporting dashboard for system performance,
 * security metrics, and audit results.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { performanceMonitor } from '@/utils/performanceMonitoring';

// Performance & Security Metrics Interfaces
interface SecurityMetrics {
  authenticationAttempts: {
    successful: number;
    failed: number;
    blocked: number;
  };
  permissionChecks: {
    granted: number;
    denied: number;
    violations: number;
  };
  dataAccess: {
    authorizedRequests: number;
    unauthorizedAttempts: number;
    rlsPolicyEnforcements: number;
  };
  inputValidation: {
    cleanInputs: number;
    sanitizedInputs: number;
    blockedInputs: number;
  };
  securityScore: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  lastIncident?: {
    type: string;
    timestamp: string;
    severity: string;
    details: string;
  };
}

interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerMinute: number;
    concurrent: number;
    peak: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    dbConnections: number;
  };
  webVitals: {
    LCP: number;
    FID: number;
    CLS: number;
    TTFB: number;
  };
  performanceScore: number;
  healthStatus: 'excellent' | 'good' | 'degraded' | 'critical';
}

interface AuditResult {
  id: string;
  testSuite: string;
  timestamp: string;
  status: 'passed' | 'failed' | 'warning';
  score: number;
  details: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  categories: {
    [key: string]: {
      score: number;
      status: 'passed' | 'failed' | 'warning';
      issues: string[];
    };
  };
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    database: 'healthy' | 'degraded' | 'critical';
    authentication: 'healthy' | 'degraded' | 'critical';
    api: 'healthy' | 'degraded' | 'critical';
    frontend: 'healthy' | 'degraded' | 'critical';
  };
  uptime: string;
  lastChecked: string;
}

// Mock data generators for demonstration
const generateSecurityMetrics = (): SecurityMetrics => {
  const baseTime = Date.now();
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  const successfulAuth = random(450, 500);
  const failedAuth = random(5, 15);
  const blockedAuth = random(0, 3);
  
  const grantedPermissions = random(800, 900);
  const deniedPermissions = random(10, 25);
  const violations = random(0, 2);
  
  const score = Math.max(0, 100 - (failedAuth * 2) - (violations * 20) - (blockedAuth * 5));
  
  return {
    authenticationAttempts: {
      successful: successfulAuth,
      failed: failedAuth,
      blocked: blockedAuth
    },
    permissionChecks: {
      granted: grantedPermissions,
      denied: deniedPermissions,
      violations
    },
    dataAccess: {
      authorizedRequests: random(1500, 1800),
      unauthorizedAttempts: random(2, 8),
      rlsPolicyEnforcements: random(200, 250)
    },
    inputValidation: {
      cleanInputs: random(1200, 1400),
      sanitizedInputs: random(50, 100),
      blockedInputs: random(5, 15)
    },
    securityScore: score,
    threatLevel: score > 90 ? 'low' : score > 75 ? 'medium' : score > 60 ? 'high' : 'critical',
    lastIncident: violations > 0 ? {
      type: 'Permission Violation',
      timestamp: new Date(baseTime - random(30000, 300000)).toISOString(),
      severity: 'medium',
      details: 'Unauthorized access attempt to COO dashboard'
    } : undefined
  };
};

const generatePerformanceMetrics = (): PerformanceMetrics => {
  const random = (min: number, max: number) => Math.random() * (max - min) + min;
  
  const avgResponse = random(150, 300);
  const score = Math.max(0, 100 - ((avgResponse - 100) / 10));
  
  return {
    responseTime: {
      average: avgResponse,
      p95: avgResponse * 1.8,
      p99: avgResponse * 2.5
    },
    throughput: {
      requestsPerMinute: Math.floor(random(800, 1200)),
      concurrent: Math.floor(random(45, 65)),
      peak: Math.floor(random(80, 120))
    },
    resources: {
      memoryUsage: random(60, 85),
      cpuUsage: random(25, 45),
      dbConnections: Math.floor(random(15, 30))
    },
    webVitals: {
      LCP: random(1200, 2000),
      FID: random(50, 150),
      CLS: random(0.05, 0.15),
      TTFB: random(200, 400)
    },
    performanceScore: score,
    healthStatus: score > 90 ? 'excellent' : score > 75 ? 'good' : score > 60 ? 'degraded' : 'critical'
  };
};

const generateAuditResults = (): AuditResult[] => {
  const suites = [
    'Load Testing',
    'Security Testing', 
    'Performance Testing',
    'Accessibility Testing',
    'Integration Testing'
  ];
  
  return suites.map((suite, index) => {
    const passed = Math.floor(Math.random() * 20) + 80;
    const failed = Math.floor(Math.random() * 5);
    const warnings = Math.floor(Math.random() * 10);
    const total = passed + failed + warnings;
    const score = Math.round((passed / total) * 100);
    
    return {
      id: `audit-${index}`,
      testSuite: suite,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      status: score > 95 ? 'passed' : score > 80 ? 'warning' : 'failed',
      score,
      details: { passed, failed, warnings, total },
      categories: {
        'Authentication': {
          score: Math.floor(Math.random() * 20) + 80,
          status: 'passed',
          issues: []
        },
        'Data Protection': {
          score: Math.floor(Math.random() * 15) + 85,
          status: 'passed', 
          issues: []
        },
        'Performance': {
          score: Math.floor(Math.random() * 25) + 75,
          status: score > 90 ? 'passed' : 'warning',
          issues: score < 90 ? ['Response time above threshold'] : []
        }
      }
    };
  });
};

const generateSystemHealth = (): SystemHealth => {
  const components = {
    database: Math.random() > 0.95 ? 'degraded' : 'healthy',
    authentication: Math.random() > 0.98 ? 'degraded' : 'healthy',
    api: Math.random() > 0.97 ? 'degraded' : 'healthy',
    frontend: Math.random() > 0.99 ? 'degraded' : 'healthy'
  };
  
  const hasIssues = Object.values(components).some(status => status !== 'healthy');
  
  return {
    overall: hasIssues ? 'degraded' : 'healthy',
    components: components as SystemHealth['components'],
    uptime: '99.8%',
    lastChecked: new Date().toISOString()
  };
};

// Status indicator components
const StatusBadge: React.FC<{ 
  status: 'excellent' | 'good' | 'degraded' | 'critical' | 'healthy' | 'passed' | 'failed' | 'warning' | 'low' | 'medium' | 'high';
  children: React.ReactNode;
}> = ({ status, children }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'healthy':
      case 'passed':
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
      case 'warning':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'degraded':
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Badge className={`${getStatusColor(status)} border`}>
      {children}
    </Badge>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'excellent' | 'good' | 'degraded' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, subtitle, status, trend }) => {
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end">
          {status && <StatusBadge status={status}>{status}</StatusBadge>}
          {trend && (
            <span className="text-lg mt-1">{getTrendIcon(trend)}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

// Main Dashboard Component
export const PerformanceSecurityDashboard: React.FC = () => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshData = useCallback(() => {
    setSecurityMetrics(generateSecurityMetrics());
    setPerformanceMetrics(generatePerformanceMetrics());
    setAuditResults(generateAuditResults());
    setSystemHealth(generateSystemHealth());
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const runLoadTest = async () => {
    // This would trigger the load testing suite
    console.log('Starting load test...');
    // In real implementation, this would call the actual test suite
  };

  const runSecurityScan = async () => {
    // This would trigger the security testing suite
    console.log('Starting security scan...');
    // In real implementation, this would call the actual security tests
  };

  if (!securityMetrics || !performanceMetrics || !systemHealth) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance & Security Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of system performance and security metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated}
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded text-sm ${
              autoRefresh 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">System Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center">
            <StatusBadge status={systemHealth.overall}>{systemHealth.overall}</StatusBadge>
            <p className="text-sm text-gray-600 mt-2">Overall Status</p>
          </div>
          {Object.entries(systemHealth.components).map(([component, status]) => (
            <div key={component} className="text-center">
              <StatusBadge status={status}>{status}</StatusBadge>
              <p className="text-sm text-gray-600 mt-2 capitalize">{component}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Uptime: {systemHealth.uptime} | Last checked: {new Date(systemHealth.lastChecked).toLocaleTimeString()}
        </div>
      </Card>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Average Response Time"
            value={`${performanceMetrics.responseTime.average.toFixed(0)}ms`}
            status={performanceMetrics.healthStatus}
            trend="stable"
          />
          <MetricCard
            title="Requests/Minute"
            value={performanceMetrics.throughput.requestsPerMinute}
            subtitle={`Peak: ${performanceMetrics.throughput.peak}`}
            trend="up"
          />
          <MetricCard
            title="Memory Usage"
            value={`${performanceMetrics.resources.memoryUsage.toFixed(1)}%`}
            status={performanceMetrics.resources.memoryUsage > 80 ? 'degraded' : 'good'}
            trend="stable"
          />
          <MetricCard
            title="Performance Score"
            value={`${performanceMetrics.performanceScore.toFixed(0)}/100`}
            status={performanceMetrics.healthStatus}
            trend="up"
          />
        </div>

        {/* Web Vitals */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-3">Core Web Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceMetrics.webVitals.LCP.toFixed(0)}ms</div>
              <div className="text-sm text-gray-600">LCP</div>
              <StatusBadge status={performanceMetrics.webVitals.LCP < 2500 ? 'excellent' : 'degraded'}>
                {performanceMetrics.webVitals.LCP < 2500 ? 'Good' : 'Needs Work'}
              </StatusBadge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceMetrics.webVitals.FID.toFixed(0)}ms</div>
              <div className="text-sm text-gray-600">FID</div>
              <StatusBadge status={performanceMetrics.webVitals.FID < 100 ? 'excellent' : 'degraded'}>
                {performanceMetrics.webVitals.FID < 100 ? 'Good' : 'Needs Work'}
              </StatusBadge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceMetrics.webVitals.CLS.toFixed(3)}</div>
              <div className="text-sm text-gray-600">CLS</div>
              <StatusBadge status={performanceMetrics.webVitals.CLS < 0.1 ? 'excellent' : 'degraded'}>
                {performanceMetrics.webVitals.CLS < 0.1 ? 'Good' : 'Needs Work'}
              </StatusBadge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceMetrics.webVitals.TTFB.toFixed(0)}ms</div>
              <div className="text-sm text-gray-600">TTFB</div>
              <StatusBadge status={performanceMetrics.webVitals.TTFB < 600 ? 'excellent' : 'degraded'}>
                {performanceMetrics.webVitals.TTFB < 600 ? 'Good' : 'Needs Work'}
              </StatusBadge>
            </div>
          </div>
        </Card>
      </div>

      {/* Security Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Security Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Security Score"
            value={`${securityMetrics.securityScore}/100`}
            status={securityMetrics.threatLevel === 'low' ? 'excellent' : 
                   securityMetrics.threatLevel === 'medium' ? 'good' : 'critical'}
            trend="stable"
          />
          <MetricCard
            title="Authentication Success"
            value={`${((securityMetrics.authenticationAttempts.successful / 
              (securityMetrics.authenticationAttempts.successful + securityMetrics.authenticationAttempts.failed)) * 100).toFixed(1)}%`}
            subtitle={`${securityMetrics.authenticationAttempts.failed} failed attempts`}
            status="good"
          />
          <MetricCard
            title="Permission Violations"
            value={securityMetrics.permissionChecks.violations}
            subtitle="Last 24 hours"
            status={securityMetrics.permissionChecks.violations === 0 ? 'excellent' : 'degraded'}
          />
          <MetricCard
            title="Threat Level"
            value={securityMetrics.threatLevel.toUpperCase()}
            status={securityMetrics.threatLevel as any}
          />
        </div>

        {/* Security Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-3">Authentication Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Successful logins:</span>
                <span className="font-medium text-green-600">
                  {securityMetrics.authenticationAttempts.successful}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Failed attempts:</span>
                <span className="font-medium text-red-600">
                  {securityMetrics.authenticationAttempts.failed}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Blocked attempts:</span>
                <span className="font-medium text-orange-600">
                  {securityMetrics.authenticationAttempts.blocked}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-medium mb-3">Data Access Control</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Authorized requests:</span>
                <span className="font-medium text-green-600">
                  {securityMetrics.dataAccess.authorizedRequests}
                </span>
              </div>
              <div className="flex justify-between">
                <span>RLS enforcements:</span>
                <span className="font-medium text-blue-600">
                  {securityMetrics.dataAccess.rlsPolicyEnforcements}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Unauthorized attempts:</span>
                <span className="font-medium text-red-600">
                  {securityMetrics.dataAccess.unauthorizedAttempts}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Last Security Incident */}
        {securityMetrics.lastIncident && (
          <Card className="p-4 border-orange-200 bg-orange-50">
            <h3 className="text-lg font-medium mb-2 text-orange-800">Recent Security Incident</h3>
            <div className="text-sm space-y-1">
              <div><strong>Type:</strong> {securityMetrics.lastIncident.type}</div>
              <div><strong>Time:</strong> {new Date(securityMetrics.lastIncident.timestamp).toLocaleString()}</div>
              <div><strong>Severity:</strong> 
                <StatusBadge status={securityMetrics.lastIncident.severity as any}>
                  {securityMetrics.lastIncident.severity}
                </StatusBadge>
              </div>
              <div><strong>Details:</strong> {securityMetrics.lastIncident.details}</div>
            </div>
          </Card>
        )}
      </div>

      {/* Audit Results */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Audit Results</h2>
          <div className="space-x-2">
            <button
              onClick={runLoadTest}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Run Load Test
            </button>
            <button
              onClick={runSecurityScan}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              Security Scan
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auditResults.map((audit) => (
            <Card key={audit.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium">{audit.testSuite}</h3>
                <StatusBadge status={audit.status}>{audit.status}</StatusBadge>
              </div>
              
              <div className="text-2xl font-bold mb-2">{audit.score}%</div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div>✅ Passed: {audit.details.passed}</div>
                <div>⚠️ Warnings: {audit.details.warnings}</div>
                <div>❌ Failed: {audit.details.failed}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(audit.timestamp).toLocaleString()}
                </div>
              </div>
              
              {Object.entries(audit.categories).map(([category, details]) => (
                details.issues.length > 0 && (
                  <div key={category} className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                    <div className="font-medium text-yellow-800">{category} Issues:</div>
                    {details.issues.map((issue, idx) => (
                      <div key={idx} className="text-yellow-700">• {issue}</div>
                    ))}
                  </div>
                )
              ))}
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border rounded hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">View Full Report</div>
          </button>
          <button className="p-4 border rounded hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-sm font-medium">Performance Test</div>
          </button>
          <button className="p-4 border rounded hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">🔒</div>
            <div className="text-sm font-medium">Security Audit</div>
          </button>
          <button className="p-4 border rounded hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Export Results</div>
          </button>
        </div>
      </Card>
    </div>
  );
};
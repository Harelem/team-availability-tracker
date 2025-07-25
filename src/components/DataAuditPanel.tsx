'use client';

import { useState } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Database,
  Users,
  Calendar,
  Calculator,
  Settings,
  Shield
} from 'lucide-react';
import { DataAuditService } from '@/utils/dataAudit';
import { AuditResult, AuditCheck, AuditConfig } from '@/types/audit';
import { Team } from '@/types';

interface DataAuditPanelProps {
  userRole: 'team' | 'coo';
  currentTeam?: Team | null;
  allTeams?: Team[];
  className?: string;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export default function DataAuditPanel({ 
  userRole, 
  currentTeam, 
  allTeams = [],
  className = '' 
}: DataAuditPanelProps) {
  const [auditResults, setAuditResults] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  const performDataAudit = async () => {
    setIsAuditing(true);
    console.log('🔍 Starting comprehensive data audit...');
    
    try {
      const config: AuditConfig = {
        includeDatabaseConsistency: true,
        includeTeamIntegrity: true,
        includeScheduleValidation: true,
        includeHoursCalculation: true,
        includeSprintData: true,
        includePermissions: true,
        teamIds: userRole === 'coo' ? undefined : currentTeam ? [currentTeam.id] : undefined
      };

      const teamScope = userRole === 'coo' ? 'All Teams' : currentTeam?.name || 'No Team';
      
      const results = await DataAuditService.performComprehensiveAudit(
        userRole,
        teamScope,
        config
      );
      
      setAuditResults(results);
      
      // Log summary
      console.log(`✅ Data Audit Complete: ${results.summary.passedChecks}/${results.summary.totalChecks} checks passed`);
      
    } catch (error) {
      console.error('❌ Data audit failed:', error);
      setAuditResults({
        timestamp: new Date().toISOString(),
        userRole,
        teamScope: userRole === 'coo' ? 'All Teams' : currentTeam?.name || 'No Team',
        checks: [],
        summary: {
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0,
          warningChecks: 0,
          errorChecks: 1,
          overallStatus: 'ERROR'
        },
        error: error instanceof Error ? error.message : 'Unknown audit error'
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const toggleCheckExpansion = (category: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedChecks(newExpanded);
  };

  const getStatusIcon = (status: AuditCheck['status']) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Database Consistency':
        return <Database className="w-4 h-4" />;
      case 'Team Data Integrity':
        return <Users className="w-4 h-4" />;
      case 'Schedule Data Validation':
        return <Calendar className="w-4 h-4" />;
      case 'Hours Calculation Verification':
        return <Calculator className="w-4 h-4" />;
      case 'Sprint Data Consistency':
        return <Settings className="w-4 h-4" />;
      case 'User Permissions':
        return <Shield className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AuditCheck['status']) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-50 border-green-200';
      case 'FAIL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'ERROR':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`data-audit-panel bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Audit Panel</h3>
            <p className="text-sm text-gray-600">
              Verify data accuracy and integrity
              {userRole === 'team' && currentTeam && ` for ${currentTeam.name}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetailedView(!showDetailedView)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            {showDetailedView ? '📊 Summary' : '🔬 Detailed'}
          </button>
          <button
            onClick={performDataAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Run Audit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audit Results */}
      {auditResults && (
        <div className="p-4">
          {/* Error Display */}
          {auditResults.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Audit Error</span>
              </div>
              <p className="text-red-700 mt-1">{auditResults.error}</p>
            </div>
          )}

          {/* Summary Stats */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-900">Audit Summary</h4>
              <div className="text-sm text-gray-500">
                {new Date(auditResults.timestamp).toLocaleString()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {auditResults.summary.totalChecks}
                </div>
                <div className="text-sm text-gray-600">Total Checks</div>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {auditResults.summary.passedChecks}
                </div>
                <div className="text-sm text-green-700">Passed</div>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {auditResults.summary.failedChecks}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {auditResults.summary.warningChecks}
                </div>
                <div className="text-sm text-yellow-700">Warnings</div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((auditResults.summary.passedChecks / Math.max(auditResults.summary.totalChecks, 1)) * 100)}%
                </div>
                <div className="text-sm text-blue-700">Success Rate</div>
              </div>
            </div>

            {/* Overall Status */}
            <div className={`mt-4 p-3 rounded-lg border ${getStatusColor(auditResults.summary.overallStatus)}`}>
              <div className="flex items-center gap-2">
                {getStatusIcon(auditResults.summary.overallStatus)}
                <span className="font-medium">
                  Overall Status: {auditResults.summary.overallStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Check Results */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Audit Details</h4>
            
            {auditResults.checks.map((check, index) => (
              <div
                key={index}
                className={`border rounded-lg ${getStatusColor(check.status)}`}
              >
                <button
                  onClick={() => toggleCheckExpansion(check.category)}
                  className="w-full p-4 text-left hover:bg-black hover:bg-opacity-5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(check.category)}
                      <div>
                        <div className="font-medium text-gray-900">{check.category}</div>
                        <div className="text-sm text-gray-600">
                          {check.passed}/{check.total} checks passed
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      {expandedChecks.has(check.category) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedChecks.has(check.category) && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-white bg-opacity-50">
                    {check.issues.length > 0 && (
                      <div className="mt-3">
                        <h5 className="font-medium text-gray-900 mb-2">Issues Found:</h5>
                        <ul className="space-y-1">
                          {check.issues.map((issue, issueIndex) => (
                            <li key={issueIndex} className="text-sm text-red-700 flex items-start gap-2">
                              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {showDetailedView && check.details && (
                      <div className="mt-3">
                        <h5 className="font-medium text-gray-900 mb-2">Details:</h5>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(check.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {auditResults.checks.some(c => c.issues.length > 0) && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Recommendations</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Review failed checks and address data inconsistencies</li>
                <li>• Run audit regularly to maintain data quality</li>
                <li>• Contact system administrator for database-level issues</li>
                <li>• Verify team member assignments and permissions</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No Results State */}
      {!auditResults && !isAuditing && (
        <div className="p-8 text-center text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Click &quot;Run Audit&quot; to verify data accuracy and integrity</p>
        </div>
      )}
    </div>
  );
}
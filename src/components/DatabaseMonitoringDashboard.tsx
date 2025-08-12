'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseMonitoringService, DatabaseMetrics, DatabaseError, MonitoringAlert } from '@/lib/databaseMonitoringService';
import { Modal } from './ui/Modal';

const monitoringService = DatabaseMonitoringService.getInstance();

export default function DatabaseMonitoringDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(monitoringService.getMonitoringStatus());
  const [metrics, setMetrics] = useState<DatabaseMetrics[]>([]);
  const [errors, setErrors] = useState<DatabaseError[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'metrics' | 'errors' | 'alerts'>('overview');

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const interval = setInterval(refreshData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const refreshData = () => {
    setStatus(monitoringService.getMonitoringStatus());
    setMetrics(monitoringService.getMetricsHistory(20));
    setErrors(monitoringService.getErrorHistory(30));
    setAlerts(monitoringService.getActiveAlerts());
  };

  const handleResolveError = (errorId: string) => {
    monitoringService.resolveError(errorId);
    refreshData();
  };

  const handleClearAlert = (alertId: string) => {
    monitoringService.clearAlert(alertId);
    refreshData();
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-100 border-green-200';
    if (score >= 70) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  // Show monitoring trigger only if there are issues or in development
  if (!status.isActive && status.activeAlerts === 0 && status.totalErrors === 0 && process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Monitoring Trigger - Only show if there are issues */}
      {(status.activeAlerts > 0 || status.totalErrors > 0 || process.env.NODE_ENV === 'development') && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              status.totalErrors > 0 
                ? 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                : status.activeAlerts > 0
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
            }`}
          >
            🔍 DB Monitor
            {status.totalErrors > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">
                {status.totalErrors}
              </span>
            )}
            {status.activeAlerts > 0 && status.totalErrors === 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                {status.activeAlerts}
              </span>
            )}
          </button>
        </div>
      )}

      <Modal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Database Monitoring Dashboard"
        className="max-w-6xl"
      >
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border ${getHealthScoreBackground(status.currentHealthScore || 0)}`}>
              <div className="text-sm font-medium text-gray-600">Health Score</div>
              <div className={`text-2xl font-bold ${getHealthScoreColor(status.currentHealthScore || 0)}`}>
                {status.currentHealthScore || 'N/A'}/100
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Monitoring</div>
              <div className="text-2xl font-bold">
                {status.isActive ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-gray-600">Inactive</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Critical Errors</div>
              <div className="text-2xl font-bold text-red-600">{status.totalErrors}</div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Active Alerts</div>
              <div className="text-2xl font-bold text-yellow-600">{status.activeAlerts}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'metrics', name: 'Metrics' },
                { id: 'errors', name: `Errors (${errors.length})` },
                { id: 'alerts', name: `Alerts (${alerts.length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="max-h-96 overflow-y-auto">
            {selectedTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Last Check</h3>
                  <p className="text-sm text-gray-600">
                    {status.lastCheck ? new Date(status.lastCheck).toLocaleString() : 'Never'}
                  </p>
                </div>

                {status.currentHealthScore && (
                  <div>
                    <h3 className="font-medium mb-2">Health Analysis</h3>
                    <div className="text-sm text-gray-600">
                      {status.currentHealthScore >= 90 && (
                        <p className="text-green-600">✅ Database is performing excellently</p>
                      )}
                      {status.currentHealthScore >= 70 && status.currentHealthScore < 90 && (
                        <p className="text-yellow-600">⚠️ Database has minor issues that should be addressed</p>
                      )}
                      {status.currentHealthScore < 70 && (
                        <p className="text-red-600">🚨 Database has serious issues requiring immediate attention</p>
                      )}
                    </div>
                  </div>
                )}

                {(status.totalErrors > 0 || status.activeAlerts > 0) && (
                  <div>
                    <h3 className="font-medium mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setSelectedTab('errors')}
                        className="block w-full text-left px-3 py-2 bg-red-50 hover:bg-red-100 rounded text-sm text-red-700"
                      >
                        Review {status.totalErrors} critical errors →
                      </button>
                      <button 
                        onClick={() => setSelectedTab('alerts')}
                        className="block w-full text-left px-3 py-2 bg-yellow-50 hover:bg-yellow-100 rounded text-sm text-yellow-700"
                      >
                        Address {status.activeAlerts} active alerts →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'metrics' && (
              <div className="space-y-4">
                {metrics.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium mb-2">Health Score Trend</h4>
                        <div className="space-y-1">
                          {metrics.slice(0, 5).map((metric, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{new Date(metric.timestamp).toLocaleTimeString()}</span>
                              <span className={getHealthScoreColor(metric.healthScore)}>
                                {metric.healthScore}/100
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Response Times (ms)</h4>
                        <div className="space-y-1">
                          {metrics.slice(0, 5).map((metric, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{new Date(metric.timestamp).toLocaleTimeString()}</span>
                              <span className={metric.responseTime > 1000 ? 'text-red-600' : metric.responseTime > 500 ? 'text-yellow-600' : 'text-green-600'}>
                                {metric.responseTime}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No metrics data available</p>
                )}
              </div>
            )}

            {selectedTab === 'errors' && (
              <div className="space-y-3">
                {errors.length > 0 ? (
                  errors.map((error) => (
                    <div 
                      key={error.id} 
                      className={`p-4 rounded-lg border ${
                        error.type === 'critical' ? 'bg-red-50 border-red-200' : 
                        error.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              error.type === 'critical' ? 'bg-red-100 text-red-800' :
                              error.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {error.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">{error.category}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(error.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{error.message}</p>
                          {error.context?.feature && (
                            <p className="text-xs text-gray-600">Feature: {error.context.feature}</p>
                          )}
                        </div>
                        
                        {!error.resolved && (
                          <button
                            onClick={() => handleResolveError(error.id)}
                            className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                          >
                            Mark Resolved
                          </button>
                        )}
                        
                        {error.resolved && (
                          <span className="ml-4 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No errors recorded</p>
                )}
              </div>
            )}

            {selectedTab === 'alerts' && (
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                        alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <h4 className="font-medium mb-2">{alert.title}</h4>
                          <p className="text-sm text-gray-700 mb-3">{alert.description}</p>
                          
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-1">Recommendations:</h5>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                              {alert.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="flex gap-4">
                            <div>
                              <span className="text-xs text-gray-500">Affected Features:</span>
                              <span className="text-xs ml-1">{alert.affectedFeatures.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Impact:</span>
                              <span className={`text-xs ml-1 font-medium ${
                                alert.estimatedImpact === 'critical' ? 'text-red-600' :
                                alert.estimatedImpact === 'high' ? 'text-orange-600' :
                                alert.estimatedImpact === 'medium' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                {alert.estimatedImpact}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleClearAlert(alert.id)}
                          className="ml-4 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                        >
                          Clear Alert
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No active alerts</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Refresh Data
            </button>
            
            <button
              onClick={() => {
                const report = monitoringService.generateReport();
                console.log('Database Monitoring Report:', report);
                // Could also download as JSON file
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Generate Report
            </button>
            
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
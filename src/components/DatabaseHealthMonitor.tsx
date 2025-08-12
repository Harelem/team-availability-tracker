'use client';

import { useEffect, useState } from 'react';
import { performDatabaseHealthCheck, HealthCheckResult, logHealthCheckResults } from '@/lib/databaseHealthCheck';
import { Modal } from './ui/Modal';

interface DatabaseHealthMonitorProps {
  enableStartupCheck?: boolean;
  enablePeriodicCheck?: boolean;
  checkIntervalMs?: number;
}

export default function DatabaseHealthMonitor({
  enableStartupCheck = true,
  enablePeriodicCheck = false,
  checkIntervalMs = 60000 // 1 minute default
}: DatabaseHealthMonitorProps) {
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const performCheck = async () => {
    setIsChecking(true);
    try {
      const result = await performDatabaseHealthCheck();
      setHealthResult(result);
      
      // Log results to console for debugging
      logHealthCheckResults(result);
      
      // Show modal if there are critical errors
      if (!result.isHealthy) {
        setShowHealthModal(true);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Startup check
  useEffect(() => {
    if (enableStartupCheck) {
      console.log('🏥 Performing database health check on component mount...');
      performCheck();
    }
  }, [enableStartupCheck]);

  // Periodic check
  useEffect(() => {
    if (enablePeriodicCheck) {
      const interval = setInterval(performCheck, checkIntervalMs);
      return () => clearInterval(interval);
    }
  }, [enablePeriodicCheck, checkIntervalMs]);

  if (!healthResult || healthResult.isHealthy) {
    return null; // Don't render anything if healthy
  }

  return (
    <>
      {/* Health indicator in corner for non-critical issues */}
      {healthResult.warnings.length > 0 && healthResult.errors.length === 0 && (
        <div className="fixed top-4 right-4 z-50">
          <div 
            className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-200 transition-colors"
            onClick={() => setShowHealthModal(true)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️ Database Warnings</span>
              <button className="text-xs underline">View Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Critical error modal */}
      <Modal 
        isOpen={showHealthModal && !healthResult.isHealthy} 
        onClose={() => setShowHealthModal(false)}
        title="🚨 Database Health Issues Detected"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Critical Errors:</h3>
            <ul className="space-y-1">
              {healthResult.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>

          {healthResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Warnings:</h3>
              <ul className="space-y-1">
                {healthResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Quick Fix Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Open Supabase SQL Editor</li>
              <li>Run the SQL migration: <code className="bg-gray-100 px-1 rounded">sql/enhance-daily-company-status.sql</code></li>
              <li>Verify the fix: <code className="bg-gray-100 px-1 rounded">node scripts/validate-database-fix.js</code></li>
              <li>Restart your application</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">📊 Performance Metrics:</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(healthResult.details.performanceMetrics).map(([metric, time]) => {
                const status = time < 500 ? '🟢' : time < 1000 ? '🟡' : '🔴';
                return (
                  <div key={metric} className="flex justify-between">
                    <span>{status} {metric}:</span>
                    <span className="font-mono">{time}ms</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={performCheck}
              disabled={isChecking}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isChecking ? 'Checking...' : 'Re-check Database'}
            </button>
            <button
              onClick={() => setShowHealthModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Non-intrusive health status for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <span className={healthResult.isHealthy ? 'text-green-400' : 'text-red-400'}>
                ● {healthResult.isHealthy ? 'Healthy' : 'Issues'}
              </span>
              <button 
                onClick={() => setShowHealthModal(true)}
                className="underline hover:no-underline"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
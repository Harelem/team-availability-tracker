/**
 * Sprint Detection Debug Component
 * 
 * Temporary component to validate that sprint detection is working correctly
 * for August 15th, 2025. Shows both database and smart detection results.
 * 
 * To use: Import and add <SprintDetectionDebug /> to any component temporarily
 */

'use client';

import { useState, useEffect } from 'react';
import { detectCurrentSprintForDate, createSprintDetectionReport } from '@/utils/smartSprintDetection';
import { getCurrentSprintInfo } from '@/utils/enhancedDateUtils';
import { DatabaseService } from '@/lib/database';

interface DebugData {
  currentDate: string;
  smartDetection: any;
  enhancedDateUtils: any;
  databaseResult: any;
  detectionReport: string;
}

export default function SprintDetectionDebug() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const runDebugCheck = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      
      // Test smart detection
      const smartResult = await detectCurrentSprintForDate(currentDate);
      
      // Test enhanced date utils
      const enhancedResult = await getCurrentSprintInfo();
      
      // Test database directly
      const databaseResult = await DatabaseService.getCurrentGlobalSprint();
      
      // Generate detailed report
      const report = await createSprintDetectionReport(currentDate);
      
      setDebugData({
        currentDate: currentDate.toDateString(),
        smartDetection: {
          sprintNumber: smartResult.sprintNumber,
          sprintName: smartResult.sprintName,
          startDate: smartResult.startDate.toDateString(),
          endDate: smartResult.endDate.toDateString(),
          isActive: smartResult.isActive,
          progressPercentage: smartResult.progressPercentage,
          workingDaysRemaining: smartResult.workingDaysRemaining,
          workingDaysCount: smartResult.workingDays.length
        },
        enhancedDateUtils: enhancedResult ? {
          sprintNumber: enhancedResult.sprintNumber,
          startDate: enhancedResult.startDate,
          endDate: enhancedResult.endDate,
          isActive: enhancedResult.isActive
        } : null,
        databaseResult: databaseResult ? {
          sprintNumber: databaseResult.current_sprint_number,
          startDate: databaseResult.sprint_start_date,
          endDate: databaseResult.sprint_end_date,
          isActive: databaseResult.is_active
        } : null,
        detectionReport: report
      });
      
    } catch (error) {
      console.error('Debug check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-run on mount
    runDebugCheck();
  }, []);

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded cursor-pointer hover:bg-blue-700 transition-colors"
        onClick={() => setIsVisible(true)}
        title="Click to show Sprint Detection Debug"
      >
        🐛 Sprint Debug
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sprint Detection Debug Panel</h2>
          <div className="flex gap-2">
            <button
              onClick={runDebugCheck}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
        
        {debugData && (
          <div className="space-y-6">
            {/* Current Status Summary */}
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">Current Status</h3>
              <p><strong>Date:</strong> {debugData.currentDate}</p>
              <p><strong>Expected for Aug 15:</strong> Sprint 2 (Aug 10-21, 2025)</p>
              <p><strong>Smart Detection Result:</strong> 
                <span className={`font-bold ${
                  debugData.smartDetection.sprintNumber === 2 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {debugData.smartDetection.sprintName}
                </span>
              </p>
            </div>

            {/* Smart Detection Results */}
            <div className="border rounded p-4">
              <h3 className="font-semibold text-green-700 mb-2">✅ Smart Sprint Detection</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Sprint:</strong> {debugData.smartDetection.sprintName}</div>
                <div><strong>Active:</strong> {debugData.smartDetection.isActive ? '✅' : '❌'}</div>
                <div><strong>Start Date:</strong> {debugData.smartDetection.startDate}</div>
                <div><strong>End Date:</strong> {debugData.smartDetection.endDate}</div>
                <div><strong>Progress:</strong> {debugData.smartDetection.progressPercentage}%</div>
                <div><strong>Working Days:</strong> {debugData.smartDetection.workingDaysCount}</div>
                <div><strong>Days Remaining:</strong> {debugData.smartDetection.workingDaysRemaining}</div>
              </div>
            </div>

            {/* Enhanced Date Utils Results */}
            <div className="border rounded p-4">
              <h3 className="font-semibold text-blue-700 mb-2">🔄 Enhanced Date Utils (with fallback)</h3>
              {debugData.enhancedDateUtils ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Sprint:</strong> Sprint {debugData.enhancedDateUtils.sprintNumber}</div>
                  <div><strong>Active:</strong> {debugData.enhancedDateUtils.isActive ? '✅' : '❌'}</div>
                  <div><strong>Start Date:</strong> {debugData.enhancedDateUtils.startDate}</div>
                  <div><strong>End Date:</strong> {debugData.enhancedDateUtils.endDate}</div>
                </div>
              ) : (
                <p className="text-red-600">No result from enhanced date utils</p>
              )}
            </div>

            {/* Database Results */}
            <div className="border rounded p-4">
              <h3 className="font-semibold text-purple-700 mb-2">🗄️ Database Direct</h3>
              {debugData.databaseResult ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Sprint:</strong> Sprint {debugData.databaseResult.sprintNumber}</div>
                  <div><strong>Active:</strong> {debugData.databaseResult.isActive ? '✅' : '❌'}</div>
                  <div><strong>Start Date:</strong> {debugData.databaseResult.startDate}</div>
                  <div><strong>End Date:</strong> {debugData.databaseResult.endDate}</div>
                </div>
              ) : (
                <p className="text-gray-600">No database result (using smart detection fallback)</p>
              )}
            </div>

            {/* Detailed Report */}
            <div className="border rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-2">📊 Detailed Detection Report</h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                {debugData.detectionReport}
              </pre>
            </div>

            {/* Fix Validation */}
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-800 mb-2">🎯 Fix Validation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={debugData.smartDetection.sprintNumber === 2 ? 'text-green-600' : 'text-red-600'}>
                    {debugData.smartDetection.sprintNumber === 2 ? '✅' : '❌'}
                  </span>
                  <span>Shows Sprint 2 (not Sprint 1) for August 15th</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={debugData.smartDetection.startDate.includes('Aug 10') ? 'text-green-600' : 'text-red-600'}>
                    {debugData.smartDetection.startDate.includes('Aug 10') ? '✅' : '❌'}
                  </span>
                  <span>Sprint starts August 10th (not July 27th)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={debugData.smartDetection.endDate.includes('Aug 21') ? 'text-green-600' : 'text-red-600'}>
                    {debugData.smartDetection.endDate.includes('Aug 21') ? '✅' : '❌'}
                  </span>
                  <span>Sprint ends August 21st</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={debugData.smartDetection.workingDaysCount === 10 ? 'text-green-600' : 'text-red-600'}>
                    {debugData.smartDetection.workingDaysCount === 10 ? '✅' : '❌'}
                  </span>
                  <span>Contains exactly 10 working days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={debugData.smartDetection.isActive ? 'text-green-600' : 'text-red-600'}>
                    {debugData.smartDetection.isActive ? '✅' : '❌'}
                  </span>
                  <span>Sprint is active for current date</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
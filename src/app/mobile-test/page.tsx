'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Target, Zap, Eye, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import MobileTester, { TouchTargetTest, MobilePerformanceTest, MobileTestUtils } from '@/utils/mobileTestUtils';
import MobileLoadingSpinner from '@/components/mobile/MobileLoadingSpinner';
import MobilePerformanceMonitor from '@/components/mobile/MobilePerformanceMonitor';
import { Button } from '@/components/ui/button';

export default function MobileTestPage() {
  const [tester] = useState(() => new MobileTester());
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  const runFullSuite = async () => {
    setIsRunning(true);
    setCurrentTest('Initializing...');

    try {
      setCurrentTest('Testing touch targets...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentTest('Testing performance...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentTest('Testing screen sizes...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const results = await tester.runFullSuite();
      setTestResults(results);

      setCurrentTest('Generating report...');
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runIndividualTest = async (testType: 'touchTargets' | 'performance' | 'screenSizes') => {
    setIsRunning(true);
    
    try {
      let result;
      switch (testType) {
        case 'touchTargets':
          setCurrentTest('Testing touch targets...');
          result = await tester.testTouchTargets();
          break;
        case 'performance':
          setCurrentTest('Testing performance...');
          result = await tester.testPerformance();
          break;
        case 'screenSizes':
          setCurrentTest('Testing screen sizes...');
          result = await tester.testScreenSizes();
          break;
      }
      
      const newResults = new Map(testResults);
      newResults.set(testType, result);
      setTestResults(newResults);
    } catch (error) {
      console.error(`Test ${testType} failed:`, error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const TouchTargetsResults: React.FC = () => {
    const touchTargets = testResults.get('touchTargets') as TouchTargetTest[] | undefined;
    if (!touchTargets) return null;

    const passed = touchTargets.filter(t => t.meetsMinimum);
    const failed = touchTargets.filter(t => !t.meetsMinimum);

    return (
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Touch Targets</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{passed.length}</div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{failed.length}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{touchTargets.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>

        {failed.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-red-600 mb-2">Issues Found:</h4>
            <div className="space-y-2">
              {failed.slice(0, 5).map((target, index) => (
                <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                  {target.issues.join(', ')}
                </div>
              ))}
              {failed.length > 5 && (
                <div className="text-sm text-gray-500">
                  +{failed.length - 5} more issues
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={MobileTestUtils.highlightTouchTargetIssues}
          >
            Highlight Issues
          </Button>
        </div>
      </div>
    );
  };

  const PerformanceResults: React.FC = () => {
    const performance = testResults.get('performance') as MobilePerformanceTest | undefined;
    if (!performance) return null;

    const getGradeColor = (grade: string) => {
      switch (grade) {
        case 'A': return 'text-green-600';
        case 'B': return 'text-blue-600';
        case 'C': return 'text-yellow-600';
        case 'D': return 'text-orange-600';
        case 'F': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold">Performance</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getGradeColor(performance.grade)}`}>
              {performance.grade}
            </div>
            <div className="text-sm text-gray-600">Grade</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(performance.loadTime)}ms</div>
            <div className="text-sm text-gray-600">Load Time</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{Math.round(performance.interactionDelay)}ms</div>
            <div className="text-sm text-gray-600">Interaction Delay</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{performance.bundleSize}KB</div>
            <div className="text-sm text-gray-600">Bundle Size</div>
          </div>
        </div>

        {performance.issues.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-red-600 mb-2">Issues:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {performance.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {performance.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-blue-600 mb-2">Recommendations:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              {performance.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const ScreenSizeResults: React.FC = () => {
    const screenSizes = testResults.get('screenSizes') as Map<string, any> | undefined;
    if (!screenSizes) return null;

    return (
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Screen Size Compatibility</h3>
        </div>
        
        <div className="space-y-3">
          {Array.from(screenSizes.entries()).map(([device, result]) => {
            const hasIssues = result.hasOverflow || result.hasScrollIssues || !result.touchTargetsValid;
            
            return (
              <div key={device} className={`flex items-center justify-between p-3 rounded-lg ${
                hasIssues ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-3">
                  {hasIssues ? 
                    <XCircle className="w-5 h-5 text-red-600" /> :
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  }
                  <span className="font-medium">{device}</span>
                </div>
                
                <div className="flex gap-2 text-sm">
                  {result.hasOverflow && <span className="text-red-600">Overflow</span>}
                  {result.hasScrollIssues && <span className="text-red-600">Scroll Issues</span>}
                  {!result.touchTargetsValid && <span className="text-red-600">Touch Issues</span>}
                  {!hasIssues && <span className="text-green-600">All Good</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Performance Monitor */}
      {showPerformanceMonitor && (
        <MobilePerformanceMonitor 
          showDebugInfo 
          logMetrics 
          onMetricsUpdate={(metrics) => {}}
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mobile Experience Test Suite
          </h1>
          <p className="text-gray-600">
            Comprehensive testing for mobile optimization and user experience
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg p-6 mb-6 border">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={runFullSuite}
              disabled={isRunning}
              className="flex-1 flex items-center gap-2 touch-target-comfortable"
              size="lg"
            >
              <Play className="w-5 h-5" />
              {isRunning ? 'Running Tests...' : 'Run Full Suite'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              className="flex items-center gap-2 touch-target-comfortable"
            >
              <Eye className="w-5 h-5" />
              Performance Monitor
            </Button>
          </div>

          {/* Individual test buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <Button
              variant="secondary"
              onClick={() => runIndividualTest('touchTargets')}
              disabled={isRunning}
              className="flex items-center gap-2 touch-target-comfortable"
            >
              <Target className="w-4 h-4" />
              Touch Targets
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => runIndividualTest('performance')}
              disabled={isRunning}
              className="flex items-center gap-2 touch-target-comfortable"
            >
              <Zap className="w-4 h-4" />
              Performance
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => runIndividualTest('screenSizes')}
              disabled={isRunning}
              className="flex items-center gap-2 touch-target-comfortable"
            >
              <Smartphone className="w-4 h-4" />
              Screen Sizes
            </Button>
          </div>

          {/* Current test indicator */}
          {isRunning && (
            <div className="mt-4 flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
              <MobileLoadingSpinner variant="spinner" size="sm" />
              <span className="text-blue-700 font-medium">{currentTest}</span>
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="space-y-6">
          <TouchTargetsResults />
          <PerformanceResults />
          <ScreenSizeResults />
        </div>

        {/* Report Generation */}
        {testResults.size > 0 && (
          <div className="mt-6 bg-white rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-4">Test Report</h3>
            <Button
              variant="outline"
              onClick={() => {
                const report = tester.generateReport();
                alert('Report generated');
              }}
              className="touch-target-comfortable"
            >
              Generate Report
            </Button>
          </div>
        )}

        {/* Development Tools */}
        <div className="mt-6 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Development Tools</h3>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={MobileTestUtils.logPerformanceMetrics}
              className="touch-target-comfortable"
            >
              Log Performance Metrics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Activity, 
  Database, 
  BarChart3, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Gauge
} from 'lucide-react';
import { enhancedDatabaseService } from '@/lib/enhancedDatabaseService';
import { dataService } from '@/services/DataService';

interface PerformanceDashboardProps {
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  refreshInterval?: number;
}

interface PerformanceData {
  database: {
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    slowQueries: any[];
    topQueries: any[];
    performanceStats: any;
  };
  dataService: {
    totalQueries: number;
    averageResponseTime: number;
    cacheHitRate: number;
    totalCacheSize: number;
    slowQueryCount: number;
  };
  cache: {
    memory: { size: number; keys: string[] };
    session: { size: number; keys: string[] };
    local: { size: number; keys: string[] };
    hitRate: number;
    totalRequests: number;
  };
}

const PerformanceMetricCard = memo(({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  status 
}: {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'stable';
  status?: 'excellent' | 'good' | 'warning' | 'critical';
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend === 'down') return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
    return null;
  };

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-4 h-4" />
        {getTrendIcon()}
      </div>
      <div className="text-lg font-semibold">
        {typeof value === 'number' && !Number.isInteger(value) 
          ? value.toFixed(1)
          : value
        }{unit}
      </div>
      <div className="text-xs opacity-75">{title}</div>
    </div>
  );
});

PerformanceMetricCard.displayName = 'PerformanceMetricCard';

const SlowQueryList = memo(({ queries }: { queries: any[] }) => {
  if (!queries || queries.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-2">
        <CheckCircle className="w-4 h-4 inline mr-1" />
        No slow queries detected
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {queries.slice(0, 5).map((query, index) => (
        <div key={index} className="text-xs bg-red-50 p-2 rounded border border-red-200">
          <div className="font-mono text-red-800">{query.queryName}</div>
          <div className="text-red-600">
            {Math.round(query.duration)}ms
            {query.timestamp && (
              <span className="ml-2 opacity-75">
                {new Date(query.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

SlowQueryList.displayName = 'SlowQueryList';

const CacheBreakdown = memo(({ cache }: { cache: PerformanceData['cache'] }) => {
  const totalEntries = cache.memory.size + cache.session.size + cache.local.size;
  
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Cache Distribution</div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Memory:</span>
          <span className="font-mono">{cache.memory.size} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-500 h-1 rounded-full" 
            style={{ width: `${totalEntries > 0 ? (cache.memory.size / totalEntries) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Session:</span>
          <span className="font-mono">{cache.session.size} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-green-500 h-1 rounded-full" 
            style={{ width: `${totalEntries > 0 ? (cache.session.size / totalEntries) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Local:</span>
          <span className="font-mono">{cache.local.size} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-purple-500 h-1 rounded-full" 
            style={{ width: `${totalEntries > 0 ? (cache.local.size / totalEntries) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
      
      <div className="pt-1 border-t border-gray-200">
        <div className="flex justify-between text-xs font-medium">
          <span>Hit Rate:</span>
          <span className={`${cache.hitRate > 80 ? 'text-green-600' : cache.hitRate > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
            {cache.hitRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
});

CacheBreakdown.displayName = 'CacheBreakdown';

export default function PerformanceDashboard({ 
  isVisible = false, 
  onToggleVisibility,
  refreshInterval = 5000 
}: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPerformanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get data from both services
      const [dbMetrics, cacheStats, dataServiceStats] = await Promise.all([
        Promise.resolve(enhancedDatabaseService.getPerformanceMetrics()),
        Promise.resolve(enhancedDatabaseService.getCacheStats()),
        Promise.resolve(dataService.getPerformanceStats())
      ]);

      setPerformanceData({
        database: dbMetrics,
        dataService: dataServiceStats,
        cache: cacheStats
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [isVisible, autoRefresh, refreshInterval, fetchPerformanceData]);

  // Initial load when becoming visible
  useEffect(() => {
    if (isVisible && !performanceData) {
      fetchPerformanceData();
    }
  }, [isVisible, performanceData, fetchPerformanceData]);

  const getOverallStatus = (): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (!performanceData) return 'good';
    
    const { database, dataService } = performanceData;
    
    // Calculate overall score based on multiple factors
    let score = 100;
    
    // Database performance (40 points)
    if (database.averageQueryTime > 2000) score -= 40;
    else if (database.averageQueryTime > 1000) score -= 20;
    else if (database.averageQueryTime > 500) score -= 10;
    
    // Cache efficiency (30 points)
    const avgCacheHit = (database.cacheHitRate + dataService.cacheHitRate) / 2;
    if (avgCacheHit < 50) score -= 30;
    else if (avgCacheHit < 70) score -= 15;
    else if (avgCacheHit < 85) score -= 5;
    
    // Slow queries (20 points)
    const slowQueryRate = (database.slowQueries.length / Math.max(database.totalQueries, 1)) * 100;
    if (slowQueryRate > 20) score -= 20;
    else if (slowQueryRate > 10) score -= 10;
    else if (slowQueryRate > 5) score -= 5;
    
    // Data service performance (10 points)
    if (dataService.averageResponseTime > 1000) score -= 10;
    else if (dataService.averageResponseTime > 500) score -= 5;
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const handleRefresh = useCallback(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  const handleOptimizeCache = useCallback(() => {
    enhancedDatabaseService.optimizeCache();
    dataService.optimizeCache();
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  const handleClearCache = useCallback(() => {
    enhancedDatabaseService.clearCache();
    dataService.invalidateCache();
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50 transition-colors"
        title="Show Performance Dashboard"
      >
        <Gauge className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1 rounded text-xs ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
              title={`Auto-refresh ${autoRefresh ? 'enabled' : 'disabled'}`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh && isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggleVisibility}
              className="p-1 rounded text-gray-500 hover:text-gray-700"
              title="Hide Performance Dashboard"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
        {!performanceData ? (
          <div className="p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-sm text-gray-500">Loading performance data...</div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Overall Status */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                getOverallStatus() === 'excellent' ? 'bg-green-100 text-green-800' :
                getOverallStatus() === 'good' ? 'bg-blue-100 text-blue-800' :
                getOverallStatus() === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getOverallStatus() === 'excellent' && <CheckCircle className="w-4 h-4" />}
                {getOverallStatus() === 'good' && <CheckCircle className="w-4 h-4" />}
                {getOverallStatus() === 'warning' && <AlertTriangle className="w-4 h-4" />}
                {getOverallStatus() === 'critical' && <XCircle className="w-4 h-4" />}
                Performance: {getOverallStatus().toUpperCase()}
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <PerformanceMetricCard
                title="Avg Query Time"
                value={performanceData.database.averageQueryTime}
                unit="ms"
                icon={Clock}
                status={
                  performanceData.database.averageQueryTime < 500 ? 'excellent' :
                  performanceData.database.averageQueryTime < 1000 ? 'good' :
                  performanceData.database.averageQueryTime < 2000 ? 'warning' : 'critical'
                }
              />
              
              <PerformanceMetricCard
                title="Cache Hit Rate"
                value={performanceData.database.cacheHitRate}
                unit="%"
                icon={Zap}
                status={
                  performanceData.database.cacheHitRate > 85 ? 'excellent' :
                  performanceData.database.cacheHitRate > 70 ? 'good' :
                  performanceData.database.cacheHitRate > 50 ? 'warning' : 'critical'
                }
              />
              
              <PerformanceMetricCard
                title="Total Queries"
                value={performanceData.database.totalQueries}
                icon={Database}
                status="good"
              />
              
              <PerformanceMetricCard
                title="Slow Queries"
                value={performanceData.database.slowQueries.length}
                icon={AlertTriangle}
                status={
                  performanceData.database.slowQueries.length === 0 ? 'excellent' :
                  performanceData.database.slowQueries.length < 3 ? 'good' :
                  performanceData.database.slowQueries.length < 5 ? 'warning' : 'critical'
                }
              />
            </div>

            {/* Cache Breakdown */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <CacheBreakdown cache={performanceData.cache} />
            </div>

            {/* Data Service Metrics */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Data Service Performance</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-600">Response Time</div>
                  <div className="font-mono">{Math.round(performanceData.dataService.averageResponseTime)}ms</div>
                </div>
                <div>
                  <div className="text-gray-600">Cache Size</div>
                  <div className="font-mono">{performanceData.dataService.totalCacheSize} items</div>
                </div>
              </div>
            </div>

            {/* Slow Queries */}
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2 text-red-800">Slow Queries</div>
              <SlowQueryList queries={performanceData.database.slowQueries} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleOptimizeCache}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                Optimize
              </button>
              <button
                onClick={handleClearCache}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for using performance monitoring in components
export const usePerformanceMonitoring = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);
  
  const show = useCallback(() => {
    setIsVisible(true);
  }, []);
  
  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);
  
  return {
    isVisible,
    toggle,
    show,
    hide,
    PerformanceDashboard: (props: Omit<PerformanceDashboardProps, 'isVisible' | 'onToggleVisibility'>) => (
      <PerformanceDashboard 
        {...props} 
        isVisible={isVisible} 
        onToggleVisibility={toggle} 
      />
    )
  };
};
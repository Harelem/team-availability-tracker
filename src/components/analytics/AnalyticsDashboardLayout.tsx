'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle, 
  Download,
  Filter,
  RefreshCw,
  Settings,
  Maximize2,
  MoreVertical
} from 'lucide-react';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { PerformanceMetricsGrid } from './PerformanceMetricsCard';

interface DashboardTab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface DashboardFilter {
  id: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}

interface AnalyticsDashboardLayoutProps {
  title: string;
  subtitle?: string;
  tabs?: DashboardTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  filters?: DashboardFilter[];
  onFilterChange?: (filterId: string, value: string) => void;
  metricsData?: any[];
  charts?: React.ReactNode[];
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  lastUpdated?: Date;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onRefresh?: () => void;
  className?: string;
}

export function AnalyticsDashboardLayout({
  title,
  subtitle,
  tabs = [],
  activeTab,
  onTabChange,
  filters = [],
  onFilterChange,
  metricsData = [],
  charts = [],
  actions,
  loading = false,
  error = null,
  lastUpdated,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  onRefresh,
  className = ''
}: AnalyticsDashboardLayoutProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, onRefresh]);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to load analytics data
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Last updated: {formatLastUpdated(lastUpdated)}
                </span>
              )}
              
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <RefreshCw 
                    className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                  Refresh
                </button>
              )}

              {filters.length > 0 && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>
              )}

              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="mt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange?.(tab.id)}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm inline-flex items-center ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.name}
                      {tab.count !== undefined && (
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                          isActive 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Filters */}
          {showFilters && filters.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filters.map((filter) => (
                  <div key={filter.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {filter.name}
                    </label>
                    <select
                      value={filter.value}
                      onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Loading analytics...</p>
              <p className="text-sm text-gray-600">This may take a few moments</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Grid */}
            {metricsData.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Key Performance Indicators
                </h2>
                <PerformanceMetricsGrid 
                  metrics={metricsData} 
                  columns={4}
                />
              </div>
            )}

            {/* Charts Grid */}
            {charts.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Analytics Charts
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {charts.map((chart, index) => (
                    <div key={index} className="col-span-1">
                      {chart}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {metricsData.length === 0 && charts.length === 0 && !loading && (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No analytics data available
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Analytics data will appear here once your team starts tracking time and completing sprints.
                </p>
                {onRefresh && (
                  <button
                    onClick={handleRefresh}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboardLayout;
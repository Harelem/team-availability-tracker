'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { CapacityTrendChartProps, CapacityTrendData } from '@/types/charts';
import { formatChartTooltip } from '@/utils/chartDataTransformers';

/**
 * Capacity Trend Area Chart Component
 * 
 * Displays historical capacity trends over time with utilization patterns.
 * Shows capacity, actual hours, and utilization trends with area fills.
 */
export function CapacityTrendAreaChart({
  data,
  timeframe = 'weekly',
  showAverage = true,
  className = '',
  height = 300,
  loading = false,
  error = null
}: CapacityTrendChartProps) {
  // Handle loading state
  if (loading) {
    return (
      <div className={`w-full bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading chart data...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={`w-full bg-red-50 border-l-4 border-red-400 p-4 rounded-lg ${className}`} style={{ height }}>
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm text-red-700">Failed to load chart data</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <p className="text-gray-600">No capacity trend data available</p>
          <p className="text-xs text-gray-500 mt-1">Historical trends will appear here once data is loaded</p>
        </div>
      </div>
    );
  }

  // Calculate averages for reference lines
  const averages = {
    utilization: data.reduce((sum, item) => sum + item.utilization, 0) / data.length,
    potential: data.reduce((sum, item) => sum + item.potential, 0) / data.length,
    actual: data.reduce((sum, item) => sum + item.actual, 0) / data.length
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CapacityTrendData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{formatPeriodLabel(label, timeframe)}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">●</span> Max Capacity: {formatChartTooltip(data.potential, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-green-600">●</span> Actual: {formatChartTooltip(data.actual, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-purple-600">●</span> Utilization: {formatChartTooltip(data.utilization, 'percentage')}
            </p>
            {data.teamCount && (
              <p className="text-sm">
                <span className="text-gray-600">●</span> Teams: {data.teamCount}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Format period label based on timeframe
  function formatPeriodLabel(period: string, timeframe: string): string {
    const date = new Date(period);
    switch (timeframe) {
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      default:
        return period;
    }
  }

  // Get gradient definitions
  const getGradientId = (type: string) => `gradient-${type}`;

  return (
    <div className={`w-full ${className}`}>
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <div className="font-semibold text-blue-900">
            {formatChartTooltip(averages.potential, 'hours')}
          </div>
          <div className="text-xs text-blue-700 mt-1">Avg Max Capacity</div>
        </div>
        
        <div className="text-center bg-green-50 rounded-lg p-3">
          <div className="font-semibold text-green-900">
            {formatChartTooltip(averages.actual, 'hours')}
          </div>
          <div className="text-xs text-green-700 mt-1">Avg Actual</div>
        </div>
        
        <div className="text-center bg-purple-50 rounded-lg p-3">
          <div className="font-semibold text-purple-900">
            {formatChartTooltip(averages.utilization, 'percentage')}
          </div>
          <div className="text-xs text-purple-700 mt-1">Avg Utilization</div>
        </div>
        
        <div className="text-center bg-gray-50 rounded-lg p-3">
          <div className="font-semibold text-gray-900">{data.length}</div>
          <div className="text-xs text-gray-700 mt-1">
            {timeframe === 'weekly' ? 'Weeks' : 
             timeframe === 'monthly' ? 'Months' : 'Quarters'}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }}
        >
          <defs>
            {/* Gradient definitions */}
            <linearGradient id={getGradientId('potential')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id={getGradientId('actual')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="period"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => formatPeriodLabel(value, timeframe)}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Average reference lines */}
          {showAverage && (
            <>
              <ReferenceLine 
                y={averages.potential} 
                stroke="#3b82f6" 
                strokeDasharray="5 5" 
                label={{ value: "Avg Max Capacity", position: "top" }}
                opacity={0.7}
              />
              <ReferenceLine 
                y={averages.actual} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                label={{ value: "Avg Actual", position: "top" }}
                opacity={0.7}
              />
            </>
          )}
          
          {/* Potential capacity area */}
          <Area
            type="monotone"
            dataKey="potential"
            stackId="1"
            stroke="#3b82f6"
            fill={`url(#${getGradientId('potential')})`}
            strokeWidth={2}
            name="Max Capacity Hours"
          />
          
          {/* Actual hours area */}
          <Area
            type="monotone"
            dataKey="actual"
            stackId="2"
            stroke="#10b981"
            fill={`url(#${getGradientId('actual')})`}
            strokeWidth={2}
            name="Actual Hours"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Trend analysis */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Capacity Trends</h4>
          <div className="space-y-2 text-sm">
            {/* Calculate trend indicators */}
            {(() => {
              const recentData = data.slice(-4); // Last 4 periods
              const earlierData = data.slice(-8, -4); // Previous 4 periods
              
              const recentAvgUtil = recentData.reduce((sum, item) => sum + item.utilization, 0) / recentData.length;
              const earlierAvgUtil = earlierData.reduce((sum, item) => sum + item.utilization, 0) / earlierData.length;
              const utilizationTrend = recentAvgUtil - earlierAvgUtil;
              
              const recentAvgActual = recentData.reduce((sum, item) => sum + item.actual, 0) / recentData.length;
              const earlierAvgActual = earlierData.reduce((sum, item) => sum + item.actual, 0) / earlierData.length;
              const actualTrend = recentAvgActual - earlierAvgActual;

              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilization Trend:</span>
                    <span className={`font-medium ${
                      utilizationTrend > 5 ? 'text-green-600' : 
                      utilizationTrend < -5 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {utilizationTrend > 0 ? '↗' : utilizationTrend < 0 ? '↘' : '→'} 
                      {Math.abs(utilizationTrend).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity Trend:</span>
                    <span className={`font-medium ${
                      actualTrend > 0 ? 'text-green-600' : 
                      actualTrend < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {actualTrend > 0 ? '↗' : actualTrend < 0 ? '↘' : '→'} 
                      {formatChartTooltip(Math.abs(actualTrend), 'hours')}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Performance Metrics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Peak Utilization:</span>
              <span className="font-medium">
                {formatChartTooltip(Math.max(...data.map(d => d.utilization)), 'percentage')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lowest Utilization:</span>
              <span className="font-medium">
                {formatChartTooltip(Math.min(...data.map(d => d.utilization)), 'percentage')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Consistency Score:</span>
              <span className="font-medium">
                {/* Calculate coefficient of variation as consistency metric */}
                {(() => {
                  const mean = averages.utilization;
                  const variance = data.reduce((sum, item) => sum + Math.pow(item.utilization - mean, 2), 0) / data.length;
                  const stdDev = Math.sqrt(variance);
                  const consistency = Math.max(0, 100 - (stdDev / mean) * 100);
                  return `${consistency.toFixed(0)}%`;
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { SprintProgressChartProps, SprintProgressData } from '@/types/charts';
import { formatChartTooltip } from '@/utils/chartDataTransformers';

/**
 * Sprint Progress Line Chart Component
 * 
 * Displays sprint progress over time with planned vs actual hours.
 * Shows cumulative progress and trend lines.
 */
export function SprintProgressLineChart({
  data,
  sprintInfo,
  showProjection = true,
  className = '',
  height = 300,
  loading = false,
  error = null
}: SprintProgressChartProps) {
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
          <p className="text-gray-600">No sprint progress data available</p>
          <p className="text-xs text-gray-500 mt-1">Sprint progress will appear here once data is loaded</p>
        </div>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SprintProgressData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">Week {label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">●</span> Planned: {formatChartTooltip(data.plannedHours, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-green-600">●</span> Actual: {formatChartTooltip(data.actualHours, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-purple-600">●</span> Cumulative Planned: {formatChartTooltip(data.cumulativePlanned, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-orange-600">●</span> Cumulative Actual: {formatChartTooltip(data.cumulativeActual, 'hours')}
            </p>
            <p className="text-sm font-medium mt-2">
              Progress: {formatChartTooltip(data.progressPercentage, 'percentage')}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate ideal progress line (straight line from 0 to total planned)
  const totalPlannedHours = data[data.length - 1]?.cumulativePlanned || 0;
  const idealProgressData = data.map((item, index) => ({
    ...item,
    idealProgress: (totalPlannedHours / data.length) * (index + 1)
  }));

  // Calculate current week position for reference line
  const currentWeek = Math.ceil((Date.now() - new Date(sprintInfo.sprint_start_date).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const showCurrentWeekLine = currentWeek >= 1 && currentWeek <= data.length;

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {/* Sprint info summary */}
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <div className="font-semibold text-blue-900">Sprint {sprintInfo.current_sprint_number}</div>
          <div className="text-xs text-blue-700 mt-1">{sprintInfo.sprint_length_weeks} weeks</div>
        </div>
        
        <div className="text-center bg-green-50 rounded-lg p-3">
          <div className="font-semibold text-green-900">{sprintInfo.progress_percentage.toFixed(1)}%</div>
          <div className="text-xs text-green-700 mt-1">Complete</div>
        </div>
        
        <div className="text-center bg-purple-50 rounded-lg p-3">
          <div className="font-semibold text-purple-900">{sprintInfo.days_remaining}</div>
          <div className="text-xs text-purple-700 mt-1">Days Left</div>
        </div>
        
        <div className="text-center bg-orange-50 rounded-lg p-3">
          <div className="font-semibold text-orange-900">
            {data[data.length - 1]?.progressPercentage.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-orange-700 mt-1">On Track</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={idealProgressData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="day"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ value: 'Week', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Current week reference line */}
          {showCurrentWeekLine && (
            <ReferenceLine 
              x={currentWeek} 
              stroke="#ef4444" 
              strokeDasharray="5 5" 
              label={{ value: "Current Week", position: "top" }}
            />
          )}
          
          {/* Ideal progress line (straight line) */}
          {showProjection && (
            <Line
              type="linear"
              dataKey="idealProgress"
              stroke="#9ca3af"
              strokeDasharray="10 5"
              strokeWidth={2}
              dot={false}
              name="Ideal Progress"
            />
          )}
          
          {/* Weekly planned hours */}
          <Line
            type="monotone"
            dataKey="plannedHours"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="Weekly Planned"
          />
          
          {/* Weekly actual hours */}
          <Line
            type="monotone"
            dataKey="actualHours"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            name="Weekly Actual"
          />
          
          {/* Cumulative planned hours */}
          <Line
            type="monotone"
            dataKey="cumulativePlanned"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
            name="Cumulative Planned"
          />
          
          {/* Cumulative actual hours */}
          <Line
            type="monotone"
            dataKey="cumulativeActual"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            name="Cumulative Actual"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Progress indicators */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Sprint Velocity</h4>
          <div className="space-y-2">
            {data.slice(-3).map((week, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">Week {week.day}:</span>
                <span className="font-medium">
                  {formatChartTooltip(week.actualHours, 'hours')} 
                  <span className="text-gray-500 ml-1">
                    ({formatChartTooltip((week.actualHours / week.plannedHours) * 100, 'percentage')})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Sprint Forecast</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Planned:</span>
              <span className="font-medium">{formatChartTooltip(totalPlannedHours, 'hours')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Actual:</span>
              <span className="font-medium">
                {formatChartTooltip(data[data.length - 1]?.cumulativeActual || 0, 'hours')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Projected End:</span>
              <span className={`font-medium ${
                (data[data.length - 1]?.progressPercentage || 0) >= 90 
                  ? 'text-green-600' 
                  : (data[data.length - 1]?.progressPercentage || 0) >= 70 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                {formatChartTooltip(data[data.length - 1]?.progressPercentage || 0, 'percentage')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
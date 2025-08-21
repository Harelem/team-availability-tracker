'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { SprintCapacityChartProps, SprintCapacityData } from '@/types/charts';
import { formatChartTooltip, getUtilizationColor } from '@/utils/chartDataTransformers';

/**
 * Sprint Capacity Bar Chart Component
 * 
 * Displays team capacity vs actual hours in a bar chart format.
 * Shows potential hours, actual hours, and utilization percentage for each team.
 */
export function SprintCapacityBarChart({
  data,
  showPercentages = true,
  onTeamClick,
  className = '',
  height = 300,
  loading = false,
  error = null
}: SprintCapacityChartProps) {
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
          <p className="text-gray-600">No team data available</p>
          <p className="text-xs text-gray-500 mt-1">Teams will appear here once data is loaded</p>
        </div>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SprintCapacityData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">●</span> Max Capacity: {formatChartTooltip(data.potential, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-green-600">●</span> Actual: {formatChartTooltip(data.actual, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-gray-600">●</span> Utilization: {formatChartTooltip(data.utilization, 'percentage')}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Status: <span className={`px-2 py-1 rounded-full text-xs ${
                data.status === 'optimal' ? 'bg-green-100 text-green-800' :
                data.status === 'under' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {data.status === 'optimal' ? 'Optimal' : 
                 data.status === 'under' ? 'Under-utilized' : 'Over-capacity'}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle bar click - updated for Recharts v2 compatibility
  const handleBarClick = (data: any, index: number) => {
    if (onTeamClick && data && data.payload) {
      onTeamClick(data.payload.teamId);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60
          }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="teamName"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Show legend if there are multiple data series */}
          <Legend 
            wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
          />
          
          {/* Potential hours bar */}
          <Bar 
            dataKey="potential" 
            name="Max Capacity Hours"
            fill="#3b82f6"
            opacity={0.7}
            onClick={handleBarClick}
            style={{ cursor: onTeamClick ? 'pointer' : 'default' }}
          />
          
          {/* Actual hours bar */}
          <Bar 
            dataKey="actual" 
            name="Actual Hours"
            onClick={handleBarClick}
            style={{ cursor: onTeamClick ? 'pointer' : 'default' }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getUtilizationColor(entry.utilization)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Optional percentage labels */}
      {showPercentages && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {data.map((team, index) => (
            <div
              key={team.teamId}
              className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded-full"
            >
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: getUtilizationColor(team.utilization) }}
              />
              <span className="text-gray-700">
                {team.teamName}: {formatChartTooltip(team.utilization, 'percentage')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
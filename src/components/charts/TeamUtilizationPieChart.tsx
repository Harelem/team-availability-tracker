'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { TeamUtilizationPieChartProps, UtilizationDistributionData } from '@/types/charts';
import { formatChartTooltip } from '@/utils/chartDataTransformers';

/**
 * Team Utilization Pie Chart Component
 * 
 * Displays the distribution of team utilization levels in a pie chart format.
 * Shows optimal, under-utilized, and over-capacity teams.
 */
export function TeamUtilizationPieChart({
  data,
  totalTeams,
  showLegend = true,
  className = '',
  height = 300,
  loading = false,
  error = null
}: TeamUtilizationPieChartProps) {
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
          <p className="text-gray-600">No utilization data available</p>
          <p className="text-xs text-gray-500 mt-1">Team utilization will appear here once data is loaded</p>
        </div>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as UtilizationDistributionData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span style={{ color: data.color }}>●</span> Teams: {data.count}
            </p>
            <p className="text-sm">
              <span className="text-gray-600">●</span> Percentage: {formatChartTooltip(data.percentage, 'percentage')}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate center text (total teams)
  const centerText = {
    total: totalTeams,
    label: totalTeams === 1 ? 'Team' : 'Teams'
  };

  // Custom label function for pie slices
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  // Custom legend component
  const CustomLegend = ({ payload }: any) => {
    if (!showLegend || !payload) return null;

    return (
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center text-sm">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">{entry.value}</span>
            <span className="text-gray-500 ml-1">
              ({data.find(d => d.label === entry.value)?.count || 0})
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={height * 0.35}
              innerRadius={height * 0.15}
              fill="#8884d8"
              dataKey="count"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text showing total teams */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{centerText.total}</div>
            <div className="text-sm text-gray-600">{centerText.label}</div>
          </div>
        </div>
      </div>

      {/* Custom legend */}
      {showLegend && <CustomLegend payload={data.map(d => ({ value: d.label, color: d.color }))} />}

      {/* Summary statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {data.map((item, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div 
              className="text-lg font-semibold"
              style={{ color: item.color }}
            >
              {item.count}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {item.status === 'optimal' ? 'Optimal' :
               item.status === 'under' ? 'Under-utilized' : 'Over-capacity'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatChartTooltip(item.percentage, 'percentage')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
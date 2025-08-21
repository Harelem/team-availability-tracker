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
import { TeamComparisonChartProps, TeamComparisonData } from '@/types/charts';
import { formatChartTooltip, getUtilizationColor } from '@/utils/chartDataTransformers';

/**
 * Team Comparison Horizontal Bar Chart Component
 * 
 * Displays team performance comparison with utilization, capacity, and ranking.
 * Shows teams ranked by utilization or other metrics with interactive features.
 */
export function TeamComparisonBarChart({
  data,
  sortBy = 'utilization',
  showRanking = true,
  onTeamClick,
  className = '',
  height = 400,
  loading = false,
  error = null
}: TeamComparisonChartProps) {
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
          <p className="text-gray-600">No team comparison data available</p>
          <p className="text-xs text-gray-500 mt-1">Team comparisons will appear here once data is loaded</p>
        </div>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const teamData = payload[0].payload as TeamComparisonData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">●</span> Max Capacity: {formatChartTooltip(teamData.potential, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-green-600">●</span> Actual: {formatChartTooltip(teamData.actual, 'hours')}
            </p>
            <p className="text-sm">
              <span className="text-purple-600">●</span> Utilization: {formatChartTooltip(teamData.utilization, 'percentage')}
            </p>
            <p className="text-sm">
              <span className="text-gray-600">●</span> Team Size: {teamData.memberCount} members
            </p>
            {showRanking && (
              <p className="text-sm font-medium mt-2">
                Rank: #{teamData.rank}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Status: <span className={`px-2 py-1 rounded-full text-xs ${
                teamData.status === 'optimal' ? 'bg-green-100 text-green-800' :
                teamData.status === 'under' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {teamData.status === 'optimal' ? 'Optimal' : 
                 teamData.status === 'under' ? 'Under-utilized' : 'Over-capacity'}
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

  // Get chart title based on sort criteria
  const getChartTitle = () => {
    switch (sortBy) {
      case 'utilization':
        return 'Team Utilization Comparison';
      case 'actual':
        return 'Team Actual Hours Comparison';
      case 'potential':
        return 'Team Max Capacity Hours Comparison';
      default:
        return 'Team Performance Comparison';
    }
  };

  // Get primary metric for display
  const getPrimaryMetric = (team: TeamComparisonData) => {
    switch (sortBy) {
      case 'utilization':
        return team.utilization;
      case 'actual':
        return team.actual;
      case 'potential':
        return team.potential;
      default:
        return team.utilization;
    }
  };

  // Calculate overall statistics
  const stats = {
    avgUtilization: data.reduce((sum, team) => sum + team.utilization, 0) / data.length,
    totalPotential: data.reduce((sum, team) => sum + team.potential, 0),
    totalActual: data.reduce((sum, team) => sum + team.actual, 0),
    totalMembers: data.reduce((sum, team) => sum + team.memberCount, 0)
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header with title and stats */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-medium text-gray-900 mb-2 md:mb-0">
          {getChartTitle()}
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{data.length}</div>
            <div className="text-xs text-gray-600">Teams</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {formatChartTooltip(stats.avgUtilization, 'percentage')}
            </div>
            <div className="text-xs text-gray-600">Avg Utilization</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{stats.totalMembers}</div>
            <div className="text-xs text-gray-600">Total Members</div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{
            top: 20,
            right: 30,
            left: 100,
            bottom: 20
          }}
          barCategoryGap="15%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ 
              value: sortBy === 'utilization' ? 'Utilization (%)' : 'Hours', 
              position: 'insideBottom', 
              offset: -10 
            }}
          />
          <YAxis 
            type="category"
            dataKey="teamName"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Main metric bar */}
          <Bar 
            dataKey={sortBy}
            onClick={handleBarClick}
            style={{ cursor: onTeamClick ? 'pointer' : 'default' }}
            radius={[0, 4, 4, 0]}
          >
            {data.map((team, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={team.color || getUtilizationColor(team.utilization)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Team ranking table */}
      {showRanking && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Team Rankings</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-900">Rank</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-900">Team</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Members</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Max Capacity</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Actual</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-900">Utilization</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((team, index) => (
                  <tr 
                    key={team.teamId} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      onTeamClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onTeamClick && onTeamClick(team.teamId)}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">#{team.rank}</span>
                        {team.rank <= 3 && (
                          <span className="ml-1">
                            {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: team.color || getUtilizationColor(team.utilization) }}
                        />
                        <span className="font-medium text-gray-900">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">
                      {team.memberCount}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900">
                      {formatChartTooltip(team.potential, 'hours')}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900">
                      {formatChartTooltip(team.actual, 'hours')}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-medium ${
                        team.utilization >= 80 && team.utilization <= 100 ? 'text-green-600' :
                        team.utilization > 100 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {formatChartTooltip(team.utilization, 'percentage')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        team.status === 'optimal' ? 'bg-green-100 text-green-800' :
                        team.status === 'under' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {team.status === 'optimal' ? 'Optimal' : 
                         team.status === 'under' ? 'Under' : 'Over'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-green-900 mb-2">Top Performers</h5>
          <div className="space-y-1">
            {data.slice(0, 3).map((team, index) => (
              <div key={team.teamId} className="flex justify-between text-xs">
                <span className="text-green-700">#{index + 1} {team.teamName}</span>
                <span className="font-medium text-green-900">
                  {formatChartTooltip(getPrimaryMetric(team), sortBy === 'utilization' ? 'percentage' : 'hours')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Company Totals</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-700">Total Max Capacity:</span>
              <span className="font-medium text-blue-900">
                {formatChartTooltip(stats.totalPotential, 'hours')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Total Actual:</span>
              <span className="font-medium text-blue-900">
                {formatChartTooltip(stats.totalActual, 'hours')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Overall Utilization:</span>
              <span className="font-medium text-blue-900">
                {formatChartTooltip((stats.totalActual / stats.totalPotential) * 100, 'percentage')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Distribution</h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">Optimal Teams:</span>
              <span className="font-medium text-green-600">
                {data.filter(team => team.status === 'optimal').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Under-utilized:</span>
              <span className="font-medium text-yellow-600">
                {data.filter(team => team.status === 'under').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Over-capacity:</span>
              <span className="font-medium text-red-600">
                {data.filter(team => team.status === 'over').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { ChartFilterControlsProps, ChartFilters } from '@/types/charts';

/**
 * Chart Filter Controls Component
 * 
 * Provides filtering and control options for chart data display.
 * Includes timeframe selection, team filtering, and display options.
 */
export function ChartFilterControls({
  filters,
  onFiltersChange,
  availableTeams,
  className = ''
}: ChartFilterControlsProps) {
  
  const handleTimeframeChange = (timeframe: ChartFilters['timeframe']) => {
    onFiltersChange({ timeframe });
  };

  const handleTeamToggle = (teamId: number) => {
    const currentTeams = filters.teams;
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter(id => id !== teamId)
      : [...currentTeams, teamId];
    
    onFiltersChange({ teams: newTeams });
  };

  const handleSelectAllTeams = () => {
    const allTeamIds = availableTeams.map(team => team.id);
    onFiltersChange({ teams: allTeamIds });
  };

  const handleDeselectAllTeams = () => {
    onFiltersChange({ teams: [] });
  };

  const handleUtilizationRangeChange = (range: [number, number]) => {
    onFiltersChange({ utilizationRange: range });
  };

  const handleShowProjectionsToggle = () => {
    onFiltersChange({ showProjections: !filters.showProjections });
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <h4 className="text-sm font-medium text-gray-900">Chart Filters</h4>
        
        {/* Reset filters button */}
        <button
          onClick={() => onFiltersChange({
            timeframe: 'current-week',
            teams: availableTeams.map(team => team.id),
            utilizationRange: [0, 200],
            showProjections: true
          })}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Timeframe Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Timeframe
          </label>
          <select
            value={filters.timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value as ChartFilters['timeframe'])}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="current-week">Current Week</option>
            <option value="current-sprint">Current Sprint</option>
            <option value="last-4-weeks">Last 4 Weeks</option>
            <option value="last-sprint">Last Sprint</option>
          </select>
        </div>

        {/* Team Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Teams ({filters.teams.length}/{availableTeams.length})
          </label>
          <div className="relative">
            <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto bg-white">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleSelectAllTeams}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  All
                </button>
                <button
                  onClick={handleDeselectAllTeams}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  None
                </button>
              </div>
              <div className="space-y-1">
                {availableTeams.map(team => (
                  <label key={team.id} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.teams.includes(team.id)}
                      onChange={() => handleTeamToggle(team.id)}
                      className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-xs truncate">{team.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Utilization Range */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Utilization Range
          </label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="200"
                value={filters.utilizationRange[0]}
                onChange={(e) => handleUtilizationRangeChange([
                  parseInt(e.target.value) || 0,
                  filters.utilizationRange[1]
                ])}
                className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                placeholder="Min"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="number"
                min="0"
                max="200"
                value={filters.utilizationRange[1]}
                onChange={(e) => handleUtilizationRangeChange([
                  filters.utilizationRange[0],
                  parseInt(e.target.value) || 200
                ])}
                className="w-16 text-xs border border-gray-300 rounded px-2 py-1"
                placeholder="Max"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Display Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={filters.showProjections}
                onChange={handleShowProjectionsToggle}
                className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-xs">Show Projections</span>
            </label>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.teams.length < availableTeams.length || 
        filters.utilizationRange[0] > 0 || 
        filters.utilizationRange[1] < 200 ||
        filters.timeframe !== 'current-week') && (
        <div className="pt-2 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600">Active filters:</span>
            
            {filters.timeframe !== 'current-week' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {filters.timeframe.replace('-', ' ')}
                <button
                  onClick={() => handleTimeframeChange('current-week')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.teams.length < availableTeams.length && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                {filters.teams.length} teams selected
                <button
                  onClick={handleSelectAllTeams}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {(filters.utilizationRange[0] > 0 || filters.utilizationRange[1] < 200) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                {filters.utilizationRange[0]}%-{filters.utilizationRange[1]}%
                <button
                  onClick={() => handleUtilizationRangeChange([0, 200])}
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {!filters.showProjections && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                Projections hidden
                <button
                  onClick={handleShowProjectionsToggle}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
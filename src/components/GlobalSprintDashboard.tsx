'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Target, TrendingUp, BarChart3, Minus, Plus } from 'lucide-react';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { Team } from '@/types';

interface GlobalSprintDashboardProps {
  team: Team;
  className?: string;
}

export default function GlobalSprintDashboard({ team, className = '' }: GlobalSprintDashboardProps) {
  const { currentSprint, teamStats, isLoading, error } = useGlobalSprint();
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sprintDashboardMinimized') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sprintDashboardMinimized', isMinimized.toString());
    }
  }, [isMinimized]);

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-3 sm:p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 sm:h-6 bg-gray-200 rounded w-32 sm:w-48 mb-3 sm:mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-20"></div>
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-12 sm:w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading sprint data</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentSprint) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No active sprint</p>
          <p className="text-sm text-gray-400">Sprint data will appear here when available</p>
        </div>
      </div>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-3 sm:p-4 transition-all duration-300 border-l-4 border-blue-500 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-wrap">
              <span className="font-semibold text-gray-900">Sprint {currentSprint.current_sprint_number}</span>
              <span className="text-gray-500">•</span>
              <span className="text-blue-600 font-medium">{currentSprint.progress_percentage}%</span>
              {teamStats && (
                <>
                  <span className="text-gray-500 hidden xs:inline">•</span>
                  <span className="text-green-600 font-medium">{teamStats.sprint_hours}h/{teamStats.total_capacity_hours}h</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={toggleMinimized}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors shrink-0 ml-2"
            title="Expand sprint dashboard"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={`bg-white rounded-lg shadow-md p-3 sm:p-6 transition-all duration-300 border-l-4 border-blue-500 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <span className="hidden sm:inline">Global Sprint Dashboard</span>
          <span className="sm:hidden">Sprint Dashboard</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Sprint #{currentSprint.current_sprint_number}
          </div>
          <button
            onClick={toggleMinimized}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Minimize sprint dashboard"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      

      {/* Global Sprint Overview */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1 sm:gap-0">
          <h3 className="font-semibold text-blue-900 text-sm sm:text-base">Global Sprint Progress</h3>
          <span className="text-xs sm:text-sm text-blue-700">
            {formatDate(currentSprint.sprint_start_date)} - {formatDate(currentSprint.sprint_end_date)}
          </span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-2 sm:h-3 mb-2">
          <div 
            className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${getProgressColor(currentSprint.progress_percentage)}`}
            style={{ width: `${currentSprint.progress_percentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs sm:text-sm text-blue-700">
          <span>{currentSprint.progress_percentage}% complete</span>
          <span>
            {currentSprint.days_remaining} day{currentSprint.days_remaining !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>

      {/* Team-Specific Statistics */}
      {teamStats && (
        <>
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <span className="truncate">{team.name} Sprint Statistics</span>
            </h3>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium text-blue-700">This Week</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-blue-900">
                  {teamStats.current_week_hours}h
                </div>
              </div>

              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  <span className="text-xs sm:text-sm font-medium text-green-700">Sprint Total</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-green-900">
                  {teamStats.sprint_hours}h
                </div>
              </div>

              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  <span className="text-xs sm:text-sm font-medium text-purple-700">Team Size</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-purple-900">
                  {teamStats.team_size}
                </div>
              </div>

              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                  <span className="text-xs sm:text-sm font-medium text-yellow-700">Capacity</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-yellow-900">
                  {teamStats.total_capacity_hours}h
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Utilization */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                <span className="hidden sm:inline">Team Capacity Utilization</span>
                <span className="sm:hidden">Capacity</span>
              </h3>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getUtilizationColor(teamStats.capacity_utilization)}`}>
                {Math.round(teamStats.capacity_utilization)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-2">
              <div 
                className="h-3 sm:h-4 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-blue-500"
                style={{ width: `${Math.min(100, teamStats.capacity_utilization)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs sm:text-sm text-gray-600">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Sprint Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Sprint Overview</h4>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sprint Length:</span>
                  <span className="font-medium">{currentSprint.sprint_length_weeks} week{currentSprint.sprint_length_weeks !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hours Logged:</span>
                  <span className="font-medium">{teamStats.sprint_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Team Capacity:</span>
                  <span className="font-medium">{teamStats.total_capacity_hours}h</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Team Performance</h4>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average per Member:</span>
                  <span className="font-medium">
                    {teamStats.team_size > 0 ? Math.round(teamStats.sprint_hours / teamStats.team_size) : 0}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">This Week:</span>
                  <span className="font-medium">{teamStats.current_week_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilization:</span>
                  <span className="font-medium">{Math.round(teamStats.capacity_utilization)}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
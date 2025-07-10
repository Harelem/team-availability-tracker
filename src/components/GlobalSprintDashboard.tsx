'use client';

import { Calendar, Clock, Users, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { Team } from '@/types';

interface GlobalSprintDashboardProps {
  team: Team;
  className?: string;
}

export default function GlobalSprintDashboard({ team, className = '' }: GlobalSprintDashboardProps) {
  const { currentSprint, teamStats, isLoading, error } = useGlobalSprint();

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
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
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

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Global Sprint Dashboard
        </h2>
        <div className="text-sm text-gray-500">
          Sprint #{currentSprint.current_sprint_number}
        </div>
      </div>

      {/* Global Sprint Overview */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900">Global Sprint Progress</h3>
          <span className="text-sm text-blue-700">
            {formatDate(currentSprint.sprint_start_date)} - {formatDate(currentSprint.sprint_end_date)}
          </span>
        </div>
        
        <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(currentSprint.progress_percentage)}`}
            style={{ width: `${currentSprint.progress_percentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-blue-700">
          <span>{currentSprint.progress_percentage}% complete</span>
          <span>
            {currentSprint.days_remaining} day{currentSprint.days_remaining !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>

      {/* Team-Specific Statistics */}
      {teamStats && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              {team.name} Sprint Statistics
            </h3>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Current Week</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {teamStats.current_week_hours}h
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Sprint Total</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {teamStats.sprint_hours}h
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Team Size</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {teamStats.team_size}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">Capacity</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {teamStats.total_capacity_hours}h
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Utilization */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                Team Capacity Utilization
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUtilizationColor(teamStats.capacity_utilization)}`}>
                {Math.round(teamStats.capacity_utilization)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div 
                className="h-4 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-blue-500"
                style={{ width: `${Math.min(100, teamStats.capacity_utilization)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-600">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Sprint Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Sprint Overview</h4>
              <div className="space-y-2 text-sm">
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Team Performance</h4>
              <div className="space-y-2 text-sm">
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
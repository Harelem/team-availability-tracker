'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, Users, Target, TrendingUp, Calendar } from 'lucide-react';
import { Team, TeamAnalytics, TeamSprint } from '@/types';
import { DatabaseService } from '@/lib/database';

interface SprintAnalyticsProps {
  team: Team;
  className?: string;
}

export default function SprintAnalytics({ team, className = '' }: SprintAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [currentSprint, setCurrentSprint] = useState<TeamSprint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [team.id]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsData, sprintData] = await Promise.all([
        DatabaseService.calculateTeamAnalytics(team.id),
        DatabaseService.getCurrentSprint(team.id)
      ]);
      
      setAnalytics(analyticsData);
      setCurrentSprint(sprintData);
    } catch (error) {
      console.error('Error loading sprint analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressPercentage = () => {
    if (!currentSprint) return 0;
    
    const now = new Date();
    const start = new Date(currentSprint.start_date);
    const end = new Date(currentSprint.end_date);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / total) * 100);
  };

  const getDaysRemaining = () => {
    if (!currentSprint) return 0;
    
    const now = new Date();
    const end = new Date(currentSprint.end_date);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (loading) {
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

  if (!analytics || !currentSprint) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">No sprint analytics available</p>
          <p className="text-sm text-gray-400">Create a sprint to see analytics</p>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();
  const daysRemaining = getDaysRemaining();

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Sprint Analytics
        </h2>
        <span className="text-sm text-gray-500">
          Sprint #{currentSprint.sprint_number}
        </span>
      </div>

      {/* Sprint Overview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Sprint Progress</span>
          <span className="text-sm text-gray-500">
            {formatDate(currentSprint.start_date)} - {formatDate(currentSprint.end_date)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(progressPercentage)}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>{progressPercentage}% complete</span>
          <span>{daysRemaining} days remaining</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Current Week</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {analytics.currentWeekHours}h
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Sprint Total</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {analytics.sprintHours}h
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Avg/Member</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {Math.round(analytics.averageHoursPerMember)}h
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Capacity</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">
            {analytics.teamCapacity}h
          </div>
        </div>
      </div>

      {/* Capacity Utilization */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            Capacity Utilization
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUtilizationColor(analytics.capacityUtilization)}`}>
            {Math.round(analytics.capacityUtilization)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="h-4 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-blue-500"
            style={{ width: `${Math.min(100, analytics.capacityUtilization)}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Sprint Efficiency</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Hours Logged:</span>
              <span className="font-medium">{analytics.sprintHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Capacity:</span>
              <span className="font-medium">{analytics.teamCapacity}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Utilization:</span>
              <span className="font-medium">{Math.round(analytics.capacityUtilization)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Team Performance</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Average per Member:</span>
              <span className="font-medium">{Math.round(analytics.averageHoursPerMember)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">This Week:</span>
              <span className="font-medium">{analytics.currentWeekHours}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sprint Length:</span>
              <span className="font-medium">{team.sprint_length_weeks || 1} week(s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
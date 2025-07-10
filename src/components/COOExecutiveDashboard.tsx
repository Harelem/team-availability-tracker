'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Calendar,
  Building2,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Award,
  Activity
} from 'lucide-react';
import { DatabaseService } from '@/lib/database';
import { COODashboardData } from '@/types';

interface COOExecutiveDashboardProps {
  className?: string;
}

export default function COOExecutiveDashboard({ className = '' }: COOExecutiveDashboardProps) {
  const [dashboardData, setDashboardData] = useState<COODashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await DatabaseService.getCOODashboardData();
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading COO dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  const refreshDashboard = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatHours = (hours: number) => `${Math.round(hours)}h`;
  const formatPercentage = (percentage: number) => `${Math.round(percentage)}%`;

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-100';
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getCapacityStatusIcon = (status: 'optimal' | 'under' | 'over') => {
    switch (status) {
      case 'optimal':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'under':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'over':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCapacityStatusColor = (status: 'optimal' | 'under' | 'over') => {
    switch (status) {
      case 'optimal':
        return 'text-green-600 bg-green-100';
      case 'under':
        return 'text-yellow-600 bg-yellow-100';
      case 'over':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading COO dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error || 'Dashboard data unavailable'}</p>
          <button
            onClick={refreshDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <span>COO Executive Dashboard</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Company-wide workforce capacity analytics • {new Date().toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Activity className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Company Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Total Workforce</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {dashboardData.companyOverview.totalMembers}
          </div>
          <div className="text-xs text-blue-600">
            {dashboardData.companyOverview.totalTeams} teams
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Weekly Potential</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatHours(dashboardData.companyOverview.weeklyPotential)}
          </div>
          <div className="text-xs text-green-600">
            {formatHours(dashboardData.companyOverview.weeklyPotential / dashboardData.companyOverview.totalMembers)} per person
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Current Utilization</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {formatPercentage(dashboardData.companyOverview.currentUtilization)}
          </div>
          <div className={`text-xs px-2 py-1 rounded-full ${getUtilizationColor(dashboardData.companyOverview.currentUtilization)}`}>
            {dashboardData.companyOverview.currentUtilization >= 90 ? 'Optimal' : 
             dashboardData.companyOverview.currentUtilization >= 80 ? 'Good' : 'Below Target'}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Capacity Gap</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {formatHours(Math.abs(dashboardData.companyOverview.capacityGap))}
          </div>
          <div className="text-xs text-orange-600">
            {dashboardData.companyOverview.capacityGap > 0 ? 'Under-utilized' : 'Over-capacity'}
          </div>
        </div>
      </div>

      {/* Team Capacity Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          Team Capacity Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardData.teamComparison.map((team) => (
            <div key={team.teamId} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getCapacityStatusIcon(team.capacityStatus)}
                  <span className="font-medium text-gray-900">{team.teamName}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getCapacityStatusColor(team.capacityStatus)}`}>
                  {formatPercentage(team.utilization)}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Potential:</span>
                  <span className="font-medium">{formatHours(team.weeklyPotential)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actual:</span>
                  <span className="font-medium">{formatHours(team.actualHours)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gap:</span>
                  <span className={`font-medium ${team.capacityGap > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {team.capacityGap > 0 ? '+' : ''}{formatHours(team.capacityGap)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Team Size:</span>
                  <span className="font-medium">{team.memberCount} members</span>
                </div>
              </div>
              
              {/* Utilization Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      team.utilization > 100 ? 'bg-red-500' :
                      team.utilization >= 90 ? 'bg-green-500' :
                      team.utilization >= 80 ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${Math.min(100, team.utilization)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint Analytics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          Sprint Capacity Overview
        </h3>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">
                Sprint {dashboardData.sprintAnalytics.currentSprintNumber}
              </div>
              <div className="text-sm text-blue-600">
                {dashboardData.sprintAnalytics.sprintWeeks} week{dashboardData.sprintAnalytics.sprintWeeks !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900">
                {formatHours(dashboardData.sprintAnalytics.sprintPotential)}
              </div>
              <div className="text-sm text-purple-600">Sprint Potential</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">
                {formatPercentage(dashboardData.sprintAnalytics.sprintUtilization)}
              </div>
              <div className="text-sm text-green-600">Sprint Utilization</div>
            </div>
          </div>
          
          {/* Sprint Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(100, dashboardData.sprintAnalytics.sprintUtilization)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sprint Progress: {formatPercentage(dashboardData.sprintAnalytics.sprintUtilization)}</span>
            <span>Target: 85-95%</span>
          </div>
        </div>
      </div>

      {/* Optimization Recommendations */}
      {dashboardData.optimizationRecommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-600" />
            Optimization Recommendations
          </h3>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="space-y-3">
              {dashboardData.optimizationRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800">{recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Capacity Forecast */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          Capacity Forecast
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Next Week Projection</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Potential:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextWeekProjection.potentialHours)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Projected:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextWeekProjection.projectedActual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Utilization:</span>
                <span className="font-medium">{formatPercentage(dashboardData.capacityForecast.nextWeekProjection.expectedUtilization)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Confidence:</span>
                <span className="font-medium">{dashboardData.capacityForecast.nextWeekProjection.confidenceLevel}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">Sprint Outlook</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Sprint Potential:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextSprintProjection.sprintPotential)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Projected Outcome:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextSprintProjection.projectedOutcome)}</span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-green-700 font-medium mb-1">Risk Factors:</div>
                {dashboardData.capacityForecast.nextSprintProjection.riskFactors.map((risk, index) => (
                  <div key={index} className="text-xs text-green-600 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
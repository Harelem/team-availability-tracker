'use client';

import { 
  ArrowLeft,
  Users,
  Target,
  TrendingUp,
  Zap,
  Building2,
  BarChart3,
  Calendar,
  Activity,
  Award
} from 'lucide-react';
import { COOUser, COODashboardData } from '@/types';
import COOExportButton from './COOExportButton';
import { formatHours, formatPercentage, getUtilizationStatusColor } from '@/lib/calculationService';

interface MobileCOODashboardProps {
  currentUser?: COOUser;
  dashboardData: COODashboardData;
  onBack?: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function MobileCOODashboard({
  currentUser,
  dashboardData,
  onBack,
  onRefresh,
  isLoading,
  error
}: MobileCOODashboardProps) {
  
  // Using standardized calculation service functions

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-red-500 font-medium mb-2">Error loading dashboard</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-3">
          {/* Back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Selection</span>
            </button>
          )}
          
          {/* Header content */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">COO Dashboard</h1>
            </div>
            <button
              onClick={onRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 touch-manipulation"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
          
          {/* User info */}
          {currentUser && (
            <p className="text-sm text-gray-600 mb-3">
              {currentUser.name} • {currentUser.title}
            </p>
          )}
          
          {/* Mobile Export Button */}
          <COOExportButton 
            currentUser={currentUser}
            disabled={isLoading || error !== null}
            className="w-full justify-center"
          />
        </div>
      </div>

      {/* Mobile Content */}
      <div className="p-4 space-y-4">
        
        {/* Company Overview - Mobile Cards */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            Company Overview
          </h2>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Total Workforce */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Total Workforce</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-900">
                    {dashboardData.companyOverview.totalMembers}
                  </div>
                  <div className="text-xs text-blue-600">
                    {dashboardData.companyOverview.totalTeams} teams
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Potential */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Weekly Potential</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-900">
                    {formatHours(dashboardData.companyOverview.weeklyPotential)}
                  </div>
                  <div className="text-xs text-green-600">
                    {formatHours(dashboardData.companyOverview.weeklyPotential / dashboardData.companyOverview.totalMembers)} per person
                  </div>
                </div>
              </div>
            </div>

            {/* Current Utilization */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Current Utilization</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-900">
                    {formatPercentage(dashboardData.companyOverview.currentUtilization)}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getUtilizationStatusColor(dashboardData.companyOverview.currentUtilization)}`}>
                    {dashboardData.companyOverview.currentUtilization >= 90 ? 'Optimal' : 
                     dashboardData.companyOverview.currentUtilization >= 80 ? 'Good' : 'Below Target'}
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Gap */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Capacity Gap</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-orange-900">
                    {formatHours(Math.abs(dashboardData.companyOverview.capacityGap))}
                  </div>
                  <div className="text-xs text-orange-600">
                    {dashboardData.companyOverview.capacityGap > 0 ? 'Under-utilized' : 'Over-capacity'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Capacity - Mobile List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            Team Capacity
          </h2>
          
          <div className="space-y-2">
            {dashboardData.teamComparison.map((team) => (
              <div key={team.teamId} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{team.teamName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${getUtilizationStatusColor(team.utilization)}`}>
                    {formatPercentage(team.utilization)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Members:</span>
                    <span className="font-medium ml-1">{team.memberCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Potential:</span>
                    <span className="font-medium ml-1">{formatHours(team.weeklyPotential)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Actual:</span>
                    <span className="font-medium ml-1">{formatHours(team.actualHours)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gap:</span>
                    <span className={`font-medium ml-1 ${team.capacityGap > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {team.capacityGap > 0 ? '+' : ''}{formatHours(team.capacityGap)}
                    </span>
                  </div>
                </div>
                
                {/* Mobile Progress Bar */}
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

        {/* Sprint Analytics - Mobile */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Sprint Overview
          </h2>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-900">
                  Sprint {dashboardData.sprintAnalytics.currentSprintNumber}
                </div>
                <div className="text-sm text-blue-600">
                  {dashboardData.sprintAnalytics.sprintWeeks} week{dashboardData.sprintAnalytics.sprintWeeks !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-purple-900">
                    {formatHours(dashboardData.sprintAnalytics.sprintPotential)}
                  </div>
                  <div className="text-xs text-purple-600">Sprint Potential</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-green-900">
                    {formatPercentage(dashboardData.sprintAnalytics.sprintUtilization)}
                  </div>
                  <div className="text-xs text-green-600">Sprint Utilization</div>
                </div>
              </div>
              
              {/* Mobile Sprint Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, dashboardData.sprintAnalytics.sprintUtilization)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progress: {formatPercentage(dashboardData.sprintAnalytics.sprintUtilization)}</span>
                <span>Target: 85-95%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations - Mobile */}
        {dashboardData.optimizationRecommendations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-gray-600" />
              Quick Actions
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="space-y-2">
                {dashboardData.optimizationRecommendations.slice(0, 3).map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-yellow-800">{recommendation}</p>
                  </div>
                ))}
                {dashboardData.optimizationRecommendations.length > 3 && (
                  <p className="text-xs text-yellow-600 mt-2">
                    +{dashboardData.optimizationRecommendations.length - 3} more recommendations in full report
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
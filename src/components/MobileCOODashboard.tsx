'use client';

import { 
  ArrowLeft,
  Users,
  Building2,
  BarChart3,
  Activity,
  Award
} from 'lucide-react';
import { COOUser, COODashboardData } from '@/types';
import COOExportButton from './COOExportButton';
import { formatHours, formatPercentage, getUtilizationStatusColor } from '@/lib/calculationService';
import SimplifiedMetricsCards from './SimplifiedMetricsCards';
import { ConsistentLoader } from '@/components/ui/ConsistentLoader';

interface MobileCOODashboardProps {
  currentUser?: COOUser;
  dashboardData: COODashboardData;
  onBack?: () => void;
  onTeamNavigate?: (team: { id: number; name: string }) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function MobileCOODashboard({
  currentUser,
  dashboardData,
  onBack,
  onTeamNavigate,
  onRefresh,
  isLoading,
  error
}: MobileCOODashboardProps) {
  
  // Using standardized calculation service functions

  if (isLoading) {
    return (
      <ConsistentLoader
        variant="skeleton"
        message="Loading mobile dashboard..."
        fullPage={true}
        testId="mobile-coo-dashboard-loading"
      />
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
        
        {/* Simplified Mobile Metrics Cards */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            Company Overview
          </h2>
          
          <SimplifiedMetricsCards 
            dashboardData={dashboardData}
            selectedDate={new Date()}
            className="grid-cols-1 sm:grid-cols-2"
          />
        </div>

        {/* Team Capacity - Mobile List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            Team Capacity
          </h2>
          
          <div className="space-y-2">
            {dashboardData.teamComparison.map((team) => (
              <div 
                key={team.teamId} 
                className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onTeamNavigate && onTeamNavigate({ id: team.teamId, name: team.teamName })}
              >
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
                    <span className="text-gray-600">Max:</span>
                    <span className="font-medium ml-1">{formatHours(team.maxCapacity)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Capacity:</span>
                    <span className="font-medium ml-1">{formatHours(team.weeklyPotential)}</span>
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
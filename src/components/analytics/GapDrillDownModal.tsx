'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Calendar, 
  Clock,
  AlertTriangle,
  TrendingDown,
  Activity,
  Target,
  Eye
} from 'lucide-react';
import { COODashboardData, TeamCapacityStatus } from '@/types';
import { formatHours, formatPercentage } from '@/lib/calculationService';

interface GapDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: COODashboardData;
  selectedMetric?: string;
}

interface TeamGapDetail {
  teamId: number;
  teamName: string;
  capacityGap: number;
  utilizationGap: number;
  maxCapacity: number;
  sprintPotential: number;
  actualHours: number;
  memberCount: number;
  status: 'optimal' | 'under' | 'over';
  issues: string[];
  recommendations: string[];
}

export default function GapDrillDownModal({
  isOpen,
  onClose,
  dashboardData,
  selectedMetric
}: GapDrillDownModalProps) {
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'teams' | 'trends'>('overview');

  const teamGapDetails = useMemo((): TeamGapDetail[] => {
    return dashboardData.teamComparison.map(team => {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Analyze team issues
      if (team.utilization < 70) {
        issues.push('Low utilization - significant under-capacity');
        recommendations.push('Increase workload or reassign team members');
      } else if (team.utilization < 80) {
        issues.push('Below target utilization');
        recommendations.push('Review capacity allocation and planning');
      }

      if (team.utilization > 100) {
        issues.push('Over-committed - risk of burnout');
        recommendations.push('Reduce commitments or add resources');
      }

      if (Math.abs(team.capacityGap) > 20) {
        issues.push('Large capacity gap detected');
        recommendations.push('Review resource planning and allocation');
      }

      // Default recommendations if no issues
      if (issues.length === 0) {
        recommendations.push('Team is performing optimally');
      }

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        capacityGap: team.capacityGap,
        utilizationGap: team.utilization - 85, // Gap from target 85%
        maxCapacity: team.maxCapacity,
        sprintPotential: team.weeklyPotential,
        actualHours: team.actualHours,
        memberCount: team.memberCount,
        status: team.capacityStatus,
        issues,
        recommendations
      };
    }).sort((a, b) => Math.abs(b.capacityGap) - Math.abs(a.capacityGap));
  }, [dashboardData.teamComparison]);

  const gapSummary = useMemo(() => {
    const totalGap = Math.abs(dashboardData.companyOverview.capacityGap);
    const underUtilizedGap = teamGapDetails
      .filter(t => t.status === 'under')
      .reduce((sum, team) => sum + Math.abs(team.capacityGap), 0);
    const overCapacityGap = teamGapDetails
      .filter(t => t.status === 'over')
      .reduce((sum, team) => sum + Math.abs(team.capacityGap), 0);
    
    return {
      totalGap,
      underUtilizedGap,
      overCapacityGap,
      criticalTeams: teamGapDetails.filter(t => Math.abs(t.capacityGap) > 20).length,
      optimalTeams: teamGapDetails.filter(t => t.status === 'optimal').length
    };
  }, [teamGapDetails, dashboardData.companyOverview.capacityGap]);

  if (!isOpen) return null;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Gap Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-6 h-6 text-red-600" />
            <span className="text-xs font-medium text-red-600 bg-red-200 px-2 py-1 rounded-full">
              TOTAL GAP
            </span>
          </div>
          <div className="text-2xl font-bold text-red-900">
            {formatHours(gapSummary.totalGap)}
          </div>
          <div className="text-sm text-red-700">
            {formatPercentage((gapSummary.totalGap / dashboardData.companyOverview.sprintMax) * 100)} of max capacity
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600 bg-yellow-200 px-2 py-1 rounded-full">
              AT RISK
            </span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">
            {gapSummary.criticalTeams}
          </div>
          <div className="text-sm text-yellow-700">
            Teams with significant gaps
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6 text-green-600" />
            <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded-full">
              OPTIMAL
            </span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {gapSummary.optimalTeams}
          </div>
          <div className="text-sm text-green-700">
            Teams performing well
          </div>
        </div>
      </div>

      {/* Gap Distribution Chart - Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6 h-80 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-medium text-gray-700 mb-2">Capacity Gap Distribution</h3>
          <p className="text-sm text-gray-500">Chart visualization will be available soon</p>
        </div>
      </div>
    </div>
  );

  const renderTeamDetails = () => (
    <div className="space-y-4">
      {teamGapDetails.map((team) => (
        <div key={team.teamId} className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors touch-target"
            onClick={() => setExpandedTeam(expandedTeam === team.teamId ? null : team.teamId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  team.status === 'optimal' ? 'bg-green-500' :
                  team.status === 'under' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                  <p className="text-sm text-gray-600">
                    Gap: {team.capacityGap > 0 ? '+' : ''}{formatHours(team.capacityGap)} | 
                    {' '}{team.memberCount} members
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatPercentage(team.actualHours > 0 ? (team.actualHours / team.sprintPotential) * 100 : 0)}
                  </div>
                  <div className="text-xs text-gray-500">Utilization</div>
                </div>
                {expandedTeam === team.teamId ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {expandedTeam === team.teamId && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Capacity Breakdown */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Capacity Breakdown
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Max Capacity:</span>
                      <span className="font-medium">{formatHours(team.maxCapacity)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sprint Potential:</span>
                      <span className="font-medium">{formatHours(team.sprintPotential)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Actual Hours:</span>
                      <span className="font-medium">{formatHours(team.actualHours)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-600">Capacity Gap:</span>
                      <span className={`font-medium ${team.capacityGap > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {team.capacityGap > 0 ? '+' : ''}{formatHours(team.capacityGap)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issues & Recommendations */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Analysis & Recommendations
                  </h4>
                  
                  {team.issues.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-red-700 mb-1">Issues Identified:</h5>
                      {team.issues.map((issue, index) => (
                        <p key={index} className="text-xs text-red-600 mb-1">• {issue}</p>
                      ))}
                    </div>
                  )}
                  
                  <div>
                    <h5 className="text-xs font-medium text-blue-700 mb-1">Recommendations:</h5>
                    {team.recommendations.map((rec, index) => (
                      <p key={index} className="text-xs text-blue-600 mb-1">• {rec}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      {/* Team Capacity Gaps Chart - Placeholder */}
      <div className="bg-gray-50 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-medium text-gray-700 mb-2">Team Capacity Gaps</h3>
          <p className="text-sm text-gray-500">Chart visualization will be available soon</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Gap Analysis Summary</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Total capacity gap represents {formatPercentage((gapSummary.totalGap / dashboardData.companyOverview.sprintMax) * 100)} of maximum capacity</p>
          <p>• {gapSummary.criticalTeams} teams require immediate attention</p>
          <p>• {gapSummary.optimalTeams} teams are performing within optimal range</p>
          <p>• Focus on balancing under-utilized and over-committed teams</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Gap Analysis Deep Dive
            </h2>
            <p className="text-gray-600 mt-1">
              Detailed capacity gap analysis and recommendations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full touch-target"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'teams', label: 'Team Details', icon: Users },
              { id: 'trends', label: 'Analysis', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id as any)}
                className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeView === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeView === 'overview' && renderOverview()}
          {activeView === 'teams' && renderTeamDetails()}
          {activeView === 'trends' && renderTrends()}
        </div>
      </div>
    </div>
  );
}
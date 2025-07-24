'use client';

import { useState, useEffect } from 'react';
import { Building2, TrendingUp, Calendar, Users, AlertTriangle } from 'lucide-react';
import { Team, TeamMember, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';
import { calculateSprintPeriod, calculateWorkingDaysInPeriod, getSprintDescription, formatSprintDateRange } from '@/utils/sprintCalculations';

interface TeamSprintStatus {
  teamName: string;
  teamId: number;
  completeMembers: number;
  totalMembers: number;
  teamCompletionRate: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  color?: string;
}

interface CompanyHoursStatus {
  currentSprint: TeamSprintStatus[];
  nextSprint: TeamSprintStatus[];
}

interface COOHoursStatusOverviewProps {
  allTeams: Team[];
  currentSprint: CurrentGlobalSprint;
}

export default function COOHoursStatusOverview({ allTeams, currentSprint }: COOHoursStatusOverviewProps) {
  const [companyStatus, setCompanyStatus] = useState<CompanyHoursStatus>({
    currentSprint: [],
    nextSprint: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (allTeams && currentSprint) {
      loadCompanyHoursStatus();
    }
  }, [allTeams, currentSprint]);

  const loadCompanyHoursStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading company-wide hours status...');
      
      const currentPeriod = calculateSprintPeriod(currentSprint, 0);
      const nextPeriod = calculateSprintPeriod(currentSprint, 1);
      
      const currentSprintTeamStatus: TeamSprintStatus[] = [];
      const nextSprintTeamStatus: TeamSprintStatus[] = [];
      
      for (const team of allTeams) {
        // Get team members
        const teamMembers = await DatabaseService.getTeamMembers(team.id);
        
        if (teamMembers.length === 0) {
          console.log(`⚠️ Team ${team.name} has no members, skipping`);
          continue;
        }
        
        // Current sprint status for this team
        const currentStatus = await checkTeamSprintStatus(team, teamMembers, currentPeriod);
        currentSprintTeamStatus.push({
          teamName: team.name,
          teamId: team.id,
          color: team.color,
          ...currentStatus
        });
        
        // Next sprint status for this team
        const nextStatus = await checkTeamSprintStatus(team, teamMembers, nextPeriod);
        nextSprintTeamStatus.push({
          teamName: team.name,
          teamId: team.id,
          color: team.color,
          ...nextStatus
        });
      }
      
      setCompanyStatus({
        currentSprint: currentSprintTeamStatus.sort((a, b) => b.teamCompletionRate - a.teamCompletionRate),
        nextSprint: nextSprintTeamStatus.sort((a, b) => b.teamCompletionRate - a.teamCompletionRate)
      });
      
      console.log('✅ Company hours status loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading company hours status:', error);
      setError('Failed to load company hours status');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTeamSprintStatus = async (
    team: Team,
    teamMembers: TeamMember[],
    sprintPeriod: { start: string; end: string }
  ) => {
    const workingDays = calculateWorkingDaysInPeriod(sprintPeriod.start, sprintPeriod.end);
    
    // Get all schedule entries for team members in this period
    const scheduleData = await DatabaseService.getScheduleEntries(
      sprintPeriod.start,
      sprintPeriod.end,
      team.id
    );
    
    // Calculate completion per member
    let completeMembers = 0;
    
    teamMembers.forEach(member => {
      const memberSchedule = scheduleData[member.id] || {};
      const filledDays = Object.keys(memberSchedule).length;
      const completionRate = workingDays > 0 ? (filledDays / workingDays) * 100 : 0;
      
      if (completionRate >= 100) {
        completeMembers++;
      }
    });
    
    const totalMembers = teamMembers.length;
    const teamCompletionRate = totalMembers > 0 ? (completeMembers / totalMembers) * 100 : 0;
    
    let status: 'excellent' | 'good' | 'needs_attention' | 'critical';
    if (teamCompletionRate >= 90) {
      status = 'excellent';
    } else if (teamCompletionRate >= 70) {
      status = 'good';
    } else if (teamCompletionRate >= 50) {
      status = 'needs_attention';
    } else {
      status = 'critical';
    }
    
    return {
      completeMembers,
      totalMembers,
      teamCompletionRate,
      status
    };
  };

  const TeamStatusBadge = ({ status }: { status: 'excellent' | 'good' | 'needs_attention' | 'critical' }) => {
    const badges = {
      excellent: { emoji: '🎉', color: 'text-green-600', bg: 'bg-green-100' },
      good: { emoji: '✅', color: 'text-blue-600', bg: 'bg-blue-100' },
      needs_attention: { emoji: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      critical: { emoji: '🚨', color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    const { emoji, color, bg } = badges[status];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color} ${bg}`}>
        <span>{emoji}</span>
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </div>
    );
  };

  const getProgressBarColor = (status: 'excellent' | 'good' | 'needs_attention' | 'critical') => {
    const colors = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      needs_attention: 'bg-yellow-500',
      critical: 'bg-red-500'
    };
    return colors[status];
  };

  const CompanyCompletionSummary = ({ sprintData }: { sprintData: TeamSprintStatus[] }) => {
    const totalMembers = sprintData.reduce((sum, team) => sum + team.totalMembers, 0);
    const completeMembers = sprintData.reduce((sum, team) => sum + team.completeMembers, 0);
    const companyRate = totalMembers > 0 ? Math.round((completeMembers / totalMembers) * 100) : 0;
    
    return (
      <div className="text-center bg-gray-50 p-4 rounded-lg">
        <div className="text-3xl font-bold text-gray-900 mb-1">{companyRate}%</div>
        <div className="text-sm text-gray-600">
          {completeMembers}/{totalMembers} employees completed
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Across {sprintData.length} teams
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="coo-hours-status bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-gray-100 p-6 rounded-lg h-80"></div>
            <div className="bg-gray-100 p-6 rounded-lg h-80"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coo-hours-status bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coo-hours-status bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Company-Wide Hours Completion Status</h2>
          <p className="text-sm text-gray-600">Track sprint completion across all teams</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Current Sprint Overview */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              {getSprintDescription(0)} Completion
            </h3>
          </div>
          <p className="text-sm text-blue-700 mb-6">
            {formatSprintDateRange(calculateSprintPeriod(currentSprint, 0))}
          </p>
          
          {companyStatus.currentSprint.length === 0 ? (
            <div className="text-center py-8 text-blue-700">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teams with members found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {companyStatus.currentSprint.map(team => (
                  <div key={team.teamId} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{team.teamName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {team.completeMembers}/{team.totalMembers}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(team.teamCompletionRate)}%
                        </span>
                        <TeamStatusBadge status={team.status} />
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(team.status)}`}
                        style={{ width: `${team.teamCompletionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <CompanyCompletionSummary sprintData={companyStatus.currentSprint} />
            </>
          )}
        </div>
        
        {/* Next Sprint Overview */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">
              {getSprintDescription(1)} Preparation
            </h3>
          </div>
          <p className="text-sm text-green-700 mb-6">
            {formatSprintDateRange(calculateSprintPeriod(currentSprint, 1))}
          </p>
          
          {companyStatus.nextSprint.length === 0 ? (
            <div className="text-center py-8 text-green-700">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teams with members found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {companyStatus.nextSprint.map(team => (
                  <div key={team.teamId} className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{team.teamName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {team.completeMembers}/{team.totalMembers}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(team.teamCompletionRate)}%
                        </span>
                        <TeamStatusBadge status={team.status} />
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(team.status)}`}
                        style={{ width: `${team.teamCompletionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <CompanyCompletionSummary sprintData={companyStatus.nextSprint} />
            </>
          )}
        </div>
      </div>
      
      {/* Key Insights */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Key Insights</h4>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {companyStatus.currentSprint.filter(t => t.status === 'excellent').length}
            </div>
            <div className="text-gray-600">Excellent Teams</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {companyStatus.currentSprint.filter(t => t.status === 'needs_attention').length}
            </div>
            <div className="text-gray-600">Need Attention</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {companyStatus.currentSprint.filter(t => t.status === 'critical').length}
            </div>
            <div className="text-gray-600">Critical Status</div>
          </div>
        </div>
      </div>
    </div>
  );
}
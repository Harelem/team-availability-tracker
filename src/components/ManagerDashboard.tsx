'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Users, Clock, Calendar, AlertCircle, TrendingUp, Settings, BarChart3, Table } from 'lucide-react';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import PersonalDashboard from './PersonalDashboard';
import ScheduleTable from './ScheduleTable';
import PersonalStatsCard from './PersonalStatsCard';
import TeamCompletionModal from './TeamCompletionModal';
import TeamMemberManagement from './TeamMemberManagement';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';
import { RealTimeCalculationService, type TeamMemberSubmissionStatus } from '@/lib/realTimeCalculationService';

interface ManagerDashboardProps {
  user: TeamMember;
  team: Team;
  teamMembers: TeamMember[];
  className?: string;
}

type TabType = 'overview' | 'schedule' | 'management';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Team completion and status overview'
  },
  {
    id: 'schedule',
    label: 'Team Schedule',
    icon: Table,
    description: 'Full team availability with inline editing'
  },
  {
    id: 'management',
    label: 'Team Management',
    icon: Settings,
    description: 'Add, edit, and manage team members'
  }
];

export default function ManagerDashboard({
  user,
  team,
  teamMembers,
  className = ''
}: ManagerDashboardProps) {
  // Get current sprint from context
  const { currentSprint, isLoading: sprintLoading } = useGlobalSprint();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Real-time team completion data
  const [teamCompletionData, setTeamCompletionData] = useState<{
    totalMembers: number;
    completedMembers: number;
    completionPercentage: number;
    totalSubmittedHours: number;
    sprintPotentialHours: number;
  } | null>(null);
  
  const [memberSubmissionStatuses, setMemberSubmissionStatuses] = useState<TeamMemberSubmissionStatus[]>([]);
  const [isLoadingTeamData, setIsLoadingTeamData] = useState(true);

  // Calculate working days in sprint (excluding weekends)
  const sprintWorkingDays = useMemo(() => {
    if (!currentSprint) return [];
    
    const dates: Date[] = [];
    const start = new Date(currentSprint.sprint_start_date || Date.now());
    const end = new Date(currentSprint.sprint_end_date || Date.now() + 14 * 24 * 60 * 60 * 1000);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip Friday (5) and Saturday (6) - Israeli weekend
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        dates.push(new Date(d));
      }
    }
    return dates;
  }, [currentSprint]);

  // Load team statistics
  const loadTeamStats = useCallback(async () => {
    if (!currentSprint || !team?.id || teamMembers.length === 0) return;
    
    try {
      setIsLoadingTeamData(true);
      
      const startDate = sprintWorkingDays[0]?.toISOString().split('T')[0];
      const endDate = sprintWorkingDays[sprintWorkingDays.length - 1]?.toISOString().split('T')[0];
      
      if (!startDate || !endDate) return;
      
      const teamStats = await RealTimeCalculationService.calculateTeamSubmissionStatus(
        teamMembers,
        startDate,
        endDate,
        team.id
      );

      setMemberSubmissionStatuses(teamStats.memberStatuses);
      setTeamCompletionData({
        totalMembers: teamStats.totalMembers,
        completedMembers: teamStats.completedMembers,
        completionPercentage: teamStats.completionPercentage,
        totalSubmittedHours: teamStats.totalSubmittedHours,
        sprintPotentialHours: teamStats.sprintPotentialHours
      });

    } catch (error) {
      console.error('Error loading team stats:', error);
    } finally {
      setIsLoadingTeamData(false);
    }
  }, [currentSprint, team?.id, teamMembers, sprintWorkingDays]);

  // Load team stats on mount and when dependencies change
  React.useEffect(() => {
    loadTeamStats();
  }, [loadTeamStats]);

  const teamStats = useMemo(() => {
    if (!teamCompletionData) {
      return {
        totalMembers: teamMembers.length,
        completedMembers: 0,
        completionPercentage: 0,
        totalSubmittedHours: 0,
        sprintPotentialHours: 0,
        sprintLength: sprintWorkingDays.length
      };
    }

    return {
      ...teamCompletionData,
      sprintLength: sprintWorkingDays.length
    };
  }, [teamCompletionData, teamMembers.length, sprintWorkingDays.length]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Team Completion Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PersonalStatsCard
                title="Team Completion"
                value={`${teamStats.completedMembers}/${teamStats.totalMembers}`}
                icon={Users}
                color="blue"
                description={`${teamStats.completionPercentage}% completed • Click for details`}
                onClick={() => setShowCompletionModal(true)}
              />
              
              <PersonalStatsCard
                title="Sprint Hours"
                value={`${teamStats.totalSubmittedHours}h`}
                icon={Clock}
                color="green"
                description={`of ${teamStats.sprintPotentialHours}h potential`}
              />
              
              <PersonalStatsCard
                title="Sprint Length"
                value={`${teamStats.sprintLength} days`}
                icon={Calendar}
                color="purple"
                description="Working days in current sprint"
              />
            </div>

            {/* Sprint Hours Summary */}
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  Sprint Hours Summary
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Expandable summary of team member hours and progress
                </p>
              </div>
              <div className="p-6">
                {isLoadingTeamData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading team data...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberSubmissionStatuses.map(memberStatus => {
                      const statusColors = {
                        complete: { bg: 'bg-green-100', text: 'text-green-800', label: 'Complete' },
                        partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
                        missing: { bg: 'bg-red-100', text: 'text-red-800', label: 'Missing' }
                      };
                      
                      const statusColor = statusColors[memberStatus.currentWeekStatus];
                      
                      return (
                        <div key={memberStatus.memberId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {memberStatus.memberName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{memberStatus.memberName}</div>
                              <div className="text-sm text-gray-500">{memberStatus.hebrew}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-medium text-gray-900">{memberStatus.sprintSubmittedHours}h</div>
                              <div className="text-sm text-gray-500">submitted</div>
                            </div>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}>
                              {statusColor.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* My Schedule Widget */}
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  My Schedule
                  <span className="text-sm font-normal text-gray-500 ml-2">(Collapsible)</span>
                </h3>
              </div>
              <div className="border-gray-200">
                <PersonalDashboard 
                  user={user}
                  team={team}
                  teamMembers={[]}
                  className="border-none shadow-none"
                />
              </div>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Table className="w-5 h-5 text-gray-600" />
                  Team Availability
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full ml-3">
                    Inline Editing Enabled
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click any cell to edit directly. Changes are saved automatically.
                </p>
              </div>
              
              <ScheduleTable 
                currentUser={user} 
                teamMembers={teamMembers}
                selectedTeam={team}
                viewMode="sprint"
                sprintDates={sprintWorkingDays}
              />
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="space-y-6">
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Team Management
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add, edit, and manage team members
                </p>
              </div>
              
              <div className="p-6">
                <TeamMemberManagement 
                  team={team}
                  teamMembers={teamMembers}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={combineClasses('space-y-6', className)}>
      {/* Header */}
      {currentSprint && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Manager Dashboard - {team.name}
              </h2>
              <p className="text-purple-600 text-sm">
                {new Date(currentSprint.sprint_start_date || Date.now()).toLocaleDateString()} - {new Date(currentSprint.sprint_end_date || Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                <span className="ml-2">({teamStats.totalMembers} team members)</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{teamStats.completionPercentage}%</div>
              <div className="text-sm text-purple-500">Team Complete</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={combineClasses(
                    'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-center">
                    <div>{tab.label}</div>
                    <div className="text-xs mt-1 opacity-75">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Team Completion Modal */}
      <TeamCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        teamMembers={teamMembers}
        currentSprint={currentSprint}
        teamName={team.name}
      />
    </div>
  );
}
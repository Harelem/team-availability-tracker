'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Users, Clock, Calendar, AlertCircle, TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import PersonalDashboard from './PersonalDashboard';
import ScheduleTable from './ScheduleTable';
import PersonalStatsCard from './PersonalStatsCard';
import TeamCompletionModal from './TeamCompletionModal';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';

interface ManagerDashboardProps {
  user: TeamMember;
  team: Team;
  teamMembers: TeamMember[];
  className?: string;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  managerOnly?: boolean;
  icon?: React.ElementType;
  badge?: string;
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false, 
  icon: Icon, 
  badge 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={DESIGN_SYSTEM.cards.default}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-gray-600" />}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {badge && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboard({
  user,
  team,
  teamMembers,
  className = ''
}: ManagerDashboardProps) {
  // Get current sprint from context
  const { currentSprint, isLoading: sprintLoading } = useGlobalSprint();
  
  // Modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

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

  // Calculate team statistics based on actual sprint data
  const teamStats = React.useMemo(() => {
    const totalMembers = teamMembers.length;
    const managersCount = teamMembers.filter(m => m.isManager).length;
    const regularMembers = totalMembers - managersCount;
    
    // Calculate sprint potential: workingDays * members * 7 hours per day
    const sprintPotentialHours = sprintWorkingDays.length * totalMembers * 7;
    
    // For now, use simplified calculations until we have real schedule data integration
    // In a real implementation, this would query actual schedule entries
    const completedMembers = Math.floor(totalMembers * 0.8); // Placeholder
    const totalSubmittedHours = Math.floor(sprintPotentialHours * 0.75); // Placeholder: 75% of potential
    
    const completionPercentage = totalMembers > 0 ? Math.round((completedMembers / totalMembers) * 100) : 0;
    
    return {
      totalMembers,
      managersCount,
      regularMembers,
      completedMembers,
      completionPercentage,
      totalSubmittedHours,
      sprintPotentialHours,
      sprintLength: sprintWorkingDays.length
    };
  }, [teamMembers, sprintWorkingDays]);

  const handleMembersUpdated = useCallback(() => {
    // This would trigger a refresh of team members data
    console.log('Team members updated - refreshing data...');
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Manager Header */}
      <div className={combineClasses(
        DESIGN_SYSTEM.cards.default,
        DESIGN_SYSTEM.spacing.lg
      )}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Team Management Dashboard
            </h1>
            <p className="text-gray-600">
              {user.name} • {team.name} Manager
            </p>
          </div>
        </div>
        
        {currentSprint && (
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2">Managing Sprint</h3>
            <p className="text-purple-700 text-sm mb-1">{(currentSprint as any)?.name || 'Current Sprint'}</p>
            <p className="text-purple-600 text-xs">
              {new Date(currentSprint.sprint_start_date || Date.now()).toLocaleDateString()} - {new Date(currentSprint.sprint_end_date || Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              <span className="ml-2">({teamStats.totalMembers} team members)</span>
            </p>
          </div>
        )}
      </div>

      {/* Simplified Manager Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <PersonalStatsCard
          title="Team Completion"
          value={`${teamStats.completedMembers}/${teamStats.totalMembers}`}
          icon={Users}
          color="blue"
          description={`${teamStats.completionPercentage}% completed • Click for details`}
          onClick={() => setShowCompletionModal(true)}
        />
        
        <PersonalStatsCard
          title="Sprint Hours Submitted"
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

      {/* Collapsible Team Summary */}
      <CollapsibleSection 
        title="Team Status Overview" 
        defaultOpen={false}
        icon={TrendingUp}
        badge={`${teamStats.completionPercentage}% Complete`}
      >
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map(member => (
              <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.hebrew}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {member.isManager && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                        Manager
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      Math.random() > 0.3 // Mock completion status
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {Math.random() > 0.3 ? 'Complete' : 'Partial'}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  {Math.floor(Math.random() * 35) + 20}h submitted
                </div>
                
                {/* Progress bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Manager's Personal Schedule (if applicable) */}
      <CollapsibleSection 
        title="My Personal Schedule" 
        defaultOpen={false}
        icon={Calendar}
      >
        <div className="p-4">
          <PersonalDashboard 
            user={user} 
            team={team} 
            teamMembers={teamMembers}
            className="shadow-none border-0 bg-transparent p-0"
          />
        </div>
      </CollapsibleSection>

      {/* Full Team Schedule */}
      <CollapsibleSection 
        title="Full Team Sprint Schedule" 
        defaultOpen={true}
        icon={Users}
        badge={currentSprint ? `${sprintWorkingDays.length} days` : "No Sprint"}
      >
        <div className="p-4">
          <div className="mb-4 bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Manager Controls - Full Sprint View</span>
            </div>
            <p className="text-sm text-blue-700">
              As a manager, you can edit any team member's schedule for the entire sprint period ({sprintWorkingDays.length} working days).
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
      </CollapsibleSection>

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
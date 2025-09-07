'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, TrendingUp, CheckCircle, User, Award } from 'lucide-react';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';
import PersonalCalendar from './PersonalCalendar';
import PersonalStatsCard from './PersonalStatsCard';
import PersonalHoursStatus from './PersonalHoursStatus';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';

interface PersonalDashboardProps {
  user: TeamMember;
  team: Team;
  teamMembers?: TeamMember[];
  className?: string;
}

interface PersonalStats {
  hoursSubmitted: number;
  daysPresent: number;
  sprintProgress: number;
  completionStatus: 'not-started' | 'partial' | 'completed';
  totalSprintDays: number;
  submittedDays: number;
}

// Component render counter removed for production performance

const PersonalDashboard = React.memo(function PersonalDashboard({ 
  user, 
  team, 
  teamMembers = [],
  className = '' 
}: PersonalDashboardProps) {
  // Component initialization
  
  // Get current sprint from context
  const { currentSprint, isLoading: sprintLoading } = useGlobalSprint();
  
  // Add delay before showing no sprint warning to prevent premature display
  const [showNoSprintWarning, setShowNoSprintWarning] = useState(false);
  
  useEffect(() => {
    // Only show warning if there's really no sprint after a reasonable delay
    const warningTimeout = setTimeout(() => {
      if (!currentSprint && !sprintLoading) {
        setShowNoSprintWarning(true);
      }
    }, 5000); // Wait 5 seconds before showing warning
    
    return () => {
      clearTimeout(warningTimeout);
      setShowNoSprintWarning(false);
    };
  }, [currentSprint, sprintLoading]);
  const [personalStats, setPersonalStats] = useState<PersonalStats>({
    hoursSubmitted: 0,
    daysPresent: 0,
    sprintProgress: 0,
    completionStatus: 'not-started',
    totalSprintDays: 0,
    submittedDays: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<any>({});

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

  // PERFORMANCE FIX: Create stable references for PersonalCalendar props
  const stableUser = useMemo(() => {
    // Creating stable user reference
    return user;
  }, [user.id, user.name, user.hebrew]);
  
  const stableTeam = useMemo(() => {
    // Creating stable team reference
    return team;
  }, [team.id, team.name]);

  // Memoized callback to prevent PersonalCalendar re-mounting - further stabilized
  const handleDataChange = useCallback((newData: any) => {
    // Data change handler called
    setScheduleData(newData);
    
    // PERFORMANCE FIX: Use cached sprintWorkingDays reference to avoid recalculation
    const currentWorkingDays = sprintWorkingDays;
    
    // Real-time stats recalculation
    const userSchedule = newData[user.id] || {};
    let totalHours = 0;
    let submittedDays = 0;
    
    currentWorkingDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const entry = dateKey ? userSchedule[dateKey] : undefined;
      
      if (entry && entry.value) {
        submittedDays++;
        switch (entry.value) {
          case '1': totalHours += 7; break;
          case '0.5': totalHours += 3.5; break;
          case 'X': totalHours += 0; break;
        }
      }
    });
    
    const progressPercentage = currentWorkingDays.length > 0 
      ? Math.round((submittedDays / currentWorkingDays.length) * 100) 
      : 0;
    
    let completionStatus: PersonalStats['completionStatus'] = 'not-started';
    if (progressPercentage === 100) {
      completionStatus = 'completed';
    } else if (progressPercentage > 0) {
      completionStatus = 'partial';
    }
    
    setPersonalStats({
      hoursSubmitted: totalHours,
      daysPresent: submittedDays,
      sprintProgress: progressPercentage,
      completionStatus,
      totalSprintDays: currentWorkingDays.length,
      submittedDays
    });
  }, [user.id, sprintWorkingDays]); // Keep dependencies minimal and stable

  // Load personal schedule data
  useEffect(() => {
    const loadPersonalData = async () => {
      if (!currentSprint || sprintWorkingDays.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get schedule data for the entire sprint period
        if (sprintWorkingDays.length === 0) {
          // console.warn('No sprint working days available');
          return;
        }
        const startDate = sprintWorkingDays[0]?.toISOString().split('T')[0];
        const endDate = sprintWorkingDays[sprintWorkingDays.length - 1]?.toISOString().split('T')[0];
        
        if (!startDate || !endDate) {
          // console.warn('Invalid sprint dates');
          return;
        }
        
        const data = await DatabaseService.getScheduleEntries(startDate, endDate, team.id);
        const userSchedule = data[user.id] || {};
        
        setScheduleData({ [user.id]: userSchedule });
        
        // Calculate personal statistics
        let totalHours = 0;
        let submittedDays = 0;
        
        sprintWorkingDays.forEach(date => {
          const dateKey = date.toISOString().split('T')[0];
          const entry = dateKey ? userSchedule[dateKey] : undefined;
          
          if (entry && entry.value) {
            submittedDays++;
            
            // Calculate hours based on work option
            switch (entry.value) {
              case '1':
                totalHours += 7; // Full day
                break;
              case '0.5':
                totalHours += 3.5; // Half day
                break;
              case 'X':
                totalHours += 0; // Sick/OoO
                break;
            }
          }
        });
        
        const progressPercentage = sprintWorkingDays.length > 0 
          ? Math.round((submittedDays / sprintWorkingDays.length) * 100) 
          : 0;
        
        let completionStatus: PersonalStats['completionStatus'] = 'not-started';
        if (progressPercentage === 100) {
          completionStatus = 'completed';
        } else if (progressPercentage > 0) {
          completionStatus = 'partial';
        }
        
        setPersonalStats({
          hoursSubmitted: totalHours,
          daysPresent: submittedDays,
          sprintProgress: progressPercentage,
          completionStatus,
          totalSprintDays: sprintWorkingDays.length,
          submittedDays
        });
        
      } catch (error) {
        // console.error('Error loading personal data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalData();
  }, [user.id, team.id, currentSprint, sprintWorkingDays]);

  if (loading || sprintLoading) {
    return (
      <div className={`space-y-6 ${className}`} style={{ minHeight: '800px' }}>
        {/* PERFORMANCE FIX: Precise skeleton loading to prevent CLS */}
        {/* Personal Header Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-6" style={{ minHeight: '140px' }}>
          <div className="animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-2 w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 h-16"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-md p-4" style={{ minHeight: '120px' }}>
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Skeleton */}
        <div className="bg-white rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
          <div className="animate-pulse p-6">
            <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }, (_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no sprint is available after timeout
  if (showNoSprintWarning && !currentSprint) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Personal Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.name}
              </h1>
              <p className="text-gray-600">
                {user.hebrew} • {team.name}
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-900">No Active Sprint</h3>
            </div>
            <p className="text-yellow-700 text-sm">
              There is no active sprint currently. Please contact your manager to start a new sprint period.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} style={{ minHeight: '800px' }}>
      {/* Personal Header */}
      <div className={combineClasses(
        DESIGN_SYSTEM.cards.default,
        DESIGN_SYSTEM.spacing.lg
      )}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user.name}
            </h1>
            <p className="text-gray-600">
              {user.hebrew} • {team.name}
            </p>
          </div>
          {personalStats.completionStatus === 'completed' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-full">
              <Award className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Sprint Complete!
              </span>
            </div>
          )}
        </div>
        
        {currentSprint && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Current Sprint</h3>
            <p className="text-blue-700 text-sm mb-1">{(currentSprint as any)?.name || 'Current Sprint'}</p>
            <p className="text-blue-600 text-xs">
              {new Date(currentSprint.sprint_start_date || Date.now()).toLocaleDateString()} - {new Date(currentSprint.sprint_end_date || Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              <span className="ml-2">({personalStats.totalSprintDays} working days)</span>
            </p>
          </div>
        )}
      </div>

      {/* Personal Stats Cards */}
      <div className={combineClasses(
        DESIGN_SYSTEM.grids.responsive4,
        DESIGN_SYSTEM.grids.gap.md
      )}>
        <PersonalStatsCard
          title="Hours Submitted"
          value={`${personalStats.hoursSubmitted}h`}
          icon={Clock}
          color="blue"
          description={`Out of ${personalStats.totalSprintDays * 7}h possible`}
        />
        
        <PersonalStatsCard
          title="Days Submitted"
          value={`${personalStats.submittedDays}/${personalStats.totalSprintDays}`}
          icon={Calendar}
          color="green"
          description="Working days completed"
        />
        
        <PersonalStatsCard
          title="Sprint Progress"
          value={`${personalStats.sprintProgress}%`}
          icon={TrendingUp}
          color="purple"
          description={
            personalStats.sprintProgress === 100 ? 'Fully completed!' :
            personalStats.sprintProgress > 50 ? 'Great progress' :
            personalStats.sprintProgress > 0 ? 'Getting started' : 'Not started yet'
          }
        />
        
        <PersonalStatsCard
          title="Status"
          value={
            personalStats.completionStatus === 'completed' ? 'Complete' :
            personalStats.completionStatus === 'partial' ? 'In Progress' : 'Not Started'
          }
          icon={CheckCircle}
          color={
            personalStats.completionStatus === 'completed' ? 'green' :
            personalStats.completionStatus === 'partial' ? 'yellow' : 'gray'
          }
          description={
            personalStats.completionStatus === 'completed' ? 'All days submitted' :
            personalStats.completionStatus === 'partial' ? 'Some days missing' : 'Please start filling your schedule'
          }
        />
      </div>

      {/* Personal Hours Status */}
      {currentSprint && (
        <PersonalHoursStatus 
          user={user}
          team={team}
          currentSprint={currentSprint}
        />
      )}

      {/* Personal Schedule Table - Sprint View */}
      {currentSprint && (
        <div className={DESIGN_SYSTEM.cards.default}>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              My Sprint Schedule
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Fill in your availability for the entire sprint period
            </p>
          </div>
          
          <PersonalCalendar
            key={`calendar-${user.id}-${team.id}`}
            user={stableUser}
            team={stableTeam}
            editable={true}
            onDataChange={handleDataChange}
          />
        </div>
      )}
      

      {/* Helpful Tips */}
      <div className={combineClasses(
        DESIGN_SYSTEM.colors.primary.bgLight,
        DESIGN_SYSTEM.colors.primary.border,
        DESIGN_SYSTEM.radius.md,
        DESIGN_SYSTEM.spacing.md,
        'border'
      )}>
        <h3 className="font-medium text-blue-900 mb-2">💡 Quick Tips</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>1</strong> = Full day (7 hours)</li>
          <li>• <strong>0.5</strong> = Half day (3.5 hours) - requires reason</li>
          <li>• <strong>X</strong> = Sick/Out of office (0 hours) - requires reason</li>
          <li>• Click on any day to change your availability</li>
          <li>• Your schedule saves automatically</li>
        </ul>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // PERFORMANCE FIX: Custom memo comparison to prevent unnecessary re-renders
  const arePropsEqual = (
    prevProps.user.id === nextProps.user.id &&
    prevProps.user.name === nextProps.user.name &&
    prevProps.team.id === nextProps.team.id &&
    prevProps.team.name === nextProps.team.name &&
    prevProps.className === nextProps.className &&
    // Compare teamMembers array by length and IDs
    prevProps.teamMembers.length === nextProps.teamMembers.length &&
    prevProps.teamMembers.every((member, index) => 
      member.id === nextProps.teamMembers[index]?.id
    )
  );
  
  // Component memoization check optimized for production
  
  return arePropsEqual;
});

export default PersonalDashboard;
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';
import { calculateSprintPeriod, calculateWorkingDaysInPeriod, formatSprintDateRange } from '@/utils/sprintCalculations';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';

interface PersonalHoursStatus {
  filledDays: number;
  totalDays: number;
  completionRate: number;
  isComplete: boolean;
  status: 'complete' | 'partial' | 'missing';
  submittedHours: number;
  totalPossibleHours: number;
}

interface PersonalHoursStatusProps {
  user: TeamMember;
  team: Team;
  currentSprint: CurrentGlobalSprint;
}

const PersonalHoursStatus = React.memo(function PersonalHoursStatus({ user, team, currentSprint }: PersonalHoursStatusProps) {
  const [currentSprintStatus, setCurrentSprintStatus] = useState<PersonalHoursStatus | null>(null);
  const [nextSprintStatus, setNextSprintStatus] = useState<PersonalHoursStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize expensive calculations
  const { currentPeriod, nextPeriod } = useMemo(() => {
    if (!currentSprint || !currentSprint.sprint_start_date || !currentSprint.sprint_end_date) {
      return { currentPeriod: null, nextPeriod: null };
    }
    
    const currentPeriod = {
      startDate: currentSprint.sprint_start_date,
      endDate: currentSprint.sprint_end_date
    };
    const nextPeriod = calculateSprintPeriod(currentSprint, 1);
    
    return { currentPeriod, nextPeriod };
  }, [currentSprint]);
  
  const loadPersonalHoursStatus = useCallback(async () => {
    if (!currentPeriod || !nextPeriod) return;
    
    setIsLoading(true);
    setError(null);
    
    // Validation checks
    if (!user || !user.id) {
      console.error('❌ PersonalHoursStatus: Invalid user data', { user });
      setError('Invalid user data');
      setIsLoading(false);
      return;
    }
    
    if (!team || !team.id) {
      console.error('❌ PersonalHoursStatus: Invalid team data', { team });
      setError('Invalid team data');
      setIsLoading(false);
      return;
    }
    
    try {
      // Load data for both sprints in parallel
      const [currentData, nextData] = await Promise.all([
        DatabaseService.getScheduleEntries(currentPeriod.startDate, currentPeriod.endDate, team.id),
        DatabaseService.getScheduleEntries(nextPeriod.startDate, nextPeriod.endDate, team.id)
      ]);
      
      // Process current sprint
      const currentUserData = currentData[user.id] || {};
      const currentWorkingDays = Math.max(0, calculateWorkingDaysInPeriod(currentPeriod.startDate, currentPeriod.endDate));
      const currentFilledDays = Math.max(0, Object.keys(currentUserData).length);
      
      const currentSubmittedHours = Object.values(currentUserData).reduce((sum: number, entry: any) => {
        if (!entry || !entry.value) return sum;
        switch (entry.value) {
          case '1': return sum + 7;
          case '0.5': return sum + 3.5;
          case 'X': return sum + 0;
          default: return sum;
        }
      }, 0);
      
      const currentSprintResult = {
        filledDays: currentFilledDays,
        totalDays: currentWorkingDays,
        completionRate: currentWorkingDays > 0 ? (currentFilledDays / currentWorkingDays) * 100 : 0,
        isComplete: currentFilledDays >= currentWorkingDays,
        status: (currentFilledDays >= currentWorkingDays ? 'complete' : currentFilledDays > 0 ? 'partial' : 'missing') as 'complete' | 'partial' | 'missing',
        submittedHours: currentSubmittedHours,
        totalPossibleHours: currentWorkingDays * 7
      };
      
      setCurrentSprintStatus(currentSprintResult);

      // Process next sprint
      const nextUserData = nextData[user.id] || {};
      const nextWorkingDays = Math.max(0, calculateWorkingDaysInPeriod(nextPeriod.startDate, nextPeriod.endDate));
      const nextFilledDays = Math.max(0, Object.keys(nextUserData).length);
      
      const nextSubmittedHours = Object.values(nextUserData).reduce((sum: number, entry: any) => {
        if (!entry || !entry.value) return sum;
        switch (entry.value) {
          case '1': return sum + 7;
          case '0.5': return sum + 3.5;
          case 'X': return sum + 0;
          default: return sum;
        }
      }, 0);
      
      const nextSprintResult = {
        filledDays: nextFilledDays,
        totalDays: nextWorkingDays,
        completionRate: nextWorkingDays > 0 ? (nextFilledDays / nextWorkingDays) * 100 : 0,
        isComplete: nextFilledDays >= nextWorkingDays,
        status: (nextFilledDays >= nextWorkingDays ? 'complete' : nextFilledDays > 0 ? 'partial' : 'missing') as 'complete' | 'partial' | 'missing',
        submittedHours: nextSubmittedHours,
        totalPossibleHours: nextWorkingDays * 7
      };
      
      setNextSprintStatus(nextSprintResult);

    } catch (err) {
      console.error('❌ PersonalHoursStatus: Error loading personal hours status:', err);
      setError('Failed to load hours status - displaying default values');
      
      // Set fallback data
      const fallbackStatus = {
        filledDays: 0, totalDays: 0, completionRate: 0, isComplete: false,
        status: 'missing' as const, submittedHours: 0, totalPossibleHours: 0
      };
      setCurrentSprintStatus(fallbackStatus);
      setNextSprintStatus(fallbackStatus);
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriod, nextPeriod, user, team]);
  
  useEffect(() => {
    if (user && team && currentSprint && currentPeriod && nextPeriod) {
      loadPersonalHoursStatus();
    }
  }, [loadPersonalHoursStatus]);

  // This entire function is now replaced by the memoized loadPersonalHoursStatus callback above

  const getStatusIcon = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return 'text-green-800 bg-green-100 border-green-300';
      case 'partial':
        return 'text-yellow-800 bg-yellow-100 border-yellow-300';
      case 'missing':
        return 'text-red-800 bg-red-100 border-red-300';
    }
  };

  const getStatusText = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'partial':
        return 'In Progress';
      case 'missing':
        return 'Not Started';
    }
  };

  if (isLoading) {
    return (
      <div className={DESIGN_SYSTEM.cards.default}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={DESIGN_SYSTEM.cards.default}>
        <div className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error loading hours status</span>
          </div>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={DESIGN_SYSTEM.cards.default}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">📊 My Hours Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Sprint Status */}
          {currentSprintStatus && (
            <div className={combineClasses(
              'p-4 rounded-lg border-2',
              getStatusColor(currentSprintStatus.status)
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(currentSprintStatus.status)}
                  <span className="font-medium">Current Sprint</span>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-white bg-opacity-50">
                  {getStatusText(currentSprintStatus.status)}
                </span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Days submitted:</span>
                  <span className="font-medium">
                    {currentSprintStatus.filledDays}/{currentSprintStatus.totalDays}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hours submitted:</span>
                  <span className="font-medium">
                    {currentSprintStatus.submittedHours}h/{currentSprintStatus.totalPossibleHours}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completion:</span>
                  <span className="font-medium">{Math.round(currentSprintStatus.completionRate)}%</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className="bg-current h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(currentSprintStatus.completionRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Next Sprint Status */}
          {nextSprintStatus && (
            <div className={combineClasses(
              'p-4 rounded-lg border-2',
              getStatusColor(nextSprintStatus.status)
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(nextSprintStatus.status)}
                  <span className="font-medium">Next Sprint</span>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-white bg-opacity-50">
                  {getStatusText(nextSprintStatus.status)}
                </span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Days submitted:</span>
                  <span className="font-medium">
                    {nextSprintStatus.filledDays}/{nextSprintStatus.totalDays}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hours submitted:</span>
                  <span className="font-medium">
                    {nextSprintStatus.submittedHours}h/{nextSprintStatus.totalPossibleHours}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completion:</span>
                  <span className="font-medium">{Math.round(nextSprintStatus.completionRate)}%</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className="bg-current h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(nextSprintStatus.completionRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick tip */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 Complete your schedule early to help managers plan better and avoid last-minute changes.
          </p>
        </div>
      </div>
    </div>
  );
});

export default PersonalHoursStatus;
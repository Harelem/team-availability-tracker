'use client';

import { useState, useEffect } from 'react';
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

export default function PersonalHoursStatus({ user, team, currentSprint }: PersonalHoursStatusProps) {
  const [currentSprintStatus, setCurrentSprintStatus] = useState<PersonalHoursStatus | null>(null);
  const [nextSprintStatus, setNextSprintStatus] = useState<PersonalHoursStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && team && currentSprint) {
      loadPersonalHoursStatus();
    }
  }, [user, team, currentSprint]);

  const loadPersonalHoursStatus = async () => {
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
    
    if (!currentSprint || !currentSprint.sprint_start_date || !currentSprint.sprint_end_date) {
      console.error('❌ PersonalHoursStatus: Invalid sprint data', { currentSprint });
      setError('Invalid sprint data');
      setIsLoading(false);
      return;
    }
    
    try {
      // Calculate sprint periods
      const currentPeriod = calculateSprintPeriod(currentSprint, 0); // Current sprint
      const nextPeriod = calculateSprintPeriod(currentSprint, 1); // Next sprint
      
      // 🔍 NEXT SPRINT DEBUG - Sprint calculation inputs
      console.log('🔍 NEXT SPRINT DEBUG - Sprint calculation inputs:', {
        currentSprint: {
          id: currentSprint.id,
          start_date: currentSprint.sprint_start_date,
          end_date: currentSprint.sprint_end_date,
          length_weeks: currentSprint.sprint_length_weeks
        },
        offset: 1
      });
      
      // 🔍 NEXT SPRINT DEBUG - Calculated periods
      const nextWorkingDaysCalculated = calculateWorkingDaysInPeriod(nextPeriod.startDate, nextPeriod.endDate);
      console.log('🔍 NEXT SPRINT DEBUG - Calculated periods:', {
        currentPeriod: { startDate: currentPeriod.startDate, endDate: currentPeriod.endDate },
        nextPeriod: { startDate: nextPeriod.startDate, endDate: nextPeriod.endDate },
        nextWorkingDays: nextWorkingDaysCalculated
      });
      
      // POTENTIAL FIX: Use actual sprint dates instead of calculated periods if they differ significantly
      const actualCurrentPeriod = {
        startDate: currentSprint.sprint_start_date,
        endDate: currentSprint.sprint_end_date
      };
      
      // Check if calculated vs actual periods differ
      const periodDiffers = (
        currentPeriod.startDate !== actualCurrentPeriod.startDate ||
        currentPeriod.endDate !== actualCurrentPeriod.endDate
      );
      
      if (periodDiffers) {
        console.warn('⚠️ PersonalHoursStatus: Calculated period differs from actual sprint dates', {
          calculated: currentPeriod,
          actual: actualCurrentPeriod
        });
      }
      
      // Use actual sprint dates for current sprint to ensure data consistency
      const finalCurrentPeriod = actualCurrentPeriod;
      
      console.log('🔍 PersonalHoursStatus: Sprint periods calculated', {
        currentSprint: {
          id: currentSprint.id,
          start_date: currentSprint.sprint_start_date,
          end_date: currentSprint.sprint_end_date,
          length_weeks: currentSprint.sprint_length_weeks
        },
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate
        },
        nextPeriod: {
          startDate: nextPeriod.startDate, 
          endDate: nextPeriod.endDate
        },
        userId: user.id,
        teamId: team.id
      });
      
      // 🔍 NEXT SPRINT DEBUG - Database query params
      console.log('🔍 NEXT SPRINT DEBUG - Database query params:', {
        nextPeriodStart: nextPeriod.startDate,
        nextPeriodEnd: nextPeriod.endDate,  
        teamId: team.id,
        userId: user.id
      });
      
      // Load data for both sprints (using corrected current period)
      const [currentData, nextData] = await Promise.all([
        DatabaseService.getScheduleEntries(finalCurrentPeriod.startDate, finalCurrentPeriod.endDate, team.id),
        DatabaseService.getScheduleEntries(nextPeriod.startDate, nextPeriod.endDate, team.id)
      ]);
      
      // 🔍 NEXT SPRINT DEBUG - Next sprint raw data
      console.log('🔍 NEXT SPRINT DEBUG - Next sprint raw data:', {
        nextDataKeys: Object.keys(nextData),
        totalMembersInNextData: Object.keys(nextData).length,
        nextDataForUser: nextData[user.id],
        nextUserDataKeys: nextData[user.id] ? Object.keys(nextData[user.id]) : [],
        nextUserDataEntries: nextData[user.id] ? Object.entries(nextData[user.id]).slice(0, 5) : []
      });
      
      console.log('📊 PersonalHoursStatus: Data fetched from database', {
        currentData: {
          totalMembers: Object.keys(currentData).length,
          userHasData: !!currentData[user.id],
          userEntryCount: currentData[user.id] ? Object.keys(currentData[user.id]).length : 0,
          sampleUserEntries: currentData[user.id] ? Object.keys(currentData[user.id]).slice(0, 3) : []
        },
        nextData: {
          totalMembers: Object.keys(nextData).length,
          userHasData: !!nextData[user.id],
          userEntryCount: nextData[user.id] ? Object.keys(nextData[user.id]).length : 0
        }
      });

      // Process current sprint with safety checks
      const currentUserData = currentData[user.id] || {};
      const currentWorkingDays = Math.max(0, calculateWorkingDaysInPeriod(finalCurrentPeriod.startDate, finalCurrentPeriod.endDate));
      const currentFilledDays = Math.max(0, Object.keys(currentUserData).length);
      
      // Validate working days calculation
      if (currentWorkingDays === 0) {
        console.warn('⚠️ PersonalHoursStatus: Current working days is 0, check date calculation', {
          startDate: finalCurrentPeriod.startDate,
          endDate: finalCurrentPeriod.endDate
        });
      }
      // Fix: Calculate hours from value field, not non-existent hours field
      const currentSubmittedHours = Object.values(currentUserData).reduce((sum: number, entry: any) => {
        if (!entry || !entry.value) return sum;
        
        switch (entry.value) {
          case '1':
            return sum + 7; // Full day = 7 hours
          case '0.5':
            return sum + 3.5; // Half day = 3.5 hours
          case 'X':
            return sum + 0; // Absence = 0 hours
          default:
            return sum;
        }
      }, 0);
      
      const currentSprintResult = {
        filledDays: currentFilledDays,
        totalDays: currentWorkingDays,
        completionRate: currentWorkingDays > 0 ? (currentFilledDays / currentWorkingDays) * 100 : 0,
        isComplete: currentFilledDays >= currentWorkingDays,
        status: currentFilledDays >= currentWorkingDays ? 'complete' : currentFilledDays > 0 ? 'partial' : 'missing',
        submittedHours: currentSubmittedHours,
        totalPossibleHours: currentWorkingDays * 7
      };
      
      console.log('✅ PersonalHoursStatus: Current sprint calculation complete', {
        workingDays: currentWorkingDays,
        filledDays: currentFilledDays,
        submittedHours: currentSubmittedHours,
        completionRate: currentSprintResult.completionRate,
        status: currentSprintResult.status,
        sampleUserData: currentUserData ? Object.entries(currentUserData).slice(0, 3) : []
      });
      
      setCurrentSprintStatus(currentSprintResult);

      // Process next sprint with safety checks
      const nextUserData = nextData[user.id] || {};
      const nextWorkingDays = Math.max(0, calculateWorkingDaysInPeriod(nextPeriod.startDate, nextPeriod.endDate));
      const nextFilledDays = Math.max(0, Object.keys(nextUserData).length);
      
      // 🔍 NEXT SPRINT DEBUG - Data processing breakdown
      console.log('🔍 NEXT SPRINT DEBUG - Data processing breakdown:', {
        nextUserData: nextUserData,
        nextUserDataKeys: Object.keys(nextUserData),
        nextWorkingDays: nextWorkingDays,
        nextFilledDays: nextFilledDays,
        calculationCheck: {
          startDate: nextPeriod.startDate,
          endDate: nextPeriod.endDate,
          workingDaysFromCalculation: calculateWorkingDaysInPeriod(nextPeriod.startDate, nextPeriod.endDate)
        }
      });
      
      // Validate next sprint working days calculation  
      if (nextWorkingDays === 0) {
        console.warn('⚠️ PersonalHoursStatus: Next working days is 0, check date calculation', {
          startDate: nextPeriod.startDate,
          endDate: nextPeriod.endDate,
          rawCalculation: calculateWorkingDaysInPeriod(nextPeriod.startDate, nextPeriod.endDate)
        });
      }
      // Fix: Calculate hours from value field, not non-existent hours field
      const nextSubmittedHours = Object.values(nextUserData).reduce((sum: number, entry: any) => {
        if (!entry || !entry.value) return sum;
        
        switch (entry.value) {
          case '1':
            return sum + 7; // Full day = 7 hours
          case '0.5':
            return sum + 3.5; // Half day = 3.5 hours
          case 'X':
            return sum + 0; // Absence = 0 hours
          default:
            return sum;
        }
      }, 0);
      
      const nextSprintResult = {
        filledDays: nextFilledDays,
        totalDays: nextWorkingDays,
        completionRate: nextWorkingDays > 0 ? (nextFilledDays / nextWorkingDays) * 100 : 0,
        isComplete: nextFilledDays >= nextWorkingDays,
        status: nextFilledDays >= nextWorkingDays ? 'complete' : nextFilledDays > 0 ? 'partial' : 'missing',
        submittedHours: nextSubmittedHours,
        totalPossibleHours: nextWorkingDays * 7
      };
      
      console.log('✅ PersonalHoursStatus: Next sprint calculation complete', {
        workingDays: nextWorkingDays,
        filledDays: nextFilledDays,
        submittedHours: nextSubmittedHours,
        completionRate: nextSprintResult.completionRate,
        status: nextSprintResult.status
      });
      
      // 🔍 NEXT SPRINT DEBUG - Final result validation
      console.log('🔍 NEXT SPRINT DEBUG - Final result validation:', {
        nextSprintResult: nextSprintResult,
        isResultEmpty: nextSprintResult.totalDays === 0 && nextSprintResult.filledDays === 0,
        possibleIssues: {
          noWorkingDays: nextWorkingDays === 0,
          noUserData: Object.keys(nextUserData).length === 0,
          noRawData: Object.keys(nextData).length === 0,
          userNotInData: !nextData[user.id]
        }
      });
      
      setNextSprintStatus(nextSprintResult);

    } catch (err) {
      console.error('❌ PersonalHoursStatus: Error loading personal hours status:', err, {
        userId: user.id,
        teamId: team.id,
        currentSprintId: currentSprint.id,
        errorDetails: err
      });
      
      // Set fallback data instead of just error message
      setCurrentSprintStatus({
        filledDays: 0,
        totalDays: 0,
        completionRate: 0,
        isComplete: false,
        status: 'missing',
        submittedHours: 0,
        totalPossibleHours: 0
      });
      
      setNextSprintStatus({
        filledDays: 0,
        totalDays: 0,
        completionRate: 0,
        isComplete: false,
        status: 'missing',
        submittedHours: 0,
        totalPossibleHours: 0
      });
      
      setError('Failed to load hours status - displaying default values');
    } finally {
      setIsLoading(false);
    }
  };

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
}
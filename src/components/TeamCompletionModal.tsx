'use client';

import React, { useEffect, useState } from 'react';
import { X, Users, Clock, CheckCircle, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { TeamMember, CurrentGlobalSprint } from '@/types';
import { DESIGN_SYSTEM, combineClasses, COMPONENT_PATTERNS } from '@/utils/designSystem';
import { RealTimeCalculationService, type TeamMemberSubmissionStatus } from '@/lib/realTimeCalculationService';
import { SprintType, getSprintDatesByType, getSprintNumber } from '@/utils/sprintCalculations';

interface TeamCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  currentSprint?: CurrentGlobalSprint | null;
  teamName: string;
  selectedSprint: SprintType;
}

export default function TeamCompletionModal({
  isOpen,
  onClose,
  teamMembers,
  currentSprint,
  teamName,
  selectedSprint
}: TeamCompletionModalProps) {
  // State for real team data
  const [memberStatuses, setMemberStatuses] = useState<TeamMemberSubmissionStatus[]>([]);
  const [teamStats, setTeamStats] = useState<{
    totalMembers: number;
    completedMembers: number;
    completionPercentage: number;
    totalSubmittedHours: number;
    sprintPotentialHours: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real team data when modal opens or sprint changes
  useEffect(() => {
    if (!isOpen || !teamMembers.length || !currentSprint) return;

    const fetchTeamData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the team ID from the first team member
        const teamId = teamMembers[0].team_id;
        if (!teamId) {
          throw new Error('No team ID found');
        }

        // Get the selected sprint date range
        const sprintDates = getSprintDatesByType(currentSprint, selectedSprint);

        // Use the flexible calculation method with dynamic date ranges
        const teamSubmissionData = await RealTimeCalculationService.calculateTeamSubmissionStatus(
          teamMembers,
          sprintDates.startDate,
          sprintDates.endDate,
          teamId
        );
        
        setMemberStatuses(teamSubmissionData.memberStatuses);
        setTeamStats({
          totalMembers: teamSubmissionData.totalMembers,
          completedMembers: teamSubmissionData.completedMembers,
          completionPercentage: teamSubmissionData.completionPercentage,
          totalSubmittedHours: teamSubmissionData.totalSubmittedHours,
          sprintPotentialHours: teamSubmissionData.sprintPotentialHours
        });
      } catch (error) {
        console.error('Error fetching team completion data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [isOpen, teamMembers, currentSprint, selectedSprint]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        {/* Header */}
        <div className={combineClasses(
          'flex items-center justify-between border-b border-gray-200',
          DESIGN_SYSTEM.spacing.lg
        )}>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{teamName} Team Status</h2>
              <p className="text-sm text-gray-600">
                {currentSprint ? `Sprint ${getSprintNumber(currentSprint, selectedSprint)}` : 'Current Period'} • {teamStats?.totalMembers || teamMembers.length} members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
            type="button"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={combineClasses(
            'border-b border-gray-200',
            DESIGN_SYSTEM.spacing.lg,
            'text-center'
          )}>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Loading team data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className={combineClasses(
            'border-b border-gray-200',
            DESIGN_SYSTEM.spacing.lg
          )}>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Error Loading Team Data</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Summary with Real Data */}
        {teamStats && !isLoading && !error && (
          <div className={combineClasses(
            'border-b border-gray-200',
            DESIGN_SYSTEM.spacing.lg,
            'text-center'
          )}>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {teamStats.completedMembers}/{teamStats.totalMembers}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Members completed • {teamStats.totalSubmittedHours}h total submitted
            </div>
            
            {/* Progress Indicator with Real Data */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div 
                className={combineClasses(
                  'h-4 rounded-full transition-all duration-300',
                  teamStats.completionPercentage >= 90 ? 'bg-green-500' :
                  teamStats.completionPercentage >= 70 ? 'bg-blue-500' :
                  teamStats.completionPercentage >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                )}
                style={{ width: `${Math.min(100, teamStats.completionPercentage)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {teamStats.completionPercentage}% team completion
            </div>
          </div>
        )}

        {/* Member Status List with Real Data */}
        {memberStatuses.length > 0 && !isLoading && !error && (
          <div className={combineClasses(
            DESIGN_SYSTEM.spacing.lg,
            'overflow-y-auto max-h-96'
          )}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Members Status ({memberStatuses.length})
            </h3>
            
            <div className="space-y-2">
              {memberStatuses.map((memberStatus) => (
                <div key={memberStatus.memberId} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {memberStatus.memberName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{memberStatus.memberName}</div>
                      <div className="text-sm text-gray-500">{memberStatus.hebrew}</div>
                    </div>
                    {memberStatus.isManager && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                        Manager
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{memberStatus.sprintSubmittedHours}h</div>
                    <div className={`text-sm ${
                      memberStatus.currentWeekStatus === 'complete' ? 'text-green-600' :
                      memberStatus.currentWeekStatus === 'partial' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {memberStatus.sprintCompletionPercentage}% complete
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={combineClasses(
          'border-t border-gray-200 bg-gray-50',
          DESIGN_SYSTEM.spacing.lg
        )}>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {currentSprint ? (() => {
                const sprintDates = getSprintDatesByType(currentSprint, selectedSprint);
                const sprintNumber = getSprintNumber(currentSprint, selectedSprint);
                const startDate = new Date(sprintDates.startDate);
                const endDate = new Date(sprintDates.endDate);
                return (
                  <>Sprint {sprintNumber} • {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</>
                );
              })() : (
                'Current reporting period'
              )}
            </div>
            <button
              onClick={onClose}
              className={combineClasses(
                DESIGN_SYSTEM.buttons.primary,
                DESIGN_SYSTEM.buttons.md
              )}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
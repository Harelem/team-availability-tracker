'use client';

import React from 'react';
import { X, Users, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { TeamMember, CurrentGlobalSprint } from '@/types';
import { DESIGN_SYSTEM, combineClasses, COMPONENT_PATTERNS } from '@/utils/designSystem';

interface TeamCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  currentSprint?: CurrentGlobalSprint | null;
  teamName: string;
}

interface MemberCompletionStatus {
  member: TeamMember;
  hoursSubmitted: number;
  daysCompleted: number;
  totalDays: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'not-started';
  lastUpdate?: Date;
}

export default function TeamCompletionModal({
  isOpen,
  onClose,
  teamMembers,
  currentSprint,
  teamName
}: TeamCompletionModalProps) {
  if (!isOpen) return null;

  // Calculate member completion status (mock data - in real implementation, this would come from actual schedule data)
  const memberStatuses: MemberCompletionStatus[] = teamMembers.map(member => {
    const totalDays = currentSprint ? 14 : 10; // Mock sprint days
    const daysCompleted = Math.floor(totalDays * (0.3 + Math.random() * 0.7));
    const hoursSubmitted = daysCompleted * 7; // 7 hours per day
    const completionPercentage = Math.round((daysCompleted / totalDays) * 100);
    
    let status: MemberCompletionStatus['status'] = 'not-started';
    if (completionPercentage === 100) status = 'complete';
    else if (completionPercentage > 0) status = 'partial';
    
    return {
      member,
      hoursSubmitted,
      daysCompleted,
      totalDays,
      completionPercentage,
      status,
      lastUpdate: new Date(Date.now() - Math.random() * 86400000 * 3) // Random date within last 3 days
    };
  });

  // Calculate team statistics
  const totalMembers = memberStatuses.length;
  const completeMembers = memberStatuses.filter(m => m.status === 'complete').length;
  const partialMembers = memberStatuses.filter(m => m.status === 'partial').length;
  const notStartedMembers = memberStatuses.filter(m => m.status === 'not-started').length;
  const teamCompletionPercentage = totalMembers > 0 ? Math.round((completeMembers / totalMembers) * 100) : 0;
  const totalHours = memberStatuses.reduce((sum, m) => sum + m.hoursSubmitted, 0);

  return (
    <div className={COMPONENT_PATTERNS.modalBackdrop}>
      <div className={COMPONENT_PATTERNS.modalContent}>
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
                {currentSprint ? `Sprint ${currentSprint.current_sprint_number}` : 'Current Period'} • {totalMembers} members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={combineClasses(
              'p-2 hover:bg-gray-100',
              DESIGN_SYSTEM.radius.md,
              DESIGN_SYSTEM.transitions.default
            )}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Team Summary Stats */}
        <div className={combineClasses(
          'border-b border-gray-200',
          DESIGN_SYSTEM.spacing.lg
        )}>
          <div className={combineClasses(
            DESIGN_SYSTEM.grids.responsive4,
            DESIGN_SYSTEM.grids.gap.md
          )}>
            <div className={combineClasses(
              'text-center',
              DESIGN_SYSTEM.spacing.md,
              DESIGN_SYSTEM.colors.success.bgLight,
              DESIGN_SYSTEM.radius.md
            )}>
              <div className="text-2xl font-bold text-green-900">{completeMembers}</div>
              <div className="text-sm text-green-700">Complete</div>
            </div>
            <div className={combineClasses(
              'text-center',
              DESIGN_SYSTEM.spacing.md,
              DESIGN_SYSTEM.colors.warning.bgLight,
              DESIGN_SYSTEM.radius.md
            )}>
              <div className="text-2xl font-bold text-yellow-900">{partialMembers}</div>
              <div className="text-sm text-yellow-700">In Progress</div>
            </div>
            <div className={combineClasses(
              'text-center',
              DESIGN_SYSTEM.spacing.md,
              DESIGN_SYSTEM.colors.danger.bgLight,
              DESIGN_SYSTEM.radius.md
            )}>
              <div className="text-2xl font-bold text-red-900">{notStartedMembers}</div>
              <div className="text-sm text-red-700">Not Started</div>
            </div>
            <div className={combineClasses(
              'text-center',
              DESIGN_SYSTEM.spacing.md,
              DESIGN_SYSTEM.colors.primary.bgLight,
              DESIGN_SYSTEM.radius.md
            )}>
              <div className="text-2xl font-bold text-blue-900">{totalHours}h</div>
              <div className="text-sm text-blue-700">Total Hours</div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Team Progress</span>
              <span className="text-sm text-gray-600">{teamCompletionPercentage}%</span>
            </div>
            <div className={combineClasses(
              COMPONENT_PATTERNS.progressContainer,
              'h-3'
            )}>
              <div 
                className={combineClasses(
                  COMPONENT_PATTERNS.progressFill,
                  'h-3',
                  teamCompletionPercentage >= 90 ? 'bg-green-500' :
                  teamCompletionPercentage >= 70 ? 'bg-blue-500' :
                  teamCompletionPercentage >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                )}
                style={{ width: `${teamCompletionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Member Details */}
        <div className={combineClasses(
          DESIGN_SYSTEM.spacing.lg,
          'overflow-y-auto max-h-96'
        )}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Member Status</h3>
          
          <div className="space-y-3">
            {memberStatuses.map(({ member, hoursSubmitted, daysCompleted, totalDays, completionPercentage, status, lastUpdate }) => (
              <div key={member.id} className={combineClasses(
                'bg-gray-50 hover:bg-gray-100',
                DESIGN_SYSTEM.radius.md,
                DESIGN_SYSTEM.spacing.md,
                DESIGN_SYSTEM.transitions.default
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={combineClasses(
                      'w-10 h-10 bg-blue-100',
                      COMPONENT_PATTERNS.avatar
                    )}>
                      <span className="text-blue-600 font-medium text-sm">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.hebrew}</div>
                    </div>
                    {member.isManager && (
                      <span className={combineClasses(
                        COMPONENT_PATTERNS.badge,
                        'bg-purple-100 text-purple-800'
                      )}>
                        Manager
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <span className={combineClasses(
                      'px-3 py-1 text-sm font-medium rounded-full',
                      status === 'complete' ? 'bg-green-100 text-green-800' :
                      status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {status === 'complete' ? 'Complete' :
                       status === 'partial' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Days</span>
                    </div>
                    <div className="text-sm font-medium">{daysCompleted}/{totalDays}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Hours</span>
                    </div>
                    <div className="text-sm font-medium">{hoursSubmitted}h</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                      {status === 'complete' ? 
                        <CheckCircle className="w-4 h-4" /> :
                        <AlertCircle className="w-4 h-4" />
                      }
                      <span className="text-xs">Progress</span>
                    </div>
                    <div className="text-sm font-medium">{completionPercentage}%</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={combineClasses(
                  COMPONENT_PATTERNS.progressContainer,
                  'mb-2'
                )}>
                  <div 
                    className={combineClasses(
                      COMPONENT_PATTERNS.progressFill,
                      status === 'complete' ? 'bg-green-500' :
                      status === 'partial' ? 'bg-yellow-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>

                {lastUpdate && (
                  <div className="text-xs text-gray-500">
                    Last updated: {lastUpdate.toLocaleDateString()} at {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={combineClasses(
          'border-t border-gray-200 bg-gray-50',
          DESIGN_SYSTEM.spacing.lg
        )}>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {currentSprint ? (
                <>Sprint {(currentSprint as any)?.current_sprint_number || 1} • {new Date((currentSprint as any)?.start_date || Date.now()).toLocaleDateString()} - {new Date((currentSprint as any)?.end_date || Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</>
              ) : (
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
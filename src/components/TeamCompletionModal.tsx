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

        {/* Simplified Team Summary */}
        <div className={combineClasses(
          'border-b border-gray-200',
          DESIGN_SYSTEM.spacing.lg,
          'text-center'
        )}>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {completeMembers}/{totalMembers}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Members completed • {totalHours}h total submitted
          </div>
          
          {/* Simple Progress Indicator */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className={combineClasses(
                'h-4 rounded-full transition-all duration-300',
                teamCompletionPercentage >= 90 ? 'bg-green-500' :
                teamCompletionPercentage >= 70 ? 'bg-blue-500' :
                teamCompletionPercentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              )}
              style={{ width: `${teamCompletionPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {teamCompletionPercentage}% team completion
          </div>
        </div>

        {/* Simplified Member Status List */}
        <div className={combineClasses(
          DESIGN_SYSTEM.spacing.lg,
          'overflow-y-auto max-h-96'
        )}>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Members Status</h3>
          
          <div className="space-y-2">
            {memberStatuses.map(({ member, hoursSubmitted, completionPercentage, status }) => (
              <div key={member.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.hebrew}</div>
                  </div>
                  {member.isManager && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                      Manager
                    </span>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="font-medium text-gray-900">{hoursSubmitted}h</div>
                  <div className={`text-sm ${
                    status === 'complete' ? 'text-green-600' :
                    status === 'partial' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {completionPercentage}% complete
                  </div>
                </div>
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
'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock, Users, X } from 'lucide-react';
import { MissingMemberData } from '@/types/tooltipTypes';

interface TeamMembersTooltipProps {
  data: MissingMemberData | null;
  isLoading: boolean;
  isVisible: boolean;
  onClose?: () => void;
}

export default function TeamMembersTooltip({
  data,
  isLoading,
  isVisible,
  onClose
}: TeamMembersTooltipProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto transition-all duration-200"
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
          
          {isLoading ? (
            <LoadingState />
          ) : data ? (
            <ModalContent data={data} />
          ) : (
            <ErrorState />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
      <span className="text-sm">Loading team status...</span>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex items-center gap-2 text-red-600">
      <XCircle className="w-4 h-4" />
      <span className="text-sm">Error loading team data</span>
    </div>
  );
}

function ModalContent({ data }: { data: MissingMemberData }) {
  const { missingMembers, completedMembers, teamName, totalWorkingDays } = data;
  const totalMembers = missingMembers.length + completedMembers.length;
  const completionRate = totalMembers > 0 ? Math.round((completedMembers.length / totalMembers) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border-b border-gray-200 pb-2">
        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          {teamName}
        </h4>
        <div className="text-xs text-gray-500 mt-1">
          {completedMembers.length}/{totalMembers} completed ({completionRate}%)
        </div>
      </div>

      {/* Missing Members Section */}
      {missingMembers.length > 0 ? (
        <div>
          <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>חסרים במילוי • Missing Members</span>
          </div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {missingMembers.map(member => (
              <li key={member.id} className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-600 font-medium" dir="rtl">
                    {member.hebrew}
                  </span>
                  <span className="text-gray-500 text-xs">
                    ({member.name})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <Clock className="w-3 h-3" />
                  <span>{member.missingDays}d</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">כל הצוות השלים</span>
          </div>
          <div className="text-xs text-green-600">All team members completed</div>
        </div>
      )}

      {/* Completed Members (Summary) */}
      {completedMembers.length > 0 && missingMembers.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <div className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>{completedMembers.length} members completed all {totalWorkingDays} days</span>
          </div>
        </div>
      )}

      {/* Sprint Period Info */}
      <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
        <div>Sprint: {new Date(data.sprintPeriod.start).toLocaleDateString()} - {new Date(data.sprintPeriod.end).toLocaleDateString()}</div>
        <div>{totalWorkingDays} working days</div>
      </div>
    </div>
  );
}
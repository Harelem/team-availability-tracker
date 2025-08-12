'use client';

import React from 'react';
import { X, User, Clock, MessageSquare } from 'lucide-react';
import { MemberDayStatus } from '@/lib/teamDailyCalculationService';

interface DayStatusDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  statusType: 'full' | 'half' | 'absent' | 'missing';
  members: MemberDayStatus[];
  teamName: string;
}

const DayStatusDetailModal: React.FC<DayStatusDetailModalProps> = ({
  isOpen,
  onClose,
  date,
  statusType,
  members,
  teamName
}) => {
  if (!isOpen) return null;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status details
  const getStatusDetails = (type: string) => {
    const statusMap = {
      full: {
        title: 'Full Day (7h)',
        icon: '●',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      half: {
        title: 'Half Day (3.5h)',
        icon: '●',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      },
      absent: {
        title: 'Absent/Sick (0h)',
        icon: '●',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      missing: {
        title: 'Missing Schedule',
        icon: '●',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    };
    return statusMap[type as keyof typeof statusMap] || statusMap.missing;
  };

  const statusDetails = getStatusDetails(statusType);

  // Filter members by status type
  const relevantMembers = members.filter(member => member.status === statusType);

  // Handle keyboard events for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`
          bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden
          ${statusDetails.bgColor} ${statusDetails.borderColor} border
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className={`text-2xl ${statusDetails.color}`}>
              {statusDetails.icon}
            </span>
            <div>
              <h2 
                id="modal-title" 
                className={`text-lg font-semibold ${statusDetails.color}`}
              >
                {statusDetails.title}
              </h2>
              <p className="text-sm text-gray-600">
                {formatDate(date)} - {teamName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {relevantMembers.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">
                No team members with {statusDetails.title.toLowerCase()} status
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">
                  {relevantMembers.length} team member{relevantMembers.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm text-gray-500">
                  Total: {relevantMembers.reduce((sum, member) => sum + member.hours, 0)}h
                </span>
              </div>

              {relevantMembers.map((member) => (
                <div 
                  key={member.id}
                  className="bg-white p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.name}
                        </div>
                        {member.hebrew && (
                          <div className="text-sm text-gray-600 font-hebrew" dir="rtl">
                            {member.hebrew}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{member.hours}h</span>
                    </div>
                  </div>
                  
                  {member.reason && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-start gap-2 text-sm">
                        <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">
                          {member.reason}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {statusType === 'missing' 
                ? 'These members need to complete their schedules'
                : `Status: ${statusDetails.title}`
              }
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayStatusDetailModal;
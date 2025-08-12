'use client';

import { X } from 'lucide-react';
import { TeamMember, WeekData } from '@/types';

interface ViewReasonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleData: WeekData;
  teamMembers: TeamMember[];
  weekDays: Date[];
}

export default function ViewReasonsModal({ 
  isOpen, 
  onClose, 
  scheduleData, 
  teamMembers, 
  weekDays 
}: ViewReasonsModalProps) {
  if (!isOpen) return null;

  const getReasonEntries = () => {
    const entries: Array<{
      member: TeamMember;
      date: Date;
      value: '0.5' | 'X';
      reason: string;
    }> = [];

    teamMembers.forEach(member => {
      const memberData = scheduleData[member.id] || {};
      weekDays.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = memberData[dateKey];
        if (entry && (entry.value === '0.5' || entry.value === 'X') && entry.reason) {
          entries.push({
            member,
            date,
            value: entry.value,
            reason: entry.reason
          });
        }
      });
    });

    return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const reasonEntries = getReasonEntries();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getValueLabel = (value: '0.5' | 'X') => {
    return value === '0.5' ? 'Half Day' : 'Absence';
  };

  const getValueColor = (value: '0.5' | 'X') => {
    return value === '0.5' 
      ? 'bg-yellow-100 text-yellow-800' 
      : 'bg-red-100 text-red-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Reasons</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {reasonEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reasons recorded for this week.
            </div>
          ) : (
            <div className="space-y-4">
              {reasonEntries.map((entry, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-gray-900">
                        {entry.member.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.member.hebrew}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getValueColor(entry.value)}`}>
                        {getValueLabel(entry.value)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(entry.date)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    <strong>Reason:</strong> {entry.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
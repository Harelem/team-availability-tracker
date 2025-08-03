'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ReasonDialogData } from '@/types';

interface ReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
  data: ReasonDialogData | null;
}

export default function ReasonDialog({ isOpen, onClose, onSave, data }: ReasonDialogProps) {
  const [reason, setReason] = useState('');

  if (!isOpen || !data) return null;

  const handleSave = () => {
    if (reason.trim()) {
      onSave(reason.trim());
      setReason('');
      onClose();
    }
  };

  const handleCancel = () => {
    setReason('');
    onClose();
  };

  const title = data.value === '0.5' ? 'Half Day Reason' : 'Absence Reason';
  const placeholder = data.value === '0.5' 
    ? 'Please provide a reason for half day (e.g., doctor appointment, personal matter)'
    : 'Please provide a reason for absence (e.g., sick leave, family emergency)';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Mobile: Full screen modal */}
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 md:rounded-lg sm:rounded-none sm:h-full sm:max-w-none sm:mx-0 sm:flex sm:flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-4">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">{title}</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation rounded-md hover:bg-gray-100"
            aria-label="Close dialog"
          >
            <X size={24} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        
        {/* Content - expandable on mobile */}
        <div className="mb-6 sm:flex-1 sm:flex sm:flex-col">
          <label htmlFor="reason" className="block font-medium text-gray-700 mb-3 sm:text-base">
            Reason *
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:flex-1 sm:min-h-[120px] resize-none"
            rows={4}
            required
            autoFocus
          />
        </div>
        
        {/* Actions - full width on mobile */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={handleCancel}
            className="w-full sm:w-auto px-6 py-3 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors touch-manipulation font-medium min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!reason.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors touch-manipulation font-medium min-h-[44px]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 lg:p-4">
      {/* Mobile: Full screen modal, Desktop: Centered modal */}
      <div className="bg-white w-full h-full flex flex-col lg:rounded-lg lg:p-6 lg:max-w-md lg:w-auto lg:h-auto lg:mx-4 lg:max-h-[80vh]">
        {/* Mobile full-screen layout */}
        <div className="flex flex-col h-full lg:h-auto">
          {/* Header - Enhanced for mobile */}
          <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 lg:bg-white lg:border-b-0 lg:p-0 lg:mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 lg:text-lg">{title}</h2>
              <p className="text-sm text-gray-600 mt-1 lg:hidden">Required for scheduling</p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation rounded-full hover:bg-gray-100 lg:rounded-md"
              aria-label="Close dialog"
            >
              <X size={24} className="lg:w-6 lg:h-6" />
            </button>
          </div>
          
          {/* Content - Enhanced mobile experience */}
          <div className="flex-1 flex flex-col p-4 lg:p-0 lg:mb-6">
            <label htmlFor="reason" className="block font-medium text-gray-700 mb-3 text-base lg:text-sm">
              Reason • סיבה *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base resize-none min-h-[120px] lg:min-h-[100px] bg-gray-50 lg:bg-white"
              required
              autoFocus
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            
            {/* Quick suggestions for mobile */}
            <div className="mt-4 lg:hidden">
              <p className="text-sm font-medium text-gray-700 mb-2">Quick suggestions:</p>
              <div className="grid grid-cols-2 gap-2">
                {data.value === '0.5' ? [
                  'Doctor appointment',
                  'Personal matter',
                  'Family emergency',
                  'Official business'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setReason(suggestion)}
                    className="text-left p-3 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px]"
                  >
                    {suggestion}
                  </button>
                )) : [
                  'Sick leave',
                  'Family emergency',
                  'Personal day off',
                  'Medical appointment'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setReason(suggestion)}
                    className="text-left p-3 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Actions - Enhanced mobile buttons */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 lg:bg-white lg:border-t-0 lg:p-0 lg:flex lg:flex-row lg:justify-end lg:gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-3">
              <button
                onClick={handleCancel}
                className="w-full lg:w-auto px-6 py-4 lg:py-3 text-gray-600 bg-gray-100 rounded-lg lg:rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation font-medium min-h-[52px] lg:min-h-[44px] text-base lg:text-sm"
              >
                Cancel • ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={!reason.trim()}
                className="w-full lg:w-auto px-6 py-4 lg:py-3 bg-blue-600 text-white rounded-lg lg:rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:bg-blue-800 transition-colors touch-manipulation font-medium min-h-[52px] lg:min-h-[44px] text-base lg:text-sm"
              >
                Save • שמור
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
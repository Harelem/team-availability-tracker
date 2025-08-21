'use client';

import { useState } from 'react';
import { CheckCircle, Clock, Heart, Shield, Stethoscope } from 'lucide-react';
import BottomSheetModal from './BottomSheetModal';

interface MobileReasonInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
  statusType: '0.5' | 'X';
  memberName?: string;
  date?: Date;
}

const quickReasons = {
  '0.5': [
    { text: 'אישי', english: 'Personal', icon: '👤' },
    { text: 'רופא', english: 'Doctor', icon: '🩺' },
    { text: 'משפחה', english: 'Family', icon: '👨‍👩‍👧‍👦' },
    { text: 'פגישה', english: 'Meeting', icon: '📅' },
  ],
  'X': [
    { text: 'מחלה', english: 'Sick', icon: '🤒' },
    { text: 'חופש', english: 'Vacation', icon: '🏖️' },
    { text: 'שמירה', english: 'Reserve', icon: '🛡️' },
    { text: 'אישי דחוף', english: 'Personal Urgent', icon: '🚨' },
  ]
};

export default function MobileReasonInput({
  isOpen,
  onClose,
  onSave,
  statusType,
  memberName,
  date
}: MobileReasonInputProps) {
  const [customReason, setCustomReason] = useState('');
  const [selectedQuickReason, setSelectedQuickReason] = useState<string>('');

  const handleQuickReasonSelect = (reason: string) => {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setSelectedQuickReason(reason);
    setCustomReason('');
  };

  const handleSave = () => {
    const finalReason = selectedQuickReason || customReason.trim();
    if (finalReason) {
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      onSave(finalReason);
      handleClose();
    }
  };

  const handleClose = () => {
    setCustomReason('');
    setSelectedQuickReason('');
    onClose();
  };

  const statusTitle = statusType === '0.5' ? 'Half Day Reason' : 'Absence Reason';
  const statusEmoji = statusType === '0.5' ? '⏰' : '❌';
  const reasons = quickReasons[statusType];

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${statusEmoji} ${statusTitle}`}
    >
      <div className="space-y-6">
        {/* Context info */}
        {memberName && date && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-sm text-blue-800">
              <p className="font-medium">{memberName}</p>
              <p className="text-blue-600">
                {date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        )}

        {/* Quick reasons */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Quick Reasons</h3>
          <div className="grid grid-cols-2 gap-3">
            {reasons.map((reason) => (
              <button
                key={reason.text}
                onClick={() => handleQuickReasonSelect(reason.text)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 touch-manipulation min-h-[80px] active:scale-95 ${
                  selectedQuickReason === reason.text
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-offset-1 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">{reason.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{reason.text}</div>
                    <div className="text-xs text-gray-500">{reason.english}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom reason */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Custom Reason</h3>
          <textarea
            value={customReason}
            onChange={(e) => {
              setCustomReason(e.target.value);
              setSelectedQuickReason('');
            }}
            placeholder="Enter a custom reason..."
            className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none touch-manipulation"
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleClose}
            className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:bg-gray-300 active:scale-95 transition-all touch-manipulation min-h-[56px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedQuickReason && !customReason.trim()}
            className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all touch-manipulation min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Save Reason
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
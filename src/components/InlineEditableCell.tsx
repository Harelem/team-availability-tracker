'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { DatabaseService } from '@/lib/database';

export interface CellValue {
  value: '1' | '0.5' | 'X' | null;
  reason?: string;
  hours?: number;
}

interface InlineEditableCellProps {
  value: CellValue | null;
  date: string;
  memberId: string;
  teamId: string;
  isManagerView: boolean;
  onSave?: (newValue: CellValue) => void;
  className?: string;
}

export default function InlineEditableCell({
  value,
  date,
  memberId,
  teamId: _teamId, // Unused but kept for potential future use
  isManagerView,
  onSave,
  className = ''
}: InlineEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentValue, setCurrentValue] = useState<CellValue | null>(value);
  const [reason, setReason] = useState(value?.reason || '');
  const [showReasonInput, setShowReasonInput] = useState(false);
  
  const cellRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop value changes
  useEffect(() => {
    setCurrentValue(value);
    setReason(value?.reason || '');
  }, [value]);

  // Close editing on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        handleCancelEdit();
      }
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  // Focus reason input when it becomes visible
  useEffect(() => {
    if (showReasonInput && reasonInputRef.current) {
      reasonInputRef.current.focus();
    }
  }, [showReasonInput]);

  const handleCellClick = () => {
    if (isManagerView && !isEditing && !isSaving) {
      setIsEditing(true);
    }
  };

  const handleValueSelect = async (selectedValue: '1' | '0.5' | 'X') => {
    // Show reason input for half day or sick/OOO
    if (selectedValue === '0.5' || selectedValue === 'X') {
      if (!showReasonInput) {
        setShowReasonInput(true);
        return;
      }
      
      // If reason input is showing but empty, require reason
      if (!reason.trim()) {
        return;
      }
    }

    const newValue: CellValue = {
      value: selectedValue,
      reason: (selectedValue === '0.5' || selectedValue === 'X') ? reason.trim() : undefined,
      hours: selectedValue === '1' ? 7 : selectedValue === '0.5' ? 3.5 : 0
    };

    await saveValue(newValue);
  };

  const saveValue = async (newValue: CellValue) => {
    setIsSaving(true);
    
    try {
      await DatabaseService.updateScheduleEntry(
        parseInt(memberId),
        date,
        newValue.value,
        newValue.reason
      );

      setCurrentValue(newValue);
      setIsEditing(false);
      setShowReasonInput(false);
      setReason('');
      
      onSave?.(newValue);
      
    } catch (error) {
      console.error('Error saving schedule entry:', error);
      // TODO: Add error toast notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setShowReasonInput(false);
    setReason(value?.reason || '');
  }, [value?.reason]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        handleCancelEdit();
        break;
      case 'Enter':
        if (showReasonInput && reason.trim()) {
          const pendingValue = currentValue?.value || '0.5';
          handleValueSelect(pendingValue as '0.5' | 'X');
        }
        break;
      case '1':
        if (isEditing && !showReasonInput) {
          event.preventDefault();
          handleValueSelect('1');
        }
        break;
      case '5':
        if (isEditing && !showReasonInput && event.key === '5') {
          event.preventDefault();
          handleValueSelect('0.5');
        }
        break;
      case 'x':
      case 'X':
        if (isEditing && !showReasonInput) {
          event.preventDefault();
          handleValueSelect('X');
        }
        break;
    }
  };

  const getCellDisplayValue = () => {
    if (!currentValue || !currentValue.value) return '';
    
    switch (currentValue.value) {
      case '1':
        return '1';
      case '0.5':
        return '½';
      case 'X':
        return 'X';
      default:
        return '';
    }
  };

  const getCellStyle = () => {
    if (!currentValue || !currentValue.value) {
      return 'bg-white hover:bg-gray-50 text-gray-400';
    }
    
    switch (currentValue.value) {
      case '1':
        return 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200';
      case '0.5':
        return 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'X':
        return 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-white hover:bg-gray-50 text-gray-400';
    }
  };

  return (
    <div
      ref={cellRef}
      className={`relative min-w-[120px] h-12 border transition-all duration-200 ${getCellStyle()} ${
        isEditing ? 'ring-2 ring-blue-500 ring-offset-1' : ''
      } ${isManagerView ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      onClick={handleCellClick}
      onKeyDown={handleKeyDown}
      tabIndex={isManagerView ? 0 : -1}
    >
      {isSaving && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        </div>
      )}

      {!isEditing ? (
        <div className="flex items-center justify-center h-full">
          <span className="font-medium text-sm">
            {getCellDisplayValue()}
          </span>
          {currentValue?.reason && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-400 rounded-full"></div>
          )}
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {!showReasonInput ? (
            <div className="flex gap-1">
              <button
                onClick={() => handleValueSelect('1')}
                className="flex-1 px-2 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors"
              >
                1
              </button>
              <button
                onClick={() => handleValueSelect('0.5')}
                className="flex-1 px-2 py-1 text-xs font-medium bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded transition-colors"
              >
                0.5
              </button>
              <button
                onClick={() => handleValueSelect('X')}
                className="flex-1 px-2 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
              >
                X
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <input
                ref={reasonInputRef}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter reason..."
                className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={100}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const pendingValue = currentValue?.value === '0.5' ? '0.5' : 'X';
                    handleValueSelect(pendingValue as '0.5' | 'X');
                  }}
                  disabled={!reason.trim()}
                  className="flex-1 px-2 py-1 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
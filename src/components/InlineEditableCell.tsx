'use client';

import React, { useState, useRef, useEffect, useCallback, startTransition, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { DatabaseService } from '@/lib/database';
import ClientOnly from '@/components/ClientOnly';
import { useOptimisticScheduleUpdatesForMember } from '@/hooks/useOptimisticScheduleUpdates';

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

// PERFORMANCE FIX: Enhanced memo comparison for better re-render prevention
const InlineEditableCell = React.memo(function InlineEditableCell({
  value,
  date,
  memberId,
  teamId: _teamId,
  isManagerView,
  onSave,
  className = ''
}: InlineEditableCellProps) {
  // PERFORMANCE FIX: State management with React 18 optimizations
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentValue, setCurrentValue] = useState<CellValue | null>(value);
  const [reason, setReason] = useState(value?.reason || '');
  const [showReasonInput, setShowReasonInput] = useState(false);
  
  const cellRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);

  // Use optimistic updates for this member
  const { getValueForDate, isPendingForDate, hasFailedForDate } = useOptimisticScheduleUpdatesForMember(parseInt(memberId));

  // Update local state when prop value changes or optimistic updates change
  useEffect(() => {
    const optimisticValue = getValueForDate(date);
    if (optimisticValue) {
      // Use optimistic value if available
      const cellValue: CellValue = {
        value: optimisticValue.value,
        reason: optimisticValue.reason
      };
      setCurrentValue(cellValue);
      setReason(optimisticValue.reason || '');
    } else {
      // Fall back to prop value
      setCurrentValue(value);
      setReason(value?.reason || '');
    }
  }, [value, getValueForDate, date]);

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

  // PERFORMANCE FIX: Memoized cell click handler
  const handleCellClick = useCallback(() => {
    if (isManagerView && !isEditing && !isSaving) {
      startTransition(() => {
        setIsEditing(true);
      });
    }
  }, [isManagerView, isEditing, isSaving]);

  // PERFORMANCE FIX: Enhanced save function with React 18 concurrent features
  const saveValue = useCallback(async (newValue: CellValue) => {
    // Close editing UI immediately for instant feedback using startTransition
    startTransition(() => {
      setIsEditing(false);
      setShowReasonInput(false);
      setReason('');
    });
    
    try {
      // PERFORMANCE FIX: Set saving state with concurrent features
      startTransition(() => {
        setIsSaving(true);
      });
      
      // Send the update to the server using the scheduleUpdateManager
      const { scheduleUpdateManager } = await import('@/lib/scheduleUpdateManager');
      
      await scheduleUpdateManager.updateScheduleEntry(
        parseInt(memberId),
        date,
        newValue.value,
        newValue.reason
      );
      
      // Call the provided onSave callback
      onSave?.(newValue);
      
      // Success handling
      startTransition(() => {
        setIsSaving(false);
        setError(null);
      });
      
      console.log('✅ Cell value saved successfully');
      
    } catch (error: any) {
      console.error('❌ Error saving cell value:', error);
      
      // Re-enable editing on error with batched state updates
      startTransition(() => {
        setIsEditing(true);
        setIsSaving(false);
        setError(error.message || 'Failed to save');
        if (newValue.value === '0.5' || newValue.value === 'X') {
          setShowReasonInput(true);
          setReason(newValue.reason || '');
        }
      });
    }
  }, [memberId, date, onSave]);

  // PERFORMANCE FIX: Optimized value selection with batched state updates
  const handleValueSelect = useCallback(async (selectedValue: '1' | '0.5' | 'X') => {
    if (selectedValue === '0.5' || selectedValue === 'X') {
      if (!showReasonInput) {
        startTransition(() => {
          setShowReasonInput(true);
        });
        return;
      }
      
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
  }, [showReasonInput, reason, saveValue]);

  // PERFORMANCE FIX: Batched cancel edit handler
  const handleCancelEdit = useCallback(() => {
    startTransition(() => {
      setIsEditing(false);
      setShowReasonInput(false);
      setReason(value?.reason || '');
    });
  }, [value?.reason]);

  // PERFORMANCE FIX: Memoized keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
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
        if (isEditing && !showReasonInput) {
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
  }, [handleCancelEdit, showReasonInput, reason, currentValue, isEditing, handleValueSelect]);

  // PERFORMANCE FIX: Memoized display value and style calculations
  const cellDisplayValue = useMemo(() => {
    if (!currentValue || !currentValue.value) return '';
    
    switch (currentValue.value) {
      case '1': return '1';
      case '0.5': return '½';
      case 'X': return 'X';
      default: return '';
    }
  }, [currentValue]);

  const cellStyle = useMemo(() => {
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
  }, [currentValue]);

  return (
    <ClientOnly fallback={
      <div className={`relative min-w-[120px] h-12 border transition-all duration-200 bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    }>
      <div
        ref={cellRef}
        data-testid="inline-editable-cell"
        className={`relative min-w-[120px] h-12 border transition-all duration-200 ${cellStyle} ${
          isEditing ? 'ring-2 ring-blue-500 ring-offset-1' : ''
        } ${isManagerView ? 'cursor-pointer' : 'cursor-default'} ${className}`}
        onClick={handleCellClick}
        onKeyDown={handleKeyDown}
        tabIndex={isManagerView ? 0 : -1}
      >
      {/* Show pending state indicator */}
      {isPendingForDate(date) && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-75 flex items-center justify-center z-10">
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
        </div>
      )}

      {/* Show failed state indicator */}
      {hasFailedForDate(date) && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full z-10" 
             title="Update failed - click to retry"></div>
      )}

      {isSaving && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        </div>
      )}

      {!isEditing ? (
        <div className="flex items-center justify-center h-full">
          <span className={`font-medium text-sm ${isPendingForDate(date) ? 'text-blue-600' : ''} ${hasFailedForDate(date) ? 'text-red-600' : ''}`}>
            {cellDisplayValue}
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
    </ClientOnly>
  );
});

// PERFORMANCE FIX: Enhanced memo comparison to prevent unnecessary re-renders
const InlineEditableCellMemo = React.memo(InlineEditableCell, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.value?.value === nextProps.value?.value &&
    prevProps.value?.reason === nextProps.value?.reason &&
    prevProps.date === nextProps.date &&
    prevProps.memberId === nextProps.memberId &&
    prevProps.isManagerView === nextProps.isManagerView &&
    prevProps.className === nextProps.className
  );
});

export default InlineEditableCellMemo;
'use client';

import React, { useEffect, useRef } from 'react';
import { X, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDailyCompanyStatus } from '@/hooks/useDailyCompanyStatus';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { WorkforceStatusModalProps } from '@/types/modalTypes';
import WorkforceStatusContent from '@/components/coo/WorkforceStatusContent';

export default function WorkforceStatusModal({
  isOpen,
  onClose,
  selectedDate = new Date()
}: WorkforceStatusModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  
  const { data: dailyStatus, isLoading, error, refetch } = useDailyCompanyStatus(selectedDate);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus management
      const firstFocusableElement = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusableElement?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside to close (disabled on mobile to prevent accidental closes)
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isMobile) {
      onClose();
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatHebrewDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workforce-modal-title"
        className={`bg-white shadow-xl w-full flex flex-col ${
          isMobile 
            ? 'h-full max-h-full rounded-none' // Mobile: Full screen
            : 'max-w-4xl max-h-[90vh] rounded-lg' // Desktop: Modal with proper height constraint
        }`}
      >
        {/* Modal Header */}
        <div className={`sticky top-0 bg-white z-10 border-b border-gray-200 ${
          isMobile ? 'px-4 py-3' : 'p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 
                id="workforce-modal-title" 
                className={`font-bold text-gray-900 ${
                  isMobile ? 'text-lg' : 'text-2xl'
                }`}
              >
                <Users className="inline-block w-6 h-6 mr-2 text-blue-600" />
                Workforce Daily Status
              </h2>
              <div className={`text-gray-600 mt-1 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                <div className="font-medium">
                  {formatDate(selectedDate)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatHebrewDate(selectedDate)}
                  {isToday(selectedDate) && ' • היום • Today'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {/* Refresh Button */}
              <button
                onClick={refetch}
                disabled={isLoading}
                className={`flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ${
                  isMobile ? 'p-3 min-h-[44px] min-w-[44px]' : 'p-2'
                }`}
                aria-label="Refresh data"
                title="Refresh workforce status"
              >
                <RefreshCw className={`${isLoading ? 'animate-spin' : ''} ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
              </button>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className={`hover:bg-gray-100 rounded-lg transition-colors ${
                  isMobile ? 'p-3 min-h-[44px] min-w-[44px]' : 'p-2'
                }`}
                aria-label="Close modal"
              >
                <X className={`text-gray-500 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content - Properly scrollable area */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {error ? (
            <div className="p-6">
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                <p className="text-red-500 font-medium">Error loading workforce status</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
                <button
                  onClick={refetch}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <WorkforceStatusContent 
              dailyStatus={dailyStatus}
              isLoading={isLoading}
              selectedDate={selectedDate}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>
    </div>
  );
}
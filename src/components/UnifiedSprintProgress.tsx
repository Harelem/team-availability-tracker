'use client';

import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, BarChart3, Target, ChevronLeft, ChevronRight, Edit3, Save, X } from 'lucide-react';
import { useEnhancedSprintData } from '@/hooks/useUnifiedSprintData';

interface UnifiedSprintProgressProps {
  showDetailed?: boolean;
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
  showNavigation?: boolean;
  showNotes?: boolean;
}

export const UnifiedSprintProgress: React.FC<UnifiedSprintProgressProps> = ({ 
  showDetailed = true,
  className = '',
  variant = 'full',
  showNavigation = true,
  showNotes = true
}) => {
  const { 
    sprintData, 
    isLoading, 
    error, 
    isSavingNotes,
    navigateToPrevious, 
    navigateToNext,
    saveNotes 
  } = useEnhancedSprintData();

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // Notes management functions
  const handleEditNotes = () => {
    setNotesValue(sprintData?.notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (await saveNotes(notesValue)) {
      setIsEditingNotes(false);
    }
  };

  const handleCancelNotes = () => {
    setNotesValue(sprintData?.notes || '');
    setIsEditingNotes(false);
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 h-24 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-sm">Loading sprint data...</div>
        </div>
      </div>
    );
  }

  if (error || !sprintData) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-800 font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>שגיאה בטעינת נתוני ספרינט • Error loading sprint data</span>
        </div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-orange-500';
    if (progress >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusColor = (isOnTrack: boolean) => {
    return isOnTrack ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isOnTrack: boolean) => {
    return isOnTrack ? CheckCircle : AlertCircle;
  };

  // Minimal variant - just the progress percentage
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <BarChart3 className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-gray-900">{sprintData.timeProgress}%</span>
        <span className="text-sm text-gray-500">ספרינט</span>
      </div>
    );
  }

  // Compact variant - progress with basic info
  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              {sprintData.name}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-600">
              {sprintData.timeProgress}%
            </div>
            <div className="text-xs text-gray-500">התקדמות</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(sprintData.timeProgress)}`}
            style={{ width: `${Math.min(sprintData.timeProgress, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>{sprintData.daysRemaining} ימים נותרו</span>
          <span>{formatDate(sprintData.endDate)}</span>
        </div>
      </div>
    );
  }

  // Full variant - complete sprint information
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Sprint Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Navigation Controls */}
          {showNavigation && sprintData?.navigation && (
            <div className="flex items-center gap-2">
              <button
                onClick={navigateToPrevious}
                disabled={!sprintData.navigation.hasPrevious}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sprintData.navigation.hasPrevious
                    ? 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Previous Sprint"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Sprint
              </button>
              
              <span className="px-3 py-2 text-sm font-medium text-gray-900">
                Sprint {sprintData.navigation.position.current} of {sprintData.navigation.position.total}
              </span>
              
              <button
                onClick={navigateToNext}
                disabled={!sprintData.navigation.hasNext}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sprintData.navigation.hasNext
                    ? 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Next Sprint"
              >
                Next Sprint
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>{sprintData.name}</span>
              {sprintData?.navigation?.position?.current === sprintData?.navigation?.position?.index && (
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Current
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {formatDate(sprintData.startDate)} - {formatDate(sprintData.endDate)} • {sprintData.sprintWeeks} שבועות
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {sprintData.timeProgress}%
          </div>
          <div className="text-sm text-gray-500">התקדמות זמן</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2 text-gray-700">
          <span>התקדמות ספרינט</span>
          <span>{sprintData.daysElapsed} מתוך {sprintData.totalDays} ימים</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(sprintData.timeProgress)}`}
            style={{ width: `${Math.min(sprintData.timeProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Detailed Information */}
      {showDetailed && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-gray-600 mr-1" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {sprintData.daysRemaining}
            </div>
            <div className="text-sm text-gray-500">ימים נותרו</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-gray-600 mr-1" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {sprintData.workingDaysRemaining}
            </div>
            <div className="text-sm text-gray-500">ימי עבודה נותרים</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-4 h-4 text-gray-600 mr-1" />
            </div>
            <div className={`text-xl font-bold ${getStatusColor(sprintData.isOnTrack)}`}>
              {sprintData.isOnTrack ? 'במסלול' : 'מאחר'}
            </div>
            <div className="text-sm text-gray-500">סטטוס ספרינט</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {React.createElement(getStatusIcon(sprintData.isOnTrack), {
                className: `w-4 h-4 mr-1 ${getStatusColor(sprintData.isOnTrack)}`
              })}
            </div>
            <div className="text-xl font-bold text-gray-900">
              {sprintData.sprintWeeks}w
            </div>
            <div className="text-sm text-gray-500">אורך ספרינט</div>
          </div>
        </div>
      )}

      {/* Sprint Notes Section */}
      {showNotes && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-900">Sprint Notes</label>
            {!isEditingNotes && (
              <button
                onClick={handleEditNotes}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes: 2 new developers joined team, 5 developers sent to other base, completed experiment, etc."
                className="w-full p-3 border rounded-lg min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelNotes}
                  disabled={isSavingNotes}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {isSavingNotes ? 'Saving Notes...' : 'Save Notes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-[60px]">
              {sprintData.notes ? (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{sprintData.notes}</p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-sm text-gray-500 italic">
                    No notes added for this sprint. Click Edit to add notes about team changes, experiments, or important events.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Source Transparency */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span>מקור נתונים: global_sprint_settings ({sprintData.settingsId})</span>
            <span>•</span>
            <span>חישוב אחיד: SprintCalculations.calculateSprintProgress</span>
          </div>
          <div>
            עודכן: {new Date(sprintData.lastUpdated).toLocaleDateString('he-IL', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSprintProgress;
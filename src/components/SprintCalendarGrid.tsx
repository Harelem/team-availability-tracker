'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SprintHistoryEntry } from '@/lib/database';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  sprints: SprintHistoryEntry[];
}

interface DragSelection {
  startDate: Date | null;
  endDate: Date | null;
  isSelecting: boolean;
}

interface SprintCalendarGridProps {
  currentDate: Date;
  viewMode: 'month' | 'quarter';
  sprints: SprintHistoryEntry[];
  onDateRangeSelect: (startDate: Date, endDate: Date) => void;
  onSprintClick: (sprint: SprintHistoryEntry) => void;
  selectedSprint?: SprintHistoryEntry | null;
}

export default function SprintCalendarGrid({
  currentDate,
  viewMode,
  sprints,
  onDateRangeSelect,
  onSprintClick,
  selectedSprint
}: SprintCalendarGridProps) {
  const [dragSelection, setDragSelection] = useState<DragSelection>({
    startDate: null,
    endDate: null,
    isSelecting: false
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate calendar days for current view
  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let startDate: Date, endDate: Date;
    
    if (viewMode === 'month') {
      // Month view: show full calendar grid
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Start from Sunday of the week containing the first day
      startDate = new Date(firstDay);
      startDate.setDate(firstDay.getDate() - firstDay.getDay());
      
      // End on Saturday of the week containing the last day
      endDate = new Date(lastDay);
      endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    } else {
      // Quarter view: show 3 months
      const quarter = Math.floor(month / 3);
      const quarterStart = new Date(year, quarter * 3, 1);
      const quarterEnd = new Date(year, (quarter + 1) * 3, 0);
      
      startDate = new Date(quarterStart);
      startDate.setDate(quarterStart.getDate() - quarterStart.getDay());
      
      endDate = new Date(quarterEnd);
      endDate.setDate(quarterEnd.getDate() + (6 - quarterEnd.getDay()));
    }
    
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    while (current <= endDate) {
      const dayDate = new Date(current);
      const isCurrentMonth = viewMode === 'month' 
        ? dayDate.getMonth() === month
        : Math.floor(dayDate.getMonth() / 3) === Math.floor(month / 3);
      
      const dayStart = new Date(dayDate);
      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Find sprints that overlap with this day
      const daysprints = sprints.filter(sprint => {
        const sprintStart = new Date(sprint.sprint_start_date);
        const sprintEnd = new Date(sprint.sprint_end_date);
        return sprintStart <= dayEnd && sprintEnd >= dayStart;
      });
      
      days.push({
        date: new Date(dayDate),
        isCurrentMonth,
        isToday: dayDate.getTime() === today.getTime(),
        isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
        sprints: daysprints
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, viewMode, sprints]);

  const calendarDays = generateCalendarDays();

  // Handle mouse down (start drag selection)
  const handleMouseDown = (date: Date, event: React.MouseEvent) => {
    // Only start selection on empty areas or when holding Shift
    if (event.shiftKey || event.target === event.currentTarget) {
      event.preventDefault();
      setDragSelection({
        startDate: new Date(date),
        endDate: new Date(date),
        isSelecting: true
      });
    }
  };

  // Handle mouse enter (continue drag selection)
  const handleMouseEnter = (date: Date) => {
    setHoveredDate(new Date(date));
    
    if (dragSelection.isSelecting && dragSelection.startDate) {
      setDragSelection(prev => ({
        ...prev,
        endDate: new Date(date)
      }));
    }
  };

  // Handle mouse up (complete drag selection)
  const handleMouseUp = () => {
    if (dragSelection.isSelecting && dragSelection.startDate && dragSelection.endDate) {
      const startDate = new Date(Math.min(dragSelection.startDate.getTime(), dragSelection.endDate.getTime()));
      const endDate = new Date(Math.max(dragSelection.startDate.getTime(), dragSelection.endDate.getTime()));
      
      // Align to Sunday-Saturday for sprint creation
      const alignedStart = new Date(startDate);
      alignedStart.setDate(startDate.getDate() - startDate.getDay()); // Go to Sunday
      
      const alignedEnd = new Date(endDate);
      alignedEnd.setDate(endDate.getDate() + (6 - endDate.getDay())); // Go to Saturday
      
      onDateRangeSelect(alignedStart, alignedEnd);
    }
    
    setDragSelection({
      startDate: null,
      endDate: null,
      isSelecting: false
    });
  };

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragSelection.isSelecting) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragSelection.isSelecting]);

  // Check if a date is in the current drag selection
  const isDateInSelection = (date: Date): boolean => {
    if (!dragSelection.startDate || !dragSelection.endDate) return false;
    
    const dateTime = date.getTime();
    const startTime = Math.min(dragSelection.startDate.getTime(), dragSelection.endDate.getTime());
    const endTime = Math.max(dragSelection.startDate.getTime(), dragSelection.endDate.getTime());
    
    return dateTime >= startTime && dateTime <= endTime;
  };

  // Get sprint color based on status
  const getSprintColor = (sprint: SprintHistoryEntry): string => {
    switch (sprint.status) {
      case 'active':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'completed':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  // Check if sprint is selected
  const isSprintSelected = (sprint: SprintHistoryEntry): boolean => {
    return selectedSprint?.id === sprint.id;
  };

  // Render sprint bar for a day
  const renderSprintBars = (day: CalendarDay) => {
    if (day.sprints.length === 0) return null;

    // Sort sprints by start date
    const sortedSprints = [...day.sprints].sort((a, b) => 
      new Date(a.sprint_start_date).getTime() - new Date(b.sprint_start_date).getTime()
    );

    return (
      <div className="absolute inset-x-1 top-8 space-y-0.5 pointer-events-none">
        {sortedSprints.slice(0, 3).map((sprint, index) => {
          const isFirstDay = new Date(sprint.sprint_start_date).toDateString() === day.date.toDateString();
          const isLastDay = new Date(sprint.sprint_end_date).toDateString() === day.date.toDateString();
          
          return (
            <div
              key={`${sprint.id}-${index}`}
              className={`h-1.5 rounded-sm border pointer-events-auto cursor-pointer transition-all hover:h-2 ${
                getSprintColor(sprint)
              } ${isSprintSelected(sprint) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSprintClick(sprint);
              }}
              title={`Sprint #${sprint.sprint_number}${sprint.sprint_name ? `: ${sprint.sprint_name}` : ''} (${sprint.status})`}
              style={{
                borderTopLeftRadius: isFirstDay ? '0.25rem' : '0',
                borderBottomLeftRadius: isFirstDay ? '0.25rem' : '0',
                borderTopRightRadius: isLastDay ? '0.25rem' : '0',
                borderBottomRightRadius: isLastDay ? '0.25rem' : '0',
              }}
            >
              {isFirstDay && (
                <div className="text-xs font-medium px-1 truncate leading-tight">
                  Sprint #{sprint.sprint_number}
                </div>
              )}
            </div>
          );
        })}
        
        {day.sprints.length > 3 && (
          <div className="h-1.5 bg-gray-200 rounded-sm text-xs text-gray-500 px-1 leading-tight">
            +{day.sprints.length - 3} more
          </div>
        )}
      </div>
    );
  };

  // Week header for month view
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="sprint-calendar-grid h-full flex flex-col" ref={gridRef}>
      {/* Week header */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {weekDays.map(day => (
          <div key={day} className="p-3 text-sm font-medium text-gray-600 text-center border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 border-l border-t overflow-hidden">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`relative border-r border-b min-h-[120px] cursor-pointer transition-colors select-none ${
              !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${
              day.isToday ? 'bg-blue-50 border-blue-200' : ''
            } ${
              isDateInSelection(day.date) ? 'bg-green-100 border-green-300' : ''
            } ${
              hoveredDate?.toDateString() === day.date.toDateString() ? 'bg-gray-100' : ''
            } ${
              day.isWeekend && day.isCurrentMonth ? 'bg-gray-25' : ''
            }`}
            onMouseDown={(e) => handleMouseDown(day.date, e)}
            onMouseEnter={() => handleMouseEnter(day.date)}
          >
            {/* Date number */}
            <div className={`p-2 text-sm font-medium ${
              day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {day.date.getDate()}
              {day.isToday && (
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold absolute top-1 left-1">
                  {day.date.getDate()}
                </div>
              )}
            </div>

            {/* Sprint bars */}
            {renderSprintBars(day)}

            {/* Drag selection overlay */}
            {isDateInSelection(day.date) && (
              <div className="absolute inset-0 bg-green-200 bg-opacity-30 pointer-events-none">
                <div className="absolute bottom-1 right-1 text-xs text-green-700 font-medium bg-green-100 px-1 rounded">
                  Selected
                </div>
              </div>
            )}

            {/* Weekend overlay */}
            {day.isWeekend && day.isCurrentMonth && (
              <div className="absolute top-0 right-0 w-0 h-0 border-l-8 border-l-transparent border-t-8 border-t-gray-300 opacity-30 pointer-events-none"></div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>💡 <strong>Drag to select:</strong> Click and drag to select date range for new sprint</span>
            <span><strong>Sprint bars:</strong> Click to view sprint details</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 bg-green-100 border border-green-300 rounded-sm"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 bg-blue-100 border border-blue-300 rounded-sm"></div>
              <span>Upcoming</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 bg-gray-100 border border-gray-300 rounded-sm"></div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag selection tooltip */}
      {dragSelection.isSelecting && dragSelection.startDate && dragSelection.endDate && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black text-white px-3 py-2 rounded-lg text-sm font-medium pointer-events-none">
          Sprint Range: {dragSelection.startDate.toLocaleDateString()} - {dragSelection.endDate.toLocaleDateString()}
          <div className="text-xs opacity-75 mt-1">
            {Math.ceil((dragSelection.endDate.getTime() - dragSelection.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)} days
            ({Math.ceil((dragSelection.endDate.getTime() - dragSelection.startDate.getTime()) / (1000 * 60 * 60 * 24 * 7) + 1)} weeks)
          </div>
        </div>
      )}
    </div>
  );
}